#!/usr/bin/env node
// Production regression baseline — capture.
//
// Records what a live origin (default https://awesome.video) serves to an
// anonymous visitor so later parity work can be diffed against a real,
// dated snapshot instead of memory:
//
//   tests/parity/production-baseline/<YYYY-MM-DD>/
//     inventory.json            routes, endpoints, viewports the run covers
//     manifest.json             one entry per invocation: command, commit,
//                               tool versions, timings, throttle events
//     routes/<slug>/            <slug>@{375,768,1024,1440}.png full page,
//                               dom.json, status.json, axe.json (375 + 1440)
//                               (sitemap/robots: body.<ext> + summary only)
//     api/<slug>.json + shapes.json
//     lighthouse/<slug>.json + scores.json   (mobile preset, 3 routes)
//
// Resumable by design: every finished unit on disk is skipped, so a run that
// was interrupted (shell budget, edge throttling) just continues on the next
// invocation. A unit is one route × viewport (PNG + DOM + axe bound to one
// page load by a shared unit id and the PNG's sha256 in the DOM record, which
// is written last — a unit that fails that check is recaptured whole), one
// API body, or one Lighthouse report, and every file lands via temp + rename.
// `--max-navigations N` caps the page loads of this invocation (screenshot
// loads, their retries, and Lighthouse attempts are all charged before they
// start) for callers that must stay under a short shell timeout; otherwise
// run it in the background. A dated directory belongs to one origin: resuming
// it with a different --base fails. All browser traffic is read-only by
// construction: a browser-wide interceptor fails every non-GET request from
// every target (pages, popups, workers, Lighthouse's page), every page —
// Lighthouse's included — is a page of a read-only Playwright context whose
// init script seals WebSocket, Worker, SharedWorker, window.open and
// service-worker registration in every document and popup, and Chromium's
// popup blocker stays on; the manifest records what was refused.
//
//   npm run baseline:capture                       # everything, today's dir
//   npm run baseline:capture -- --max-navigations 8
//   npm run baseline:capture -- --only api,lighthouse
//   npm run baseline:capture -- --routes /,/about --force
//   npm run baseline:capture -- --base http://127.0.0.1:5000 --out /tmp/x
//
// Exit codes: 0 complete · 2 stopped by --max-navigations (re-run to resume)
//             1 at least one route/endpoint failed (details in manifest.json;
//               takes precedence over 2 when both apply).
import fs from "node:fs";
import path from "node:path";
import {
  API_ENDPOINTS,
  AXE_WIDTHS,
  BASELINE_ROOT,
  DEFAULT_BASE,
  LIGHTHOUSE_ROUTES,
  VIEWPORTS,
  VISITOR_ROUTES,
  captureApiSet,
  captureLighthouseSet,
  createNavigationBudget,
  captureRoute,
  createTelemetry,
  freePort,
  gitCommit,
  inventory,
  launchBrowser,
  parseOriginUrl,
  readJson,
  readOnlyGuardOf,
  routeIsComplete,
  toolVersions,
  todayStamp,
  writeJson,
} from "./production-baseline-lib.mjs";

function parseArgs(argv) {
  const args = { base: DEFAULT_BASE, out: null, date: null, routes: null, only: new Set(["routes", "api", "lighthouse"]), maxNavigations: Infinity, force: false, list: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => {
      const value = argv[++i];
      if (value === undefined) throw new Error(`${arg} needs a value`);
      return value;
    };
    switch (arg) {
      case "--base": args.base = next(); break;
      case "--out": args.out = next(); break;
      case "--date": args.date = next(); break;
      case "--routes": args.routes = next().split(",").map((route) => route.trim()).filter(Boolean); break;
      case "--only": args.only = new Set(next().split(",").map((phase) => phase.trim()).filter(Boolean)); break;
      case "--max-navigations": {
        const value = Number(next());
        if (!Number.isInteger(value) || value < 0) throw new Error("--max-navigations needs a non-negative integer (0 = unlimited)");
        args.maxNavigations = value === 0 ? Infinity : value;
        break;
      }
      case "--force": args.force = true; break;
      case "--list": args.list = true; break;
      case "--help": case "-h":
        console.log(fs.readFileSync(new URL(import.meta.url), "utf8").split("\n").filter((line) => line.startsWith("//")).map((line) => line.slice(3)).join("\n"));
        process.exit(0);
        break;
      default:
        throw new Error(`Unknown argument ${arg}`);
    }
  }
  for (const phase of args.only) {
    if (!["routes", "api", "lighthouse"].includes(phase)) throw new Error(`--only accepts routes, api, lighthouse (got ${phase})`);
  }
  args.base = parseOriginUrl(args.base, "--base");
  if (args.date && !/^\d{4}-\d{2}-\d{2}$/.test(args.date)) throw new Error("--date must be YYYY-MM-DD");
  return args;
}

function selectRoutes(requested) {
  if (!requested) return VISITOR_ROUTES;
  const known = new Map(VISITOR_ROUTES.map((route) => [route.path, route]));
  return requested.map((routePath) => {
    const route = known.get(routePath);
    if (!route) throw new Error(`Unknown route ${routePath}; the baseline covers only the inventoried visitor routes`);
    return route;
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const stamp = args.date ?? todayStamp();
  const outDir = path.resolve(args.out ?? path.join(BASELINE_ROOT, stamp));
  const routes = selectRoutes(args.routes);

  if (args.list) {
    console.log(JSON.stringify(inventory({ base: args.base, routes }), null, 2));
    return 0;
  }

  fs.mkdirSync(outDir, { recursive: true });
  const inventoryPath = path.join(outDir, "inventory.json");
  const existingInventory = readJson(inventoryPath);
  if (existingInventory && existingInventory.base !== args.base) {
    // A dated baseline describes ONE origin. Resuming it against another would
    // silently interleave two sites' artefacts under one date.
    throw new Error(`${path.relative(process.cwd(), inventoryPath)} was captured from ${existingInventory.base}, not ${args.base}; use --out/--date for a separate baseline`);
  }
  if (args.force || !existingInventory) writeJson(inventoryPath, inventory({ base: args.base }));

  const telemetry = createTelemetry();
  const invocation = {
    startedAt: telemetry.startedAt,
    command: ["node", path.relative(process.cwd(), process.argv[1]), ...process.argv.slice(2)].join(" "),
    base: args.base,
    outDir: path.relative(process.cwd(), outDir),
    toolCommit: gitCommit(),
    tools: toolVersions(),
    phases: [...args.only],
    routesRequested: routes.map((route) => route.path),
    maxNavigations: Number.isFinite(args.maxNavigations) ? args.maxNavigations : null,
    force: args.force,
  };
  console.log(`Production baseline capture → ${invocation.outDir}`);
  console.log(`  base ${args.base} · commit ${invocation.toolCommit ?? "unknown"} · chromium ${invocation.tools.chromium} · lighthouse ${invocation.tools.lighthouse} · axe ${invocation.tools.axeCore}`);

  // One budget for the whole invocation: screenshot loads, their retries and
  // Lighthouse attempts all draw from it before they start.
  const budget = createNavigationBudget(args.maxNavigations);
  let stoppedByBudget = false;
  const routeResults = [];

  if (args.only.has("api")) {
    console.log("Phase: api");
    try {
      await captureApiSet({ base: args.base, outDir, endpoints: API_ENDPOINTS, force: args.force, telemetry });
    } catch (error) {
      telemetry.failures.push({ phase: "api", error: error instanceof Error ? error.message : String(error) });
      console.error(`  api phase failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  const needsBrowser = args.only.has("routes") || args.only.has("lighthouse");
  if (needsBrowser) {
    const port = args.only.has("lighthouse") ? await freePort() : null;
    const browser = await launchBrowser("production-baseline-capture", { remoteDebuggingPort: port });
    invocation.tools.chromiumVersion = browser.version();
    try {
      if (args.only.has("routes")) {
        console.log("Phase: routes");
        for (const route of routes) {
          if (budget.remaining <= 0) {
            stoppedByBudget = true;
            break;
          }
          try {
            const result = await captureRoute({
              browser,
              base: args.base,
              route,
              outDir,
              force: args.force,
              telemetry,
              budget,
            });
            routeResults.push({ route: route.path, navigations: result.navigations, complete: result.complete });
            if (!result.complete) {
              stoppedByBudget = true;
              break;
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            telemetry.failures.push({ phase: "routes", route: route.path, error: message });
            routeResults.push({ route: route.path, navigations: 0, complete: false, error: message });
            console.error(`  route ${route.path} failed: ${message.split("\n")[0]}`);
          }
        }
      }
      if (args.only.has("lighthouse") && !stoppedByBudget) {
        console.log("Phase: lighthouse");
        try {
          const result = await captureLighthouseSet({
            base: args.base,
            outDir,
            browser,
            port,
            routes: LIGHTHOUSE_ROUTES,
            force: args.force,
            telemetry,
            budget,
          });
          if (!result.complete) stoppedByBudget = true;
        } catch (error) {
          telemetry.failures.push({ phase: "lighthouse", error: error instanceof Error ? error.message : String(error) });
          console.error(`  lighthouse phase failed: ${error instanceof Error ? error.message : error}`);
        }
      }
    } finally {
      const guard = readOnlyGuardOf(browser);
      invocation.browserGuard = {
        continued: guard.continued,
        blocked: guard.blocked.length,
        sample: guard.blocked.slice(0, 25),
      };
      if (guard.blocked.length) console.warn(`  browser guard refused ${guard.blocked.length} non-safe request(s) across all targets`);
      await browser.close();
    }
  }

  invocation.finishedAt = new Date().toISOString();
  invocation.durationSeconds = Math.round((Date.parse(invocation.finishedAt) - Date.parse(invocation.startedAt)) / 1000);
  const navigations = budget.used;
  invocation.navigations = navigations;
  invocation.stoppedByBudget = stoppedByBudget;
  invocation.routes = routeResults;
  invocation.throttled = telemetry.throttled;
  invocation.failures = telemetry.failures;
  const manifestPath = path.join(outDir, "manifest.json");
  const manifest = readJson(manifestPath) ?? { base: args.base, createdAt: telemetry.startedAt, invocations: [] };
  manifest.invocations.push(invocation);
  writeJson(manifestPath, manifest);

  const completeness = summarizeCompleteness(outDir, routes);
  console.log(`Done in ${invocation.durationSeconds}s · ${navigations} navigations · ${telemetry.throttled.length} throttle retries · ${telemetry.failures.length} failures`);
  console.log(`  routes complete ${completeness.routesComplete}/${completeness.routesTotal} · api ${completeness.apiComplete}/${API_ENDPOINTS.length} · lighthouse ${completeness.lighthouseComplete}/${LIGHTHOUSE_ROUTES.length}`);
  // Failures outrank a budget stop: exit 2 promises "just re-run to finish",
  // which is not true while a route or phase is erroring.
  if (stoppedByBudget) console.log("  stopped by --max-navigations; re-run the same command to resume");
  if (telemetry.failures.length) return 1;
  if (stoppedByBudget) return 2;
  return 0;
}

function summarizeCompleteness(outDir, routes) {
  const inv = readJson(path.join(outDir, "inventory.json"));
  const viewports = inv?.viewports ?? VIEWPORTS;
  const axeWidths = inv?.axeWidths ?? AXE_WIDTHS;
  const routesComplete = routes.filter((route) => routeIsComplete({ outDir, route, viewports, axeWidths })).length;
  const shapes = readJson(path.join(outDir, "api/shapes.json"));
  const apiDir = path.join(outDir, "api");
  const apiComplete = Object.values(shapes?.endpoints ?? {}).filter((entry) => entry?.bodyFile && fs.existsSync(path.join(apiDir, entry.bodyFile))).length;
  const scores = readJson(path.join(outDir, "lighthouse/scores.json"));
  const lhDir = path.join(outDir, "lighthouse");
  const lighthouseComplete = Object.values(scores?.routes ?? {}).filter((entry) => entry?.reportFile && fs.existsSync(path.join(lhDir, entry.reportFile))).length;
  return { routesTotal: routes.length, routesComplete, apiComplete, lighthouseComplete };
}

main().then(
  (code) => process.exit(code),
  (error) => {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    process.exit(1);
  },
);

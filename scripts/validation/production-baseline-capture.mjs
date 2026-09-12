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
// Resumable by design: anything already on disk is skipped, so a run that was
// interrupted (shell budget, edge throttling) just continues on the next
// invocation. `--max-navigations N` stops after N page loads for callers that
// must stay under a short shell timeout; otherwise run it in the background.
//
//   npm run baseline:capture                       # everything, today's dir
//   npm run baseline:capture -- --max-navigations 8
//   npm run baseline:capture -- --only api,lighthouse
//   npm run baseline:capture -- --routes /,/about --force
//   npm run baseline:capture -- --base http://127.0.0.1:5000 --out /tmp/x
//
// Exit codes: 0 complete · 2 stopped by --max-navigations (re-run to resume)
//             1 at least one route/endpoint failed (details in manifest.json).
import fs from "node:fs";
import path from "node:path";
import {
  API_ENDPOINTS,
  BASELINE_ROOT,
  DEFAULT_BASE,
  LIGHTHOUSE_ROUTES,
  VISITOR_ROUTES,
  captureApiSet,
  captureLighthouseSet,
  captureRoute,
  createTelemetry,
  freePort,
  gitCommit,
  inventory,
  launchBrowser,
  readJson,
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
  if (!/^https?:\/\//.test(args.base)) throw new Error(`--base must be an absolute http(s) origin (got ${args.base})`);
  args.base = args.base.replace(/\/+$/, "");
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
  if (args.force || !fs.existsSync(inventoryPath)) writeJson(inventoryPath, inventory({ base: args.base }));

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

  let navigations = 0;
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
          if (navigations >= args.maxNavigations) {
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
              navigationBudget: args.maxNavigations - navigations,
            });
            navigations += result.navigations;
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
          await captureLighthouseSet({ base: args.base, outDir, port, routes: LIGHTHOUSE_ROUTES, force: args.force, telemetry });
        } catch (error) {
          telemetry.failures.push({ phase: "lighthouse", error: error instanceof Error ? error.message : String(error) });
          console.error(`  lighthouse phase failed: ${error instanceof Error ? error.message : error}`);
        }
      }
    } finally {
      await browser.close();
    }
  }

  invocation.finishedAt = new Date().toISOString();
  invocation.durationSeconds = Math.round((Date.parse(invocation.finishedAt) - Date.parse(invocation.startedAt)) / 1000);
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
  if (stoppedByBudget) {
    console.log("  stopped by --max-navigations; re-run the same command to resume");
    return 2;
  }
  if (telemetry.failures.length) return 1;
  return 0;
}

function summarizeCompleteness(outDir, routes) {
  const inv = readJson(path.join(outDir, "inventory.json"));
  const viewports = inv?.viewports ?? [];
  const axeWidths = inv?.axeWidths ?? [];
  let routesComplete = 0;
  for (const route of routes) {
    const dir = path.join(outDir, "routes", inv?.routes.find((entry) => entry.path === route.path)?.slug ?? "");
    const dom = readJson(path.join(dir, "dom.json"));
    const status = readJson(path.join(dir, "status.json"));
    if (!dom || !status) continue;
    if (route.kind === "document") {
      routesComplete += 1;
      continue;
    }
    const axe = readJson(path.join(dir, "axe.json"));
    const allViewports = viewports.every((viewport) => dom.byViewport?.[viewport.width] && fs.existsSync(path.join(dir, `${dom.slug}@${viewport.width}.png`)));
    const allAxe = axeWidths.every((width) => axe?.byViewport?.[width]);
    if (allViewports && allAxe) routesComplete += 1;
  }
  const shapes = readJson(path.join(outDir, "api/shapes.json"));
  const scores = readJson(path.join(outDir, "lighthouse/scores.json"));
  return {
    routesTotal: routes.length,
    routesComplete,
    apiComplete: Object.keys(shapes?.endpoints ?? {}).length,
    lighthouseComplete: Object.keys(scores?.routes ?? {}).length,
  };
}

main().then(
  (code) => process.exit(code),
  (error) => {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    process.exit(1);
  },
);

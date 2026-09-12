#!/usr/bin/env node
// Production regression baseline — compare.
//
// Re-captures a candidate origin with exactly the code that produced a stored
// baseline (production-baseline-lib.mjs) and reports what moved:
//
//   per route     status + redirect chain, final URL, visible data-testid
//                 add/remove (per viewport), title / h1 change, axe
//                 serious+critical rule set AND node count at 375 and 1440;
//                 canonical / robots / JSON-LD / nav changes land in notes
//   per document  (sitemap.xml, robots.txt) status, counts, and the body
//                 itself once each side's own origin is normalised away
//   per endpoint  status, key-path add/remove, item / total count deltas
//   strips        <out>/strips/<slug>@<w>.png = baseline | candidate side by
//                 side on a union canvas — VISUAL ONLY, never a pixel gate
//
// URLs and document bodies match when they are byte-identical OR equal once
// each side's OWN origin is replaced by "{origin}": a local candidate is not
// penalised for not being awesome.video, an unchanged response is never a
// delta, and a redirect or canonical that newly points at a foreign host is.
//
//   npm run baseline:compare -- --baseline tests/parity/production-baseline/2026-09-12 \
//       --against http://127.0.0.1:5000 [--routes /,/about] [--out /tmp/dir]
//   npm run baseline:compare -- --baseline <dir> --candidate <already-captured-dir>
//
// Writes <out>/compare-report.md + compare-report.json. Exit 0 = no tracked
// delta, 1 = deltas found (like diff), 3 = capture or tooling failure.
// Lighthouse is capture-only and is not compared here (its scores vary run to
// run by design; read lighthouse/scores.json directly).
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import {
  API_ENDPOINTS,
  AXE_WIDTHS,
  VIEWPORTS,
  VISITOR_ROUTES,
  captureApiSet,
  captureRoute,
  createTelemetry,
  gitCommit,
  launchBrowser,
  parseOriginUrl,
  readJson,
  routeDir,
  toolVersions,
  writeJson,
} from "./production-baseline-lib.mjs";

function parseArgs(argv) {
  const args = { baseline: null, against: null, candidate: null, routes: null, out: null, strips: true };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => {
      const value = argv[++i];
      if (value === undefined) throw new Error(`${arg} needs a value`);
      return value;
    };
    switch (arg) {
      case "--baseline": args.baseline = next(); break;
      case "--against": args.against = parseOriginUrl(next(), "--against"); break;
      case "--candidate": args.candidate = next(); break;
      case "--routes": args.routes = next().split(",").map((route) => route.trim()).filter(Boolean); break;
      case "--out": args.out = next(); break;
      case "--no-strips": args.strips = false; break;
      case "--help": case "-h":
        console.log(fs.readFileSync(new URL(import.meta.url), "utf8").split("\n").filter((line) => line.startsWith("//")).map((line) => line.slice(3)).join("\n"));
        process.exit(0);
        break;
      default:
        throw new Error(`Unknown argument ${arg}`);
    }
  }
  if (!args.baseline) throw new Error("--baseline <dir> is required");
  if (!args.against && !args.candidate) throw new Error("--against <url> (or --candidate <dir>) is required");
  return args;
}

const setDiff = (before = [], after = []) => {
  const a = new Set(before);
  const b = new Set(after);
  return { added: [...b].filter((x) => !a.has(x)).sort(), removed: [...a].filter((x) => !b.has(x)).sort() };
};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
// Own-origin URLs collapse to "{origin}/path?query#hash"; anything else keeps
// its host, so a hop to another site can never read as "same". URL.origin
// drops userinfo, so credentials are re-attached (user visible, password
// redacted — the report must not echo a secret): a URL that carries
// credentials never normalises to one that does not.
const normalizeUrl = (url, ownOrigin) => {
  if (!url) return null;
  try {
    const parsed = new URL(url, ownOrigin);
    const prefix = parsed.origin === new URL(ownOrigin).origin ? "{origin}" : parsed.origin;
    const userinfo = parsed.username || parsed.password ? `${parsed.username}${parsed.password ? ":<password>" : ""}@` : "";
    return `${userinfo}${prefix}${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return url;
  }
};
const normalizeBody = (body, ownOrigin) => body.split(ownOrigin.replace(/\/$/, "")).join("{origin}");
// Identical wins outright; otherwise the origin-normalised forms must agree.
const equivalent = (rawB, rawC, normB, normC) => same(rawB, rawC) || same(normB, normC);
const S_C = new Set(["serious", "critical"]);
const seriousCritical = (axeViewport) => {
  if (!axeViewport) return { rules: null, nodes: null, ruleIds: [] };
  const violations = (axeViewport.violations ?? []).filter((v) => S_C.has(v.impact));
  return {
    rules: violations.length,
    nodes: violations.reduce((sum, v) => sum + (v.nodes ?? 0), 0),
    ruleIds: violations.map((v) => `${v.id}×${v.nodes ?? 0}`).sort(),
  };
};
const fmtAxe = (before, after) => {
  if (!before || before.rules === null) return "–";
  const b = `${before.rules}/${before.nodes}`;
  const a = after && after.rules !== null ? `${after.rules}/${after.nodes}` : "–";
  return b === a ? b : `${b} → ${a}`;
};
const fmtDelta = (before, after) => {
  if (before === after) return `${before ?? "–"}`;
  if (before === null || before === undefined || after === null || after === undefined) return `${before ?? "–"} → ${after ?? "–"}`;
  const diff = after - before;
  return `${before} → ${after} (${diff > 0 ? "+" : ""}${diff})`;
};
const cell = (value) => String(value ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");

function compareRoute(route, baselineDir, candidateDir, viewports, axeWidths, origins) {
  const slug = route.slug;
  const bUrl = (url) => normalizeUrl(url, origins.baseline);
  const cUrl = (url) => normalizeUrl(url, origins.candidate);
  const b = {
    status: readJson(path.join(routeDir(baselineDir, slug), "status.json")),
    dom: readJson(path.join(routeDir(baselineDir, slug), "dom.json")),
    axe: readJson(path.join(routeDir(baselineDir, slug), "axe.json")),
  };
  const c = {
    status: readJson(path.join(routeDir(candidateDir, slug), "status.json")),
    dom: readJson(path.join(routeDir(candidateDir, slug), "dom.json")),
    axe: readJson(path.join(routeDir(candidateDir, slug), "axe.json")),
  };
  const result = { route: route.path, slug, kind: route.kind, deltas: [], notes: [], missing: [] };
  if (!b.status || !b.dom) result.missing.push("baseline");
  if (!c.status || !c.dom) result.missing.push("candidate");
  if (result.missing.length) return result;

  result.status = { baseline: b.status.status, candidate: c.status.status, match: b.status.status === c.status.status };
  if (!result.status.match) result.deltas.push("status");
  const chain = (status, norm = (location) => location) => (status.redirectChain ?? []).map((hop) => `${hop.status}→${norm(hop.location)}`);
  result.redirects = { baseline: chain(b.status, bUrl), candidate: chain(c.status, cUrl) };
  result.redirects.match = equivalent(chain(b.status), chain(c.status), result.redirects.baseline, result.redirects.candidate);
  if (!result.redirects.match) result.deltas.push("redirects");
  if ((b.status.xRobotsTag ?? null) !== (c.status.xRobotsTag ?? null)) result.notes.push(`x-robots-tag ${b.status.xRobotsTag ?? "–"} → ${c.status.xRobotsTag ?? "–"}`);

  if (route.kind === "document") {
    result.document = { sha256Match: b.dom.sha256 === c.dom.sha256, counts: {} };
    for (const field of ["urlCount", "lineCount", "bytes"]) {
      if (b.dom[field] !== undefined || c.dom[field] !== undefined) result.document.counts[field] = { baseline: b.dom[field] ?? null, candidate: c.dom[field] ?? null };
    }
    if (b.dom.urlCount !== undefined && b.dom.urlCount !== c.dom.urlCount) result.deltas.push("counts");
    if (b.dom.lineCount !== c.dom.lineCount && b.dom.urlCount === undefined) result.deltas.push("counts");
    // The body is the contract: equal counts with different URLs or
    // directives is still a change. Compare with own origins normalised so the
    // only thing that can differ is content.
    const bodyOf = (dom, dir) => {
      if (!dom.bodyFile) return null;
      try {
        return fs.readFileSync(path.join(routeDir(dir, slug), dom.bodyFile), "utf8");
      } catch {
        return null;
      }
    };
    const bBody = bodyOf(b.dom, baselineDir);
    const cBody = bodyOf(c.dom, candidateDir);
    // The verdict is about the stored bodies a reviewer can open and diff, so
    // a side without its body file is a missing capture (exit 3), never a
    // sha-only comparison that looks like a result.
    if (bBody === null) result.missing.push("baseline body");
    if (cBody === null) result.missing.push("candidate body");
    if (result.missing.length) return result;
    result.document.bodyMatch = equivalent(bBody, cBody, normalizeBody(bBody, origins.baseline), normalizeBody(cBody, origins.candidate));
    if (!result.document.bodyMatch) {
      result.deltas.push("body");
      result.notes.push("body differs beyond its own origin");
    }
    return result;
  }

  result.title = { baseline: b.dom.title, candidate: c.dom.title, match: b.dom.title === c.dom.title };
  if (!result.title.match) result.deltas.push("title");
  result.h1 = { baseline: b.dom.h1, candidate: c.dom.h1, match: same(b.dom.h1, c.dom.h1) };
  if (!result.h1.match) result.deltas.push("h1");
  result.finalPath = { baseline: bUrl(b.dom.finalUrl), candidate: cUrl(c.dom.finalUrl) };
  result.finalPath.match = equivalent(b.dom.finalUrl ?? null, c.dom.finalUrl ?? null, result.finalPath.baseline, result.finalPath.candidate);
  if (!result.finalPath.match) result.deltas.push("final-url");
  const bChain = (b.dom.clientNavigations ?? []).map(bUrl);
  const cChain = (c.dom.clientNavigations ?? []).map(cUrl);
  if (!equivalent(b.dom.clientNavigations ?? [], c.dom.clientNavigations ?? [], bChain, cChain)) result.notes.push(`client navigations ${bChain.join(" → ")} ⇒ ${cChain.join(" → ")}`);

  if (!equivalent(b.dom.canonical ?? null, c.dom.canonical ?? null, bUrl(b.dom.canonical), cUrl(c.dom.canonical))) result.notes.push(`canonical ${bUrl(b.dom.canonical) ?? "–"} → ${cUrl(c.dom.canonical) ?? "–"}`);
  if ((b.dom.robotsMeta ?? null) !== (c.dom.robotsMeta ?? null)) result.notes.push(`robots meta "${b.dom.robotsMeta ?? "–"}" → "${c.dom.robotsMeta ?? "–"}"`);
  const jsonLd = setDiff(b.dom.jsonLdTypes, c.dom.jsonLdTypes);
  if (jsonLd.added.length || jsonLd.removed.length) result.notes.push(`JSON-LD types +${jsonLd.added.join(",") || "∅"} −${jsonLd.removed.join(",") || "∅"}`);
  const nav = setDiff(b.dom.navLabels, c.dom.navLabels);
  if (nav.added.length || nav.removed.length) result.notes.push(`nav labels +${nav.added.length} −${nav.removed.length}`);
  result.linkCount = { baseline: b.dom.linkCount, candidate: c.dom.linkCount };

  result.testIds = {};
  let added = new Set();
  let removed = new Set();
  for (const viewport of viewports) {
    const key = String(viewport.width);
    const diff = setDiff(b.dom.byViewport?.[key]?.visibleTestIds, c.dom.byViewport?.[key]?.visibleTestIds);
    result.testIds[key] = diff;
    diff.added.forEach((id) => added.add(id));
    diff.removed.forEach((id) => removed.add(id));
  }
  result.testIdSummary = { added: [...added].sort(), removed: [...removed].sort() };
  if (added.size || removed.size) result.deltas.push("testids");

  const consent = (dom) => Object.values(dom.byViewport ?? {}).some((entry) => entry.consentBanner?.present);
  if (consent(b.dom) !== consent(c.dom)) result.notes.push(`consent banner ${consent(b.dom) ? "present" : "absent"} → ${consent(c.dom) ? "present" : "absent"}`);

  result.axe = {};
  for (const width of axeWidths) {
    const key = String(width);
    const before = seriousCritical(b.axe?.byViewport?.[key]);
    const after = seriousCritical(c.axe?.byViewport?.[key]);
    // Rule ids carry their node count, so an existing violation spreading to
    // more elements is a delta even when the rule set is unchanged.
    const rules = setDiff(before.ruleIds, after.ruleIds);
    result.axe[key] = { baseline: before, candidate: after, rules };
    if (before.rules !== after.rules || before.nodes !== after.nodes || rules.added.length || rules.removed.length) result.deltas.push(`axe@${key}`);
  }
  return result;
}

function compareApi(endpoint, baselineShapes, candidateShapes) {
  const b = baselineShapes?.endpoints?.[endpoint.path];
  const c = candidateShapes?.endpoints?.[endpoint.path];
  const result = { endpoint: endpoint.path, slug: endpoint.slug, deltas: [], notes: [], missing: [] };
  if (!b) result.missing.push("baseline");
  if (!c) result.missing.push("candidate");
  if (result.missing.length) return result;
  result.status = { baseline: b.status, candidate: c.status, match: b.status === c.status };
  if (!result.status.match) result.deltas.push("status");
  result.keyPaths = setDiff(b.keyPaths, c.keyPaths);
  if (result.keyPaths.added.length || result.keyPaths.removed.length) result.deltas.push("key-paths");
  result.itemCount = { baseline: b.itemCount ?? null, candidate: c.itemCount ?? null };
  if (result.itemCount.baseline !== result.itemCount.candidate) result.deltas.push("item-count");
  result.arrayCounts = {};
  if (b.arrayCounts && c.arrayCounts) {
    for (const key of new Set([...Object.keys(b.arrayCounts), ...Object.keys(c.arrayCounts)])) {
      result.arrayCounts[key] = { baseline: b.arrayCounts[key] ?? null, candidate: c.arrayCounts[key] ?? null };
      if (key !== b.collectionKey && result.arrayCounts[key].baseline !== result.arrayCounts[key].candidate && !result.deltas.includes("counts")) result.deltas.push("counts");
    }
  } else {
    result.notes.push("array counts not recorded on one side (older capture)");
  }
  result.totals = {};
  for (const key of new Set([...Object.keys(b.totals ?? {}), ...Object.keys(c.totals ?? {})])) {
    result.totals[key] = { baseline: b.totals?.[key] ?? null, candidate: c.totals?.[key] ?? null };
    if (result.totals[key].baseline !== result.totals[key].candidate && !result.deltas.includes("counts")) result.deltas.push("counts");
  }
  result.ids = { baseline: [b.firstId, b.lastId], candidate: [c.firstId, c.lastId] };
  if (!same(result.ids.baseline, result.ids.candidate)) result.notes.push(`first/last id ${result.ids.baseline.join("…")} → ${result.ids.candidate.join("…")}`);
  for (const header of ["content-type", "cache-control"]) {
    if ((b.headers?.[header] ?? null) !== (c.headers?.[header] ?? null)) result.notes.push(`${header} "${b.headers?.[header] ?? "–"}" → "${c.headers?.[header] ?? "–"}"`);
  }
  if (b.sha256 === c.sha256) result.notes.push("byte-identical body");
  return result;
}

async function writeStrip(baselinePng, candidatePng, outFile, label) {
  const [b, c] = await Promise.all([sharp(baselinePng).metadata(), sharp(candidatePng).metadata()]);
  const gutter = 24;
  const header = 36;
  const width = b.width + gutter + c.width;
  const height = header + Math.max(b.height, c.height);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${header}">
    <rect width="${width}" height="${header}" fill="#1a1a1a"/>
    <text x="8" y="24" font-family="monospace" font-size="16" fill="#e6e6e6">baseline ${b.width}×${b.height}</text>
    <text x="${b.width + gutter + 8}" y="24" font-family="monospace" font-size="16" fill="#e6e6e6">candidate ${c.width}×${c.height}</text>
    <text x="${width - 8}" y="24" text-anchor="end" font-family="monospace" font-size="14" fill="#9a9a9a">${label.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</text>
  </svg>`;
  await sharp({ create: { width, height, channels: 4, background: { r: 60, g: 20, b: 60, alpha: 1 } } })
    .composite([
      { input: baselinePng, top: header, left: 0 },
      { input: candidatePng, top: header, left: b.width + gutter },
      { input: Buffer.from(svg), top: 0, left: 0 },
    ])
    .png({ compressionLevel: 6 })
    .toFile(outFile);
  return { width, height, sizeMatch: b.width === c.width && b.height === c.height };
}

function renderMarkdown({ meta, routes, api, strips }) {
  const lines = [];
  lines.push(`# Production baseline compare — ${meta.baselineDate}`);
  lines.push("");
  lines.push(`- baseline: \`${meta.baseline}\` (captured from ${meta.baselineBase})`);
  lines.push(`- candidate: \`${meta.candidateBase}\`${meta.candidatePrecaptured ? " (pre-captured)" : ""} → \`${meta.candidate}\``);
  lines.push(`- compared at ${meta.comparedAt} · tool commit ${meta.toolCommit ?? "unknown"} · chromium ${meta.tools.chromium} · axe-core ${meta.tools.axeCore}`);
  lines.push(`- routes: ${meta.routeCount} · endpoints: ${meta.apiCount} · strips: ${strips.length} (visual only, never a pixel gate)`);
  lines.push(`- tracked deltas: **${meta.deltaCount}** (${meta.routesWithDeltas} routes, ${meta.apiWithDeltas} endpoints)${meta.missing ? ` · ${meta.missing} entries missing on one side` : ""}`);
  lines.push("");
  lines.push("Tracked delta columns: status, redirect chain, final URL, visible data-testids (any viewport), title, h1, axe serious+critical rules/nodes (375/1440), document counts + body (own origin normalised), API status, key paths, item/total counts. Everything else lands in *notes*.");
  lines.push("");
  lines.push("## Routes");
  lines.push("");
  lines.push("| route | status | redirects | testids (+/−) | title | h1 | axe S+C rules/nodes 375 | axe S+C rules/nodes 1440 | deltas | notes |");
  lines.push("|---|---|---|---|---|---|---|---|---|---|");
  for (const r of routes) {
    if (r.missing.length) {
      lines.push(`| \`${cell(r.route)}\` | missing: ${r.missing.join(", ")} | | | | | | | missing | |`);
      continue;
    }
    if (r.kind === "document") {
      const counts = Object.entries(r.document.counts)
        .filter(([, v]) => v.baseline !== v.candidate)
        .map(([k, v]) => `${k} ${fmtDelta(v.baseline, v.candidate)}`)
        .join("; ");
      lines.push(`| \`${cell(r.route)}\` | ${fmtDelta(r.status.baseline, r.status.candidate)} | ${r.redirects.match ? "same" : cell(`${r.redirects.baseline.join(",") || "∅"} → ${r.redirects.candidate.join(",") || "∅"}`)} | n/a | n/a | n/a | n/a | n/a | ${r.deltas.join(", ") || "—"} | ${cell([counts, ...r.notes].filter(Boolean).join("; "))} |`);
      continue;
    }
    const testIds = `+${r.testIdSummary.added.length} / −${r.testIdSummary.removed.length}`;
    lines.push(
      `| \`${cell(r.route)}\` | ${fmtDelta(r.status.baseline, r.status.candidate)} | ${r.redirects.match ? "same" : cell(`${r.redirects.baseline.join(",") || "∅"} → ${r.redirects.candidate.join(",") || "∅"}`)} | ${testIds} | ${r.title.match ? "same" : "changed"} | ${r.h1.match ? "same" : "changed"} | ${fmtAxe(r.axe["375"]?.baseline, r.axe["375"]?.candidate)} | ${fmtAxe(r.axe["1440"]?.baseline, r.axe["1440"]?.candidate)} | ${r.deltas.join(", ") || "—"} | ${cell(r.notes.join("; "))} |`,
    );
  }
  lines.push("");
  const detailed = routes.filter((r) => !r.missing.length && r.kind !== "document" && r.deltas.length);
  if (detailed.length) {
    lines.push("### Route details");
    lines.push("");
    for (const r of detailed) {
      lines.push(`#### \`${r.route}\``);
      lines.push("");
      if (!r.title.match) lines.push(`- title: \`${cell(r.title.baseline)}\` → \`${cell(r.title.candidate)}\``);
      if (!r.h1.match) lines.push(`- h1: \`${cell(JSON.stringify(r.h1.baseline))}\` → \`${cell(JSON.stringify(r.h1.candidate))}\``);
      if (!r.finalPath.match) lines.push(`- final URL: \`${r.finalPath.baseline}\` → \`${r.finalPath.candidate}\``);
      for (const [width, diff] of Object.entries(r.testIds)) {
        if (diff.added.length || diff.removed.length) {
          lines.push(`- testids @${width}: +[${diff.added.slice(0, 25).join(", ")}${diff.added.length > 25 ? ", …" : ""}] −[${diff.removed.slice(0, 25).join(", ")}${diff.removed.length > 25 ? ", …" : ""}]`);
        }
      }
      for (const [width, axe] of Object.entries(r.axe)) {
        if (axe.rules.added.length || axe.rules.removed.length) lines.push(`- axe @${width}: +[${axe.rules.added.join(", ")}] −[${axe.rules.removed.join(", ")}]`);
      }
      lines.push("");
    }
  }
  lines.push("## API");
  lines.push("");
  lines.push("| endpoint | status | key paths (+/−) | items | counts | deltas | notes |");
  lines.push("|---|---|---|---|---|---|---|");
  for (const a of api) {
    if (a.missing.length) {
      lines.push(`| \`${cell(a.endpoint)}\` | missing: ${a.missing.join(", ")} | | | | missing | |`);
      continue;
    }
    const counts = [
      ...Object.entries(a.arrayCounts).filter(([, v]) => v.baseline !== v.candidate).map(([k, v]) => `${k}[] ${fmtDelta(v.baseline, v.candidate)}`),
      ...Object.entries(a.totals).filter(([, v]) => v.baseline !== v.candidate).map(([k, v]) => `${k} ${fmtDelta(v.baseline, v.candidate)}`),
    ];
    lines.push(`| \`${cell(a.endpoint)}\` | ${fmtDelta(a.status.baseline, a.status.candidate)} | +${a.keyPaths.added.length} / −${a.keyPaths.removed.length} | ${fmtDelta(a.itemCount.baseline, a.itemCount.candidate)} | ${cell(counts.join("; ") || "same")} | ${a.deltas.join(", ") || "—"} | ${cell(a.notes.join("; "))} |`);
  }
  const apiDetailed = api.filter((a) => !a.missing.length && (a.keyPaths.added.length || a.keyPaths.removed.length));
  if (apiDetailed.length) {
    lines.push("");
    lines.push("### Key-path details");
    lines.push("");
    for (const a of apiDetailed) {
      lines.push(`- \`${a.endpoint}\`: +[${a.keyPaths.added.join(", ")}] −[${a.keyPaths.removed.join(", ")}]`);
    }
  }
  lines.push("");
  lines.push("## Strips");
  lines.push("");
  if (!strips.length) lines.push("No strips written (no route had a PNG on both sides, or --no-strips).");
  for (const strip of strips) lines.push(`- \`${strip.file}\` ${strip.sizeMatch ? "" : "(dimensions differ)"}`);
  lines.push("");
  return `${lines.join("\n")}\n`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const baselineDir = path.resolve(args.baseline);
  const inventory = readJson(path.join(baselineDir, "inventory.json"));
  if (!inventory) throw new Error(`${baselineDir} has no inventory.json — is it a production-baseline directory?`);
  const manifest = readJson(path.join(baselineDir, "manifest.json"));
  const viewports = inventory.viewports ?? VIEWPORTS;
  const axeWidths = inventory.axeWidths ?? AXE_WIDTHS;
  const allRoutes = inventory.routes ?? VISITOR_ROUTES;
  const routes = args.routes ? args.routes.map((routePath) => {
    const route = allRoutes.find((entry) => entry.path === routePath);
    if (!route) throw new Error(`Route ${routePath} is not in the baseline inventory`);
    return route;
  }) : allRoutes;
  const endpoints = inventory.api ?? API_ENDPOINTS.map((endpoint) => ({ path: endpoint, slug: endpoint }));

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = path.resolve(args.out ?? path.join("/tmp/validation/production-baseline-compare", stamp));
  fs.mkdirSync(outDir, { recursive: true });
  const candidateDir = args.candidate ? path.resolve(args.candidate) : path.join(outDir, "candidate");
  const telemetry = createTelemetry();

  if (!args.candidate) {
    console.log(`Capturing candidate ${args.against} → ${candidateDir}`);
    fs.mkdirSync(candidateDir, { recursive: true });
    writeJson(path.join(candidateDir, "inventory.json"), { ...inventory, base: args.against, capturedForCompare: true });
    await captureApiSet({ base: args.against, outDir: candidateDir, endpoints: endpoints.map((endpoint) => endpoint.path), force: true, telemetry });
    const browser = await launchBrowser("production-baseline-compare");
    try {
      for (const route of routes) {
        try {
          await captureRoute({ browser, base: args.against, route, outDir: candidateDir, viewports, axeWidths, force: true, telemetry });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          telemetry.failures.push({ route: route.path, error: message });
          console.error(`  candidate capture failed for ${route.path}: ${message.split("\n")[0]}`);
        }
      }
    } finally {
      await browser.close();
    }
  }

  const baselineShapes = readJson(path.join(baselineDir, "api/shapes.json"));
  const candidateShapes = readJson(path.join(candidateDir, "api/shapes.json"));
  const candidateInventory = readJson(path.join(candidateDir, "inventory.json"));
  const origins = {
    baseline: inventory.base ?? manifest?.base,
    candidate: args.against ?? candidateInventory?.base ?? candidateShapes?.base,
  };
  for (const [side, origin] of Object.entries(origins)) {
    if (!origin) throw new Error(`Cannot determine the ${side} origin (no inventory.json base); URLs cannot be normalised`);
  }
  const routeResults = routes.map((route) => compareRoute(route, baselineDir, candidateDir, viewports, axeWidths, origins));
  const apiResults = endpoints.map((endpoint) => compareApi(endpoint, baselineShapes, candidateShapes));

  const strips = [];
  if (args.strips) {
    const stripDir = path.join(outDir, "strips");
    fs.mkdirSync(stripDir, { recursive: true });
    for (const route of routes) {
      if (route.kind === "document") continue;
      for (const viewport of viewports) {
        const name = `${route.slug}@${viewport.width}.png`;
        const baselinePng = path.join(routeDir(baselineDir, route.slug), name);
        const candidatePng = path.join(routeDir(candidateDir, route.slug), name);
        if (!fs.existsSync(baselinePng) || !fs.existsSync(candidatePng)) continue;
        const file = path.join(stripDir, name);
        const info = await writeStrip(baselinePng, candidatePng, file, `${route.path} @${viewport.width}`);
        strips.push({ file: path.relative(outDir, file), ...info });
      }
    }
  }

  const deltaCount = routeResults.reduce((sum, r) => sum + r.deltas.length, 0) + apiResults.reduce((sum, a) => sum + a.deltas.length, 0);
  const missing = routeResults.filter((r) => r.missing.length).length + apiResults.filter((a) => a.missing.length).length;
  const meta = {
    baseline: path.relative(process.cwd(), baselineDir),
    baselineDate: path.basename(baselineDir),
    baselineBase: origins.baseline,
    candidate: path.relative(process.cwd(), candidateDir),
    candidateBase: origins.candidate,
    candidatePrecaptured: Boolean(args.candidate),
    comparedAt: new Date().toISOString(),
    toolCommit: gitCommit(),
    tools: toolVersions(),
    routeCount: routes.length,
    apiCount: endpoints.length,
    deltaCount,
    routesWithDeltas: routeResults.filter((r) => r.deltas.length).length,
    apiWithDeltas: apiResults.filter((a) => a.deltas.length).length,
    missing,
    throttled: telemetry.throttled,
    captureFailures: telemetry.failures,
  };
  const markdown = renderMarkdown({ meta, routes: routeResults, api: apiResults, strips });
  fs.writeFileSync(path.join(outDir, "compare-report.md"), markdown);
  writeJson(path.join(outDir, "compare-report.json"), { meta, routes: routeResults, api: apiResults, strips });
  console.log(markdown.split("\n").slice(0, 8).join("\n"));
  console.log(`Report: ${path.join(outDir, "compare-report.md")}`);
  if (telemetry.failures.length || missing) return 3;
  return deltaCount ? 1 : 0;
}

main().then(
  (code) => process.exit(code),
  (error) => {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    process.exit(3);
  },
);

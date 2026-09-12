#!/usr/bin/env node
/**
 * Visual parity harness: app (and design-system artifact) vs the canonical
 * awesome-list-site-ds reference, pixel-for-pixel on a union canvas.
 *
 * Entry point for `npm run test:parity`. See cli.mjs for flags, inventory.mjs
 * for the row catalogue, readiness.mjs for the capture contract, actions.mjs
 * for per-row interactions, identity.mjs for the disposable admin,
 * reference-adapter.mjs for the data binding, and report.mjs for markdown.
 */
import fs from "node:fs";
import fsp from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";
import sharp from "sharp";
import pixelmatch from "pixelmatch";
import { acquireGateLease } from "../../scripts/validation/gate-lease.mjs";
import { parseCli, USAGE, CliError } from "./cli.mjs";
import { loadInventory, eligibilityClass, widthsFor, ELIGIBILITY } from "./inventory.mjs";
import {
  PARITY_FONT_FAMILIES,
  CAPTURE_NORMALISATIONS,
  collectFontFaces,
  compareFontFaces,
  renderFontGapMarkdown,
  settlePage,
  stableFullPageCapture,
  DocumentReloadedError,
  attachNetworkTracker,
} from "./readiness.mjs";
import { ActionUnavailableError, applyAction } from "./actions.mjs";
import {
  sha256,
  buildCatalogAdapter,
  resolveCatalogTokens,
  resolvePathTemplate,
  buildAdminAdapter,
  buildPlaceholderSubstitutions,
  adaptReferenceSnapshot,
  buildAdapterScript,
} from "./reference-adapter.mjs";
import { QA_PREFIX, identityAvailability, createDisposableAdmin, sweepDisposableAdmins } from "./identity.mjs";
import { renderReport, renderStatus } from "./report.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");
const referenceRoot = path.join(repoRoot, "awesome-list-site-ds");
const docsParityDir = path.join(repoRoot, "docs", "parity");
const harnessEvidenceDir = path.join(docsParityDir, "evidence", "harness");

const PIXELMATCH_THRESHOLD = 0.1;
const MAXIMUM_DIFF_PERCENT = 0.5;
const VIEWPORT_HEIGHTS = { 375: 812, 768: 1024, 1024: 768, 1440: 900 };
const ROW_TIMEOUT_MS = 150_000;
/** Raw stability frames: `<stem>.attempt-N.png` and `<stem>.repeat.png` (never compared, never committed). */
const STABILITY_FRAME_RE = /\.(attempt-\d+|repeat)\.png$/;
const CHROMIUM_EXECUTABLE = path.join(repoRoot, ".cache/ms-playwright/chromium-1223/chrome-linux64/chrome");
const CHROMIUM_VERSION = "148.0.7778.96";
/**
 * Full-page capture makes Chromium re-raster the page per frame; with partial
 * raster on, reused tile content flips single anti-aliased pixels on rounded
 * corners between consecutive frames (the design's About page never produced
 * two identical frames: A/B/A/B). Disabling it made 18/18 frames across three
 * fresh browsers byte-identical. Applied to both sides, recorded in results.
 */
/** How many times a side is reopened after its document reloaded mid-capture. */
const MAX_DOCUMENT_RELOADS = 2;
const CHROMIUM_ARGS = ["--disable-partial-raster"];

class PreconditionError extends Error {}

const log = (message) => process.stderr.write(`${message}\n`);
const rel = (from, to) => path.relative(from, to).split(path.sep).join("/");

// ---------------------------------------------------------------------------
// Modes that never need a browser
// ---------------------------------------------------------------------------
const printList = (inventory) => {
  const width = Math.max(...inventory.screens.map((screen) => screen.id.length));
  process.stdout.write(`${"id".padEnd(width)}  class            widths              note\n`);
  for (const screen of inventory.screens) {
    const klass = eligibilityClass(screen);
    const widths = screen.aliasOf ? `= ${screen.aliasOf}` : widthsFor(screen, inventory).join(",");
    const note = screen.aliasOf
      ? `alias of ${screen.aliasOf}`
      : klass.startsWith("blocked")
        ? ""
        : [screen.requires?.length ? `requires ${screen.requires.join("+")}` : "", screen.referenceAction ? `ref:${screen.referenceAction}` : ""].filter(Boolean).join(" ");
    process.stdout.write(`${screen.id.padEnd(width)}  ${klass.padEnd(16)} ${widths.padEnd(19)} ${note}\n`);
  }
  const counts = countEligibility(inventory);
  process.stdout.write(`\n${inventory.screens.length} screens: ${Object.entries(counts).map(([key, value]) => `${key} ${value}`).join(", ")}\n`);
};

const countEligibility = (inventory) => {
  const counts = Object.fromEntries(ELIGIBILITY.map((name) => [name, 0]));
  for (const screen of inventory.screens) counts[screen.eligibility] += 1;
  return counts;
};

/**
 * Every run writes its own REPORT.md next to results.json. Only a full-inventory
 * run replaces the shared docs/parity/REPORT.md and tests/parity/REPORT.md —
 * a `--only` diagnostic must never overwrite the whole-inventory report — and
 * only a full admin run rewrites docs/parity/STATUS.md.
 */
const writeReports = async (results, runDir) => {
  const determinismFile = path.join(harnessEvidenceDir, "determinism", "determinism.json");
  const render = (fromDir) => renderReport(results, {
    linkPrefix: `${rel(fromDir, runDir)}/`,
    stageRoot: runDir,
    determinismEvidence: { file: determinismFile, link: rel(fromDir, determinismFile) },
  });
  const runReport = path.join(runDir, "REPORT.md");
  // Published run directories are read-only (0444); `--report` re-renders in place.
  if (fs.existsSync(runReport)) await fsp.chmod(runReport, 0o644);
  await fsp.writeFile(runReport, render(runDir));
  if (!results.selection.full) return { shared: false };
  await fsp.writeFile(path.join(docsParityDir, "REPORT.md"), render(docsParityDir));
  await fsp.writeFile(path.join(here, "REPORT.md"), render(here));
  if (results.identity.mode === "admin") {
    await fsp.writeFile(path.join(docsParityDir, "STATUS.md"), renderStatus(results));
  }
  return { shared: true };
};

const regenerateReport = async (resultsPath) => {
  const absolute = path.resolve(resultsPath);
  const results = JSON.parse(await fsp.readFile(absolute, "utf8"));
  const { shared } = await writeReports(results, path.dirname(absolute));
  await fsp.chmod(path.join(path.dirname(absolute), "REPORT.md"), 0o444);
  log(`[parity] regenerated REPORT.md from ${rel(repoRoot, absolute)}${shared ? " (shared docs/parity and tests/parity reports too)" : " (selected run: run directory only)"}`);
};

// ---------------------------------------------------------------------------
// Row planning
// ---------------------------------------------------------------------------
const planRows = (inventory, cli) => {
  const byId = new Map(inventory.screens.map((screen) => [screen.id, screen]));
  if (cli.only) {
    const unknown = cli.only.filter((id) => !byId.has(id));
    if (unknown.length) throw new CliError(`Unknown inventory row(s): ${unknown.join(", ")} (see --list)`);
  }
  const selectedIds = new Set(cli.only || inventory.screens.map((screen) => screen.id));
  for (const id of [...selectedIds]) {
    const alias = byId.get(id)?.aliasOf;
    if (alias) selectedIds.add(alias);
  }
  const plan = [];
  for (const screen of inventory.screens) {
    if (!selectedIds.has(screen.id)) continue;
    const widths = (screen.aliasOf ? widthsFor(byId.get(screen.aliasOf), inventory) : widthsFor(screen, inventory))
      .filter((width) => !cli.widths || cli.widths.includes(width));
    for (const width of widths) plan.push({ screen, width });
  }
  if (!plan.length) throw new CliError("The selection matches no screen/width rows");
  return { plan, byId, full: !cli.only && !cli.widths };
};

// ---------------------------------------------------------------------------
// Comparison
// ---------------------------------------------------------------------------
/**
 * Union-canvas comparison. Both captures are placed top-left on a canvas of
 * max(width) × max(height); the overlap is compared with pixelmatch and every
 * pixel outside the overlap counts as differing (it exists on one side only).
 * Nothing is scaled, masked, or cropped.
 */
const compareCaptures = async (actualFile, expectedFile, diffFile) => {
  const [actualMeta, expectedMeta] = await Promise.all([sharp(actualFile).metadata(), sharp(expectedFile).metadata()]);
  const width = Math.max(actualMeta.width, expectedMeta.width);
  const height = Math.max(actualMeta.height, expectedMeta.height);
  const decode = (file, meta) => sharp(file).ensureAlpha().extend({
    top: 0,
    left: 0,
    right: width - meta.width,
    bottom: height - meta.height,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  }).raw().toBuffer();
  const [actual, expected] = await Promise.all([decode(actualFile, actualMeta), decode(expectedFile, expectedMeta)]);
  const output = Buffer.alloc(width * height * 4);
  pixelmatch(expected, actual, output, width, height, {
    threshold: PIXELMATCH_THRESHOLD,
    includeAA: false,
    alpha: 0.6,
    diffColor: [255, 0, 64],
    diffColorAlt: [0, 180, 255],
  });
  await sharp(output, { raw: { width, height, channels: 4 } }).png().toFile(diffFile);
  const overlapWidth = Math.min(actualMeta.width, expectedMeta.width);
  const overlapHeight = Math.min(actualMeta.height, expectedMeta.height);
  const [actualOverlap, expectedOverlap] = await Promise.all([
    sharp(actualFile).ensureAlpha().extract({ left: 0, top: 0, width: overlapWidth, height: overlapHeight }).raw().toBuffer(),
    sharp(expectedFile).ensureAlpha().extract({ left: 0, top: 0, width: overlapWidth, height: overlapHeight }).raw().toBuffer(),
  ]);
  const overlapDifferingPixels = pixelmatch(expectedOverlap, actualOverlap, null, overlapWidth, overlapHeight, {
    threshold: PIXELMATCH_THRESHOLD,
    includeAA: false,
  });
  const canvasPixels = width * height;
  const unmatchedDimensionPixels = canvasPixels - overlapWidth * overlapHeight;
  const differingPixels = overlapDifferingPixels + unmatchedDimensionPixels;
  const diffPercent = (differingPixels / canvasPixels) * 100;
  return {
    differingPixels,
    overlapDifferingPixels,
    unmatchedDimensionPixels,
    canvasPixels,
    diffPercent,
    actualDimensions: { width: actualMeta.width, height: actualMeta.height },
    expectedDimensions: { width: expectedMeta.width, height: expectedMeta.height },
    canvas: { width, height },
    dimensionsMatch: actualMeta.width === expectedMeta.width && actualMeta.height === expectedMeta.height,
    withinCeiling: diffPercent <= MAXIMUM_DIFF_PERCENT,
  };
};

// ---------------------------------------------------------------------------
// Identity checks (same entity on both sides)
// ---------------------------------------------------------------------------
const normaliseText = (value) => String(value || "").replace(/\s+/g, " ").trim().toLowerCase();

// Kinds whose page heading IS the entity on both sides (measured: app and reference `main h1` both equal
// the catalogue label for these). The leaf page keeps the parent subcategory as its reference heading and
// names the leaf in the breadcrumb, so it is checked against the main content instead.
const HEADING_IDENTITY_KINDS = new Set(["category", "subcategory", "resource"]);

const collectIdentity = async (page, kind, side, tokens, adapter) => {
  // The sidebar tree lists every taxonomy label on every page, so a body-wide search proves nothing;
  // scope the label search to the main content with navigation removed (breadcrumbs kept).
  const { mainText, bodyText } = await page.evaluate(() => {
    const main = document.querySelector("main");
    const scope = main ? main.cloneNode(true) : null;
    if (scope) scope.querySelectorAll("aside, [data-sidebar], nav:not([aria-label*='readcrumb' i])").forEach((node) => node.remove());
    return { mainText: scope ? scope.textContent : "", bodyText: document.body.innerText };
  });
  const activeTab = side === "actual"
    ? await page.locator('[role="tab"][data-state="active"]').first().getAttribute("data-testid").catch(() => null)
    : normaliseText(await page.locator("main .tabs .tab.active").first().textContent().catch(() => ""));
  const heading = normaliseText(await page.locator("main h1").first().textContent().catch(() => ""));
  const required = {
    home: adapter.AV_CATEGORIES.slice(0, 3).map((category) => ({ label: category.name })),
    category: [{ label: adapter.AV_CATEGORIES.find((category) => category.id === tokens.categorySlug)?.name }],
    subcategory: [{ label: Object.values(adapter.AV_SUBCATEGORIES).flat().find((sub) => sub.id === tokens.subcategorySlug)?.name }],
    subsubcategory: [{ label: Object.values(adapter.AV_SUBSUBCATEGORIES).flat().find((leaf) => leaf.id === tokens.subSubcategorySlug)?.name }],
    resource: [{ label: adapter.AV_RESOURCES.find((resource) => String(resource.id) === String(tokens.resourceId))?.title }],
    "admin-tab": [],
  }[kind] || [];
  const scopeText = normaliseText(kind === "home" ? bodyText : mainText);
  const missing = required.filter((item) => !item.label || !scopeText.includes(normaliseText(item.label))).map((item) => item.label || "(unresolved)");
  const entityLabel = required.length === 1 ? required[0].label : null;
  const headingMatches = entityLabel ? heading === normaliseText(entityLabel) : null;
  return { required: required.map((item) => item.label), missing, heading, headingMatches, activeTab, scope: kind === "home" ? "body" : "main" };
};

const tabKey = (value) => normaliseText(value).replace(/[\s-]+/g, "");

const assertAlignedIdentity = (kind, actual, expected, slug) => {
  if (!kind) return { checked: false };
  if (kind === "admin-tab") {
    // Both sides must have activated the REQUESTED tab, not merely some tab.
    const ok = actual.activeTab === `tab-${slug}` && Boolean(expected.activeTab) && tabKey(expected.activeTab) === tabKey(slug);
    return { checked: true, ok, actualTab: actual.activeTab, expectedTab: expected.activeTab, reason: ok ? undefined : `admin tab identity mismatch: wanted ${slug}, app active tab ${actual.activeTab || "none"}, reference ${expected.activeTab || "none"}` };
  }
  const problems = [];
  if (actual.missing.length) problems.push(`app main content lacks ${actual.missing.join(", ")}`);
  if (expected.missing.length) problems.push(`reference main content lacks ${expected.missing.join(", ")}`);
  if (HEADING_IDENTITY_KINDS.has(kind) || kind === "subsubcategory") {
    if (actual.headingMatches !== true) problems.push(`app heading is "${actual.heading || ""}", not the ${kind} label`);
  }
  if (HEADING_IDENTITY_KINDS.has(kind) && expected.headingMatches !== true) problems.push(`reference heading is "${expected.heading || ""}", not the ${kind} label`);
  return { checked: true, ok: problems.length === 0, required: actual.required, scope: actual.scope, actualHeading: actual.heading, expectedHeading: expected.heading, reason: problems.length ? `${kind} identity mismatch: ${problems.join("; ")}` : undefined };
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const main = async () => {
  const cli = parseCli(process.argv.slice(2));
  if (cli.help) {
    process.stdout.write(`${USAGE}\n`);
    return 0;
  }
  const inventory = await loadInventory({ verifyGenerated: true });
  if (cli.list) {
    printList(inventory);
    return 0;
  }
  if (cli.report) {
    await regenerateReport(cli.report);
    return 0;
  }

  const requireLoopback = (name) => {
    const raw = process.env[name];
    if (!raw) throw new PreconditionError(`${name} must be supplied (loopback origin, e.g. http://127.0.0.1:5000)`);
    const url = new URL(raw);
    if (!["127.0.0.1", "localhost", "::1"].includes(url.hostname) || url.protocol !== "http:") {
      throw new PreconditionError(`${name} must be a local loopback http origin; production is never a parity target`);
    }
    return url.origin;
  };
  const appBase = requireLoopback("BASE_URL");
  const availability = identityAvailability(process.env);

  if (cli.sweep) {
    if (!availability.ok) throw new PreconditionError(`--sweep needs ${availability.missing.join(" and ")}`);
    const swept = await sweepDisposableAdmins({ appBase, secretKey: process.env.CLERK_SECRET_KEY, auditKey: process.env.ADMIN_PASSWORD, log });
    process.stdout.write(`${JSON.stringify(swept, null, 2)}\n`);
    // Any failure or leftover on either side is a dirty sweep: exit 2, never 0.
    return swept.clean ? 0 : 2;
  }

  const { plan, byId, full } = planRows(inventory, cli);
  const needsArtifact = plan.some(({ screen }) => (screen.aliasOf ? byId.get(screen.aliasOf) : screen).kind === "artifact");
  const artifactBase = needsArtifact ? requireLoopback("ARTIFACT_BASE_URL") : null;
  if (!fs.existsSync(CHROMIUM_EXECUTABLE)) throw new PreconditionError("Pinned Playwright Chromium is not installed; refusing to download a browser");

  const runStartedAt = new Date();
  const frozenAt = new Date(Math.floor(runStartedAt.getTime() / 60_000) * 60_000);
  const runId = `${runStartedAt.toISOString().replace(/[:.]/g, "-")}-${process.pid}`;
  const stageRoot = path.join("/tmp", "parity-baseline", runId);
  const dirs = Object.fromEntries(["expected", "actual", "diff", "determinism", "diagnostics"].map((name) => [name, path.join(stageRoot, name)]));
  await Promise.all(Object.values(dirs).map((directory) => fsp.mkdir(directory, { recursive: true })));

  let identityMode = cli.as;
  let identityReason = null;
  if (identityMode === "admin" && !availability.ok) {
    identityMode = "visitor";
    identityReason = `identity unavailable: missing ${availability.missing.join(" and ")}`;
    log(`[parity] ${identityReason}; admin-session rows will be BLOCKED and other app rows recorded as visitor evidence`);
  } else if (identityMode === "visitor") {
    identityReason = "--as visitor";
  }

  const releaseLease = await acquireGateLease("db-heavy", "parity-baseline");
  const browser = await chromium.launch({ executablePath: CHROMIUM_EXECUTABLE, headless: true, args: CHROMIUM_ARGS });
  const browserVersion = browser.version();
  if (browserVersion !== CHROMIUM_VERSION) {
    await browser.close();
    releaseLease();
    throw new PreconditionError(`Pinned Chromium ${CHROMIUM_VERSION} expected, found ${browserVersion}`);
  }

  let identity = null;
  let referenceServer = null;
  const cleanup = async () => {
    if (referenceServer) await new Promise((resolve) => referenceServer.close(resolve));
    referenceServer = null;
    await browser.close().catch(() => {});
    try { releaseLease(); } catch {}
  };

  try {
    // ---- identity ---------------------------------------------------------
    let teardownOutcome = null;
    if (identityMode === "admin") {
      identity = await createDisposableAdmin({
        browser,
        appBase,
        secretKey: process.env.CLERK_SECRET_KEY,
        auditKey: process.env.ADMIN_PASSWORD,
        log,
      });
    }

    // ---- reference data binding ----------------------------------------------
    const catalogBinding = await buildCatalogAdapter(appBase);
    const tokens = resolveCatalogTokens(catalogBinding.adapter);
    const admin = identity ? await buildAdminAdapter(identity.fetchJson, frozenAt.getTime()) : null;
    const substitutions = buildPlaceholderSubstitutions({
      adapter: catalogBinding.adapter,
      createdAts: catalogBinding.createdAts,
      frozenAt,
      admin,
    });
    const adapterScript = buildAdapterScript({
      adapter: catalogBinding.adapter,
      adminGlobals: admin?.globals || null,
      appBase,
      snapshotBytes: catalogBinding.snapshotBytes,
      frozenAt,
    });
    const rawSnapshot = await snapshotDirectory(referenceRoot);
    const adapted = adaptReferenceSnapshot(rawSnapshot, { adapterScript, substitutions });
    referenceServer = await serveSnapshot(adapted.served);
    const referenceBase = `http://127.0.0.1:${referenceServer.address().port}`;

    // ---- workspace fingerprints ---------------------------------------------
    const fingerprintInputs = async () => ({
      config: sha256(await fsp.readFile(path.join(repoRoot, "awesome-list.config.yaml"))),
      app: await walkHashes(path.join(repoRoot, "client")),
      shared: await walkHashes(path.join(repoRoot, "shared")),
      artifact: needsArtifact ? await walkHashes(path.join(repoRoot, "artifacts/awesome-video-design-system")) : null,
      reference: adapted.provenance.rawHashes,
      harness: await walkHashes(here, { include: (relative) => /\.(mjs|json)$/.test(relative) && !relative.startsWith("baseline/") }),
    });
    const startFingerprints = await fingerprintInputs();
    const gitCommit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
    const gitDirty = execFileSync("git", ["status", "--porcelain=v1", "--", "client", "shared", "awesome-list-site-ds", "artifacts/awesome-video-design-system", "tests/parity/inventory", "awesome-list.config.yaml"], { cwd: repoRoot, encoding: "utf8" }).trim().split("\n").filter(Boolean);

    // ---- determinism mode ---------------------------------------------------
    if (cli.determinism) {
      const determinism = await runDeterminism({ browser, plan, byId, cli, tokens, referenceBase, frozenAt, dirs, catalogBinding });
      await cleanup();
      if (identity) teardownOutcome = await identity.teardown({ keepUser: cli.keepUser });
      const outFile = path.join(stageRoot, "determinism.json");
      const payload = { runId, frozenAt: frozenAt.toISOString(), captures: cli.determinism, browserVersion, referenceAdapter: { snapshot: sha256(catalogBinding.snapshotBytes) }, rows: determinism, identityTeardown: teardownOutcome };
      await fsp.writeFile(outFile, JSON.stringify(payload, null, 2));
      const evidenceDir = path.join(harnessEvidenceDir, "determinism");
      await fsp.rm(evidenceDir, { recursive: true, force: true });
      await fsp.mkdir(evidenceDir, { recursive: true });
      // Only the accepted captures are evidence; the raw stability frames stay in the run directory.
      await fsp.cp(dirs.determinism, evidenceDir, { recursive: true, filter: (source) => !STABILITY_FRAME_RE.test(source) });
      await fsp.copyFile(outFile, path.join(evidenceDir, "determinism.json"));
      const failing = determinism.filter((cell) => !cell.identical);
      log(`[parity] determinism: ${determinism.length - failing.length}/${determinism.length} cells byte-identical across ${cli.determinism} captures → ${rel(repoRoot, evidenceDir)}`);
      for (const cell of failing) log(`  ✗ ${cell.screen}@${cell.width}: ${cell.hashes.join(" ")}`);
      return failing.length ? 1 : 0;
    }

    // ---- rows ------------------------------------------------------------------
    const rows = [];
    const rowIndex = new Map();
    const pushRow = (row) => {
      rows.push(row);
      rowIndex.set(`${row.screen}@${row.width}`, row);
    };
    const throttleGuard = createThrottleGuard();
    const documentReloads = [];
    const captureContext = { browser, appBase, artifactBase, referenceBase, frozenAt, tokens, adapter: catalogBinding.adapter, identity, dirs, plan, byId, throttleGuard, documentReloads };

    // Cells run in plan order, except that a cell whose app limiter window is
    // currently closed is moved behind the remaining cells so the wait overlaps
    // other captures; the wait is only slept when nothing else is left.
    const queue = [...plan];
    const planOrder = new Map(plan.map((cell, index) => [`${cell.screen.id}@${cell.width}`, index]));
    const throttleDeferrals = [];
    while (queue.length) {
      const cell = queue.shift();
      const { screen, width } = cell;
      const base = { screen: screen.id, width, family: screen.family, kind: screen.kind, eligibility: screen.eligibility, denominator: false };
      if (screen.kind === "app" && screen.eligibility === "pixel") {
        const pending = throttleWaitNeeded(throttleGuard, screen);
        if (pending && queue.some((other) => !(other.screen.kind === "app" && throttleWaitNeeded(throttleGuard, other.screen)))) {
          log(`[parity] ${screen.id} @ ${width} deferred ${Math.ceil(pending.waitMs / 1000)}s: app limiter behind ${pending.key} is closed`);
          throttleDeferrals.push({ screen: screen.id, width, limiter: pending.key, deferredMs: pending.waitMs, at: new Date().toISOString() });
          queue.push(cell);
          continue;
        }
      }
      if (screen.aliasOf) {
        pushRow({ ...base, status: "ALIAS", aliasOf: screen.aliasOf, reason: `Shares ${screen.aliasOf}'s exact capture identity; excluded from the denominator to prevent double counting.` });
        continue;
      }
      if (screen.eligibility === "blocked") {
        pushRow({ ...base, status: "BLOCKED", reason: screen.reason });
        continue;
      }
      if (screen.eligibility === "token-only") {
        pushRow({ ...base, status: "UNVERIFIED", reason: screen.reason || "Token-only row: verified by token audits, never by pixel comparison." });
        continue;
      }
      const needsAdmin = (screen.requires || []).includes("admin-session");
      if (needsAdmin && !identity) {
        pushRow({ ...base, status: "BLOCKED", reason: `Requires a real admin session (${identityReason}); never captured as a visitor.` });
        continue;
      }
      const evidenceKind = screen.eligibility === "artifact-docs"
        ? "artifact-docs"
        : (identityMode === "visitor" && screen.kind === "app" ? "visitor-identity" : null);
      log(`[parity] ${screen.id} @ ${width}`);
      const outcome = await withTimeout(() => captureRow(captureContext, screen, width), ROW_TIMEOUT_MS, `${screen.id}@${width}`, throttleGuard)
        .catch((error) => ({ failure: error }));
      if (outcome.failure) {
        const error = outcome.failure;
        const diagnostics = error?.diagnostics || undefined;
        // Failed sides keep their same-origin API failures on the row as well as in the diagnostics record.
        const apiFailures = error?.apiFailures || [];
        if (error instanceof ActionUnavailableError) {
          pushRow({ ...base, status: "BLOCKED", reason: error.message, diagnostics, apiFailures });
        } else if (evidenceKind) {
          pushRow({ ...base, status: "EVIDENCE", evidenceKind, reason: `capture failed: ${error.message}`, diagnostics, apiFailures });
        } else {
          pushRow({ ...base, status: "FAIL", denominator: true, reason: `capture failed: ${error.message}`, diagnostics, apiFailures });
        }
        log(`  ✗ ${error.message.split("\n")[0]}${diagnostics ? ` (see ${diagnostics})` : ""}`);
        continue;
      }
      const row = { ...base, ...outcome };
      const fontGap = !row.fontParity.ok;
      const visualOk = row.comparison.withinCeiling && row.backdropFilters.match && row.identity.ok !== false;
      const reasons = [];
      if (!row.comparison.withinCeiling) reasons.push(`${row.comparison.diffPercent.toFixed(3)}% differing pixels exceeds the ${MAXIMUM_DIFF_PERCENT}% ceiling`);
      if (!row.backdropFilters.match) reasons.push(`backdrop-filter sets differ (app ${JSON.stringify(row.backdropFilters.actual)} vs reference ${JSON.stringify(row.backdropFilters.expected)})`);
      if (row.identity.ok === false) reasons.push(row.identity.reason);
      if (fontGap) reasons.push(`@font-face parity gap: ${row.fontParity.gaps.length} face(s) declared on one side only`);
      if (evidenceKind) {
        pushRow({ ...row, status: "EVIDENCE", evidenceKind, reason: reasons.join("; ") || undefined });
      } else {
        pushRow({ ...row, status: visualOk && !fontGap ? "PASS" : "FAIL", denominator: true, fontGap, reason: reasons.join("; ") || undefined });
      }
      log(`  ${rows.at(-1).status} ${row.comparison.diffPercent.toFixed(4)}% (${row.comparison.differingPixels}px)`);
    }
    rows.sort((a, b) => planOrder.get(`${a.screen}@${a.width}`) - planOrder.get(`${b.screen}@${b.width}`));

    // aliases point at their target's evidence
    for (const row of rows) {
      if (row.status !== "ALIAS") continue;
      const target = rowIndex.get(`${row.aliasOf}@${row.width}`);
      if (target?.links) row.links = target.links;
    }

    // ---- teardown + provenance ------------------------------------------------
    const endFingerprints = await fingerprintInputs();
    const inputsChangedDuringRun = JSON.stringify(startFingerprints) !== JSON.stringify(endFingerprints);
    await cleanup();
    let teardownError = null;
    if (identity) {
      try {
        teardownOutcome = await identity.teardown({ keepUser: cli.keepUser });
      } catch (error) {
        // Residue is a run failure, but the captures and results are still evidence.
        teardownError = error.message;
        teardownOutcome = error.outcome ?? { errors: [error.message] };
      }
    }

    const measured = rows.filter((row) => row.denominator);
    const pass = measured.filter((row) => row.status === "PASS").length;
    const fail = measured.length - pass;
    const blocked = rows.filter((row) => row.status === "BLOCKED").length;
    const gatePassed = full && identityMode === "admin" && fail === 0 && blocked === 0 && !inputsChangedDuringRun && measured.length > 0;
    let exitCode;
    if (fail > 0 || rows.some((row) => row.status === "BLOCKED" && row.eligibility === "pixel" && !(row.reason || "").startsWith("Requires a real admin session") && identityMode === "admin")) exitCode = 1;
    else if (full && identityMode === "admin" && !gatePassed) exitCode = 1;
    else exitCode = 0;
    if (identityMode === "admin" && rows.some((row) => row.status === "BLOCKED" && row.eligibility === "pixel")) exitCode = 1;
    if (teardownError) exitCode = 2;
    const claim = identityMode !== "admin"
      ? "visitor-evidence-only"
      : full
        ? (gatePassed ? "parity-gate-pass" : "pre-parity-baseline")
        : "selected-rows-diagnostic";

    const fontRows = rows.filter((row) => row.fontParity);
    const fontGapRows = fontRows.filter((row) => !row.fontParity.ok);
    const fontGapMarkdown = [
      "# @font-face parity",
      "",
      `Run \`${runId}\`. Families asserted before every capture: ${PARITY_FONT_FAMILIES.join(", ")}.`,
      `${fontRows.length} captured rows; ${fontGapRows.length} with a declared-face gap (each gap row is a FAIL regardless of pixel diff).`,
      "",
      ...(fontGapRows.length
        ? fontGapRows.map((row) => renderFontGapMarkdown(row.screen, row.width, { ...row.fontParity, table: { length: row.fontParity.sharedFaces + row.fontParity.gaps.length } }))
        : ["No gaps: every captured row declared identical face sets on both sides.", ""]),
    ].join("\n");
    await fsp.writeFile(path.join(stageRoot, "font-gaps.md"), fontGapMarkdown);

    const results = {
      schemaVersion: 2,
      runId,
      executedAt: runStartedAt.toISOString(),
      finishedAt: new Date().toISOString(),
      claim,
      gatePassed,
      exitCode,
      selection: { full, only: cli.only, widths: cli.widths, description: [cli.only ? `--only ${cli.only.join(",")}` : "", cli.widths ? `--width ${cli.widths.join(",")}` : ""].filter(Boolean).join(" ") || "full inventory" },
      identity: {
        mode: identityMode,
        reason: identityReason,
        bridgeId: identity?.bridgeId || null,
        displayName: identity?.displayName || null,
        clerkUserId: identity?.clerkUserId || null,
        teardown: teardownOutcome,
        teardownError,
        prefix: QA_PREFIX,
      },
      configuration: {
        frozenAt: frozenAt.toISOString(),
        browserVersion,
        pixelmatchThreshold: PIXELMATCH_THRESHOLD,
        maximumDiffPercent: MAXIMUM_DIFF_PERCENT,
        viewportHeights: VIEWPORT_HEIGHTS,
        captureNormalisations: CAPTURE_NORMALISATIONS,
        chromiumArgs: CHROMIUM_ARGS,
        captureState: CAPTURE_STATE,
        throttleWaits: throttleGuard.waits,
        throttleDeferrals,
        documentReloads,
        fontFamilies: PARITY_FONT_FAMILIES,
        rowTimeoutMs: ROW_TIMEOUT_MS,
        targets: { app: appBase, artifact: artifactBase, reference: "in-memory snapshot of awesome-list-site-ds on an ephemeral loopback port" },
      },
      inventory: { screens: inventory.screens.length, eligibility: countEligibility(inventory), generatedHash: sha256(await fsp.readFile(path.join(here, "inventory.json"))) },
      provenance: {
        gitCommit,
        gitDirtyPaths: gitDirty,
        snapshot: { sha256: sha256(catalogBinding.snapshotBytes), categories: catalogBinding.adapter.AV_CATEGORIES.length, totalResources: catalogBinding.adapter.AV_TOTAL, reconciledPaths: catalogBinding.reconciledPaths },
        referenceAdapter: { adminGlobals: admin ? Object.keys(admin.globals) : [], adminCounts: admin?.counts || null, placeholders: { applied: adapted.provenance.applied, unadapted: adapted.provenance.unadapted, rule: adapted.provenance.rule }, rawHashes: adapted.provenance.rawHashes, servedHashes: adapted.provenance.servedHashes },
        workspace: { startFingerprints: sha256(Buffer.from(JSON.stringify(startFingerprints))), endFingerprints: sha256(Buffer.from(JSON.stringify(endFingerprints))), inputsChangedDuringRun },
      },
      summary: { denominator: measured.length, pass, fail, fontGapOnlyFails: measured.filter((row) => row.status === "FAIL" && row.fontGap && row.comparison?.withinCeiling && row.backdropFilters?.match && row.identity?.ok !== false).length, blocked, evidence: rows.filter((row) => row.status === "EVIDENCE").length, unverified: rows.filter((row) => row.status === "UNVERIFIED").length, aliases: rows.filter((row) => row.status === "ALIAS").length },
      rows,
    };
    await fsp.writeFile(path.join(stageRoot, "results.json"), JSON.stringify(results, null, 2));

    // ---- publish -------------------------------------------------------------
    const finalRoot = path.join(here, "baseline", runId);
    await fsp.cp(stageRoot, finalRoot, { recursive: true });
    await writeReports(results, finalRoot);
    // The manifest is written last so it really covers every file in the run directory (reports included).
    await fsp.writeFile(path.join(finalRoot, "OUTPUT-MANIFEST.json"), JSON.stringify(await walkHashes(finalRoot), null, 2));
    if (full) {
      // Whole-inventory evidence only: a selected run would overwrite it with a subset.
      await fsp.mkdir(harnessEvidenceDir, { recursive: true });
      await fsp.copyFile(path.join(finalRoot, "font-gaps.md"), path.join(harnessEvidenceDir, "font-gaps.md"));
      // Root mirrors hold the accepted captures only; the raw stability frames
      // stay in the run directory (and are not committed — see .gitignore).
      for (const name of ["actual", "expected", "diff"]) {
        await fsp.rm(path.join(here, name), { recursive: true, force: true });
        await fsp.cp(path.join(finalRoot, name), path.join(here, name), { recursive: true, filter: (source) => !STABILITY_FRAME_RE.test(source) });
      }
      const sampleDir = path.join(harnessEvidenceDir, "sample-diffs");
      await fsp.rm(sampleDir, { recursive: true, force: true });
      await fsp.mkdir(sampleDir, { recursive: true });
      for (const key of ["app.home.index@375", "app.category@1440", "app.admin.overview@1024"]) {
        const row = rowIndex.get(key);
        if (!row?.links) continue;
        // The three sides share a basename inside the run; suffix them here so
        // actual/expected/diff of one row sit side by side.
        for (const side of ["actual", "expected", "diff"]) {
          await fsp.copyFile(path.join(finalRoot, row.links[side]), path.join(sampleDir, path.basename(row.links[side]).replace(/\.png$/, `.${side}.png`)));
        }
      }
    }
    await makeReadOnly(finalRoot);
    // The /tmp stage is fully published; leaving it would only pile up ~100 MB per run.
    await fsp.rm(stageRoot, { recursive: true, force: true });
    log(`[parity] ${claim}: ${pass}/${measured.length} pixel rows pass, ${fail} fail, ${blocked} blocked → ${rel(repoRoot, finalRoot)} (exit ${exitCode})`);
    return exitCode;
  } catch (error) {
    await cleanup();
    if (identity) await identity.teardown({ keepUser: cli.keepUser }).catch((teardownError) => log(`[identity] teardown failed: ${teardownError.message}`));
    throw error;
  }
};

// ---------------------------------------------------------------------------
// Capture of one row
// ---------------------------------------------------------------------------
/**
 * Pre-seeded browser state for every capture. This is user state, not
 * masking: a visitor who picked the Editorial × Crimson theme and answered the
 * analytics consent prompt sees exactly this DOM. The design demonstrator has
 * no consent prompt, so the app side records the decision as "denied" (no
 * analytics SDK is loaded either way) and the prompt never renders.
 */
export const CAPTURE_STATE = {
  theme: { system: "editorial", accent: "crimson" },
  app: { localStorage: { "ds-system": "editorial", "ds-accent": "crimson", "analytics-consent": "denied" } },
  reference: { localStorage: { "av-ds-system": "editorial", "av-ds-accent": "crimson" } },
};

const stateInitScript = (isReference) => `(() => {
  const entries = ${JSON.stringify(Object.entries(isReference ? CAPTURE_STATE.reference.localStorage : CAPTURE_STATE.app.localStorage))};
  try { for (const [key, value] of entries) localStorage.setItem(key, value); } catch {}
})();`;

const newCaptureContext = async ({ browser, frozenAt }, width, { reference, storageState }) => {
  const context = await browser.newContext({
    viewport: { width, height: VIEWPORT_HEIGHTS[width] },
    deviceScaleFactor: 1,
    locale: "en-US",
    timezoneId: "UTC",
    colorScheme: "dark",
    reducedMotion: "reduce",
    serviceWorkers: "block",
    ...(storageState ? { storageState } : {}),
  });
  try {
    context.setDefaultTimeout(30_000);
    await context.clock.setFixedTime(frozenAt);
    await context.addInitScript(stateInitScript(reference));
    return context;
  } catch (error) {
    // A half-configured context must not outlive its setup failure.
    await context.close().catch(() => {});
    throw error;
  }
};

const guardOrigin = (page, origin, label) => {
  page.on("framenavigated", (frame) => {
    if (frame !== page.mainFrame()) return;
    const url = frame.url();
    if (url === "about:blank") return;
    if (new URL(url).origin !== origin) page.__originViolation = `${label} navigated away to ${new URL(url).origin}`;
  });
};

/**
 * Failure diagnostics: when a side cannot be opened or settled, the page as it
 * stands is written to `diagnostics/<row>-<width>-<side>.png` together with a
 * JSON record of the URL, title, console errors, page errors and failed
 * requests, so a page task can see *why* a row never settled without
 * re-running the harness under a debugger. The capture never enters the
 * comparison.
 */
const attachDiagnostics = (page) => {
  page.__diagnostics = { console: [], pageErrors: [], failedRequests: [] };
  page.on("console", (message) => {
    if (!["error", "warning"].includes(message.type())) return;
    if (page.__diagnostics.console.length < 50) page.__diagnostics.console.push({ type: message.type(), text: message.text().slice(0, 500) });
  });
  page.on("pageerror", (error) => {
    if (page.__diagnostics.pageErrors.length < 20) page.__diagnostics.pageErrors.push(String(error?.stack || error).slice(0, 1000));
  });
  page.on("requestfailed", (request) => {
    if (page.__diagnostics.failedRequests.length < 50) page.__diagnostics.failedRequests.push({ url: request.url().slice(0, 300), error: request.failure()?.errorText || null });
  });
};

const dumpDiagnostics = async (ctx, page, screen, width, side, error) => {
  if (!ctx.dirs?.diagnostics) return null;
  const stem = `${screen.id}-${width}-${side}`;
  const record = {
    screen: screen.id,
    width,
    side,
    error: String(error?.message || error),
    url: page.isClosed() ? null : page.url(),
    title: page.isClosed() ? null : await page.title().catch(() => null),
    bodyTextHead: page.isClosed() ? null : await page.evaluate(() => (document.body?.innerText || "").slice(0, 600)).catch(() => null),
    ...(page.__diagnostics || {}),
    apiFailures: (page.__parityNetwork?.failures || []).map(({ method, path: apiPath, status, error: apiError }) => ({ method, path: apiPath, status, ...(apiError ? { error: apiError } : {}) })),
  };
  try {
    if (!page.isClosed()) await page.screenshot({ path: path.join(ctx.dirs.diagnostics, `${stem}.png`), fullPage: false, timeout: 15_000 });
  } catch {
    // the page may be wedged; the JSON record is still written
  }
  await fsp.writeFile(path.join(ctx.dirs.diagnostics, `${stem}.json`), JSON.stringify(record, null, 2)).catch(() => {});
  if (error && typeof error === "object") error.apiFailures = record.apiFailures;
  return `diagnostics/${stem}.json`;
};

/**
 * App rate-limit budget. The signed-in home page POSTs /api/recommendations,
 * which sits behind the app's AI limiter (10 requests / 15 min per IP, and a
 * real Claude call each). The harness reads the standard RateLimit-* headers
 * the app returns, remembers which rows consume each limiter, and waits for the
 * window to reset before opening another consumer row rather than capturing a
 * throttled page. Every wait is recorded in results (`throttleWaits`).
 */
const createThrottleGuard = () => ({ limits: new Map(), waits: [] });

const noteRateLimits = (guard, page, screen) => {
  const entries = page.__parityNetwork?.rateLimits || [];
  const perOpen = new Map();
  for (const entry of entries) {
    const key = `${entry.method} ${entry.path}`;
    perOpen.set(key, (perOpen.get(key) || 0) + 1);
  }
  for (const entry of entries) {
    const key = `${entry.method} ${entry.path}`;
    const previous = guard.limits.get(key);
    const consumers = previous?.consumers || new Set();
    consumers.add(screen.actualPath);
    const info = !previous || entry.observedAt >= previous.observedAt
      ? { ...entry.rateLimit, observedAt: entry.observedAt, resetAt: entry.observedAt + entry.rateLimit.resetSeconds * 1000 }
      : previous;
    // A single page open can consume more than one hit (the app issues two
    // recommendation POSTs per home load); budget for the worst observed case.
    info.perOpen = Math.max(previous?.perOpen || 1, perOpen.get(key) || 1);
    info.consumers = consumers;
    guard.limits.set(key, info);
  }
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const recordThrottleWait = async (guard, { screen, width, key, waitMs, why }) => {
  console.log(`  … waiting ${Math.ceil(waitMs / 1000)}s for the app limiter behind ${key} to reset before ${screen.id}@${width} (${why})`);
  guard.waits.push({ screen: screen.id, width, limiter: key, waitedMs: waitMs, why, at: new Date().toISOString() });
  await sleep(waitMs);
};

/** The limiter (if any) that would reject another load of `screen` right now. */
const throttleWaitNeeded = (guard, screen) => {
  for (const [key, info] of guard.limits) {
    if (!info.consumers.has(screen.actualPath) || info.remaining >= (info.perOpen || 1)) continue;
    const waitMs = info.resetAt + 1_000 - Date.now();
    if (waitMs > 0) return { key, info, waitMs };
  }
  return null;
};

const awaitThrottleBudget = async (guard, screen, width) => {
  for (let pending = throttleWaitNeeded(guard, screen); pending; pending = throttleWaitNeeded(guard, screen)) {
    const { key, info, waitMs } = pending;
    await recordThrottleWait(guard, { screen, width, key, waitMs, why: `${info.remaining} of ${info.limit} left, a load consumes ${info.perOpen}` });
    info.remaining = info.limit;
  }
};

/**
 * A 429 can still arrive when the limiter window was filled by an earlier run
 * (the app's rate-limit store outlives the harness). The 429 carries the same
 * RateLimit-* headers, so the side is reopened once after the window resets.
 */
const throttleRetryDelay = (error) => {
  const throttled = error?.throttled || [];
  if (!throttled.length) return null;
  const resetMs = Math.max(...throttled.map((entry) => (entry.rateLimit ? entry.observedAt + entry.rateLimit.resetSeconds * 1000 : 0)));
  return { key: `${throttled[0].method} ${throttled[0].path}`, waitMs: Math.max(resetMs + 1_000 - Date.now(), 5_000) };
};

const openSide = async (ctx, screen, width, side, { retriedAfterThrottle = false } = {}) => {
  const isReference = side === "expected";
  const kind = screen.kind;
  const base = isReference ? ctx.referenceBase : (kind === "artifact" ? ctx.artifactBase : ctx.appBase);
  // Wait for the limiter BEFORE snapshotting the session: the snapshot carries a
  // short-lived Clerk session token that the frozen-clock capture context never
  // refreshes, so a snapshot taken before a multi-minute wait arrives expired
  // (both earlier full runs lost app.shell.palette@768 this way).
  if (!isReference && kind === "app") await awaitThrottleBudget(ctx.throttleGuard, screen, width);
  const storageState = !isReference && kind === "app" && ctx.identity ? await ctx.identity.storageState() : null;
  const context = await newCaptureContext(ctx, width, { reference: isReference, storageState });
  let page;
  try {
    page = await context.newPage();
    attachDiagnostics(page);
    attachNetworkTracker(page);
    guardOrigin(page, base, side);
  } catch (error) {
    await context.close().catch(() => {});
    throw error;
  }
  try {
    return await openSideOn(ctx, screen, width, side, { context, page, base, isReference, kind });
  } catch (error) {
    if (!isReference && kind === "app") noteRateLimits(ctx.throttleGuard, page, screen);
    const retry = !isReference && kind === "app" && !retriedAfterThrottle ? throttleRetryDelay(error) : null;
    if (retry) {
      await context.close().catch(() => {});
      await recordThrottleWait(ctx.throttleGuard, { screen, width, key: retry.key, waitMs: retry.waitMs, why: "429 received (window filled before this run); reopening once" });
      return openSide(ctx, screen, width, side, { retriedAfterThrottle: true });
    }
    const diagnostics = await dumpDiagnostics(ctx, page, screen, width, side, error);
    if (diagnostics && error && typeof error === "object") error.diagnostics = diagnostics;
    await context.close().catch(() => {});
    throw error;
  }
};

const openSideOn = async (ctx, screen, width, side, { context, page, base, isReference, kind }) => {
  const template = isReference ? screen.referencePath : screen.actualPath;
  const url = `${base}${resolvePathTemplate(template, ctx.tokens.values)}`;
  const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
  const status = response?.status() ?? 0;
  if (status >= 400) throw new Error(`${side} ${url} returned HTTP ${status}`);
  let session = null;
  if (!isReference && kind === "app" && ctx.identity) {
    session = await page.evaluate(async () => {
      const result = await fetch("/api/auth/user", { credentials: "include", headers: { accept: "application/json" } });
      return result.json().catch(() => null);
    });
    if (!session?.isAuthenticated) throw new Error("app row context is not authenticated as the disposable admin (session lapsed before capture)");
    const role = session.user?.role;
    if ((screen.requires || []).includes("admin-session") && role !== "admin") throw new Error(`app row context is authenticated as role ${role}, not admin`);
  }
  const action = isReference ? screen.referenceAction : screen.actualAction;
  // Actions receive the structured catalog tokens (category/subcategory/leaf/
  // resource objects); path templates and identity checks use the flat `values`.
  if (action) await applyAction(page, action, isReference ? "reference" : "actual", { tokens: ctx.tokens });
  const selector = isReference ? screen.referenceReadySelector : screen.actualReadySelector;
  const settled = await settlePage(page, selector, { side: isReference ? "reference" : "actual" });
  if (!isReference && kind === "app") noteRateLimits(ctx.throttleGuard, page, screen);
  const faces = await collectFontFaces(page);
  if (page.__originViolation) throw new Error(page.__originViolation);
  return { context, page, url, settled, faces, session: session ? { userId: session.user?.id, role: session.user?.role } : null };
};

/** Keep the frames of a side that reloaded mid-capture as diagnostics. */
const stashReloadFrames = async (ctx, stem, side, round) => {
  const sourceDir = side === "expected" ? ctx.dirs.expected : ctx.dirs.actual;
  const names = (await fsp.readdir(sourceDir)).filter((name) => name.startsWith(`${stem}.attempt-`) || name === `${stem}.repeat.png`);
  const kept = [];
  for (const name of names) {
    const target = `${stem}-${side}-reload-${round}.${name.slice(stem.length + 1)}`;
    await fsp.rename(path.join(sourceDir, name), path.join(ctx.dirs.diagnostics, target));
    kept.push(`diagnostics/${target}`);
  }
  return kept;
};

/** A settle that died because the document went away under it. */
const looksLikeReload = (error) => error instanceof DocumentReloadedError ||
  /Execution context was destroyed|because of a navigation|[Ff]rame was detached/.test(String(error?.message || ""));

const captureRow = async (ctx, screen, width) => {
  const stem = `${screen.id}-${width}`;
  const actualFile = path.join(ctx.dirs.actual, `${stem}.png`);
  const expectedFile = path.join(ctx.dirs.expected, `${stem}.png`);
  const diffFile = path.join(ctx.dirs.diff, `${stem}.png`);
  const sides = {};
  const reloads = { actual: 0, expected: 0 };
  // A side whose document reloaded under the settle or between settle and a
  // frame is reopened from scratch (fresh context, same action, full settle)
  // instead of being captured mid-boot, at most MAX_DOCUMENT_RELOADS times per
  // row; discarded frames go to diagnostics/ and every event is recorded.
  const noteReload = async (sideName, phase, error) => {
    if (!looksLikeReload(error) || reloads[sideName] >= MAX_DOCUMENT_RELOADS) throw error;
    reloads[sideName] += 1;
    const frames = await stashReloadFrames(ctx, stem, sideName, reloads[sideName]);
    ctx.documentReloads?.push({ screen: screen.id, width, side: sideName, phase, round: reloads[sideName], reason: error.message.split("\n")[0], frames, at: new Date().toISOString() });
    log(`  … ${sideName} ${phase}: ${error.message.split("\n")[0]}; reopening the side (${reloads[sideName]}/${MAX_DOCUMENT_RELOADS})`);
  };
  const openSideOrReopen = async (sideName) => {
    for (;;) {
      try {
        return await openSide(ctx, screen, width, sideName);
      } catch (error) {
        await noteReload(sideName, "settle", error);
      }
    }
  };
  const captureSide = async (sideName, file) => {
    for (;;) {
      const side = sides[sideName];
      try {
        return await stableFullPageCapture(side.page, file, {
          documentToken: side.settled.documentToken,
          side: sideName === "expected" ? "reference" : "actual",
        });
      } catch (error) {
        await noteReload(sideName, "capture", error);
        await side.context.close().catch(() => {});
        sides[sideName] = await openSideOrReopen(sideName);
      }
    }
  };
  try {
    sides.actual = await openSideOrReopen("actual");
    sides.expected = await openSideOrReopen("expected");
    const actualCapture = await captureSide("actual", actualFile);
    const expectedCapture = await captureSide("expected", expectedFile);
    const slug = screen.actualAction?.startsWith("admin-tab:") ? screen.actualAction.slice("admin-tab:".length) : null;
    const identityCheck = screen.identityCheck || (slug ? "admin-tab" : null);
    const identity = identityCheck
      ? assertAlignedIdentity(
          identityCheck,
          await collectIdentity(sides.actual.page, identityCheck, "actual", ctx.tokens.values, ctx.adapter),
          await collectIdentity(sides.expected.page, identityCheck, "expected", ctx.tokens.values, ctx.adapter),
          slug,
        )
      : { checked: false };
    const comparison = await compareCaptures(actualFile, expectedFile, diffFile);
    const fontComparison = compareFontFaces(sides.actual.faces, sides.expected.faces);
    const fontParity = {
      ok: fontComparison.ok,
      sharedFaces: fontComparison.table.length - fontComparison.gaps.length,
      gaps: fontComparison.gaps,
      familiesMissingOnActual: fontComparison.familiesMissingOnActual,
      familiesMissingOnExpected: fontComparison.familiesMissingOnExpected,
    };
    const actualFilters = sides.actual.settled.backdropFilters.map((entry) => entry.value).sort();
    const expectedFilters = sides.expected.settled.backdropFilters.map((entry) => entry.value).sort();
    return {
      urls: { actual: sides.actual.url, expected: sides.expected.url },
      session: sides.actual.session,
      comparison,
      identity,
      fontParity,
      backdropFilters: { actual: actualFilters, expected: expectedFilters, match: JSON.stringify(actualFilters) === JSON.stringify(expectedFilters) },
      apiFailures: sides.actual.settled.apiFailures || [],
      actualCaptureStability: { stableAttempts: actualCapture.stableAttempts, attemptHashes: actualCapture.attemptHashes, reopenedAfterReload: reloads.actual },
      expectedCaptureStability: { stableAttempts: expectedCapture.stableAttempts, attemptHashes: expectedCapture.attemptHashes, reopenedAfterReload: reloads.expected },
      captureHashes: { actual: actualCapture.sha256, expected: expectedCapture.sha256 },
      fontsSettled: {
        actual: { complete: sides.actual.settled.fonts.complete, failedFaces: sides.actual.settled.fonts.failedFaces, nativeDefects: sides.actual.settled.fonts.nativeDefects },
        expected: { complete: sides.expected.settled.fonts.complete, failedFaces: sides.expected.settled.fonts.failedFaces, nativeDefects: sides.expected.settled.fonts.nativeDefects },
      },
      links: { actual: `actual/${stem}.png`, expected: `expected/${stem}.png`, diff: `diff/${stem}.png` },
    };
  } finally {
    for (const side of Object.values(sides)) await side.context.close().catch(() => {});
  }
};

// ---------------------------------------------------------------------------
// Determinism proof (reference side, fresh context per capture)
// ---------------------------------------------------------------------------
const runDeterminism = async ({ browser, plan, byId, cli, tokens, referenceBase, frozenAt, dirs }) => {
  const ctx = { browser, referenceBase, frozenAt, tokens, dirs, throttleGuard: createThrottleGuard() };
  const cells = [];
  for (const { screen: candidate, width } of plan) {
    const screen = candidate.aliasOf ? byId.get(candidate.aliasOf) : candidate;
    if (screen.eligibility !== "pixel" || !screen.referencePath) continue;
    if ((screen.requires || []).includes("admin-session")) continue;
    const hashes = [];
    let failure = null;
    for (let attempt = 1; attempt <= cli.determinism && !failure; attempt += 1) {
      const file = path.join(dirs.determinism, `${screen.id}-${width}.capture-${attempt}.png`);
      let side = null;
      try {
        side = await openSide(ctx, screen, width, "expected");
        const capture = await stableFullPageCapture(side.page, file, { documentToken: side.settled.documentToken, side: "reference" });
        hashes.push(capture.sha256);
      } catch (error) {
        failure = { attempt, error: String(error?.message || error).split("\n")[0], diagnostics: error?.diagnostics || null };
      } finally {
        await side?.context.close().catch(() => {});
      }
    }
    const identical = !failure && hashes.length === cli.determinism && hashes.every((hash) => hash === hashes[0]);
    cells.push({ screen: screen.id, width, hashes, identical, failure, files: hashes.map((_, index) => `determinism/${screen.id}-${width}.capture-${index + 1}.png`) });
    log(`[parity] determinism ${screen.id}@${width}: ${identical ? "identical" : failure ? `FAILED on capture ${failure.attempt}: ${failure.error}` : "DIFFERENT"} ${hashes.map((hash) => hash.slice(0, 12)).join(" ")}`);
  }
  if (!cells.length) throw new CliError("--determinism needs at least one visitor-capturable pixel row in the selection");
  return cells;
};

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------
/**
 * Row budget. Time spent waiting for the app's rate-limit window to reset is
 * excluded (the wait is recorded separately in `throttleWaits`), so a
 * legitimately slow row still fails while a budgeted wait does not.
 *
 * `run` is a thunk, not a promise: the baseline of already-recorded waits must
 * be taken before the row starts, because a row whose first act is the limiter
 * wait records that wait synchronously (no await precedes the push) and a
 * baseline taken afterwards would count the wait against the row.
 */
const withTimeout = (run, ms, label, guard) => new Promise((resolve, reject) => {
  const sumWaits = () => (guard ? guard.waits.reduce((total, wait) => total + wait.waitedMs, 0) : 0);
  const waitedBefore = sumWaits();
  const startedAt = Date.now();
  let timer = null;
  const check = () => {
    const elapsed = Date.now() - startedAt - (sumWaits() - waitedBefore);
    if (elapsed >= ms) reject(new Error(`${label} exceeded the ${ms / 1000}s row budget`));
    else timer = setTimeout(check, Math.min(ms - elapsed, 5_000));
  };
  timer = setTimeout(check, Math.min(ms, 5_000));
  let promise;
  try {
    promise = Promise.resolve(run());
  } catch (error) {
    clearTimeout(timer);
    reject(error);
    return;
  }
  promise.then((value) => { clearTimeout(timer); resolve(value); }, (error) => { clearTimeout(timer); reject(error); });
});

const snapshotDirectory = async (directory, prefix = "") => {
  const files = new Map();
  for (const entry of await fsp.readdir(directory, { withFileTypes: true })) {
    const relative = path.posix.join(prefix, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Reference snapshot rejects symlink ${relative}`);
    if (entry.isDirectory()) {
      for (const pair of await snapshotDirectory(path.join(directory, entry.name), relative)) files.set(...pair);
    } else if (entry.isFile()) {
      files.set(relative, await fsp.readFile(path.join(directory, entry.name)));
    }
  }
  return files;
};

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".jsx": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
};

const serveSnapshot = async (served) => {
  const server = http.createServer((request, response) => {
    try {
      const requestUrl = new URL(request.url, "http://127.0.0.1");
      const relative = decodeURIComponent(requestUrl.pathname).replace(/^\/+/, "") || "index.html";
      if (relative.includes("\0") || relative.includes("\\") || relative.split("/").includes("..")) throw new Error("invalid path");
      const bytes = served.get(relative);
      if (!bytes) {
        response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        response.end("Not available");
        return;
      }
      response.writeHead(200, {
        "content-type": MIME[path.extname(relative).toLowerCase()] || "application/octet-stream",
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
      });
      response.end(bytes);
    } catch {
      response.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not available");
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return server;
};

const walkHashes = async (directory, { include } = {}, prefix = "") => {
  const result = {};
  for (const entry of await fsp.readdir(directory, { withFileTypes: true })) {
    const relative = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) Object.assign(result, await walkHashes(path.join(directory, entry.name), { include }, relative));
    else if (entry.isFile() && (!include || include(relative))) result[relative] = sha256(await fsp.readFile(path.join(directory, entry.name)));
  }
  return result;
};

const makeReadOnly = async (directory) => {
  for (const entry of await fsp.readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) await makeReadOnly(absolute);
    else await fsp.chmod(absolute, 0o444);
  }
};

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().then(
    (code) => process.exit(code),
    (error) => {
      if (error instanceof CliError) {
        process.stderr.write(`${error.message}\n`);
        process.exit(2);
      }
      process.stderr.write(`[parity] ${error instanceof PreconditionError ? "precondition" : "infrastructure"} failure: ${error.stack || error.message}\n`);
      process.exit(2);
    },
  );
}

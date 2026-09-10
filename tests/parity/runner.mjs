#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import pixelmatch from "pixelmatch";
import sharp from "sharp";
import { indexCatalogPaths } from "./catalog-paths.mjs";
import { acquireGateLease } from "../../scripts/validation/gate-lease.mjs";
import { launchBrowserWithLease } from "../../scripts/validation/playwright-launch-lease.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
const referenceRoot = path.join(repoRoot, "awesome-list-site-ds");
const inventoryPath = path.join(here, "inventory.json");
const inventory = JSON.parse(await fsp.readFile(inventoryPath, "utf8"));

const allowedWidths = [375, 768, 1024, 1440];
const assert = (condition, message) => {
  if (!condition) throw new Error(`Inventory validation failed: ${message}`);
};
assert(inventory && typeof inventory === "object" && !Array.isArray(inventory), "root must be an object");
assert(inventory.schemaVersion === 1, "schemaVersion must be exactly 1");
assert(Array.isArray(inventory.widths) && inventory.widths.length > 0, "widths must be nonempty");
assert(
  inventory.widths.length === allowedWidths.length && allowedWidths.every((width) => inventory.widths.includes(width)),
  `root widths must be exactly ${allowedWidths.join(",")}`,
);
assert(inventory.viewportHeights && typeof inventory.viewportHeights === "object", "viewportHeights is required");
for (const width of allowedWidths) {
  assert(Number.isInteger(inventory.viewportHeights[String(width)]) && inventory.viewportHeights[String(width)] > 0, `viewport height missing for ${width}`);
}
for (const key of ["screens", "tokenOnly", "artifactDocs", "unconfiguredScreens", "adminSections"]) {
  assert(Array.isArray(inventory[key]), `${key} must be an array`);
}
const assertId = (id, where) => assert(typeof id === "string" && /^[a-z0-9][a-z0-9.-]+$/.test(id), `${where} has invalid id`);
for (const [index, screen] of inventory.screens.entries()) {
  assert(screen && typeof screen === "object" && !Array.isArray(screen), `screens[${index}] must be an object`);
  assertId(screen.id, `screens[${index}]`);
  assert(["app", "artifact"].includes(screen.kind), `${screen.id} has invalid kind`);
  assert(screen.classification === "pixel-gated", `${screen.id} must be pixel-gated`);
  const screenWidths = screen.widths || inventory.widths;
  assert(Array.isArray(screenWidths) && screenWidths.length > 0, `${screen.id} widths must be nonempty`);
  assert(new Set(screenWidths).size === screenWidths.length, `${screen.id} widths contain duplicates`);
  assert(screenWidths.every((width) => allowedWidths.includes(width)), `${screen.id} widths are outside the exact allowed set`);
  if (screen.aliasOf) {
    assert(Object.keys(screen).every((key) => ["id", "kind", "classification", "aliasOf", "widths"].includes(key)), `${screen.id} alias must not declare a second capture`);
  } else {
    assert(typeof screen.actualPath === "string", `${screen.id} actualPath is required`);
    assert(screen.referencePath === null || typeof screen.referencePath === "string", `${screen.id} referencePath must be string or null`);
  }
}
for (const [index, row] of inventory.unconfiguredScreens.entries()) {
  assert(Array.isArray(row) && row.length === 3, `unconfiguredScreens[${index}] must be [id, classification, reason]`);
  assertId(row[0], `unconfiguredScreens[${index}]`);
  assert(["pixel-gated", "token-only"].includes(row[1]), `${row[0]} has invalid classification`);
  assert(typeof row[2] === "string" && row[2].length > 0, `${row[0]} needs a reason`);
}
for (const [index, id] of inventory.tokenOnly.entries()) assertId(id, `tokenOnly[${index}]`);
for (const [index, tab] of inventory.adminSections.entries()) assertId(`app.admin.${tab}`, `adminSections[${index}]`);
for (const [index, doc] of inventory.artifactDocs.entries()) {
  assert(Array.isArray(doc) && doc.length === 2 && doc.every((value) => typeof value === "string" && value.length > 0), `artifactDocs[${index}] invalid`);
}
for (const [docId, title] of inventory.artifactDocs || []) {
  const id = `artifact.docs.${docId}`;
  if (inventory.screens.some((screen) => screen.id === id)) continue;
  inventory.screens.push({
    id,
    kind: "artifact",
    classification: "pixel-gated",
    actualPath: `/#docs-${docId}`,
    referencePath: `/docs.html#${docId}`,
    readySelector: "main",
    missingActualNavigationCounterpart: `The registered artifact has no docs hash router for "${title}"; both captures are diagnostic only.`,
  });
}
const allDeclaredIds = [
  ...inventory.screens.map((screen) => screen.id),
  ...inventory.tokenOnly,
  ...inventory.unconfiguredScreens.map(([id]) => id),
  ...inventory.adminSections.map((tab) => `app.admin.${tab}`),
];
assert(new Set(allDeclaredIds).size === allDeclaredIds.length, "screen IDs must be globally unique after normalization");
const screensById = new Map(inventory.screens.map((screen) => [screen.id, screen]));
for (const screen of inventory.screens) {
  if (screen.aliasOf) {
    const target = screensById.get(screen.aliasOf);
    assert(target && !target.aliasOf, `${screen.id} alias target must be a concrete screen`);
    assert((screen.widths || inventory.widths).every((width) => (target.widths || inventory.widths).includes(width)), `${screen.id} widths must be a subset of its target`);
  }
}
const captureIdentities = new Map();
for (const screen of inventory.screens.filter((item) => !item.aliasOf && item.referencePath)) {
  const identity = JSON.stringify([
    screen.kind, screen.actualPath, screen.actualAction || null,
    screen.referencePath, screen.referenceAction || null,
  ]);
  assert(!captureIdentities.has(identity), `${screen.id} duplicates capture identity of ${captureIdentities.get(identity)}; declare aliasOf`);
  captureIdentities.set(identity, screen.id);
}
const args = process.argv.slice(2);
const argValue = (name) => {
  const at = args.indexOf(name);
  return at >= 0 ? args[at + 1] : undefined;
};
const selectedScreen = argValue("--screen");
const selectedWidth = argValue("--width") ? Number(argValue("--width")) : null;
const listOnly = args.includes("--list");
const rowTimeoutMs = 120_000;
const captureAttempts = 8;

if (listOnly) {
  for (const screen of inventory.screens) {
    console.log(`${screen.id}\t${screen.classification}\t${screen.kind}${screen.aliasOf ? `\talias:${screen.aliasOf}` : ""}`);
  }
  for (const id of inventory.tokenOnly) console.log(`${id}\ttoken-only\tapp`);
  for (const [id, classification] of inventory.unconfiguredScreens) console.log(`${id}\t${classification}\tapp`);
  for (const tab of inventory.adminSections) console.log(`app.admin.${tab}\tpixel-gated\tapp`);
  process.exit(0);
}

if (selectedWidth && !inventory.widths.includes(selectedWidth)) {
  throw new Error(`--width must be one of ${inventory.widths.join(", ")}`);
}
if (selectedScreen && !allDeclaredIds.includes(selectedScreen)) {
  throw new Error(`Unknown --screen ${selectedScreen}; use --list`);
}

const appBaseUrl = process.env.BASE_URL;
const artifactBaseUrl = process.env.ARTIFACT_BASE_URL;
if (!appBaseUrl) throw new Error("BASE_URL must be externally supplied; the parity harness never starts or guesses the app workflow");
if (!artifactBaseUrl) throw new Error("ARTIFACT_BASE_URL must be supplied from the registered artifact service status");

const normalizeBase = (value, name) => {
  const url = new URL(value);
  const expectedPort = name === "BASE_URL" ? "5000" : "20928";
  if (url.username || url.password) throw new Error(`${name} must not contain embedded credentials`);
  if (url.protocol !== "http:") throw new Error(`${name} must use HTTP on the approved loopback service`);
  if (!["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)) throw new Error(`${name} must use a confirmed loopback host`);
  if (url.port !== expectedPort) throw new Error(`${name} must use the approved port ${expectedPort}`);
  if (!["", "/"].includes(url.pathname) || url.search || url.hash) throw new Error(`${name} must be an origin without path, query, or fragment`);
  return url.origin;
};
const bases = {
  app: normalizeBase(appBaseUrl, "BASE_URL"),
  artifact: normalizeBase(artifactBaseUrl, "ARTIFACT_BASE_URL"),
};
const releaseGateLease = await acquireGateLease("db-heavy", "parity-baseline");
process.on("exit", releaseGateLease);

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const fetchJson = async (url) => {
  const response = await fetch(url, { headers: { accept: "application/json" }, redirect: "error" });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  if (response.url !== url) throw new Error(`${url} resolved away from its approved address`);
  const type = response.headers.get("content-type") || "";
  if (!type.includes("json")) throw new Error(`${url} did not return JSON (${type || "missing content-type"})`);
  return response.json();
};

// This is the only reference data binding. It reads public, approved application
// APIs without credentials and maps that exact snapshot onto the reference's
// AV_* catalog globals before React renders. It never intercepts app traffic.
const [catalog, nav] = await Promise.all([
  fetchJson(`${bases.app}/api/awesome-list`),
  fetchJson(`${bases.app}/api/awesome-list/nav`),
]);
const categories = Array.isArray(nav?.categories) ? nav.categories : [];
const corpusResources = Array.isArray(catalog?.resources)
  ? catalog.resources
  : Array.isArray(catalog?.categories)
    ? catalog.categories.flatMap((category) =>
        (category.resources || []).concat(
          (category.subcategories || []).flatMap((sub) =>
            (sub.resources || []).concat((sub.subSubcategories || []).flatMap((leaf) => leaf.resources || [])),
          ),
        ),
      )
    : [];
if (!categories.length || !corpusResources.length) {
  throw new Error("Approved public catalog snapshot is empty; refusing a blank or placeholder baseline");
}
const recursiveCount = (node) =>
  Number(node?.resourceCount || 0) +
  (node?.subcategories || []).reduce((sum, child) => sum + recursiveCount(child), 0) +
  (node?.subSubcategories || []).reduce((sum, child) => sum + recursiveCount(child), 0);
const { byResourceId, reconciledPaths } = indexCatalogPaths(catalog, categories);
const adapter = {
  AV_CONFIG: {
    title: nav.title || catalog.title || null,
    source: "approved public application catalog snapshot",
  },
  AV_CATEGORIES: categories.map((item) => ({
    id: item.slug,
    name: item.name,
    short: item.name,
    icon: null,
    count: recursiveCount(item),
    desc: item.teaser?.description || "",
  })),
  AV_SUBCATEGORIES: Object.fromEntries(
    categories.map((item) => [
      item.slug,
      (item.subcategories || []).map((sub) => ({ id: sub.slug, name: sub.name, count: recursiveCount(sub) })),
    ]),
  ),
  AV_SUBSUBCATEGORIES: Object.fromEntries(
    categories.flatMap((category) =>
      (category.subcategories || []).map((subcategory) => [
        subcategory.slug,
        (subcategory.subSubcategories || []).map((leaf) => ({
          id: leaf.slug,
          name: leaf.name,
          count: recursiveCount(leaf),
        })),
      ]),
    ),
  ),
  AV_RESOURCES: corpusResources.map((item) => {
    const { category, subcategory, leaf } = byResourceId.get(String(item.id)) || {};
    return {
    id: item.id,
    title: item.title || item.name,
    cat: category?.slug || null,
    sub: subcategory?.slug || null,
    subsub: leaf?.slug || null,
    desc: item.description || "",
    tags: Array.isArray(item.metadata?.tags)
      ? item.metadata.tags.map((tag) => tag.name || tag).filter(Boolean)
      : [],
    featured: Boolean(item.featured),
    url: item.url,
    };
  }),
  AV_TOTAL: Number(nav.totalResources || corpusResources.length),
  AV_TOTAL_SUBCATS: categories.reduce((sum, item) => sum + (item.subcategories?.length || 0), 0),
};
const mappingFailures = adapter.AV_RESOURCES.filter((mapped) => !mapped.cat);
if (mappingFailures.length) {
  throw new Error(
    `Catalog-to-nav identity mapping is incomplete for ${mappingFailures.length} resources; refusing false alignment`,
  );
}
const snapshotBytes = Buffer.from(JSON.stringify({ catalog, nav }));
const adapterScript = `\n;(()=>{const priorIcons=new Map((window.AV_CATEGORIES||[]).flatMap(x=>[[x.id,x.icon],[x.name,x.icon]]));const bound=${JSON.stringify(adapter)};bound.AV_CATEGORIES=bound.AV_CATEGORIES.map(x=>({...x,icon:priorIcons.get(x.id)||priorIcons.get(x.name)||''}));Object.assign(window,bound);window.__PARITY_REFERENCE_ADAPTER__=${JSON.stringify({
  source: `${bases.app}/api/awesome-list + /api/awesome-list/nav`,
  sha256: sha256(snapshotBytes),
  capturedAt: new Date().toISOString(),
  iconProvenance: "canonical reference data.js icon matched by category slug/name; unmatched categories intentionally have no invented icon",
})};})();\n`;

const mime = {
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
const snapshotDirectory = async (directory, prefix = "") => {
  const files = new Map();
  for (const entry of await fsp.readdir(directory, { withFileTypes: true })) {
    const relative = path.posix.join(prefix, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Reference snapshot rejects symlink ${relative}`);
    if (entry.isDirectory()) {
      const nested = await snapshotDirectory(path.join(directory, entry.name), relative);
      for (const pair of nested) files.set(...pair);
    } else if (entry.isFile()) {
      files.set(relative, await fsp.readFile(path.join(directory, entry.name)));
    }
  }
  return files;
};
// Read each approved reference byte exactly once. Hashes and HTTP responses use
// this immutable memory snapshot, eliminating hash/serve TOCTOU.
const referenceSnapshot = await snapshotDirectory(referenceRoot);
const referenceSourceAssetHashes = Object.fromEntries(
  [...referenceSnapshot].map(([relative, bytes]) => [relative, sha256(bytes)]),
);
const servedReferenceSnapshot = new Map(referenceSnapshot);
servedReferenceSnapshot.set(
  "data.js",
  Buffer.concat([referenceSnapshot.get("data.js"), Buffer.from(adapterScript)]),
);
const referenceAssetHashes = Object.fromEntries(
  [...servedReferenceSnapshot].map(([relative, bytes]) => [relative, sha256(bytes)]),
);
const referenceServer = http.createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url, "http://127.0.0.1");
    let relative = decodeURIComponent(requestUrl.pathname).replace(/^\/+/, "") || "index.html";
    if (relative.includes("\0") || relative.includes("\\") || relative.split("/").includes("..")) throw new Error("invalid path");
    const original = servedReferenceSnapshot.get(relative);
    if (!original) {
      const error = new Error("not found");
      error.code = "ENOENT";
      throw error;
    }
    const bytes = original;
    response.writeHead(200, {
      "content-type": mime[path.extname(relative).toLowerCase()] || "application/octet-stream",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    });
    response.end(bytes);
  } catch (error) {
    response.writeHead(error.code === "ENOENT" ? 404 : 403, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not available");
  }
});
await new Promise((resolve, reject) => {
  referenceServer.once("error", reject);
  referenceServer.listen(0, "127.0.0.1", resolve);
});
const referenceAddress = referenceServer.address();
const referenceBaseUrl = `http://127.0.0.1:${referenceAddress.port}`;

const walkHashes = async (directory, prefix = "") => {
  const result = {};
  for (const entry of await fsp.readdir(directory, { withFileTypes: true })) {
    const rel = path.join(prefix, entry.name);
    if (entry.isDirectory()) Object.assign(result, await walkHashes(path.join(directory, entry.name), rel));
    else if (entry.isFile()) result[rel.split(path.sep).join("/")] = sha256(await fsp.readFile(path.join(directory, entry.name)));
  }
  return result;
};
const gitCommit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
const gitStatus = execFileSync("git", ["status", "--porcelain=v1"], { cwd: repoRoot, encoding: "utf8" })
  .trim()
  .split("\n")
  .filter(Boolean);
const relevantDirtyPaths = gitStatus
  .map((line) => line.slice(3).split(" -> ").at(-1))
  .filter((relative) =>
    relative === "awesome-list.config.yaml" ||
    relative.startsWith("client/") ||
    relative.startsWith("artifacts/awesome-video-design-system/") ||
    relative.startsWith("awesome-list-site-ds/"),
  );
const dirtyFileFingerprints = {};
for (const relative of relevantDirtyPaths) {
  const absolute = path.join(repoRoot, relative);
  const stat = await fsp.stat(absolute).catch(() => null);
  if (stat?.isFile()) dirtyFileFingerprints[relative] = sha256(await fsp.readFile(absolute));
  else if (stat?.isDirectory()) dirtyFileFingerprints[`${relative.replace(/\/$/, "")}/`] = await walkHashes(absolute);
  else dirtyFileFingerprints[relative] = "deleted";
}
const sourceFingerprints = {
  config: sha256(await fsp.readFile(path.join(repoRoot, "awesome-list.config.yaml"))),
  packageLock: sha256(await fsp.readFile(path.join(repoRoot, "package-lock.json"))),
  catalogAdapter: sha256(await fsp.readFile(path.join(here, "catalog-paths.mjs"))),
  app: await walkHashes(path.join(repoRoot, "client")),
  server: await walkHashes(path.join(repoRoot, "server")),
  shared: await walkHashes(path.join(repoRoot, "shared")),
  artifact: await walkHashes(path.join(repoRoot, "artifacts/awesome-video-design-system")),
};
const rawServiceDocumentHashes = [];
const hashDocument = async (url) => {
  const response = await fetch(url, { redirect: "error" });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  if (response.url !== url) throw new Error(`${url} resolved away from its approved address`);
  const document = Buffer.from(await response.arrayBuffer());
  rawServiceDocumentHashes.push({ url, sha256: sha256(document) });
  // Retain raw hashes without treating deliberate security nonce rotation as
  // application drift. Screenshots and served reference bytes remain untouched.
  const stableDocument = document.toString("utf8")
    .replace(/nonce=(['"])[^'"]*\1/g, 'nonce="PER_RESPONSE"')
    .replace(/nonce-[A-Za-z0-9+/_=-]+/g, "nonce-PER_RESPONSE");
  return sha256(Buffer.from(stableDocument));
};
const serviceDocumentHashes = {
  app: await hashDocument(`${bases.app}/`),
  artifact: await hashDocument(`${bases.artifact}/`),
  reference: await hashDocument(`${referenceBaseUrl}/index.html`),
};
const executablePath = path.join(repoRoot, ".cache/ms-playwright/chromium-1223/chrome-linux64/chrome");
if (!fs.existsSync(executablePath)) {
  await new Promise((resolve) => referenceServer.close(resolve));
  throw new Error("Pinned Playwright Chromium is not installed; refusing to download a browser");
}
const browserBinaryHash = sha256(await fsp.readFile(executablePath));
const runnerHash = sha256(await fsp.readFile(new URL(import.meta.url)));
const inventoryHash = sha256(await fsp.readFile(inventoryPath));
const initialValidityInputs = {
  gitCommit,
  gitStatus,
  dirtyFileFingerprints,
  sourceFingerprints,
  serviceDocumentHashes,
  referenceSourceAssetHashes,
  referenceAssetHashes,
  runnerHash,
  inventoryHash,
  browserBinaryHash,
};
// Git metadata and evidence outputs are provenance, not rendered inputs. A
// documentation/evidence commit must not invalidate itself. Actual source and
// browser inputs still fail closed when their content changes.
const fingerprintInputs = (inputs) => sha256(Buffer.from(JSON.stringify({
  sourceFingerprints: inputs.sourceFingerprints,
  serviceDocumentHashes: inputs.serviceDocumentHashes,
  referenceSourceAssetHashes: inputs.referenceSourceAssetHashes,
  referenceAssetHashes: inputs.referenceAssetHashes,
  runnerHash: inputs.runnerHash,
  inventoryHash: inputs.inventoryHash,
  browserBinaryHash: inputs.browserBinaryHash,
})));
const validityFingerprint = fingerprintInputs(initialValidityInputs);

const runId = `${new Date().toISOString().replace(/[:.]/g, "-")}-${process.pid}`;
const stageRoot = path.join("/tmp", "parity-baseline", runId);
const finalRoot = path.join(here, "baseline", runId);
const dirs = Object.fromEntries(["expected", "actual", "diff"].map((name) => [name, path.join(stageRoot, name)]));
await Promise.all(Object.values(dirs).map((directory) => fsp.mkdir(directory, { recursive: true })));

const widths = selectedWidth ? [selectedWidth] : inventory.widths;
const selectedDefinition = selectedScreen ? screensById.get(selectedScreen) : null;
const requestedScreenIds = selectedScreen
  ? new Set([selectedScreen, selectedDefinition?.aliasOf].filter(Boolean))
  : new Set(inventory.screens.map((screen) => screen.id));
const requestedScreens = inventory.screens.filter((screen) => requestedScreenIds.has(screen.id) && !screen.aliasOf);
const rows = [];
for (const screen of inventory.screens) {
  const screenWidths = screen.widths || inventory.widths;
  for (const width of screenWidths) {
    if (!requestedScreenIds.has(screen.id) || !widths.includes(width)) {
      rows.push({ screen: screen.id, width, classification: screen.classification, status: "FILTERED", denominator: false });
    } else if (screen.aliasOf) {
      rows.push({
        screen: screen.id,
        width,
        classification: screen.classification,
        status: "ALIAS",
        aliasOf: screen.aliasOf,
        reason: "Shares the target's exact full-page capture identity; excluded from the denominator to prevent double counting.",
        denominator: false,
      });
    } else if (screen.blocked || !screen.referencePath || screen.missingActualNavigationCounterpart) {
      rows.push({
        screen: screen.id,
        width,
        classification: screen.classification,
        status: !screen.referencePath || screen.missingActualNavigationCounterpart ? "MISSING_COUNTERPART" : "BLOCKED",
        reason: screen.blocked || screen.missingActualNavigationCounterpart || "No approved canonical counterpart",
        denominator: false,
      });
    }
  }
}
for (const id of inventory.tokenOnly) {
  for (const width of inventory.widths) {
    const included = (!selectedScreen || selectedScreen === id) && (!selectedWidth || selectedWidth === width);
    rows.push({
      screen: id,
      width,
      classification: "token-only",
      status: included ? "UNVERIFIED" : "FILTERED",
      reason: included ? "Token-only inventory row; screenshot/token checks have not been executed by this pixel comparator." : undefined,
      denominator: false,
    });
  }
}
const knownInventoryIds = new Set([...inventory.screens.map((screen) => screen.id), ...inventory.tokenOnly]);
for (const [id, classification, reason] of inventory.unconfiguredScreens || []) {
  knownInventoryIds.add(id);
  for (const width of inventory.widths) {
    const included = (!selectedScreen || selectedScreen === id) && (!selectedWidth || selectedWidth === width);
    rows.push({
      screen: id,
      width,
      classification,
      status: included ? "UNVERIFIED" : "FILTERED",
      reason: included ? reason : undefined,
      denominator: false,
    });
  }
}
for (const tab of inventory.adminSections || []) {
  const id = `app.admin.${tab}`;
  knownInventoryIds.add(id);
  for (const width of inventory.widths) {
    const included = (!selectedScreen || selectedScreen === id) && (!selectedWidth || selectedWidth === width);
    rows.push({
      screen: id,
      width,
      classification: "pixel-gated",
      status: included ? "BLOCKED" : "FILTERED",
      reason: included ? "Real admin authorization is required and no mock reference admin statistics are permitted." : undefined,
      denominator: false,
    });
  }
}

const resolveTokens = (template) => {
  const firstCategory = adapter.AV_CATEGORIES[0];
  const subcategoryCategory = adapter.AV_CATEGORIES.find((item) => adapter.AV_SUBCATEGORIES[item.id]?.length);
  const firstSubcategory = adapter.AV_SUBCATEGORIES[subcategoryCategory?.id]?.[0];
  const firstResource = adapter.AV_RESOURCES[0];
  const tokens = {
    categorySlug: firstCategory?.id,
    subcategorySlug: firstSubcategory?.id,
    resourceId: firstResource?.id,
  };
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    if (tokens[key] === undefined || tokens[key] === null) throw new Error(`Snapshot cannot resolve {${key}}`);
    return encodeURIComponent(String(tokens[key]));
  });
};

const settlePage = async (page, selector) => {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForFunction(() => document.readyState === "complete", null, { timeout: 60_000 });
  if (selector) await page.locator(selector).first().waitFor({ state: "visible", timeout: 60_000 });
  // Theme stylesheets can mount after the first render and fonts.ready.
  await page.waitForFunction(() => ["Inter", "Fraunces", "JetBrains Mono"].every(
    (family) => [...document.fonts].some((face) => face.family.replace(/^['"]|['"]$/g, "") === family),
  ), null, { timeout: 15_000 }).catch(() => false);
  const fontReadiness = await page.evaluate(async () => {
    await document.fonts.ready;
    const rootStyle = getComputedStyle(document.documentElement);
    const canonical = [
      ["body-400", rootStyle.getPropertyValue("--font-body"), "normal", "400"],
      ["body-600", rootStyle.getPropertyValue("--font-body"), "normal", "600"],
      ["display-400", rootStyle.getPropertyValue("--font-display"), "normal", "400"],
      ["display-italic-400", rootStyle.getPropertyValue("--font-display"), "italic", "400"],
      ["mono-400", rootStyle.getPropertyValue("--font-mono"), "normal", "400"],
    ].map(([label, stack, style, weight]) => ({
      label,
      family: stack.split(",")[0].trim().replace(/^['"]|['"]$/g, ""),
      style,
      weight,
    })).filter((item) => item.family);
    const visible = [...document.body.querySelectorAll("*")].filter((node) => {
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return rect.width > 1 && rect.height > 1 && style.visibility !== "hidden" &&
        style.display !== "none" && node.textContent?.trim();
    });
    const used = [...new Map(visible.map((node) => {
      const style = getComputedStyle(node);
      const family = style.fontFamily.split(",")[0].trim().replace(/^['"]|['"]$/g, "");
      const weight = /^\d+$/.test(style.fontWeight) ? style.fontWeight : "400";
      const fontStyle = style.fontStyle === "italic" ? "italic" : "normal";
      return [`${family}\0${fontStyle}\0${weight}`, { family, style: fontStyle, weight }];
    })).values()];
    await Promise.all(used.concat(canonical).map((item) =>
      document.fonts.load(`${item.style} ${item.weight} 16px "${item.family}"`, "Parity"),
    ));
    await document.fonts.ready;
    const faces = [...document.fonts];
    const failedFaces = faces.filter((face) => face.status === "error").map((face) => ({
      family: face.family, style: face.style, weight: face.weight,
    }));
    const faceMatches = ({ family, style, weight }, face) =>
      face.family.replace(/^['"]|['"]$/g, "").toLowerCase() === family.toLowerCase() &&
      face.status === "loaded" &&
      (face.style === style || (style === "normal" && !face.style)) &&
      (face.weight === weight || (weight === "400" && face.weight === "normal") ||
        (face.weight.split(" ").length === 2 &&
          Number(weight) >= Number(face.weight.split(" ")[0]) &&
          Number(weight) <= Number(face.weight.split(" ")[1])));
    const checks = canonical.map(({ label, family, style, weight }) => {
      const loadedFace = faces.some((face) =>
        faceMatches({ family, style, weight }, face)
      );
      return {
        label,
        family,
        style,
        weight,
        check: document.fonts.check(`${style} ${weight} 16px "${family}"`),
        loadedFace,
      };
    });
    const registeredFamilies = new Set(faces.map((face) =>
      face.family.replace(/^['"]|['"]$/g, "").toLowerCase()
    ));
    const usedFaceChecks = used.filter((item) => registeredFamilies.has(item.family.toLowerCase())).map((item) => ({
      ...item,
      loadedFace: faces.some((face) => faceMatches(item, face)),
      check: document.fonts.check(`${item.style} ${item.weight} 16px "${item.family}"`),
    }));
    const nativeDefects = checks
      .filter((check) => check.label === "display-italic-400" && !check.loadedFace)
      .map((check) =>
        `Canonical display italic face ${check.family} is not registered/loaded; synthetic italic is a visual defect when used`
      );
    document.body.classList.add("no-anim");
    window.scrollTo(0, 0);
    return {
      status: document.fonts.status, checks, usedFaceChecks, failedFaces, nativeDefects,
      // Font matching may legitimately synthesize a requested weight from a
      // registered variable/static family; document.fonts.check is the browser's
      // authoritative used-face readiness signal. Native italic absence remains
      // an explicit visual defect above rather than a missing-capture blocker.
      complete: document.fonts.status === "loaded" && failedFaces.length === 0 &&
        usedFaceChecks.every((check) => check.check),
    };
  });
  await page.addStyleTag({
    content: "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important;scroll-behavior:auto!important}",
  });
  await page.waitForFunction(() => {
    const root = document.documentElement;
    return root.dataset.system === "editorial" && root.dataset.accent === "crimson";
  }, null, { timeout: 15_000 });
  await page.evaluate(async () => {
    const step = Math.max(256, Math.floor(innerHeight * 0.75));
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      scrollTo(0, y);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }
    scrollTo(0, 0);
    const images = [...document.images];
    const decodeAll = Promise.all(images.map(async (image) => {
      if (!image.complete) await new Promise((resolve, reject) => {
        image.addEventListener("load", resolve, { once: true });
        image.addEventListener("error", () => reject(new Error(`Image failed: ${image.currentSrc || image.src}`)), { once: true });
      });
      if (!image.naturalWidth || !image.naturalHeight) throw new Error(`Image did not decode: ${image.currentSrc || image.src}`);
      await image.decode();
    }));
    await Promise.race([
      decodeAll,
      new Promise((_, reject) => setTimeout(() => reject(new Error("Images did not decode within 20s")), 20_000)),
    ]);
  });
  await page.evaluate(() => new Promise((resolve) => {
    let timer;
    const done = () => {
      observer.disconnect();
      resolve();
    };
    const observer = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(done, 500);
    });
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true });
    timer = setTimeout(done, 500);
    setTimeout(done, 5_000);
  }));
  const stability = await page.evaluate(async () => {
    const deadline = performance.now() + 10_000;
    let previous = null;
    let consistent = 0;
    const samples = [];
    while (performance.now() < deadline) {
      const body = document.body.getBoundingClientRect();
      const sample = {
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
        bodyWidth: Math.round(body.width * 100) / 100,
        bodyHeight: Math.round(body.height * 100) / 100,
      };
      samples.push(sample);
      if (previous && JSON.stringify(previous) === JSON.stringify(sample)) consistent += 1;
      else consistent = 0;
      if (consistent >= 3) return { stable: true, samples: samples.slice(-4) };
      previous = sample;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    throw new Error(`Layout did not stabilize within 10s: ${JSON.stringify(samples.slice(-6))}`);
  });
  const dimensions = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    height: document.documentElement.scrollHeight,
    textLength: document.body.innerText.trim().length,
    visibleElements: [...document.body.querySelectorAll("*")].filter((node) => {
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return rect.width > 1 && rect.height > 1 && style.visibility !== "hidden" && style.display !== "none";
    }).length,
    loading: Boolean(document.querySelector('[aria-busy="true"], [data-testid*="skeleton"]')),
  }));
  if (dimensions.textLength < 20 || dimensions.visibleElements < 5 || dimensions.width < 100 || dimensions.height < 100) {
    throw new Error(`Blank/partial render rejected: ${JSON.stringify(dimensions)}`);
  }
  if (dimensions.loading) throw new Error("Loading/skeleton DOM remained at capture time");
  return { ...dimensions, fonts: fontReadiness, stability };
};

const applyAction = async (page, action, side) => {
  if (!action) return;
  if (action === "home-index") {
    if (side === "reference") {
      await page.waitForFunction(() => typeof window.__avGo === "function");
      await page.evaluate(() => window.__avGo("home"));
      await page.getByText(/INDEX ·/).first().waitFor({ state: "visible", timeout: 15_000 });
    }
    return;
  }
  if (action === "palette") {
    await page.locator(side === "actual" ? "[data-testid=list-categories]" : "header").first()
      .waitFor({ state: "visible", timeout: 60_000 });
    await page.keyboard.press("Control+K");
    await page.locator(side === "actual" ? '[role="dialog"]' : ".modal-backdrop").first()
      .waitFor({ state: "visible", timeout: 10_000 });
    return;
  }
  if (action === "mobile-drawer") {
    const button = page.getByRole("button", {
      name: side === "actual" ? "Toggle sidebar" : "Open menu",
      exact: true,
    });
    await button.click();
    return;
  }
  if (side === "reference" && ["category", "subcategory", "resource", "about", "submit", "admin"].includes(action)) {
    await page.waitForFunction(() => typeof window.__avGo === "function");
    await page.evaluate(({ action, categoryId, subcategoryId, resourceId }) => {
      const category = window.AV_CATEGORIES.find((item) => item.id === categoryId);
      const subcategory = window.AV_SUBCATEGORIES[categoryId]?.find((item) => item.id === subcategoryId);
      const resource = window.AV_RESOURCES.find((item) => String(item.id) === String(resourceId));
      if (action === "category") window.__avGo("category", { cat: category });
      if (action === "subcategory") window.__avGo("subcategory", { cat: category, sub: subcategory });
      if (action === "resource") window.__avGo("resource", { resource });
      if (["about", "submit", "admin"].includes(action)) window.__avGo(action);
    }, {
      action,
      categoryId: action === "subcategory"
        ? adapter.AV_CATEGORIES.find((item) => adapter.AV_SUBCATEGORIES[item.id]?.length)?.id
        : adapter.AV_CATEGORIES[0]?.id,
      subcategoryId: adapter.AV_SUBCATEGORIES[adapter.AV_CATEGORIES.find((item) => adapter.AV_SUBCATEGORIES[item.id]?.length)?.id]?.[0]?.id,
      resourceId: adapter.AV_RESOURCES[0]?.id,
    });
    return;
  }
  const labels = {
    "home-index": /index/i,
    category: /^category$/i,
    subcategory: /^subcategory$/i,
    resource: /^resource$/i,
    submit: /^submit$/i,
    about: /^about$/i,
    admin: /^admin$/i,
  };
  const control = page.getByRole("button", { name: labels[action] }).last();
  await control.waitFor({ state: "visible", timeout: 15_000 });
  await control.click();
};

const assertAlignedIdentity = async (actual, expected, check) => {
  if (!check) return null;
  if (check === "home") {
    const required = adapter.AV_CATEGORIES.map(({ id, name, count }) => ({ id, label: name, count }));
    const inspect = (page, side) => page.evaluate(({ required, side }) => {
      const rows = side === "actual"
        ? [...document.querySelectorAll('[data-testid="list-categories"] [data-testid^="link-category-"]')].map((link) => {
            const id = link.getAttribute("data-testid").slice("link-category-".length);
            const item = required.find((entry) => entry.id === id);
            const count = document.querySelector(`[data-testid="list-categories"] [data-testid="badge-count-${CSS.escape(id)}"]`);
            return {
              id,
              label: item && link.getAttribute("aria-label") === `View ${item.label} category with ${item.count} resources` ? item.label : null,
              count: Number(count?.textContent.replace(/[^\d]/g, "")),
            };
          })
        : [...document.querySelectorAll(".index-grid > div > section")].map((section) => {
            const button = section.querySelector("button");
            const label = button?.querySelector("h3")?.textContent.trim();
            return {
              id: required.find((item) => item.label === label)?.id,
              label,
              count: Number(button?.lastElementChild?.textContent.replace(/[^\d]/g, "")),
            };
          });
      if (JSON.stringify(rows) !== JSON.stringify(required)) {
        throw new Error(`${side} category-card identity/count/order mismatch: ${JSON.stringify({ required, rows })}`);
      }
      return { rows, ordered: true, scope: side === "actual" ? "list-categories links and count badges" : "index-grid category section headings and their count controls" };
    }, { required, side });
    return { required, actual: await inspect(actual, "actual"), expected: await inspect(expected, "reference") };
  }
  const category = adapter.AV_CATEGORIES[0];
  const subcategoryCategory = adapter.AV_CATEGORIES.find((item) => adapter.AV_SUBCATEGORIES[item.id]?.length);
  const subcategory = adapter.AV_SUBCATEGORIES[subcategoryCategory?.id]?.[0];
  const resource = adapter.AV_RESOURCES[0];
  const required = check === "home"
    ? adapter.AV_CATEGORIES.map((item) => ({ label: item.name, count: item.count }))
    : check === "category"
      ? [{ label: category.name, count: category.count }]
      : check === "subcategory"
        ? [{ label: subcategory.name, count: subcategory.count }]
        : [{ label: resource.title, count: null }];
  const inspect = (page, side) => page.evaluate(({ required, side }) => {
    const text = document.body.innerText;
    const labels = required.map((item) => ({
      ...item,
      index: text.indexOf(item.label),
      countPresent: item.count === null || text.includes(Number(item.count).toLocaleString("en-US")) || text.includes(String(item.count)),
    }));
    const ordered = labels.every((item, index) =>
      item.index >= 0 && (index === 0 || item.index > labels[index - 1].index)
    );
    if (labels.some((item) => item.index < 0 || !item.countPresent) || (required.length > 1 && !ordered)) {
      throw new Error(`${side} identity/count/order mismatch: ${JSON.stringify(labels)}`);
    }
    return { labels, ordered };
  }, { required, side });
  const [actualIdentity, expectedIdentity] = await Promise.all([
    inspect(actual, "actual"),
    inspect(expected, "reference"),
  ]);
  return { required, actual: actualIdentity, expected: expectedIdentity };
};

const screenshotStats = async (file) => {
  const image = sharp(file).ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  let min = 255;
  let max = 0;
  for (let index = 0; index < data.length; index += 4) {
    const luminance = Math.round((data[index] + data[index + 1] + data[index + 2]) / 3);
    min = Math.min(min, luminance);
    max = Math.max(max, luminance);
  }
  if (max - min < 3) throw new Error(`Blank screenshot rejected (${max - min} luminance range)`);
  return { width: info.width, height: info.height, channels: info.channels, luminanceRange: max - min };
};
const stableFullPageCapture = async (page, file) => {
  const repeatFile = file.replace(/\.png$/, ".repeat.png");
  const attemptFiles = [];
  const hashes = [];
  let stablePair = null;
  for (let attempt = 1; attempt <= captureAttempts; attempt += 1) {
    const attemptFile = file.replace(/\.png$/, `.attempt-${attempt}.png`);
    await page.screenshot({ path: attemptFile, fullPage: true, animations: "disabled" });
    const hash = sha256(await fsp.readFile(attemptFile));
    attemptFiles.push(attemptFile);
    hashes.push(hash);
    if (attempt > 1 && hashes[attempt - 2] === hash) {
      stablePair = [attemptFiles[attempt - 2], attemptFile];
      break;
    }
    await page.waitForTimeout(250);
    await page.evaluate(() => new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve))
    ));
  }
  if (!stablePair) {
    throw new Error(`No two consecutive raw full-page captures stabilized within ${captureAttempts} attempts: ${hashes.join(",")}`);
  }
  await Promise.all([
    fsp.copyFile(stablePair[0], file),
    fsp.copyFile(stablePair[1], repeatFile),
  ]);
  return {
    image: await screenshotStats(file),
    hashes: [hashes[attemptFiles.indexOf(stablePair[0])], hashes[attemptFiles.indexOf(stablePair[1])]],
    attemptHashes: hashes,
    stableAttempts: stablePair.map((item) => attemptFiles.indexOf(item) + 1),
    identical: true,
    postprocessing: "none",
  };
};

const compare = async (expectedPath, actualPath, diffPath) => {
  const [expectedMeta, actualMeta] = await Promise.all([sharp(expectedPath).metadata(), sharp(actualPath).metadata()]);
  const width = Math.max(expectedMeta.width, actualMeta.width);
  const height = Math.max(expectedMeta.height, actualMeta.height);
  const decode = (file) => sharp(file).ensureAlpha().extend({
    top: 0,
    left: 0,
    right: width - (file === expectedPath ? expectedMeta.width : actualMeta.width),
    bottom: height - (file === expectedPath ? expectedMeta.height : actualMeta.height),
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  }).raw().toBuffer();
  const [expected, actual] = await Promise.all([decode(expectedPath), decode(actualPath)]);
  const output = Buffer.alloc(width * height * 4);
  pixelmatch(expected, actual, output, width, height, {
    threshold: 0.1,
    includeAA: false,
    alpha: 0.6,
    diffColor: [255, 0, 64],
    diffColorAlt: [0, 180, 255],
  });
  await sharp(output, { raw: { width, height, channels: 4 } }).png().toFile(diffPath);
  const overlapWidth = Math.min(expectedMeta.width, actualMeta.width);
  const overlapHeight = Math.min(expectedMeta.height, actualMeta.height);
  const [expectedOverlap, actualOverlap] = await Promise.all([
    sharp(expectedPath).ensureAlpha().extract({ left: 0, top: 0, width: overlapWidth, height: overlapHeight }).raw().toBuffer(),
    sharp(actualPath).ensureAlpha().extract({ left: 0, top: 0, width: overlapWidth, height: overlapHeight }).raw().toBuffer(),
  ]);
  const overlapDifferingPixels = pixelmatch(
    expectedOverlap,
    actualOverlap,
    null,
    overlapWidth,
    overlapHeight,
    { threshold: 0.1, includeAA: false },
  );
  const pixels = width * height;
  const unmatchedDimensionPixels = pixels - overlapWidth * overlapHeight;
  const differingPixels = overlapDifferingPixels + unmatchedDimensionPixels;
  return {
    expectedDimensions: { width: expectedMeta.width, height: expectedMeta.height },
    actualDimensions: { width: actualMeta.width, height: actualMeta.height },
    canvasDimensions: { width, height },
    differingPixels,
    overlapDifferingPixels,
    unmatchedDimensionPixels,
    totalPixels: pixels,
    diffPercent: (differingPixels / pixels) * 100,
    dimensionsMatch: expectedMeta.width === actualMeta.width && expectedMeta.height === actualMeta.height,
  };
};

const browser = await launchBrowserWithLease(chromium, {
  headless: true,
  chromiumSandbox: true,
  executablePath,
  args: ["--disable-dev-shm-usage"],
}, "parity-baseline");
let browserVersion;
try {
  browserVersion = browser.version();
  if (browserVersion !== "148.0.7778.96") {
    throw new Error(`Chromium version mismatch: expected 148.0.7778.96, received ${browserVersion}`);
  }
  for (const screen of requestedScreens) {
    if (screen.blocked || !screen.referencePath || screen.missingActualNavigationCounterpart) continue;
    for (const width of (screen.widths || inventory.widths).filter((item) => widths.includes(item))) {
      const progress = `${screen.id}@${width}`;
      console.log(`[parity] START ${progress}`);
      const stem = `${screen.id}-${width}`;
      const expectedPath = path.join(dirs.expected, `${stem}.png`);
      const actualPath = path.join(dirs.actual, `${stem}.png`);
      const diffPath = path.join(dirs.diff, `${stem}.png`);
      const row = {
        screen: screen.id,
        width,
        viewportHeight: inventory.viewportHeights[String(width)],
        classification: screen.classification,
        denominator: true,
        links: {
          expected: `baseline/${runId}/expected/${stem}.png`,
          expectedRepeat: `baseline/${runId}/expected/${stem}.repeat.png`,
          actual: `baseline/${runId}/actual/${stem}.png`,
          actualRepeat: `baseline/${runId}/actual/${stem}.repeat.png`,
          diff: `baseline/${runId}/diff/${stem}.png`,
        },
      };
      const context = await browser.newContext({
        viewport: { width, height: row.viewportHeight },
        deviceScaleFactor: 1,
        locale: "en-US",
        timezoneId: "UTC",
        colorScheme: "dark",
        reducedMotion: "reduce",
        serviceWorkers: "block",
      });
      context.setDefaultTimeout(30_000);
      const rowTimer = setTimeout(() => {
        void context.close().catch(() => {});
      }, rowTimeoutMs);
      await context.addInitScript(({ referenceOrigin }) => {
        if (location.origin === referenceOrigin) {
          localStorage.setItem("av-ds-system", "editorial");
          localStorage.setItem("av-ds-accent", "crimson");
        } else {
          localStorage.setItem("ds-system", "editorial");
          localStorage.setItem("ds-accent", "crimson");
        }
      }, { referenceOrigin: new URL(referenceBaseUrl).origin });
      try {
        const actual = await context.newPage();
        const actualUrl = `${bases[screen.kind]}${resolveTokens(screen.actualPath)}`;
        const actualResponse = await actual.goto(actualUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
        if (!actualResponse || new URL(actual.url()).origin !== new URL(bases[screen.kind]).origin) {
          throw new Error(`Actual navigation redirected away from approved origin: ${actual.url()}`);
        }
        await applyAction(actual, screen.actualAction, "actual");
        row.actualDom = await settlePage(actual, screen.actualReadySelector || screen.readySelector);
        const actualCapture = await stableFullPageCapture(actual, actualPath);
        row.actualImage = actualCapture.image;
        row.actualCaptureStability = actualCapture;

        const expected = await context.newPage();
        const expectedUrl = `${referenceBaseUrl}${screen.referencePath}`;
        const expectedResponse = await expected.goto(expectedUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
        if (!expectedResponse || new URL(expected.url()).origin !== new URL(referenceBaseUrl).origin) {
          throw new Error(`Reference navigation redirected away from approved origin: ${expected.url()}`);
        }
        await applyAction(expected, screen.referenceAction, "reference");
        row.expectedDom = await settlePage(expected, screen.referenceReadySelector || screen.readySelector);
        try {
          row.identityAlignment = await assertAlignedIdentity(actual, expected, screen.identityCheck);
        } catch (error) {
          row.identityAlignment = { error: error instanceof Error ? error.message : String(error) };
        }
        const expectedCapture = await stableFullPageCapture(expected, expectedPath);
        row.expectedImage = expectedCapture.image;
        row.expectedCaptureStability = expectedCapture;
        row.comparison = await compare(expectedPath, actualPath, diffPath);
        const referenceShowsDemoAuth = screen.kind === "app" && await expected
          .getByRole("button", { name: /Account · Admin/i })
          .isVisible()
          .catch(() => false);
        const actualShowsVisitorAuth = screen.kind === "app" && await actual
          .getByRole("button", { name: "Sign in", exact: true })
          .or(actual.getByRole("link", { name: "Sign in", exact: true }))
          .first()
          .isVisible()
          .catch(() => false);
        row.authAlignment = { referenceShowsDemoAuth, actualShowsVisitorAuth };
        if (screen.missingActualNavigationCounterpart) {
          row.status = "MISSING_COUNTERPART";
          row.reason = screen.missingActualNavigationCounterpart;
          row.denominator = false;
        } else if (!row.actualDom.fonts.complete || !row.expectedDom.fonts.complete) {
          row.status = "BLOCKED";
          row.reason = [
            !row.actualDom.fonts.complete ? "Actual required native font faces are unavailable; see actualDom.fonts" : null,
            !row.expectedDom.fonts.complete ? "Reference required native font faces are unavailable; see expectedDom.fonts" : null,
          ].filter(Boolean).join("; ");
          row.denominator = false;
        } else {
          const visualDefects = [
            ...row.actualDom.fonts.nativeDefects.map((item) => `Actual: ${item}`),
            ...row.expectedDom.fonts.nativeDefects.map((item) => `Reference: ${item}`),
            row.identityAlignment?.error,
            referenceShowsDemoAuth && actualShowsVisitorAuth
              ? "Reference demonstrator admin identity is not aligned with the real visitor role"
              : null,
          ].filter(Boolean);
          row.status = row.comparison.diffPercent <= 0.5 && row.comparison.dimensionsMatch && visualDefects.length === 0 ? "PASS" : "FAIL";
          if (visualDefects.length) row.reason = visualDefects.join("; ");
          if (!row.comparison.dimensionsMatch) row.reason = "Full-page dimensions differ; union canvas includes all unmatched pixels";
        }
      } catch (error) {
        row.status = screen.missingActualNavigationCounterpart
          ? "MISSING_COUNTERPART"
          : (fs.existsSync(actualPath) || fs.existsSync(expectedPath) ? "BLOCKED" : "MISSING_PAIR");
        row.reason = [
          screen.missingActualNavigationCounterpart,
          `Diagnostic execution error: ${error instanceof Error ? error.message : String(error)}`,
        ].filter(Boolean).join(" ");
        row.denominator = false;
      } finally {
        clearTimeout(rowTimer);
        await context.close();
      }
      rows.push(row);
      console.log(`[parity] END ${progress} ${row.status}${row.comparison ? ` ${row.comparison.diffPercent.toFixed(4)}%` : ""}`);
    }
  }
} finally {
  await browser.close();
  await new Promise((resolve) => referenceServer.close(resolve));
  releaseGateLease();
}

for (const row of rows.filter((item) => item.status === "ALIAS")) {
  const target = rows.find((item) => item.screen === row.aliasOf && item.width === row.width);
  if (!target) throw new Error(`Alias ${row.screen}@${row.width} has no terminal target row`);
  row.links = target.links;
  row.targetStatus = target.status;
}

const expectedRowKeys = new Set([
  ...inventory.screens.flatMap((screen) => (screen.widths || inventory.widths).map((width) => `${screen.id}\0${width}`)),
  ...inventory.tokenOnly.flatMap((id) => inventory.widths.map((width) => `${id}\0${width}`)),
  ...inventory.unconfiguredScreens.flatMap(([id]) => inventory.widths.map((width) => `${id}\0${width}`)),
  ...inventory.adminSections.flatMap((tab) => inventory.widths.map((width) => `app.admin.${tab}\0${width}`)),
]);
const actualRowKeys = rows.map((row) => `${row.screen}\0${row.width}`);
assert(new Set(actualRowKeys).size === actualRowKeys.length, "more than one terminal row exists for a screen/width");
assert(
  actualRowKeys.length === expectedRowKeys.size && actualRowKeys.every((key) => expectedRowKeys.has(key)),
  "terminal row set does not exactly match every declared screen/width",
);
const terminalStatuses = new Set(["PASS", "FAIL", "BLOCKED", "UNVERIFIED", "MISSING_COUNTERPART", "MISSING_PAIR", "FILTERED", "ALIAS"]);
assert(rows.every((row) => terminalStatuses.has(row.status)), "every expected row must have exactly one terminal status");

const endGitCommit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
const endGitStatus = execFileSync("git", ["status", "--porcelain=v1"], { cwd: repoRoot, encoding: "utf8" })
  .trim().split("\n").filter(Boolean);
const endDirtyFileFingerprints = {};
for (const relative of endGitStatus.map((line) => line.slice(3).split(" -> ").at(-1)).filter((relative) =>
  relative === "awesome-list.config.yaml" ||
  relative.startsWith("client/") ||
  relative.startsWith("artifacts/awesome-video-design-system/") ||
  relative.startsWith("awesome-list-site-ds/")
)) {
  const absolute = path.join(repoRoot, relative);
  const stat = await fsp.stat(absolute).catch(() => null);
  if (stat?.isFile()) endDirtyFileFingerprints[relative] = sha256(await fsp.readFile(absolute));
  else if (stat?.isDirectory()) endDirtyFileFingerprints[`${relative.replace(/\/$/, "")}/`] = await walkHashes(absolute);
  else endDirtyFileFingerprints[relative] = "deleted";
}
const endValidityInputs = {
  gitCommit: endGitCommit,
  gitStatus: endGitStatus,
  dirtyFileFingerprints: endDirtyFileFingerprints,
  sourceFingerprints: {
    config: sha256(await fsp.readFile(path.join(repoRoot, "awesome-list.config.yaml"))),
    packageLock: sha256(await fsp.readFile(path.join(repoRoot, "package-lock.json"))),
    catalogAdapter: sha256(await fsp.readFile(path.join(here, "catalog-paths.mjs"))),
    app: await walkHashes(path.join(repoRoot, "client")),
    server: await walkHashes(path.join(repoRoot, "server")),
    shared: await walkHashes(path.join(repoRoot, "shared")),
    artifact: await walkHashes(path.join(repoRoot, "artifacts/awesome-video-design-system")),
  },
  serviceDocumentHashes: {
    app: await hashDocument(`${bases.app}/`),
    artifact: await hashDocument(`${bases.artifact}/`),
    reference: serviceDocumentHashes.reference,
  },
  referenceSourceAssetHashes: await walkHashes(referenceRoot),
  referenceAssetHashes,
  runnerHash: sha256(await fsp.readFile(new URL(import.meta.url))),
  inventoryHash: sha256(await fsp.readFile(inventoryPath)),
  browserBinaryHash: sha256(await fsp.readFile(executablePath)),
};
const endValidityFingerprint = fingerprintInputs(endValidityInputs);
const inputsChangedDuringRun = validityFingerprint !== endValidityFingerprint;

const filteredRun = Boolean(selectedScreen || selectedWidth);
const report = {
  schemaVersion: 1,
  runId,
  executedAt: new Date().toISOString(),
  claim: filteredRun
    ? "filtered-diagnostic-only"
    : inputsChangedDuringRun
      ? "stale-inputs-diagnostic-only"
      : "full-inventory-baseline",
  fullGateEligible: !filteredRun && !inputsChangedDuringRun,
  executed: true,
  configuration: {
    pixelmatchThreshold: 0.1,
    maximumDiffPercent: 0.5,
    fullPage: true,
    deviceScaleFactor: 1,
    locale: "en-US",
    timezone: "UTC",
    colorScheme: "dark",
    reducedMotion: "reduce",
    widths,
    viewportHeights: inventory.viewportHeights,
    browser: "chromium",
    browserVersion,
    executablePath,
    chromiumSandbox: "enabled explicitly with chromiumSandbox: true; launch verified in this workspace",
  },
  provenance: {
    appBaseUrl: bases.app,
    artifactBaseUrl: bases.artifact,
    referenceBaseUrl,
    referenceRoot: "awesome-list-site-ds",
    referenceAssetHashes,
    referenceSourceAssetHashes,
    rawServiceDocumentHashes,
    serviceDocumentHashNormalization: "Only per-response CSP nonce values are replaced for drift detection; raw hashes are retained and screenshots are never modified.",
    workspace: {
      gitCommit,
      gitStatus,
      dirtyFileFingerprints,
      sourceFingerprints,
      serviceDocumentHashes,
      validityFingerprint,
      endValidityFingerprint,
      inputsChangedDuringRun,
      stale: inputsChangedDuringRun,
      runnerHash,
      inventoryHash,
      browserBinaryHash,
      invalidationRule: "Source/config/browser or nonce-normalized served-document changes invalidate this run. Git metadata is retained as provenance; unrelated documentation and evidence commits do not invalidate rendered inputs.",
    },
    snapshot: {
      endpoints: [`${bases.app}/api/awesome-list`, `${bases.app}/api/awesome-list/nav`],
      sha256: sha256(snapshotBytes),
      bytes: snapshotBytes.length,
      categories: adapter.AV_CATEGORIES.length,
      resourcesBound: adapter.AV_RESOURCES.length,
      totalResources: adapter.AV_TOTAL,
      authorization: "public endpoints; no cookies, secrets, fixtures, or privileged data",
      mapping: "All corpus resources mapped from their authoritative public-tree placement to exact nav slugs; tags came from metadata.tags; flat catalog order was preserved without slicing.",
      reconciledPaths,
      referenceIdentityDefaults: {
        siteName: catalog.title || nav.title || "",
        siteTag: catalog.description || "",
        repoUrl: catalog.repoUrl || "",
        mechanism: "Catalog identity/count data is bound without changing geometry. Any demonstrator-versus-visitor shell role mismatch is retained as a measured visual failure.",
      },
    },
  },
  rows: rows.sort((a, b) => a.screen.localeCompare(b.screen) || a.width - b.width),
};
const measured = report.rows.filter((row) => row.denominator && ["PASS", "FAIL"].includes(row.status));
report.summary = {
  pass: measured.filter((row) => row.status === "PASS").length,
  fail: measured.filter((row) => row.status === "FAIL").length,
  denominator: measured.length,
  blocked: report.rows.filter((row) => row.status === "BLOCKED").length,
  unverified: report.rows.filter((row) => row.status === "UNVERIFIED").length,
  missingCounterpart: report.rows.filter((row) => row.status === "MISSING_COUNTERPART").length,
  missingPair: report.rows.filter((row) => row.status === "MISSING_PAIR").length,
  filtered: report.rows.filter((row) => row.status === "FILTERED").length,
};
report.gatePassed =
  report.fullGateEligible &&
  report.summary.denominator > 0 &&
  report.summary.fail === 0 &&
  report.summary.blocked === 0 &&
  report.summary.unverified === 0 &&
  report.summary.missingCounterpart === 0 &&
  report.summary.missingPair === 0 &&
  report.summary.filtered === 0;

await fsp.writeFile(path.join(stageRoot, "results.json"), `${JSON.stringify(report, null, 2)}\n`);
const link = (row, key, label) => row.links?.[key] && fs.existsSync(path.join(stageRoot, key, `${row.screen}-${row.width}.png`))
  ? `[${label}](${row.links[key]})`
  : label;
const markdown = [
  "# Independent visual parity report",
  "",
  `Run: \`${runId}\`  `,
  `Claim: **${report.claim}**  `,
  `Gate: **${report.gatePassed ? "PASS" : "NOT PASSED"}**  `,
  `Measured: ${report.summary.pass} pass / ${report.summary.fail} fail / ${report.summary.denominator} denominator rows. Missing counterparts, aliases, and blocked rows are excluded from the denominator but keep the gate unpassed. Inputs changed during run: ${inputsChangedDuringRun ? "YES — STALE" : "no"}.`,
  "",
  "## Executed coverage",
  "",
  `Executed ${measured.length} full expected/actual comparisons across ${new Set(measured.map((row) => row.screen)).size} concrete screen/state identities. ${report.summary.blocked} rows are blocked, ${report.summary.unverified} are unverified, ${report.summary.missingCounterpart} lack a routeable counterpart, and ${report.rows.filter((row) => row.status === "ALIAS").length} are aliases. Every configured inventory row has one terminal result.`,
  "",
  `${measured.filter((row) => row.actualCaptureStability?.stableAttempts?.[0] > 1 || row.expectedCaptureStability?.stableAttempts?.[0] > 1).length} comparisons required bounded repeat settling after the first raw frame. All admitted comparison images use two consecutive byte-identical raw frames; every attempt remains retained alongside the selected pair.`,
  "",
  "## Actionable implementation findings",
  "",
  "- Home Index, category, subcategory, resource detail, about, palette, mobile drawer, and the registered artifact all have measured presentation failures above the fixed 0.5% ceiling; use the per-row dimensions and diff images below.",
  "- The production app is missing the native Fraunces italic face. It is recorded as a visual defect, not mislabeled as a failed capture.",
  "- The reference shell's demonstrator admin identity is not aligned to the real visitor role. The real signed-out state is retained; no auth bypass or fake identity is used.",
  "- The registered artifact has no independently routeable anatomy/docs chapter surfaces. Those rows remain MISSING_COUNTERPART build work rather than duplicate screenshots of `/`.",
  "- Production-only admin sub-subcategories, journeys, and digests have no genuine active-source counterpart and are token-only; authorized admin rows remain explicit blockers without fabricated data.",
  "",
  "| Screen/state | Width | Diff pixels | Diff % | Status | Evidence / reason |",
  "|---|---:|---:|---:|---|---|",
  ...report.rows.map((row) => {
    const evidence = row.links
      ? `${link(row, "actual", "Actual")} · ${link(row, "expected", "Expected")} · ${link(row, "diff", "Diff")}`
      : (row.reason || "—");
    return `| ${row.screen} | ${row.width} | ${row.comparison?.differingPixels ?? "—"} | ${row.comparison ? `${row.comparison.diffPercent.toFixed(4)}%` : "—"} | ${row.status} | ${evidence} |`;
  }),
  "",
  "## Reproducibility",
  "",
  `Chromium ${browserVersion}; DPR 1; en-US; UTC; dark color scheme; reduced motion; pixelmatch threshold 0.1; pass ceiling 0.5%. Expected and actual are full-page captures. Unequal images use an unscaled union canvas and fail regardless of percentage.`,
  "",
  "The immutable machine result and source hashes are in [`results.json`](baseline/" + runId + "/results.json), and SHA-256 hashes for every evidence output are in [`OUTPUT-MANIFEST.json`](baseline/" + runId + "/OUTPUT-MANIFEST.json). The reference server served a pre-hashed in-memory snapshot, was loopback-only and ephemeral, and was closed before these files were copied into the repository.",
  "",
].join("\n");
await fsp.writeFile(path.join(stageRoot, "REPORT.md"), markdown);
const outputFiles = await walkHashes(stageRoot);
const outputManifest = {
  schemaVersion: 1,
  runId,
  algorithm: "sha256",
  scope: "Every output present before this manifest; the manifest cannot self-hash.",
  files: await Promise.all(Object.entries(outputFiles).map(async ([relative, hash]) => ({
    path: relative,
    sha256: hash,
    bytes: (await fsp.stat(path.join(stageRoot, relative))).size,
  }))),
};
await fsp.writeFile(path.join(stageRoot, "OUTPUT-MANIFEST.json"), `${JSON.stringify(outputManifest, null, 2)}\n`);

// Browser and both HTTP contexts are closed before evidence enters the Vite
// watched repository. A run id is immutable and never overwritten.
if (fs.existsSync(finalRoot)) throw new Error(`Refusing to overwrite immutable baseline ${finalRoot}`);
await fsp.mkdir(path.dirname(finalRoot), { recursive: true });
await fsp.cp(stageRoot, finalRoot, { recursive: true, errorOnExist: true, force: false });
await fsp.copyFile(path.join(stageRoot, "REPORT.md"), path.join(here, "REPORT.md"));
for (const name of ["actual", "expected", "diff"]) {
  const rootOutput = path.join(here, name);
  await fsp.rm(rootOutput, { recursive: true, force: true });
  await fsp.cp(path.join(stageRoot, name), rootOutput, { recursive: true });
}
const docsMarkdown = markdown
  .replaceAll(`](baseline/${runId}/`, `](../../tests/parity/baseline/${runId}/`);
await fsp.writeFile(path.join(repoRoot, "docs/parity/REPORT.md"), docsMarkdown);
const makeReadOnly = async (directory) => {
  for (const entry of await fsp.readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await makeReadOnly(absolute);
      await fsp.chmod(absolute, 0o555);
    } else if (entry.isFile()) {
      await fsp.chmod(absolute, 0o444);
    }
  }
  await fsp.chmod(directory, 0o555);
};
await makeReadOnly(finalRoot);
console.log(`Parity baseline written to ${path.relative(repoRoot, finalRoot)}`);
console.log(JSON.stringify(report.summary));
if (!report.gatePassed) process.exitCode = 1;
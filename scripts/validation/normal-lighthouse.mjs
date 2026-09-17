#!/usr/bin/env node
// Normal Lighthouse control for the production build.
//
// This intentionally does NOT import production-baseline-lib.mjs: that module
// owns the strict read-only/interception harness. This control measures the
// normal browser/auth path instead, while observing (never intercepting)
// requests and invalidating its own evidence if the app makes a same-origin
// unsafe request.
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DEFAULT_BASE = "http://127.0.0.1:5000";
const DEFAULT_OUT = path.join(
  ROOT,
  "docs/parity/evidence/integration-shell/retained-controls/authorized-lighthouse/normal-lighthouse/fixed-3cold",
);
const RUN_COUNT = 3;
const PERFORMANCE_THRESHOLD = 0.82;
const LIGHTHOUSE_CATEGORIES = ["performance", "accessibility", "best-practices", "seo"];
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const SENSITIVE_EVIDENCE_KEY = /(?:authorization|cookie|credential|jwt|token|secret|password|api[_-]?key|session)/i;

function usage() {
  console.log(`Normal, loopback-only Lighthouse control

Usage:
  node scripts/validation/normal-lighthouse.mjs --base http://127.0.0.1:5000 [--out <directory>] [--threshold 0.82]

Exactly ${RUN_COUNT} fresh-browser mobile Lighthouse runs are captured. The command
exits 1 for an invalid run, a Lighthouse runtime error, or a median performance
score below the threshold.`);
}

function parseArgs(argv) {
  const args = { base: DEFAULT_BASE, out: DEFAULT_OUT, threshold: PERFORMANCE_THRESHOLD };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => {
      const value = argv[++index];
      if (value === undefined) throw new Error(`${arg} needs a value`);
      return value;
    };
    switch (arg) {
      case "--base":
        args.base = next();
        break;
      case "--out":
        args.out = next();
        break;
      case "--threshold":
        args.threshold = Number(next());
        break;
      case "--help":
      case "-h":
        usage();
        process.exit(0);
        break;
      default:
        throw new Error(`Unknown argument ${arg}`);
    }
  }
  if (
    !Number.isFinite(args.threshold) ||
    args.threshold < PERFORMANCE_THRESHOLD ||
    args.threshold > 1
  ) {
    throw new Error(
      `--threshold must be a number from ${PERFORMANCE_THRESHOLD} through 1; the normal-control floor cannot be lowered`,
    );
  }
  return args;
}

function isLoopbackHost(hostname) {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host === "[::1]" || host === "::1") return true;
  const octets = host.split(".");
  return octets.length === 4 && octets[0] === "127" && octets.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255);
}

function parseLoopbackOrigin(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("--base must be an absolute loopback http(s) origin");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("--base must use http or https");
  }
  if (url.username || url.password) {
    throw new Error("--base must not contain userinfo");
  }
  if (!isLoopbackHost(url.hostname)) {
    throw new Error("--base host must be a loopback address");
  }
  if (url.pathname !== "/" || url.search || url.hash) {
    throw new Error("--base must be a bare origin without path, query, or fragment");
  }
  return url.origin;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function commandOutput(command, args) {
  return execFileSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    // The source snapshot includes `git diff --binary HEAD`; a working tree
    // with re-captured parity PNGs exceeds Node's 1 MiB default (ENOBUFS).
    maxBuffer: 512 * 1024 * 1024,
    stdio: ["ignore", "pipe", "ignore"],
  });
}

function hashPathList(paths) {
  const hash = createHash("sha256");
  for (const relativePath of [...paths].sort()) {
    const absolutePath = path.join(ROOT, relativePath);
    const stat = fs.lstatSync(absolutePath);
    if (!stat.isFile()) throw new Error(`Source snapshot cannot hash non-file ${relativePath}`);
    hash.update(relativePath);
    hash.update("\0");
    hash.update(sha256(fs.readFileSync(absolutePath)));
    hash.update("\n");
  }
  return hash.digest("hex");
}

function sourceSnapshot() {
  const tracked = commandOutput("git", ["ls-files", "-z"]).split("\0").filter(Boolean);
  const untracked = commandOutput("git", ["ls-files", "--others", "--exclude-standard", "-z"])
    .split("\0")
    .filter(Boolean);
  const status = commandOutput("git", ["status", "--porcelain=v1", "-z"]);
  const patch = commandOutput("git", ["diff", "--binary", "--no-ext-diff", "HEAD"]);
  return {
    gitHead: commandOutput("git", ["rev-parse", "HEAD"]).trim(),
    gitStatusSha256: sha256(status),
    dirtyPatchSha256: sha256(patch),
    trackedFileCount: tracked.length,
    trackedTreeSha256: hashPathList(tracked),
    untrackedFileCount: untracked.length,
    untrackedTreeSha256: hashPathList(untracked),
  };
}

function hashDirectory(directory) {
  if (!fs.existsSync(directory)) throw new Error(`Built output is missing: ${path.relative(ROOT, directory)}`);
  const files = [];
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(absolute);
      } else if (entry.isFile()) {
        files.push(absolute);
      } else {
        throw new Error(`Built output contains unsupported entry: ${path.relative(ROOT, absolute)}`);
      }
    }
  };
  walk(directory);
  const hash = createHash("sha256");
  for (const file of files) {
    hash.update(path.relative(directory, file));
    hash.update("\0");
    hash.update(sha256(fs.readFileSync(file)));
    hash.update("\n");
  }
  return { fileCount: files.length, treeSha256: hash.digest("hex") };
}

function buildSnapshot() {
  const dist = path.join(ROOT, "dist");
  return {
    directory: "dist",
    ...hashDirectory(dist),
  };
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`);
  fs.renameSync(temporary, file);
}

// This is deliberately byte-for-byte equivalent in behavior to the existing
// baseline evidence URL redactor. It is local so this normal control cannot
// import the strict harness or any of its guards.
function redactEvidenceUrl(value) {
  if (typeof value !== "string") return value;
  try {
    const url = new URL(value);
    if (url.username) url.username = "[REDACTED]";
    if (url.password) url.password = "[REDACTED]";
    if (url.search) {
      const redacted = new URLSearchParams();
      for (const [key, queryValue] of url.searchParams) {
        redacted.append(key, SENSITIVE_EVIDENCE_KEY.test(key) ? "[REDACTED]" : queryValue);
      }
      url.search = redacted.toString();
    }
    url.hash = "";
    return url.toString();
  } catch {
    return value
      .replace(/(https?:\/\/)[^\/\s@]*@/gi, "$1[REDACTED]@")
      .replace(/([?&]([^=&\s]+)=)([^&#\s"'`]+)/g, (match, prefix, rawKey) => {
        let key = rawKey;
        try {
          key = decodeURIComponent(rawKey);
        } catch {
          // A malformed key is still safe to leave as non-sensitive metadata.
        }
        return SENSITIVE_EVIDENCE_KEY.test(key) ? `${prefix}[REDACTED]` : match;
      });
  }
}

function redactLighthouseEvidence(value, key = "") {
  if (SENSITIVE_EVIDENCE_KEY.test(key)) return "[REDACTED]";
  if (typeof value === "string") return redactEvidenceUrl(value);
  if (Array.isArray(value)) return value.map((item) => redactLighthouseEvidence(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, item]) => [
        entryKey,
        redactLighthouseEvidence(item, entryKey),
      ]),
    );
  }
  return value;
}

function sanitizeError(error) {
  return redactEvidenceUrl(error instanceof Error ? error.message : String(error));
}

function chromiumExecutable() {
  const cache = path.join(ROOT, ".cache/ms-playwright");
  const directories = fs.existsSync(cache)
    ? fs.readdirSync(cache).filter((entry) => /^chromium-\d+$/.test(entry)).sort()
    : [];
  const directory = directories.at(-1);
  if (!directory) throw new Error("No pinned Chromium is available under .cache/ms-playwright");
  const executable = path.join(cache, directory, "chrome-linux64/chrome");
  if (!fs.existsSync(executable)) throw new Error("Pinned Chromium executable is missing");
  return executable;
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

async function importLighthousePuppeteer() {
  const requireFromLighthouse = createRequire(
    createRequire(import.meta.url).resolve("lighthouse/package.json"),
  );
  return (await import(pathToFileURL(requireFromLighthouse.resolve("puppeteer-core")).href)).default;
}

async function verifyLighthouseVersion() {
  const requireFromScript = createRequire(import.meta.url);
  const packageJson = JSON.parse(
    fs.readFileSync(requireFromScript.resolve("lighthouse/package.json"), "utf8"),
  );
  if (packageJson.version !== "12.8.2") {
    throw new Error(`This control requires Lighthouse 12.8.2, found ${packageJson.version}`);
  }
  return packageJson.version;
}

function metricSummary(lhr) {
  const metrics = lhr.audits?.metrics?.details?.items?.[0] ?? {};
  return {
    firstContentfulPaintMs: metrics.firstContentfulPaint ?? null,
    largestContentfulPaintMs: metrics.largestContentfulPaint ?? null,
    totalBlockingTimeMs: metrics.totalBlockingTime ?? null,
    cumulativeLayoutShift: metrics.cumulativeLayoutShift ?? null,
    speedIndexMs: metrics.speedIndex ?? null,
    interactiveMs: metrics.interactive ?? null,
  };
}

function stripBulkLighthousePayload(lhr) {
  delete lhr.fullPageScreenshot;
  delete lhr.timing;
  if (lhr.i18n) delete lhr.i18n.icuMessagePaths;
  for (const id of ["screenshot-thumbnails", "final-screenshot", "script-treemap-data"]) {
    const audit = lhr.audits?.[id];
    if (audit?.details) {
      audit.details = {
        type: audit.details.type,
        stripped: "bulk payload removed from the stored normal Lighthouse control",
      };
    }
  }
  lhr.strippedForNormalControl = [
    "fullPageScreenshot",
    "timing",
    "i18n.icuMessagePaths",
    "audits.screenshot-thumbnails.details",
    "audits.final-screenshot.details",
    "audits.script-treemap-data.details",
  ];
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function ensureOwnEmptyOutput(outDir) {
  const strictEvidence = path.join(
    ROOT,
    "docs/parity/evidence/integration-shell/retained-controls/authorized-lighthouse/faithful-prerender-strict",
  );
  const resolvedOut = path.resolve(outDir);
  if (resolvedOut === strictEvidence || resolvedOut.startsWith(`${strictEvidence}${path.sep}`)) {
    throw new Error("--out must not target strict-failure evidence");
  }
  if (fs.existsSync(resolvedOut) && fs.readdirSync(resolvedOut).length > 0) {
    throw new Error("--out must be a new or empty directory; normal-control evidence is never overwritten");
  }
  fs.mkdirSync(resolvedOut, { recursive: true });
  return resolvedOut;
}

function isSameOriginUnsafeRequest(request, base) {
  if (SAFE_METHODS.has(request.method)) return false;
  try {
    return new URL(request.url).origin === base;
  } catch {
    return false;
  }
}

async function runOne({ run, base, outDir, binding, lighthouseVersion }) {
  const port = await freePort();
  const browser = await chromium.launch({
    headless: true,
    executablePath: chromiumExecutable(),
    chromiumSandbox: true,
    args: ["--disable-dev-shm-usage", `--remote-debugging-port=${port}`],
    ignoreDefaultArgs: ["--disable-popup-blocking"],
  });
  let context;
  let puppeteerBrowser;
  const observedRequests = [];
  try {
    // No routing, init scripts, request interception, service-worker blocking,
    // or window/worker guards are installed in this normal-control browser.
    context = await browser.newContext({ viewport: null });
    context.on("request", (request) => {
      observedRequests.push({
        method: request.method(),
        url: redactEvidenceUrl(request.url()),
        resourceType: request.resourceType(),
        isNavigationRequest: request.isNavigationRequest(),
      });
    });
    const page = await context.newPage();
    const puppeteer = await importLighthousePuppeteer();
    puppeteerBrowser = await puppeteer.connect({
      browserURL: `http://127.0.0.1:${port}`,
      defaultViewport: null,
    });
    const marker = `about:blank#normal-lighthouse-${randomUUID()}`;
    await page.goto(marker);
    const target = await puppeteerBrowser.waitForTarget(
      (candidate) => candidate.url() === marker,
      { timeout: 15_000 },
    );
    const puppeteerPage = await target.page();
    if (!puppeteerPage) throw new Error("Puppeteer could not attach to the Lighthouse page");

    const { default: lighthouse } = await import("lighthouse");
    // `undefined` retains Lighthouse's default configuration, which is the
    // baseline mobile preset/configuration. Do not add desktop emulation or
    // Chrome flags here.
    const result = await lighthouse(
      base,
      {
        output: "json",
        logLevel: "error",
        onlyCategories: LIGHTHOUSE_CATEGORIES,
      },
      undefined,
      puppeteerPage,
    );
    if (!result?.lhr) throw new Error("Lighthouse returned no report");

    const rawLhr = result.lhr;
    const unsafeRequests = observedRequests.filter((request) =>
      isSameOriginUnsafeRequest(request, base),
    );
    const lhr = redactLighthouseEvidence(rawLhr);
    stripBulkLighthousePayload(lhr);
    const performanceScore = rawLhr.categories?.performance?.score ?? null;
    const formFactor = rawLhr.configSettings?.formFactor ?? null;
    const valid =
      !rawLhr.runtimeError &&
      formFactor === "mobile" &&
      unsafeRequests.length === 0;
    const runRecord = {
      schemaVersion: 1,
      run,
      capturedAt: new Date().toISOString(),
      base: redactEvidenceUrl(base),
      lighthouseVersion,
      binding,
      valid,
      invalidReasons: [
        ...(rawLhr.runtimeError ? [`Lighthouse runtime error: ${sanitizeError(rawLhr.runtimeError.message ?? rawLhr.runtimeError.code)}`] : []),
        ...(formFactor !== "mobile"
          ? [`Lighthouse form factor was ${String(formFactor)}, expected mobile`]
          : []),
        ...(unsafeRequests.length
          ? [`Observed ${unsafeRequests.length} same-origin unsafe request(s); normal-control evidence invalidated`]
          : []),
      ],
      performanceScore,
      scores: Object.fromEntries(
        Object.entries(rawLhr.categories ?? {}).map(([id, category]) => [id, category.score]),
      ),
      metrics: metricSummary(rawLhr),
      formFactor,
      finalDisplayedUrl: redactEvidenceUrl(rawLhr.finalDisplayedUrl),
      observedRequests,
      unsafeSameOriginRequests: unsafeRequests,
      reportFile: "lighthouse/home.json",
    };
    writeJson(path.join(outDir, `run-${run}`, "lighthouse/home.json"), lhr);
    writeJson(path.join(outDir, `run-${run}`, "request-observation.json"), {
      schemaVersion: 1,
      binding,
      observedRequests,
      unsafeSameOriginRequests: unsafeRequests,
    });
    writeJson(path.join(outDir, `run-${run}`, "run.json"), runRecord);
    return runRecord;
  } catch (error) {
    const unsafeRequests = observedRequests.filter((request) =>
      isSameOriginUnsafeRequest(request, base),
    );
    const runRecord = {
      schemaVersion: 1,
      run,
      capturedAt: new Date().toISOString(),
      base: redactEvidenceUrl(base),
      lighthouseVersion,
      binding,
      valid: false,
      invalidReasons: [
        `Capture failed: ${sanitizeError(error)}`,
        ...(unsafeRequests.length
          ? [`Observed ${unsafeRequests.length} same-origin unsafe request(s); normal-control evidence invalidated`]
          : []),
      ],
      performanceScore: null,
      scores: null,
      metrics: null,
      finalDisplayedUrl: null,
      observedRequests,
      unsafeSameOriginRequests: unsafeRequests,
      reportFile: null,
    };
    writeJson(path.join(outDir, `run-${run}`, "request-observation.json"), {
      schemaVersion: 1,
      binding,
      observedRequests,
      unsafeSameOriginRequests: unsafeRequests,
    });
    writeJson(path.join(outDir, `run-${run}`, "run.json"), runRecord);
    return runRecord;
  } finally {
    await puppeteerBrowser?.disconnect().catch(() => {});
    await context?.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const base = parseLoopbackOrigin(args.base);
  const outDir = ensureOwnEmptyOutput(args.out);
  const lighthouseVersion = await verifyLighthouseVersion();
  const source = sourceSnapshot();
  const build = buildSnapshot();
  const binding = {
    sourceTrackedTreeSha256: source.trackedTreeSha256,
    sourceDirtyPatchSha256: source.dirtyPatchSha256,
    sourceUntrackedTreeSha256: source.untrackedTreeSha256,
    buildTreeSha256: build.treeSha256,
  };
  const manifest = {
    schemaVersion: 1,
    kind: "normal-lighthouse-control",
    createdAt: new Date().toISOString(),
    command: ["node", path.relative(ROOT, process.argv[1]), ...process.argv.slice(2)].join(" "),
    base: redactEvidenceUrl(base),
    outputDirectory: path.relative(ROOT, outDir),
    runCount: RUN_COUNT,
    performanceThreshold: args.threshold,
    lighthouse: {
      version: lighthouseVersion,
      options: {
        output: "json",
        logLevel: "error",
        onlyCategories: LIGHTHOUSE_CATEGORIES,
      },
      config: "Lighthouse default mobile configuration (undefined config argument)",
    },
    browser: {
      freshBrowserPerRun: true,
      executable: path.relative(ROOT, chromiumExecutable()),
      chromiumSandbox: true,
      args: ["--disable-dev-shm-usage", "--remote-debugging-port=<ephemeral-loopback-port>"],
      requestInterception: false,
      strictGuardsImported: false,
    },
    requestSafety: {
      observedAllContextRequests: true,
      invalidatesSameOriginUnsafeMethods: true,
      safeMethods: [...SAFE_METHODS],
    },
    source,
    build,
    binding,
    runs: [],
  };
  writeJson(path.join(outDir, "manifest.json"), manifest);

  for (let run = 1; run <= RUN_COUNT; run += 1) {
    console.log(`Normal Lighthouse run ${run}/${RUN_COUNT}`);
    const result = await runOne({ run, base, outDir, binding, lighthouseVersion });
    manifest.runs.push({
      run,
      valid: result.valid,
      performanceScore: result.performanceScore,
      runFile: `run-${run}/run.json`,
      reportFile: result.reportFile ? `run-${run}/${result.reportFile}` : null,
    });
    writeJson(path.join(outDir, "manifest.json"), manifest);
  }

  const scores = manifest.runs.map((run) => run.performanceScore);
  const allScoresPresent = scores.every((score) => typeof score === "number");
  const medianPerformanceScore = allScoresPresent ? median(scores) : null;
  const allRunsValid = manifest.runs.every((run) => run.valid);
  const thresholdPassed =
    allRunsValid &&
    medianPerformanceScore !== null &&
    medianPerformanceScore >= args.threshold;
  const summary = {
    schemaVersion: 1,
    kind: "normal-lighthouse-control-summary",
    base: redactEvidenceUrl(base),
    binding,
    runCount: RUN_COUNT,
    runs: manifest.runs,
    medianPerformanceScore,
    performanceThreshold: args.threshold,
    thresholdPassed,
    allRunsValid,
  };
  writeJson(path.join(outDir, "scores.json"), summary);
  manifest.finishedAt = new Date().toISOString();
  manifest.summaryFile = "scores.json";
  manifest.thresholdPassed = thresholdPassed;
  writeJson(path.join(outDir, "manifest.json"), manifest);

  console.log(
    `Normal Lighthouse median ${medianPerformanceScore === null ? "unavailable" : medianPerformanceScore.toFixed(2)} ` +
      `(${thresholdPassed ? "meets" : "does not meet"} ${args.threshold.toFixed(2)})`,
  );
  return thresholdPassed ? 0 : 1;
}

main().then(
  (code) => process.exit(code),
  (error) => {
    console.error(redactEvidenceUrl(error instanceof Error ? error.message : String(error)));
    process.exit(1);
  },
);
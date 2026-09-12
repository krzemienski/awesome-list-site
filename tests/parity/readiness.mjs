/**
 * Page readiness, font-face parity and stable capture.
 *
 * Determinism contract (applied identically to both sides, never masking):
 *   1. document.readyState complete + the row's ready selector visible
 *   2. reference SPA (index.html): window.__avGo present (React mounted);
 *      the design's static docs/showcase pages have no boot signal
 *   2b. same-origin /api/ requests idle (the app's own data fetches, incl.
 *      the ~10 s AI recommendation call, must land before any frame counts)
 *   3. document.fonts.ready, then every used face explicitly loaded again
 *   4. render normalisation style: animations/transitions off, caret hidden,
 *      backdrop-filter disabled (GPU blur is non-deterministic at ±1 RGB on
 *      rounded edges — measured, see docs/parity/assumptions/harness.md; the
 *      blur radii themselves are compared as computed styles instead)
 *   5. scroll-through + image decode, MutationObserver quiet window,
 *      layout stability, two animation frames, blank-render rejection
 * Capture: two consecutive byte-identical raw full-page frames.
 */
import fsp from "node:fs/promises";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { sha256 } from "./reference-adapter.mjs";

export const PARITY_FONT_FAMILIES = [
  "Inter",
  "Fraunces",
  "JetBrains Mono",
  "Geist",
  "Instrument Serif",
  "Space Grotesk",
  "IBM Plex Mono",
  "IBM Plex Sans",
  "Manrope",
];

export const RENDER_NORMALISATION_CSS =
  "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important;scroll-behavior:auto!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}";

export const CAPTURE_NORMALISATIONS = [
  "animations disabled",
  "transitions disabled",
  "caret hidden",
  "backdrop-filter disabled on both sides (blur values compared via computed style)",
  "Chromium partial raster disabled (--disable-partial-raster): full-page capture re-rasters tiles per frame and reused tile content flipped single anti-aliased pixels between consecutive frames",
];

const waitTwoFrames = (page) => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));

// ---------------------------------------------------------------------------
// Same-origin API tracking: in-flight requests, failures, rate-limit headers.
// Attached once per page by the runner before navigation.
// ---------------------------------------------------------------------------
const apiPath = (request) => {
  try {
    const url = new URL(request.url());
    return url.pathname.startsWith("/api/") ? url.pathname : null;
  } catch {
    return null;
  }
};

/**
 * @returns {{ inflight: Map<object, number>, failures: object[], rateLimits: object[], completed: number }}
 */
export function attachNetworkTracker(page) {
  const tracker = { inflight: new Map(), failures: [], rateLimits: [], completed: 0 };
  page.on("request", (request) => {
    if (apiPath(request)) tracker.inflight.set(request, Date.now());
  });
  page.on("requestfinished", (request) => {
    if (tracker.inflight.delete(request)) tracker.completed += 1;
  });
  page.on("requestfailed", (request) => {
    if (tracker.inflight.delete(request)) tracker.completed += 1;
    const pathname = apiPath(request);
    if (pathname) tracker.failures.push({ method: request.method(), path: pathname, status: 0, error: request.failure()?.errorText || "request failed" });
  });
  page.on("response", (response) => {
    const request = response.request();
    const pathname = apiPath(request);
    if (!pathname) return;
    const headers = response.headers();
    const rateLimit = headers["ratelimit-remaining"] !== undefined
      ? { limit: Number(headers["ratelimit-limit"]), remaining: Number(headers["ratelimit-remaining"]), resetSeconds: Number(headers["ratelimit-reset"]) }
      : null;
    const entry = { method: request.method(), path: pathname, status: response.status(), rateLimit, observedAt: Date.now() };
    if (rateLimit) tracker.rateLimits.push(entry);
    if (response.status() >= 400) tracker.failures.push(entry);
  });
  page.__parityNetwork = tracker;
  return tracker;
}

/** Waits until no same-origin /api/ request has been in flight for `quietMs`. */
export async function waitForApiIdle(page, { quietMs = 750, timeout = 45_000 } = {}) {
  const tracker = page.__parityNetwork;
  if (!tracker) return { idle: true, waitedMs: 0, pending: [] };
  const start = Date.now();
  let quietSince = null;
  while (Date.now() - start < timeout) {
    if (tracker.inflight.size === 0) {
      quietSince ??= Date.now();
      if (Date.now() - quietSince >= quietMs) return { idle: true, waitedMs: Date.now() - start, pending: [] };
    } else {
      quietSince = null;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  const pending = [...tracker.inflight.keys()].map((request) => `${request.method()} ${apiPath(request)}`);
  return { idle: false, waitedMs: Date.now() - start, pending };
}

/** Failures that make a capture untrustworthy (throttled or broken backend). */
export const capturePoisoningFailures = (tracker) =>
  (tracker?.failures || []).filter((entry) => entry.status === 429 || entry.status >= 500);

const throwIfPoisoned = (tracker) => {
  const poisoned = capturePoisoningFailures(tracker);
  if (!poisoned.length) return;
  const summary = [...new Set(poisoned.map((entry) => `${entry.status} ${entry.method} ${entry.path}`))].join(", ");
  const error = new Error(`app API failed during capture (${summary}); the rendered state is not trustworthy`);
  error.apiFailures = poisoned;
  error.throttled = poisoned.filter((entry) => entry.status === 429);
  throw error;
};

/**
 * The moment-of-frame API guard. A page stays live between its settle and each
 * frame (the other side opens and settles in between), so every frame is
 * bracketed: before it, same-origin API traffic must be idle again and no
 * 429/5xx may have landed since the settle; after it, no request may have
 * started or finished while the frame was taken (a frame that straddles a
 * refetch is discarded, whatever its pixels look like).
 * @returns {number|null} the tracker's completed-request count at the check (null when the page has no tracker)
 */
export async function assertApiQuiet(page, when, { quietMs = 500, timeout = 15_000 } = {}) {
  const tracker = page.__parityNetwork;
  if (!tracker) return null;
  const idle = await waitForApiIdle(page, { quietMs, timeout });
  if (!idle.idle) throw new Error(`same-origin API requests still in flight ${when} (${Math.round(idle.waitedMs / 1000)}s): ${idle.pending.join(", ")}`);
  throwIfPoisoned(tracker);
  return tracker.completed;
}

/** Describes API traffic that overlapped a frame, or null when the frame was quiet. */
export function apiTrafficDuringFrame(page, completedBefore) {
  const tracker = page.__parityNetwork;
  if (!tracker || completedBefore === null) return null;
  throwIfPoisoned(tracker);
  const started = [...tracker.inflight.keys()].map((request) => `${request.method()} ${apiPath(request)}`);
  const completed = tracker.completed - completedBefore;
  if (!started.length && completed === 0) return null;
  return `${completed} request(s) completed and ${started.length} started during the frame${started.length ? ` (${started.join(", ")})` : ""}`;
}

/** Thrown when a page's web fonts did not finish loading (a fallback-font render is not a capture of either side). */
export class FontsNotReadyError extends Error {
  constructor(message, readiness = null) {
    super(message);
    this.name = "FontsNotReadyError";
    this.readiness = readiness;
  }
}

const SPA_ENTRY_PATHS = new Set(["/", "/index.html"]);

/** Distinct computed backdrop-filter values in use, sampled before normalisation. */
export async function collectBackdropFilters(page) {
  return page.evaluate(() => {
    const values = new Map();
    for (const node of document.querySelectorAll("body *")) {
      const style = getComputedStyle(node);
      const value = style.backdropFilter || style.webkitBackdropFilter;
      if (!value || value === "none") continue;
      const hint = `${node.tagName.toLowerCase()}${node.className && typeof node.className === "string" ? `.${node.className.trim().split(/\s+/).slice(0, 2).join(".")}` : ""}`;
      const entry = values.get(value) || { value, count: 0, elements: [] };
      entry.count += 1;
      if (entry.elements.length < 4 && !entry.elements.includes(hint)) entry.elements.push(hint);
      values.set(value, entry);
    }
    return [...values.values()].sort((a, b) => a.value.localeCompare(b.value));
  });
}

/** Every declared @font-face for the nine parity families, deduped by family|style|weight. */
export async function collectFontFaces(page, families = PARITY_FONT_FAMILIES) {
  return page.evaluate((families) => {
    const wanted = new Set(families.map((family) => family.toLowerCase()));
    const byKey = new Map();
    for (const face of document.fonts) {
      const family = face.family.replace(/^['"]|['"]$/g, "");
      if (!wanted.has(family.toLowerCase())) continue;
      const key = `${family}|${face.style}|${face.weight}`;
      const previous = byKey.get(key);
      const rank = { loaded: 3, loading: 2, unloaded: 1, error: 0 }[face.status] ?? 0;
      if (!previous || rank > previous.rank) byKey.set(key, { key, family, style: face.style, weight: face.weight, status: face.status, rank });
    }
    return [...byKey.values()]
      .sort((a, b) => a.key.localeCompare(b.key))
      .map(({ key, family, style, weight, status }) => ({ key, family, style, weight, status }));
  }, families);
}

/**
 * Both pages must declare the same faces for the nine families. Loaded status
 * is reported but only the declared set decides the gap: usage differs by
 * page content, declarations do not.
 */
export function compareFontFaces(actualFaces, expectedFaces) {
  const actualByKey = new Map(actualFaces.map((face) => [face.key, face]));
  const expectedByKey = new Map(expectedFaces.map((face) => [face.key, face]));
  const keys = [...new Set([...actualByKey.keys(), ...expectedByKey.keys()])].sort();
  const table = keys.map((key) => {
    const actual = actualByKey.get(key);
    const expected = expectedByKey.get(key);
    const [family, style, weight] = key.split("|");
    return {
      family,
      style,
      weight,
      actual: actual ? actual.status : "missing",
      expected: expected ? expected.status : "missing",
      gap: !actual || !expected,
    };
  });
  const gaps = table.filter((row) => row.gap);
  const familiesMissingOnActual = PARITY_FONT_FAMILIES.filter((family) => !actualFaces.some((face) => face.family.toLowerCase() === family.toLowerCase()));
  const familiesMissingOnExpected = PARITY_FONT_FAMILIES.filter((family) => !expectedFaces.some((face) => face.family.toLowerCase() === family.toLowerCase()));
  return { ok: gaps.length === 0, gaps, table, familiesMissingOnActual, familiesMissingOnExpected };
}

export function renderFontGapMarkdown(rowId, width, comparison) {
  const lines = [
    `### ${rowId} @ ${width}`,
    "",
    `Declared faces: ${comparison.table.length - comparison.gaps.length} shared, ${comparison.gaps.length} gaps.`,
    comparison.familiesMissingOnActual.length ? `Families absent on the app page: ${comparison.familiesMissingOnActual.join(", ")}.` : "All nine families are declared on the app page.",
    comparison.familiesMissingOnExpected.length ? `Families absent on the reference page: ${comparison.familiesMissingOnExpected.join(", ")}.` : "All nine families are declared on the reference page.",
    "",
    "| Family | Style | Weight | App | Reference |",
    "|---|---|---|---|---|",
    ...comparison.gaps.map((row) => `| ${row.family} | ${row.style} | ${row.weight} | ${row.actual} | ${row.expected} |`),
    "",
  ];
  return lines.join("\n");
}

export async function settlePage(page, selector, { side } = {}) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForFunction(() => document.readyState === "complete", null, { timeout: 60_000 });
  // Only the design's SPA entry boots React and exposes __avGo; docs.html and
  // design-system.html are static documents with no boot signal.
  if (side === "reference" && SPA_ENTRY_PATHS.has(new URL(page.url()).pathname)) {
    await page.waitForFunction(() => typeof window.__avGo === "function", null, { timeout: 60_000 });
  }
  // The app ships crawler prerender inside #root (og-middleware) and parks it
  // in a fixed #ssr-seo-hold overlay until React has data; both satisfy plain
  // selectors such as `main h1`, so a cold Vite compile once got the prerender
  // captured as "the app". Require React's container on #root and no
  // prerender/hold nodes before anything else is trusted.
  if (side === "actual") {
    await page.waitForFunction(() => {
      const root = document.getElementById("root");
      if (!root) return false;
      if (document.getElementById("ssr-seo-hold") || document.getElementById("ssr-seo-content")) return false;
      return Object.keys(root).some((key) => key.startsWith("__reactContainer"));
    }, null, { timeout: 60_000 });
  }
  if (selector) await page.locator(selector).first().waitFor({ state: "visible", timeout: 60_000 });
  const apiIdle = await waitForApiIdle(page);
  if (!apiIdle.idle) throw new Error(`same-origin API requests still in flight after ${Math.round(apiIdle.waitedMs / 1000)}s: ${apiIdle.pending.join(", ")}`);
  throwIfPoisoned(page.__parityNetwork);
  // Theme stylesheets can mount after the first render and fonts.ready.
  await page.waitForFunction(() => ["Inter", "Fraunces", "JetBrains Mono"].every(
    (family) => [...document.fonts].some((face) => face.family.replace(/^['"]|['"]$/g, "") === family),
  ), null, { timeout: 15_000 }).catch(() => false);
  await page.waitForFunction(() => {
    const root = document.documentElement;
    return root.dataset.system === "editorial" && root.dataset.accent === "crimson";
  }, null, { timeout: 15_000 });
  const fontReadiness = await page.evaluate(async (parityFamilies) => {
    await document.fonts.ready;
    const stripQuotes = (value) => String(value).replace(/^['"]|['"]$/g, "");
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
    // Every declared family|style|weight of the nine parity families is forced
    // to load (its latin subset — the one every capture renders), not only the
    // faces the page happens to use: a declared-but-broken face must fail here,
    // and two sides that both fell back would otherwise compare equal.
    const wantedFamilies = new Set(parityFamilies.map((family) => family.toLowerCase()));
    const declaredParity = new Map();
    for (const face of document.fonts) {
      const family = stripQuotes(face.family);
      if (!wantedFamilies.has(family.toLowerCase())) continue;
      const key = `${family}|${face.style}|${face.weight}`;
      if (!declaredParity.has(key)) {
        declaredParity.set(key, { key, family, style: face.style.split(" ")[0] || "normal", weight: face.weight.split(" ")[0] || "400" });
      }
    }
    const forced = [...declaredParity.values()];
    await Promise.allSettled(used.concat(canonical, forced).map((item) =>
      document.fonts.load(`${item.style} ${item.weight} 16px "${item.family}"`, "Parity"),
    ));
    await document.fonts.ready;
    const faces = [...document.fonts];
    const failedFaces = faces.filter((face) => face.status === "error").map((face) => ({
      family: face.family, style: face.style, weight: face.weight,
    }));
    // Best status per declared parity key (unicode-range subsets share a key;
    // the latin subset is the one the forced load fetches).
    const parityKeyStatus = new Map();
    for (const face of faces) {
      const family = stripQuotes(face.family);
      if (!wantedFamilies.has(family.toLowerCase())) continue;
      const key = `${family}|${face.style}|${face.weight}`;
      const rank = { loaded: 3, loading: 2, unloaded: 1, error: 0 }[face.status] ?? 0;
      const previous = parityKeyStatus.get(key);
      if (!previous || rank > previous.rank) parityKeyStatus.set(key, { status: face.status, rank });
    }
    const unloadedParityFaces = [...parityKeyStatus.entries()]
      .filter(([, value]) => value.status !== "loaded")
      .map(([key, value]) => `${key} (${value.status})`);
    const faceMatches = ({ family, style, weight }, face) =>
      face.family.replace(/^['"]|['"]$/g, "").toLowerCase() === family.toLowerCase() &&
      face.status === "loaded" &&
      (face.style === style || (style === "normal" && !face.style)) &&
      (face.weight === weight || (weight === "400" && face.weight === "normal") ||
        (face.weight.split(" ").length === 2 &&
          Number(weight) >= Number(face.weight.split(" ")[0]) &&
          Number(weight) <= Number(face.weight.split(" ")[1])));
    const checks = canonical.map(({ label, family, style, weight }) => ({
      label,
      family,
      style,
      weight,
      check: document.fonts.check(`${style} ${weight} 16px "${family}"`),
      loadedFace: faces.some((face) => faceMatches({ family, style, weight }, face)),
    }));
    const registeredFamilies = new Set(faces.map((face) => face.family.replace(/^['"]|['"]$/g, "").toLowerCase()));
    const usedFaceChecks = used.filter((item) => registeredFamilies.has(item.family.toLowerCase())).map((item) => ({
      ...item,
      loadedFace: faces.some((face) => faceMatches(item, face)),
      check: document.fonts.check(`${item.style} ${item.weight} 16px "${item.family}"`),
    }));
    const nativeDefects = checks
      .filter((check) => check.label === "display-italic-400" && !check.loadedFace)
      .map((check) => `Canonical display italic face ${check.family} is not registered/loaded; synthetic italic is a visual defect when used`);
    document.body.classList.add("no-anim");
    window.scrollTo(0, 0);
    return {
      status: document.fonts.status, checks, usedFaceChecks, failedFaces, nativeDefects,
      forcedParityFaces: forced.length,
      unloadedParityFaces,
      complete: document.fonts.status === "loaded" && failedFaces.length === 0 &&
        unloadedParityFaces.length === 0 && usedFaceChecks.every((check) => check.check),
    };
  }, PARITY_FONT_FAMILIES);
  if (!fontReadiness.complete) {
    const problems = [
      fontReadiness.status !== "loaded" ? `document.fonts.status is ${fontReadiness.status}` : null,
      fontReadiness.failedFaces.length ? `${fontReadiness.failedFaces.length} face(s) failed to load: ${fontReadiness.failedFaces.slice(0, 4).map((face) => `${face.family} ${face.style} ${face.weight}`).join(", ")}` : null,
      fontReadiness.unloadedParityFaces.length ? `${fontReadiness.unloadedParityFaces.length} declared parity face(s) not loaded after a forced load: ${fontReadiness.unloadedParityFaces.slice(0, 4).join(", ")}` : null,
      fontReadiness.usedFaceChecks.some((check) => !check.check) ? `used faces unavailable: ${fontReadiness.usedFaceChecks.filter((check) => !check.check).slice(0, 4).map((check) => `${check.family} ${check.style} ${check.weight}`).join(", ")}` : null,
    ].filter(Boolean);
    throw new FontsNotReadyError(`${side || "page"} fonts not ready (${problems.join("; ")}); a fallback-font render is not a capture`, fontReadiness);
  }
  const backdropFilters = await collectBackdropFilters(page);
  await page.addStyleTag({ content: RENDER_NORMALISATION_CSS });
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
  // DOM quiet + layout stability, repeated while the app's own API calls keep
  // landing (a late fetch that resolves after the quiet window would otherwise
  // be captured at a timing-dependent state).
  let stability = null;
  for (let round = 1; ; round += 1) {
    const completedBefore = page.__parityNetwork?.completed ?? 0;
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
    stability = await page.evaluate(async () => {
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
    const idleAgain = await waitForApiIdle(page);
    if (!idleAgain.idle) throw new Error(`same-origin API requests still in flight after ${Math.round(idleAgain.waitedMs / 1000)}s: ${idleAgain.pending.join(", ")}`);
    throwIfPoisoned(page.__parityNetwork);
    if ((page.__parityNetwork?.completed ?? 0) === completedBefore) break;
    if (round >= 4) throw new Error("app API traffic never went quiet across four settle rounds");
  }
  await waitTwoFrames(page);
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
  // Stamp the settled document. A full reload between here and a frame (Vite
  // HMR, dependency optimisation, a workspace file write picked up by the dev
  // server's watcher) replaces the window, drops the stamp and boots the app
  // again behind its prerender hold; every frame re-checks the stamp so that
  // state is never captured as the settled page.
  const documentToken = randomUUID();
  await page.evaluate((token) => {
    window.__parityDocument = token;
  }, documentToken);
  const network = page.__parityNetwork;
  return {
    ...dimensions,
    documentToken,
    fonts: fontReadiness,
    backdropFilters,
    stability,
    apiIdle,
    apiCompleted: network ? network.completed : null,
    apiFailures: network ? network.failures.map(({ method, path, status, error }) => ({ method, path, status, ...(error ? { error } : {}) })) : [],
  };
}

/** The tracker's failures as they stand now (read at the end of a row, never a settle-time snapshot). */
export const currentApiFailures = (page) =>
  (page.__parityNetwork?.failures || []).map(({ method, path, status, error }) => ({ method, path, status, ...(error ? { error } : {}) }));

export async function screenshotStats(file) {
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
}

/** Thrown when the settled document is no longer the one on screen. */
export class DocumentReloadedError extends Error {
  constructor(message, state = null) {
    super(message);
    this.name = "DocumentReloadedError";
    this.state = state;
  }
}

const documentState = (page, side) => page.evaluate((sideName) => {
  const root = document.getElementById("root");
  return {
    marker: window.__parityDocument || null,
    hold: Boolean(document.getElementById("ssr-seo-hold") || document.getElementById("ssr-seo-content")),
    mounted: sideName !== "actual" || Boolean(root && Object.keys(root).some((key) => key.startsWith("__reactContainer"))),
    href: location.href,
  };
}, side);

/**
 * Fails when the page is not the settled document any more: the settle stamp
 * is gone or replaced (full reload / navigation), the app's prerender hold is
 * back, or React's container left #root. `when` names the moment for the log.
 */
export async function assertSettledDocument(page, { documentToken, side }, when) {
  let state;
  try {
    state = await documentState(page, side);
  } catch (error) {
    throw new DocumentReloadedError(`document navigated ${when} (${String(error?.message || error).split("\n")[0]})`);
  }
  if (state.marker !== documentToken) {
    throw new DocumentReloadedError(`document reloaded ${when} (settle stamp ${state.marker ? "replaced" : "gone"}; page is now ${state.href})`, state);
  }
  if (state.hold) throw new DocumentReloadedError(`prerender hold returned ${when}`, state);
  if (!state.mounted) throw new DocumentReloadedError(`React container left #root ${when}`, state);
}

export async function stableFullPageCapture(page, file, { attempts = 8, documentToken = null, side = null } = {}) {
  const repeatFile = file.replace(/\.png$/, ".repeat.png");
  const frames = [];
  const discardedFrames = [];
  let previous = null;
  let stablePair = null;
  const identity = documentToken ? { documentToken, side } : null;
  const completedAtStart = page.__parityNetwork?.completed ?? null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const attemptFile = file.replace(/\.png$/, `.attempt-${attempt}.png`);
    if (identity) await assertSettledDocument(page, identity, `before frame ${attempt}`);
    // Idle again + nothing poisoned since the settle (the other side opened and
    // settled in between; a refetch or a late 429 in that gap must not be captured).
    const completedBefore = await assertApiQuiet(page, `before frame ${attempt}`);
    await page.screenshot({ path: attemptFile, fullPage: true, animations: "disabled" });
    if (identity) await assertSettledDocument(page, identity, `while taking frame ${attempt}`);
    const overlap = apiTrafficDuringFrame(page, completedBefore);
    const hash = sha256(await fsp.readFile(attemptFile));
    const frame = { attempt, file: attemptFile, hash };
    frames.push(frame);
    if (overlap) {
      // The frame straddled API traffic: whatever it shows is timing-dependent.
      discardedFrames.push({ attempt, reason: overlap });
      previous = null;
    } else if (previous && previous.hash === hash) {
      stablePair = [previous, frame];
      break;
    } else {
      previous = frame;
    }
    await page.waitForTimeout(250);
    await waitTwoFrames(page);
  }
  if (!stablePair) {
    const discarded = discardedFrames.length ? ` (${discardedFrames.length} frame(s) discarded for overlapping API traffic)` : "";
    throw new Error(`No two consecutive raw full-page captures stabilized within ${attempts} attempts${discarded}: ${frames.map((frame) => frame.hash).join(",")}`);
  }
  await Promise.all([fsp.copyFile(stablePair[0].file, file), fsp.copyFile(stablePair[1].file, repeatFile)]);
  return {
    image: await screenshotStats(file),
    sha256: stablePair[0].hash,
    hashes: [stablePair[0].hash, stablePair[1].hash],
    attemptHashes: frames.map((frame) => frame.hash),
    stableAttempts: stablePair.map((frame) => frame.attempt),
    discardedFrames,
    apiTraffic: completedAtStart === null ? null : { completedAtCaptureStart: completedAtStart, completedAtCaptureEnd: page.__parityNetwork.completed, failures: capturePoisoningFailures(page.__parityNetwork).length },
    identical: true,
    postprocessing: "none",
  };
}

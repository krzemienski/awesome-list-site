/**
 * Real-app design evidence, never a pixel baseline. State recipes are explicit
 * and fail closed: missing transient/owned-data activations are UNVERIFIED.
 * No source pages are invented and no response is mocked or intercepted.
 *
 * BASE_URL=http://127.0.0.1:5000 node tests/parity/nonpixel-runner.mjs
 *   [--states tests/parity/nonpixel-states.json] --out <directory>
 *   [--only id,id] [--widths 375,1440] [--systems editorial,...] [--accents natural,violet,magenta]
 * A state entry: {path, readySelector, triggerSelector?, typeSelector?,
 * typeText?, transition?, setup?}. transition is "offline" or "slow"; the
 * trigger (a real click or real typing) must run after the network
 * transition. setup "owned-collection" publishes a collection owned by the
 * disposable QA identity and exposes its share id as {ownedShareId}. No JS
 * injection recipes. results.json is resumable: EVIDENCE/UNVERIFIED keys are
 * skipped; FAIL keys are retried and their row replaced.
 */
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { createDisposableAdmin } from "./identity.mjs";
import { captureState, assertCaptureTheme } from "./runner.mjs";
import { applyAction } from "./actions.mjs";
import { buildCatalogAdapter, resolveCatalogTokens, resolvePathTemplate } from "./reference-adapter.mjs";
import { collectStrayButtons, collectStrayInputs, collectStrayChips, collectStrayCards, collectStrayH1s, collectStrayEyebrows } from "../../scripts/validation/ds-button-filter.mjs";

const NATURAL = { editorial: "crimson", terminal: "matrix", geist: "cyan", brutalist: "amber", swiss: "orange" };
const { values } = parseArgs({ options: {
  states: { type: "string", default: "tests/parity/nonpixel-states.json" },
  out: { type: "string", default: ".cache/plan-0109/verify/nonpixel" },
  only: { type: "string" }, list: { type: "boolean" },
  widths: { type: "string", default: "375,768,1024,1440" },
  systems: { type: "string", default: Object.keys(NATURAL).join(",") },
  accents: { type: "string", default: "natural,violet,magenta" },
} });
const inventory = JSON.parse(fs.readFileSync("tests/parity/inventory.json", "utf8"));
const screens = inventory.screens.filter(row => ["blocked", "token-only"].includes(row.eligibility));
if (screens.length !== 35) throw new Error(`Nonpixel inventory changed: expected 35, found ${screens.length}; review coverage`);
if (values.list) {
  console.log(JSON.stringify(screens.map(row => ({ id: row.id, path: row.actualPath, action: row.actualAction })), null, 2));
} else {
  await run();
}

async function revealDisclosures(page) {
  // nth()-based locators shift once a toggle flips to "true", so tag each
  // candidate with a stable marker and verify THAT element opened.
  const selector = '[aria-expanded="false"]:not([aria-haspopup]):not([role="tab"]):not([role="combobox"])';
  // Native <details> folds carry no aria-expanded; open the visible ones too.
  await page.evaluate(() => document.querySelectorAll("details:not([open])").forEach(d => { if (d.getClientRects().length) d.open = true; }));
  for (let n = 0; n < 200; n++) {
    const marker = await page.evaluate(({ selector, n }) => {
      const el = [...document.querySelectorAll(selector)].find(e => !e.hasAttribute("data-a578-reveal") && e.getClientRects().length && getComputedStyle(e).visibility !== "hidden");
      if (!el) return null;
      el.setAttribute("data-a578-reveal", String(n));
      return String(n);
    }, { selector, n });
    if (marker === null) {
      await page.evaluate(() => document.querySelectorAll("details:not([open])").forEach(d => { if (d.getClientRects().length) d.open = true; }));
      return;
    }
    const toggle = page.locator(`[data-a578-reveal="${marker}"]`);
    await toggle.click();
    if (await toggle.count() && await toggle.getAttribute("aria-expanded") !== "true") throw new Error("Folded disclosure did not open");
  }
  throw new Error("Disclosure reveal did not converge");
}

/** A collection owned by the disposable identity (cascade-deleted with it). */
async function ownedCollection(identity, tokens) {
  return identity.page.evaluate(async ({ slug }) => {
    const json = async (url, init) => {
      const response = await fetch(url, { credentials: "include", headers: { "Content-Type": "application/json" }, ...init });
      if (!response.ok) throw new Error(`${init?.method || "GET"} ${url} HTTP ${response.status}`);
      return response.json().catch(() => ({}));
    };
    const list = await json(`/api/resources?limit=3`);
    const ids = (list.resources || list.items || list.data || []).map(item => item.id).filter(Boolean).slice(0, 3);
    const created = await json("/api/collections", { method: "POST", body: JSON.stringify({ name: "__qa_test_plan_collection" }) });
    const collection = created.collection || created;
    for (const id of ids) {
      await json(`/api/bookmarks/${id}`, { method: "POST", body: "{}" });
      await json(`/api/collections/${collection.id}/items/${id}`, { method: "POST", body: "{}" });
    }
    const published = await json(`/api/collections/${collection.id}/publish`, { method: "POST", body: "{}" });
    const shareId = (published.collection || published).shareId;
    if (!shareId) throw new Error("Owned collection publish returned no shareId");
    return { collectionId: collection.id, shareId, items: ids.length, slug };
  }, { slug: tokens.values.categorySlug ?? null });
}

async function run() {
  const base = process.env.BASE_URL || "http://127.0.0.1:5000";
  if (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(base).hostname)) throw new Error("Nonpixel evidence is DEV-loopback only");
  const recipes = values.states && fs.existsSync(values.states) ? JSON.parse(fs.readFileSync(values.states, "utf8")) : {};
  for (const id of Object.keys(recipes)) if (!id.startsWith("$") && !screens.some(row => row.id === id)) throw new Error(`Unknown nonpixel state ${id}`);
  const selected = values.only ? screens.filter(row => values.only.split(",").includes(row.id)) : screens;
  if (!selected.length) throw new Error("No nonpixel screens selected");
  const widths = values.widths.split(",").map(Number);
  const systems = values.systems.split(",").filter(Boolean);
  const accentsFor = system => [...new Set(values.accents.split(",").map(a => a === "natural" ? NATURAL[system] : a))];
  fs.mkdirSync(values.out, { recursive: true });
  const resultsFile = path.join(values.out, "results.json");
  // Only settled outcomes are skipped on resume; FAIL rows are retried and
  // replaced so a fixed defect never stays recorded as failing.
  const results = fs.existsSync(resultsFile) ? JSON.parse(fs.readFileSync(resultsFile, "utf8")).rows : [];
  const done = new Set(results.filter(row => row.status === "EVIDENCE" || row.status === "UNVERIFIED").map(row => row.key));
  const pending = [];
  for (const screen of selected) for (const width of widths) for (const system of systems) for (const accent of accentsFor(system)) {
    const key = `${screen.id}-${width}-${system}-${accent}`;
    if (!done.has(key)) pending.push({ screen, width, system, accent, key });
  }
  if (!pending.length) { console.log("Nothing pending"); return; }
  const browser = await chromium.launch({ executablePath: path.resolve(".cache/ms-playwright/chromium-1223/chrome-linux64/chrome"), headless: true });
  let identity;
  try {
    identity = await createDisposableAdmin({ browser, appBase: base, secretKey: process.env.CLERK_SECRET_KEY, auditKey: process.env.ADMIN_PASSWORD });
    const catalog = await buildCatalogAdapter(base, { frozenAt: new Date() });
    const tokens = resolveCatalogTokens(catalog.adapter);
    const tokenValues = { ...tokens.values };
    // Deterministic real entities for the two template routes the catalog
    // adapter does not cover: the first journey by orderIndex and the most
    // used tag (both read from the live API, never invented).
    if (pending.some(({ screen }) => /\{(journeySlug|tagSlug)\}/.test(recipes[screen.id]?.path || screen.actualPath || ""))) {
      const live = await identity.page.evaluate(async () => {
        const journeys = await (await fetch("/api/journeys", { credentials: "include" })).json();
        const tags = await (await fetch("/api/tags?limit=1")).json();
        const first = [...journeys].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0) || a.id - b.id)[0];
        return { journeySlug: first?.id ?? null, tagSlug: tags?.tags?.[0]?.tag ?? null };
      });
      Object.assign(tokenValues, live);
    }
    if (pending.some(({ screen }) => recipes[screen.id]?.setup === "owned-collection")) {
      const owned = await ownedCollection(identity, tokens);
      tokenValues.ownedShareId = owned.shareId;
      fs.writeFileSync(path.join(values.out, `owned-collection-${Date.now()}.json`), JSON.stringify(owned, null, 2));
    }
    for (const { screen, width, system, accent, key } of pending) {
      const row = { id: screen.id, width, system, accent, key, pixelStatus: "unavailable" };
      let context, page;
      try {
        const recipe = recipes[screen.id] || {};
        const rawPath = recipe.path || screen.actualPath;
        if (!rawPath) throw new Error(`UNVERIFIED: ${recipe.unverified || "explicit real state activation path required"}`);
        if (/app\.(error\.|system\.(loading|error|toast))/.test(screen.id) && !recipe.readySelector)
          throw new Error("UNVERIFIED: transient state needs explicit observed readySelector and real trigger/network transition");
        const actualPath = resolvePathTemplate(rawPath, tokenValues);
        if (!actualPath.startsWith("/") || actualPath.startsWith("//")) throw new Error("State path must be same-origin");
        const visitor = screen.id.startsWith("app.auth.") || screen.id === "app.system.consent";
        if (!visitor) await identity.page.evaluate(async ({ system, accent }) => {
          const response = await fetch("/api/user/preferences", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ themeSystem: system, themeAccent: accent }) });
          if (!response.ok) throw new Error(`QA preference write HTTP ${response.status}`);
        }, { system, accent });
        context = await browser.newContext({ viewport: { width, height: inventory.viewportHeights[width] }, reducedMotion: "reduce", serviceWorkers: "block", ...(!visitor ? { storageState: await identity.storageState() } : {}) });
        await context.addInitScript(state => {
          for (const [key, value] of Object.entries(state.app.localStorage)) localStorage.setItem(key, value);
        }, captureState({ system, accent }));
        if (screen.id === "app.system.consent") await context.addInitScript(() => localStorage.removeItem("analytics-consent"));
        page = await context.newPage();
        page.setDefaultTimeout(30_000);
        await page.goto(`${base}${actualPath}`, { waitUntil: "domcontentloaded" });
        await page.waitForFunction(() => document.querySelector("#root")?.childElementCount > 0);
        if (!visitor) {
          const user = await page.evaluate(async () => (await fetch("/api/auth/user")).json());
          if (!user.isAuthenticated || String(user.user?.id) !== String(identity.localUserId)) {
            // Fail closed: never audit another user's screen.
            throw new Error("Owned QA identity did not reach the screen");
          }
        }
        if (screen.actualAction) await applyAction(page, screen.actualAction, "actual", { tokens });
        await assertCaptureTheme(page, { system, accent });
        if (recipe.warmSelector) await page.locator(recipe.warmSelector).first().waitFor({ state: "visible" });
        if (recipe.transition) {
          if (!recipe.triggerSelector && !recipe.typeSelector) throw new Error("Network transition requires a real trigger");
          if (recipe.transition === "offline") await context.setOffline(true);
          else if (recipe.transition === "slow") {
            const cdp = await context.newCDPSession(page);
            await cdp.send("Network.enable");
            await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 3000, downloadThroughput: 8000, uploadThroughput: 8000 });
          } else throw new Error(`Unsupported real transition ${recipe.transition}`);
        }
        if (recipe.typeSelector) await page.locator(recipe.typeSelector).first().pressSequentially(recipe.typeText, { delay: 20 });
        if (recipe.triggerSelector) await page.locator(recipe.triggerSelector).first().click();
        if (recipe.readySelector) await page.locator(recipe.readySelector).first().waitFor({ state: "visible" });
        else await page.waitForLoadState("networkidle");
        row.activation = recipe.readySelector ? `observed ${recipe.readySelector}${recipe.transition ? ` after real ${recipe.transition} transition` : ""}` : "networkidle";
        await page.evaluate(async () => { await document.fonts.ready; await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
        if (!recipe.transition && !recipe.readySelector?.includes("data-state")) await revealDisclosures(page);
        await assertCaptureTheme(page, { system, accent });
        row.hooks = {};
        for (const [name, collect] of Object.entries({ buttons: collectStrayButtons, inputs: collectStrayInputs, chips: collectStrayChips, cards: collectStrayCards, h1s: collectStrayH1s, eyebrows: collectStrayEyebrows }))
          row.hooks[name] = await page.evaluate(collect);
        // Disclosure clicks can scroll the page; measure target spacing at the
        // document's resting position so content sliding under the sticky
        // header is not mistaken for adjacent targets.
        await page.evaluate(() => window.scrollTo(0, 0));
        row.computed = await computedEvidence(page);
        row.axe = (await new AxeBuilder({ page }).analyze()).violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.slice(0, 5).map(n => n.target.join(" ")) }));
        row.screenshot = `${key}.jpg`;
        await page.screenshot({ path: path.join(values.out, row.screenshot), fullPage: true, type: "jpeg", quality: 60 });
        const hookFailures = Object.values(row.hooks).some(hook => hook.strays?.length);
        row.status = hookFailures || row.computed.failures.length || row.axe.length ? "FAIL" : "EVIDENCE";
        // EVIDENCE deliberately is not PASS: a reviewer must inspect the
        // captured computed skin states and state-specific screenshots.
      } catch (error) {
        row.status = error.message.startsWith("UNVERIFIED:") ? "UNVERIFIED" : "FAIL";
        row.error = error.message.slice(0, 500);
        // Failure evidence: what the page showed when the recipe gave up.
        if (page) { row.errorScreenshot = `${key}-error.jpg`; await page.screenshot({ path: path.join(values.out, row.errorScreenshot), type: "jpeg", quality: 60 }).catch(() => { delete row.errorScreenshot; }); }
      } finally {
        await context?.close().catch(() => {});
        const previous = results.findIndex(existing => existing.key === row.key);
        if (previous === -1) results.push(row); else results[previous] = row;
        fs.writeFileSync(resultsFile, JSON.stringify({ selected: selected.map(row => row.id), wholeScreenPixelParity: "unavailable", rows: results }, null, 2));
        console.log(`${row.status} ${key}${row.error ? ` ERR ${row.error.slice(0, 160)}` : row.status === "FAIL" ? ` ${JSON.stringify({ hooks: Object.fromEntries(Object.entries(row.hooks).map(([k, v]) => [k, v.strays?.length])), failures: row.computed.failures.slice(0, 4), axe: row.axe.map(v => v.id) })}` : ""}`);
      }
    }
  } finally {
    try {
      const teardown = await identity?.teardown();
      fs.writeFileSync(path.join(values.out, `teardown-${Date.now()}.json`), JSON.stringify(teardown, null, 2));
    } finally { await browser.close(); }
  }
  if (results.some(row => row.status !== "EVIDENCE")) process.exitCode = 2;
}

async function computedEvidence(page) {
  return page.evaluate(async () => {
    const html = document.documentElement;
    const root = getComputedStyle(html);
    const system = html.dataset.system;
    const registry = window.DESIGN_SYSTEMS[system].vars;
    const accentPair = window.ACCENTS.find(a => a.id === html.dataset.accent);
    const norm = v => String(v).replace(/\s+/g, "").toLowerCase();
    const resolvedTokens = Object.fromEntries(Object.keys(registry).map(token => [token, root.getPropertyValue(token).trim()]));
    const failures = [];
    // Registry tokens must be what paints. --text-3 is the documented app AA
    // correction (design-system.ts text3Corrections): record, don't fail.
    const tokenDeviations = [];
    // Chromium serialises custom properties with nested var() substituted, so
    // compare against the registry value with its var() references resolved.
    const substitute = value => String(value).replace(/var\((--[\w-]+)\)/g, (_, name) => root.getPropertyValue(name).trim());
    for (const [token, expected] of Object.entries(registry)) {
      if (norm(resolvedTokens[token]) === norm(expected) || norm(resolvedTokens[token]) === norm(substitute(expected))) continue;
      if (token === "--text-3") { tokenDeviations.push({ token, expected, actual: resolvedTokens[token], basis: "approved AA text-3 correction" }); continue; }
      failures.push(`Token ${token} resolves ${resolvedTokens[token]} not registry ${expected}`);
    }
    if (accentPair && norm(root.getPropertyValue("--accent")) !== norm(accentPair.primary)) failures.push(`--accent ${root.getPropertyValue("--accent")} not ${accentPair.primary}`);
    // A custom element + !important declarations: no author rule targeting
    // div (Clerk/emotion globals) can repaint the token probe; transitions off
    // or the computed radius lags at the PREVIOUS token value.
    const probe = document.createElement("a578-token-probe");
    document.body.appendChild(probe);
    const resolve = (prop, expr) => { probe.style.cssText = `display:block;position:absolute;visibility:hidden;transition:none !important;animation:none !important;${prop}:${expr} !important`; return getComputedStyle(probe)[prop === "border-radius" ? "borderTopLeftRadius" : "fontFamily"]; };
    const radiusTokens = Object.fromEntries(["--radius-xs", "--radius-sm", "--radius", "--radius-md", "--radius-lg", "--radius-xl", "--radius-pill"].map(t => [t, resolve("border-radius", `var(${t}, 0px)`)]));
    const radii = new Set(["0px", "50%", "9999px", "999px", "100%", ...Object.values(radiusTokens)]);
    const displayFamily = resolve("font-family", "var(--font-display)").split(",")[0].replace(/["']/g, "").trim();
    const bodyFamily = resolve("font-family", "var(--font-body)").split(",")[0].replace(/["']/g, "").trim();
    probe.remove();
    const first = family => family.split(",")[0].replace(/["']/g, "").trim();
    if (first(getComputedStyle(document.body).fontFamily) !== bodyFamily) failures.push(`Body font ${getComputedStyle(document.body).fontFamily} is not --font-body ${bodyFamily}`);
    if (document.documentElement.scrollWidth > innerWidth) failures.push(`Horizontal page overflow ${document.documentElement.scrollWidth}>${innerWidth}`);
    const controls = [];
    const below44 = [];
    let inlineLinksExempt = 0;
    const targetRects = [...document.querySelectorAll("button,input,select,textarea,a[href],[role=button],[role=tab],[role=switch]")]
      // checkVisibility(): a closed <details> body is content-visibility:hidden
      // yet still reports layout rects, so it would phantom-overlap content.
      .filter(t => !t.closest(".sr-only,[aria-hidden='true']") && t.checkVisibility()).map(t => [t, t.getBoundingClientRect()]).filter(([, r]) => r.width && r.height);
    // WCAG 2.2 AA 2.5.8 spacing exception: a 24px circle centred on the
    // undersized target must not intersect any other target.
    const spaced = (el, r) => {
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      return targetRects.every(([other, o]) => other === el || other.contains(el) || el.contains(other) ||
        Math.hypot(Math.max(o.left - cx, 0, cx - o.right), Math.max(o.top - cy, 0, cy - o.bottom)) >= 12);
    };
    const offTokenRadius = [];
    for (const el of document.querySelectorAll(".btn, .chip, .card, .display-h, .eyebrow, button, input, select, textarea, a[href]")) {
      const bounds = el.getBoundingClientRect();
      const css = getComputedStyle(el);
      if (!bounds.width || !bounds.height || css.visibility === "hidden" || !el.checkVisibility()) continue;
      if (el.closest(".sr-only,[aria-hidden='true']")) continue;
      const read = () => {
        const s = getComputedStyle(el);
        return Object.fromEntries(["color", "backgroundColor", "borderTopLeftRadius", "borderTopWidth", "fontFamily", "fontWeight", "boxShadow", "textTransform", "outlineStyle", "outlineWidth"].map(key => [key, s[key]]));
      };
      const rest = read();
      // Reference-faithful exception: the frozen admin masthead h1
      // (awesome-list-site-ds-20260929/admin.jsx:62) inherits the BODY face;
      // admin-shell.css mirrors it, so --font-display is the wrong expectation.
      if (el.matches(".display-h") && !el.matches(".admin-dashboard__masthead h1") && first(rest.fontFamily) !== displayFamily) failures.push(`.display-h font ${rest.fontFamily} is not --font-display ${displayFamily}`);
      if (el.matches(".btn,.chip,.card") && !radii.has(rest.borderTopLeftRadius)) offTokenRadius.push(`${el.className.split(" ").slice(0, 3).join(".")}=${rest.borderTopLeftRadius}`);
      const interactive = el.matches("button,input,select,textarea,a[href]");
      // WCAG 2.5.8 inline exception: a link inside a sentence of text.
      const inline = el.matches("a[href]") && css.display === "inline" && [...(el.parentElement?.childNodes || [])].some(n => n !== el && n.nodeType === 3 && n.textContent.trim());
      if (inline) inlineLinksExempt++;
      else if (interactive && (bounds.width < 44 || bounds.height < 44)) {
        const label = `${el.tagName} ${el.getAttribute("data-testid") || el.textContent?.trim().slice(0, 50)} ${Math.round(bounds.width)}x${Math.round(bounds.height)}`;
        // 44px (AAA 2.5.5 / repo mobile floor) is recorded for review; below
        // the AA 24px minimum without the spacing exception is a failure.
        below44.push(label);
        if ((bounds.width < 24 || bounds.height < 24) && !spaced(el, bounds)) failures.push(`Target below WCAG 2.5.8 24px without spacing: ${label}`);
      }
      const oldActive = document.activeElement;
      if (interactive) el.focus({ preventScroll: true });
      const focus = read();
      if (oldActive instanceof HTMLElement) oldActive.focus({ preventScroll: true });
      if (controls.length < 400) controls.push({ tag: el.tagName, testId: el.getAttribute("data-testid"), text: el.textContent?.trim().slice(0, 60), classes: String(el.className).slice(0, 120), width: Math.round(bounds.width), height: Math.round(bounds.height), rest, focus });
    }
    if (offTokenRadius.length) failures.push(`Off-token radius: ${[...new Set(offTokenRadius)].slice(0, 6).join(", ")}`);
    return { resolvedTokens, tokenDeviations, displayFamily, bodyFamily, radii: [...radii], radiusTokens, controls, inlineLinksExempt, below44: [...new Set(below44)], failures, note: "Review computed skins against applicable canonical and app-owned CSS rules. Hover/contrast ancestry is measured by accent-contrast-browser.mjs." };
  });
}

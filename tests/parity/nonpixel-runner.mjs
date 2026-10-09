/**
 * Real-app design evidence, never a pixel baseline. State recipes are explicit
 * and fail closed: missing transient/owned-data activations are UNVERIFIED.
 * No source pages are invented and no response is mocked or intercepted.
 *
 * BASE_URL=http://127.0.0.1:5000 node tests/parity/nonpixel-runner.mjs
 *   --states .cache/plan-0109/verify/nonpixel-states.json --out <directory>
 * A state entry: {path, readySelector, triggerSelector?, transition?}.
 * transition is "offline" or "slow"; triggerSelector must perform the real
 * navigation/action after the network transition. No JS injection recipes.
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

const { values } = parseArgs({ options: {
  states: { type: "string" }, out: { type: "string", default: ".cache/plan-0109/verify/nonpixel" },
  only: { type: "string" }, list: { type: "boolean" },
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
  for (let round = 0; round < 12; round++) {
    const toggles = page.locator('[aria-expanded="false"]:not([aria-haspopup]):not([role="tab"]):not([role="combobox"])');
    let clicked = 0;
    for (const toggle of await toggles.all()) {
      if (!await toggle.isVisible()) continue;
      await toggle.click();
      if (await toggle.getAttribute("aria-expanded") !== "true") throw new Error("Folded disclosure did not open");
      clicked++;
    }
    if (!clicked) return;
  }
  throw new Error("Disclosure reveal did not converge");
}

async function run() {
  const base = process.env.BASE_URL || "http://127.0.0.1:5000";
  if (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(base).hostname)) throw new Error("Nonpixel evidence is DEV-loopback only");
  const recipes = values.states ? JSON.parse(fs.readFileSync(values.states, "utf8")) : {};
  for (const id of Object.keys(recipes)) if (!screens.some(row => row.id === id)) throw new Error(`Unknown nonpixel state ${id}`);
  const selected = values.only ? screens.filter(row => values.only.split(",").includes(row.id)) : screens;
  if (!selected.length) throw new Error("No nonpixel screens selected");
  fs.mkdirSync(values.out, { recursive: true });
  const browser = await chromium.launch({ executablePath: path.resolve(".cache/ms-playwright/chromium-1223/chrome-linux64/chrome"), headless: true });
  let identity;
  const results = [];
  try {
    identity = await createDisposableAdmin({ browser, appBase: base, secretKey: process.env.CLERK_SECRET_KEY, auditKey: process.env.ADMIN_PASSWORD });
    const catalog = await buildCatalogAdapter(base, { frozenAt: new Date() });
    const tokens = resolveCatalogTokens(catalog.adapter);
    const natural = { editorial: "crimson", terminal: "matrix", geist: "cyan", brutalist: "amber", swiss: "orange" };
    for (const screen of selected) for (const width of [375, 768, 1024, 1440])
      for (const [system, accentDefault] of Object.entries(natural)) for (const accent of [accentDefault, "violet", "magenta"]) {
        const key = `${screen.id}-${width}-${system}-${accent}`;
        const row = { id: screen.id, width, system, accent, key, pixelStatus: "unavailable" };
        let context;
        try {
          const recipe = recipes[screen.id] || {};
          const rawPath = recipe.path || screen.actualPath;
          if (!rawPath) throw new Error("UNVERIFIED: explicit real state activation path required");
          if (/app\.(error\.|system\.(loading|error|toast))/.test(screen.id) && !recipe.readySelector)
            throw new Error("UNVERIFIED: transient state needs explicit observed readySelector and real trigger/network transition");
          const actualPath = resolvePathTemplate(rawPath, tokens.values);
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
          const page = await context.newPage();
          await page.goto(`${base}${actualPath}`, { waitUntil: "domcontentloaded" });
          await page.waitForFunction(() => document.querySelector("#root")?.childElementCount > 0);
          if (!visitor) {
            const user = await page.evaluate(async () => (await fetch("/api/auth/user")).json());
            if (!user.isAuthenticated || user.user?.id !== identity.localUserId) {
              // The helper records the owned id as localUserId; fail closed if
              // a future helper changes its shape, never audit another user.
              throw new Error("Owned QA identity did not reach the screen");
            }
          }
          if (screen.actualAction) await applyAction(page, screen.actualAction, "actual", { tokens });
          await assertCaptureTheme(page, { system, accent });
          if (recipe.transition) {
            if (!recipe.triggerSelector) throw new Error("Network transition requires a real triggerSelector");
            if (recipe.transition === "offline") await context.setOffline(true);
            else if (recipe.transition === "slow") {
              const cdp = await context.newCDPSession(page);
              await cdp.send("Network.enable");
              await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 3000, downloadThroughput: 8000, uploadThroughput: 8000 });
            } else throw new Error(`Unsupported real transition ${recipe.transition}`);
          }
          if (recipe.triggerSelector) await page.locator(recipe.triggerSelector).click();
          if (recipe.readySelector) await page.locator(recipe.readySelector).first().waitFor({ state: "visible" });
          else await page.waitForLoadState("networkidle");
          await page.evaluate(async () => { await document.fonts.ready; await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
          await revealDisclosures(page);
          await assertCaptureTheme(page, { system, accent });
          row.hooks = {};
          for (const [name, collect] of Object.entries({ buttons: collectStrayButtons, inputs: collectStrayInputs, chips: collectStrayChips, cards: collectStrayCards, h1s: collectStrayH1s, eyebrows: collectStrayEyebrows }))
            row.hooks[name] = await page.evaluate(collect);
          row.computed = await computedEvidence(page);
          row.axe = (await new AxeBuilder({ page }).analyze()).violations;
          row.screenshot = `${key}.png`;
          await page.screenshot({ path: path.join(values.out, row.screenshot), fullPage: true });
          const hookFailures = Object.values(row.hooks).some(items => items.length);
          row.status = hookFailures || row.computed.failures.length || row.axe.length ? "FAIL" : "EVIDENCE";
          // EVIDENCE deliberately is not PASS: a reviewer must inspect all
          // captured computed skin states and state-specific screenshots.
        } catch (error) {
          row.status = error.message.startsWith("UNVERIFIED:") ? "UNVERIFIED" : "FAIL";
          row.error = error.message;
        } finally {
          await context?.close();
          results.push(row);
          fs.writeFileSync(path.join(values.out, "results.json"), JSON.stringify({ selected: selected.map(row => row.id), wholeScreenPixelParity: "unavailable", rows: results }, null, 2));
        }
      }
  } finally {
    try {
      const teardown = await identity?.teardown();
      fs.writeFileSync(path.join(values.out, "teardown.json"), JSON.stringify(teardown, null, 2));
    } finally { await browser.close(); }
  }
  if (results.some(row => row.status !== "EVIDENCE")) process.exitCode = 2;
}

async function computedEvidence(page) {
  return page.evaluate(async () => {
    const root = getComputedStyle(document.documentElement);
    const registry = window.DESIGN_SYSTEMS[document.documentElement.dataset.system].vars;
    const resolvedTokens = Object.fromEntries(Object.keys(registry).map(token => [token, root.getPropertyValue(token).trim()]));
    const failures = [];
    if (document.documentElement.scrollWidth > innerWidth) failures.push("Horizontal page overflow");
    const controls = [];
    for (const el of document.querySelectorAll(".btn, .chip, .card, .display-h, .eyebrow, button, input, select, textarea, a[href]")) {
      const bounds = el.getBoundingClientRect();
      if (!bounds.width || !bounds.height || getComputedStyle(el).visibility === "hidden") continue;
      const read = () => {
        const css = getComputedStyle(el);
        return Object.fromEntries(["color", "backgroundColor", "borderTopLeftRadius", "borderTopWidth", "fontFamily", "fontWeight", "boxShadow", "textTransform", "outlineStyle", "outlineWidth"].map(key => [key, css[key]]));
      };
      const rest = read();
      const interactive = el.matches("button,input,select,textarea,a[href]");
      if (interactive && (bounds.width < 44 || bounds.height < 44)) failures.push(`Target below 44px: ${el.tagName} ${el.getAttribute("data-testid") || el.textContent?.trim().slice(0, 50)}`);
      const oldActive = document.activeElement;
      if (interactive) el.focus({ preventScroll: true });
      const focus = read();
      if (oldActive instanceof HTMLElement) oldActive.focus({ preventScroll: true });
      controls.push({ tag: el.tagName, testId: el.getAttribute("data-testid"), text: el.textContent?.trim().slice(0, 80), classes: el.className, width: bounds.width, height: bounds.height, rest, focus });
    }
    return { resolvedTokens, controls, failures, note: "Review computed skins against applicable canonical and app-owned CSS rules. Hover and browser contrast ancestry need separate pointer measurement; never infer them from class presence." };
  });
}

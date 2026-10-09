// Real Chromium against the running app. Admin identity: the documented
// X-Admin-Audit-Key header, added ONLY to same-origin requests via route
// interception (Clerk/third-party requests are untouched).
import path from "node:path";
import { log, BASE } from "./lib.mjs";
const ROOT = "/home/runner/workspace";
process.env.PLAYWRIGHT_BROWSERS_PATH ||= path.join(ROOT, ".cache/ms-playwright");
const { chromium } = await import(path.join(ROOT, "node_modules/@playwright/test/index.mjs"));

export async function openAdminBrowser() {
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const origin = new URL(BASE).origin;
  await context.route((url) => url.origin === origin, async (route) => {
    const headers = { ...route.request().headers(), "x-admin-audit-key": process.env.ADMIN_PASSWORD };
    await route.continue({ headers });
  });
  // Dismiss the consent banner up front so it never eats clicks.
  await context.addInitScript(() => {
    try { localStorage.setItem("analytics-consent", "denied"); } catch {}
  });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on("pageerror", (e) => consoleErrors.push(String(e)));
  return { browser, context, page, consoleErrors };
}

export async function shot(page, item, name) {
  const file = `/tmp/p583/shots/${item}-${name}.png`;
  await page.screenshot({ path: file, fullPage: false });
  log(item, { label: "screenshot", note: file });
  return file;
}

/** SPA navigation (pushState + popstate) so the React Query cache survives. */
export async function spaNav(page, to) {
  await page.evaluate((href) => { window.history.pushState(null, "", href); window.dispatchEvent(new PopStateEvent("popstate")); }, to);
}

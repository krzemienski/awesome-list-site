import { chromium } from "@playwright/test";
import fs from "node:fs";
import { BASE, clerk } from "./lib.mjs";

// Screenshots go to /tmp first (repo writes during a run reload every Vite page).
export const SHOTS = process.env.SHOTS ?? "/tmp/v592shots";
fs.mkdirSync(SHOTS, { recursive: true });

export const VPS = {
  desktop: { width: 1440, height: 900 },
  390: { width: 390, height: 844, mobile: true },
  402: { width: 402, height: 874, mobile: true },
  768: { width: 768, height: 1024 },
  375: { width: 375, height: 812, mobile: true },
};

export async function launch() {
  return chromium.launch({ headless: true });
}

export async function newPage(browser, { width = 1440, height = 900, mobile = false } = {}, { consent = true } = {}) {
  const context = await browser.newContext({
    viewport: { width, height }, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile, reducedMotion: "reduce",
  });
  if (consent) await context.addInitScript(() => { try { localStorage.setItem("analytics-consent", "denied"); } catch {} });
  const page = await context.newPage();
  page.__errors = [];
  page.on("pageerror", (e) => page.__errors.push(String(e).slice(0, 300)));
  return { context, page };
}

/** Sign the browser into a backend-minted Clerk user via a sign-in ticket. */
export async function signIn(page, user, landing = "/") {
  const tok = await clerk("POST", "/sign_in_tokens", { user_id: user.clerkUserId, expires_in_seconds: 600 });
  // landing=null: sign in inside the already-loaded SPA (no navigation).
  if (landing !== null) await page.goto(`${BASE}${landing}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => Boolean(window.Clerk?.client), null, { timeout: 60_000 });
  await page.evaluate(async (ticket) => {
    const attempt = await window.Clerk.client.signIn.create({ strategy: "ticket", ticket });
    if (attempt.status !== "complete") throw new Error(`ticket sign-in status ${attempt.status}`);
    await window.Clerk.setActive({ session: attempt.createdSessionId });
  }, tok.token);
  await page.waitForFunction(() => Boolean(window.Clerk?.user), null, { timeout: 30_000 });
}

export async function shot(page, name, locator) {
  const file = `${SHOTS}/${name}.png`;
  await page.waitForTimeout(300);
  if (locator) await locator.screenshot({ path: file }); else await page.screenshot({ path: file });
  return file;
}
export const toasts = async (page) => (await page.locator("li[data-state]").allInnerTexts().catch(() => [])).join(" | ");
/** fetch() from inside the page so it carries the browser's Clerk session. */
export const pageFetch = (page, path, init = {}) => page.evaluate(async ([p, i]) => {
  const r = await fetch(p, { credentials: "include", ...i, headers: { "Content-Type": "application/json", ...(i.headers ?? {}) } });
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch {}
  return { status: r.status, json: j };
}, [path, init]);

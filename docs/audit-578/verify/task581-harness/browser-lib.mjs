import { chromium } from "@playwright/test";
import { BASE, clerk } from "./lib.mjs";

export async function launch() {
  return chromium.launch({ headless: true });
}

export async function newPage(browser, { width = 1366, height = 900, mobile = false } = {}) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
    isMobile: mobile,
    hasTouch: mobile,
    reducedMotion: "reduce",
  });
  // Dismiss the consent banner up front so it never eats clicks.
  await context.addInitScript(() => {
    try { localStorage.setItem("analytics-consent", "denied"); } catch {}
  });
  const page = await context.newPage();
  page.on("console", (m) => { if (/route-monitor|error/i.test(m.text())) page.__logs = [...(page.__logs ?? []), `${m.type()}: ${m.text()}`]; });
  return { context, page };
}

/** Sign the browser into a backend-minted Clerk user via a sign-in ticket. */
export async function signIn(page, user, landing = "/") {
  const tok = await clerk("POST", "/sign_in_tokens", { user_id: user.clerkUserId, expires_in_seconds: 600 });
  await page.goto(`${BASE}${landing}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => Boolean(window.Clerk?.client), null, { timeout: 45_000 });
  await page.evaluate(async (ticket) => {
    const attempt = await window.Clerk.client.signIn.create({ strategy: "ticket", ticket });
    if (attempt.status !== "complete") throw new Error(`ticket sign-in status ${attempt.status}`);
    await window.Clerk.setActive({ session: attempt.createdSessionId });
  }, tok.token);
  await page.waitForFunction(() => Boolean(window.Clerk?.user), null, { timeout: 30_000 });
}

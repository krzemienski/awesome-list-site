import { createRequire } from "node:module";
import { clerk, BASE } from "./lib.mjs";
const require = createRequire("/home/runner/workspace/package.json");
const { chromium } = require("@playwright/test");

export async function signedInPage(user, { width = 1366, height = 900 } = {}) {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  const requests = [];
  page.on("request", (r) => {
    if (r.method() === "POST" && /\/api\/(resources\/\d+\/edits|claude\/analyze|admin\/resource-edits)/.test(r.url())) {
      requests.push({ url: r.url().replace(BASE, ""), body: r.postData() });
    }
  });
  const responses = [];
  page.on("response", async (r) => {
    if (r.request().method() === "POST" && /\/api\/(resources\/\d+\/edits|claude\/analyze|admin\/resource-edits)/.test(r.url())) {
      let body = ""; try { body = (await r.text()).slice(0, 600); } catch {}
      responses.push({ url: r.url().replace(BASE, ""), status: r.status(), body });
    }
  });
  // Real Clerk sign-in with a backend-issued one-time ticket (no UI bypass).
  const { token } = await clerk("POST", "/sign_in_tokens", { user_id: user.clerkId, expires_in_seconds: 600 });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk && window.Clerk.client, null, { timeout: 60000 });
  await page.evaluate(async (ticket) => {
    const si = await window.Clerk.client.signIn.create({ strategy: "ticket", ticket });
    await window.Clerk.setActive({ session: si.createdSessionId });
  }, token);
  await page.waitForFunction(() => !!window.Clerk.user, null, { timeout: 30000 });
  return { browser, page, requests, responses };
}

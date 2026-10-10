import { chromium } from "playwright";
import pg from "pg";
const B = "http://127.0.0.1:5000";
const EXE = "/home/runner/workspace/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome";
const KEY = process.env.CLERK_SECRET_KEY;
const PREFIX = "__qa_test_plan_";
const bridgeId = `${PREFIX}h09_${Date.now()}`;
const email = `${bridgeId}@example.com`;
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const log = (...a) => console.log(...a);
async function clerk(method, route, body) {
  const r = await fetch(`https://api.clerk.com/v1${route}`, { method, headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const d = await r.json().catch(() => null);
  if (!r.ok) throw new Error(`Clerk ${method} ${route} ${r.status} ${JSON.stringify(d).slice(0, 200)}`);
  return d;
}
let clerkUserId;
const browser = await chromium.launch({ headless: true, executablePath: EXE });
async function signedInPage(viewport, system) {
  const ctx = await browser.newContext({ viewport });
  await ctx.addInitScript(s => { localStorage.setItem("analytics-consent", "denied"); if (s && !sessionStorage.getItem("seeded")) { localStorage.setItem("ds-system", s); sessionStorage.setItem("seeded", "1"); } }, system);
  const page = await ctx.newPage();
  const { token } = await clerk("POST", "/sign_in_tokens", { user_id: clerkUserId, expires_in_seconds: 600 });
  await page.goto(B + "/");
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 30000 });
  await page.evaluate(async t => { const si = await window.Clerk.client.signIn.create({ strategy: "ticket", ticket: t }); await window.Clerk.setActive({ session: si.createdSessionId }); }, token);
  await page.waitForFunction(() => !!window.Clerk?.user, null, { timeout: 20000 });
  return { ctx, page };
}
async function apiJwt() {
  const s = await clerk("POST", "/sessions", { user_id: clerkUserId });
  const { jwt } = await clerk("POST", `/sessions/${s.id}/tokens`, {});
  return jwt;
}
async function apiPrefs(method, body) {
  const r = await fetch(B + "/api/user/preferences", { method, headers: { Authorization: `Bearer ${await apiJwt()}`, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await r.json().catch(() => null) };
}
const toastInfo = page => page.evaluate(() => { const li = [...document.querySelectorAll('li[data-state="open"]')].find(e => /Theme not saved/.test(e.textContent)); if (!li) return "no toast"; const r = li.getBoundingClientRect(); return `toast visible-in-viewport=${r.top >= 0 && r.bottom <= innerHeight && r.width > 0} text="${li.textContent.trim()}"`; });
const statusText = page => page.evaluate(() => { const el = [...document.querySelectorAll('[role="status"],[role="alert"]')].find(e => /account|device/i.test(e.textContent)); return el ? `${el.getAttribute("role")}: ${el.textContent.trim()}` : null; });
try {
  const u = await clerk("POST", "/users", { email_address: [email], external_id: bridgeId, skip_password_requirement: true });
  clerkUserId = u.id; log("clerk user created", u.id, "bridge", bridgeId);
  for (const [vp, start, target, tag] of [[{ width: 1440, height: 900 }, "editorial", "brutalist", "desktop"], [{ width: 390, height: 844 }, "brutalist", "editorial", "390"]]) {
    const { ctx, page } = await signedInPage(vp, start);
    await page.goto(B + "/settings/theme"); await page.waitForLoadState("networkidle").catch(() => {}); await page.waitForTimeout(1500);
    log(`\n[${tag}] start system=${await page.evaluate(() => document.documentElement.dataset.system)} status=${await statusText(page)}`);
    log(`[${tag}] server before:`, JSON.stringify((await apiPrefs("GET")).body?.theme));
    // 1) network failure on the account write
    const puts = [];
    await page.route("**/api/user/preferences", r => { if (r.request().method() === "PUT") { puts.push("aborted"); return r.abort("failed"); } return r.continue(); });
    await page.click(`[data-testid="system-option-${target}"]`);
    await page.getByRole("button", { name: "Retry account save" }).waitFor({ timeout: 15000 });
    await page.waitForTimeout(500);
    log(`[${tag}] after blocked PUT: applied=${await page.evaluate(() => document.documentElement.dataset.system)} puts=${puts.length} ${await statusText(page)}`);
    log(`[${tag}] ${await toastInfo(page)}`);
    await page.screenshot({ path: `/tmp/h587/shots/h09-failed-${target}-${tag}.png` });
    log(`[${tag}] server after blocked PUT:`, JSON.stringify((await apiPrefs("GET")).body?.theme));
    await page.unroute("**/api/user/preferences");
    await page.getByRole("button", { name: "Retry account save" }).click();
    await page.getByText("Theme saved to your account.").waitFor({ timeout: 15000 });
    await page.waitForTimeout(800);
    log(`[${tag}] after retry: ${await statusText(page)} | ${await toastInfo(page)}`);
    await page.screenshot({ path: `/tmp/h587/shots/h09-saved-${target}-${tag}.png` });
    const after = await apiPrefs("GET");
    log(`[${tag}] server after retry:`, JSON.stringify(after.body?.theme), "revision", after.body?.revision);
    // 2) real revision conflict: another device writes first.
    const accents = await page.$$eval('[data-testid^="accent-option-"]', els => els.map(e => e.dataset.testid.replace("accent-option-", "")));
    const current = await page.evaluate(() => document.documentElement.dataset.accent);
    const other = accents.filter(a => a !== current);
    const elsewhere = await apiPrefs("PUT", { themeSystem: "geist", themeAccent: other[0], expectedRevision: after.body?.revision });
    log(`[${tag}] other-device write: ${elsewhere.status} theme=${JSON.stringify(elsewhere.body?.theme)} revision=${elsewhere.body?.revision}`);
    const statuses = [];
    page.on("response", r => { if (r.url().endsWith("/api/user/preferences") && r.request().method() === "PUT") statuses.push(r.status()); });
    await page.click(`[data-testid="accent-option-${other[1]}"]`);
    await page.getByRole("button", { name: "Retry account save" }).waitFor({ timeout: 15000 });
    await page.waitForTimeout(800);
    log(`[${tag}] conflict PUT statuses=${statuses} ${await statusText(page)} applied=${await page.evaluate(() => [document.documentElement.dataset.system, document.documentElement.dataset.accent].join("/"))}`);
    log(`[${tag}] scrollY=${await page.evaluate(() => Math.round(scrollY))} ${await toastInfo(page)}`);
    await page.screenshot({ path: `/tmp/h587/shots/h09-conflict-${tag}.png` });
    // Retry from the toast, where the visitor is looking (pickers are scrolled).
    await page.locator('li[data-state="open"]').filter({ hasText: "Theme not saved" }).getByRole("button", { name: /Retry/ }).click();
    await page.getByText("Theme saved to your account.").waitFor({ timeout: 15000 });
    const final = await apiPrefs("GET");
    await page.waitForTimeout(800);
    log(`[${tag}] toast-retry after conflict statuses=${statuses} ${await statusText(page)} | ${await toastInfo(page)} server=${JSON.stringify(final.body?.theme)}`);
    await ctx.close();
    // 3) fresh session/device: no local theme storage at all.
    const fresh = await signedInPage(vp, null);
    await fresh.page.goto(B + "/settings/theme"); await fresh.page.waitForLoadState("networkidle").catch(() => {}); await fresh.page.waitForTimeout(2500);
    const applied = await fresh.page.evaluate(() => [document.documentElement.dataset.system, document.documentElement.dataset.accent].join("/"));
    log(`[${tag}] fresh device applied=${applied} expected=${final.body?.theme?.systemId}/${final.body?.theme?.accentId} ${await statusText(fresh.page)}`);
    await fresh.page.screenshot({ path: `/tmp/h587/shots/h09-fresh-${tag}.png` });
    await fresh.ctx.close();
  }
} finally {
  await browser.close();
  if (clerkUserId) { await clerk("DELETE", `/users/${clerkUserId}`).then(() => log("clerk user deleted")).catch(e => log("clerk delete failed", e.message)); }
  await pool.query("DELETE FROM user_preferences WHERE user_id = $1", [bridgeId]);
  await pool.query("DELETE FROM users WHERE id = $1", [bridgeId]);
  const { rows } = await pool.query(`SELECT (SELECT count(*) FROM users WHERE id LIKE '__qa_test_plan_%' OR email LIKE '__qa_test_plan_%')::int AS users, (SELECT count(*) FROM user_preferences WHERE user_id LIKE '__qa_test_plan_%')::int AS prefs`);
  log("residue", JSON.stringify(rows[0]));
  await pool.end();
}

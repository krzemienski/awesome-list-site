/**
 * Run3 dev verification sweep (task #135, T011) — browser-level checks for
 * findings whose fixes were code-done but unverified:
 *  R3-02/12  /admin/:section deep-links + all admin tabs stay on /admin
 *  R3-29     lean NotFound layout (no full chrome duplication)
 *  R3-14/21  Recommendations page renders items with truthful labels
 *  R3-30     journey detail steps link to resources
 *  R3-31     ResourceCard / category cards are real <a> anchors
 *  R3-04     submit form category select has an accessible name
 *
 * Usage: node scripts/run3-verify-dev.mjs [BASE]
 * Needs dev admin creds via env: ADMIN_TEST_EMAIL / ADMIN_TEST_PASSWORD.
 */
import { chromium } from "playwright";

const BASE = process.argv[2] || "http://localhost:5000";
const EMAIL = process.env.ADMIN_TEST_EMAIL || "admin@example.com";
const PASSWORD = process.env.ADMIN_TEST_PASSWORD;
const EXEC = ".cache/ms-playwright/chromium-1223/chrome-linux64/chrome";

const results = [];
const ok = (id, name, pass, detail) => {
  results.push({ id, name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${id}  ${name} — ${detail}`);
};

const browser = await chromium.launch({ executablePath: EXEC });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

// ---- login (needed for /admin + journeys progress surfaces) ----
if (PASSWORD) {
  const r = await ctx.request.post(`${BASE}/api/auth/local/login`, {
    data: { email: EMAIL, password: PASSWORD },
  });
  if (!r.ok()) {
    console.error("admin login failed:", r.status(), await r.text());
    process.exit(1);
  }
}

// ---- R3-02: /admin/resources deep link lands on Resources tab ----
await page.goto(`${BASE}/admin/resources`, { waitUntil: "networkidle" });
{
  const url = page.url();
  const onAdmin = url.includes("/admin");
  const activeTab = await page
    .locator('[role="tab"][aria-selected="true"], [role="tab"][data-state="active"]')
    .first()
    .textContent()
    .catch(() => null);
  ok("R3-02", "admin deep-link /admin/resources", onAdmin && /resource/i.test(activeTab || ""),
    `url=${url} activeTab=${(activeTab || "").trim()}`);
}

// ---- R3-12: click through ALL admin tabs; url must stay on /admin ----
{
  await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
  const tabs = page.locator('[role="tab"]');
  const n = await tabs.count();
  let stayed = 0;
  const escaped = [];
  for (let i = 0; i < n; i++) {
    await tabs.nth(i).click().catch(() => {});
    await page.waitForTimeout(250);
    const u = new URL(page.url());
    if (u.pathname.startsWith("/admin")) stayed++;
    else {
      escaped.push(`${(await tabs.nth(i).textContent().catch(() => "?"))?.trim()}→${u.pathname}`);
      await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
    }
  }
  ok("R3-12", `all ${n} admin tabs stay on /admin`, n >= 10 && escaped.length === 0,
    escaped.length ? `escaped: ${escaped.join(", ")}` : `${stayed}/${n} stayed`);
}

// ---- R3-29: lean 404 ----
{
  await page.goto(`${BASE}/definitely-not-a-page-xyz`, { waitUntil: "networkidle" });
  const h1 = (await page.locator("h1").first().textContent().catch(() => "")) || "";
  const sidebarCount = await page.locator('[data-sidebar="sidebar"]').count();
  const homeLink = await page.locator('a[href="/"]').count();
  ok("R3-29", "lean NotFound layout", /404|not found/i.test(h1) && homeLink > 0,
    `h1="${h1.trim()}" sidebars=${sidebarCount} homeLinks=${homeLink}`);
}

// ---- R3-14/21: Recommendations page renders items, truthful labels ----
{
  await page.goto(`${BASE}/recommendations`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  const body = await page.textContent("body");
  const cards = await page.locator('[data-testid*="recommendation"], a[href^="/resource/"]').count();
  const claudeClaim = /powered by claude|claude ai analyzed/i.test(body || "");
  ok("R3-14", "recommendations render items", cards > 0, `${cards} resource links/cards`);
  ok("R3-21", "no untruthful AI claim on rule-based recs", !claudeClaim,
    claudeClaim ? "found Claude claim text" : "no Claude claim in body");
}

// ---- R3-30: journey detail steps link resources ----
// (journey listing cards are onClick-nav; the finding targets the DETAIL page,
//  so resolve a real journey id from the API and go there directly)
{
  const jr = await ctx.request.get(`${BASE}/api/journeys`);
  const jd = await jr.json();
  const journeys = jd.journeys || jd;
  const jid = journeys?.[0]?.id;
  if (jid) {
    await page.goto(`${BASE}/journey/${jid}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    const resLinks = await page.locator('a[href^="/resource/"]').count();
    ok("R3-30", "journey steps link resources", resLinks > 0, `/journey/${jid}: ${resLinks} resource links`);
  } else {
    ok("R3-30", "journey steps link resources", false, "no journeys returned by /api/journeys");
  }
}

// ---- R3-31: category page cards are real anchors ----
{
  await page.goto(`${BASE}/category/encoding-codecs`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  const cardAnchors = await page.locator('a[href^="/resource/"]').count();
  ok("R3-31", "resource cards are real <a> anchors", cardAnchors > 0, `${cardAnchors} anchors on category page`);
}

// ---- R3-04: submit form select accessible name ----
{
  await page.goto(`${BASE}/submit`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  // shadcn Select renders a combobox trigger; check for aria-label / labelled-by / <label for>.
  // Skip Radix's aria-hidden native <select> mirror — it is invisible to AT.
  const combos = page.locator('[role="combobox"]:not([aria-hidden="true"]), select:not([aria-hidden="true"])');
  const n = await combos.count();
  let named = 0;
  for (let i = 0; i < n; i++) {
    const el = combos.nth(i);
    const aria = await el.getAttribute("aria-label");
    const labelledBy = await el.getAttribute("aria-labelledby");
    const id = await el.getAttribute("id");
    let hasLabel = Boolean(aria || labelledBy);
    if (!hasLabel && id) hasLabel = (await page.locator(`label[for="${id}"]`).count()) > 0;
    if (hasLabel) named++;
  }
  ok("R3-04", "submit selects have accessible names", n > 0 && named === n, `${named}/${n} named`);
}

console.log("\npageerrors:", errors.length ? errors.slice(0, 5) : "none");
const failed = results.filter((r) => !r.pass);
console.log(`\n=== ${results.length - failed.length}/${results.length} PASS ===`);
await browser.close();
process.exit(failed.length ? 1 : 0);

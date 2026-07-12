/**
 * Run3 PROD verification sweep — anonymous checks only (task #136).
 * Admin-authed checks (R3-02 tab landing, R3-12 tab strip) run separately
 * with prod admin creds via run3-verify-dev.mjs pointed at prod.
 *
 * Usage: node scripts/run3-verify-prod-anon.mjs [BASE]
 */
import { chromium } from "playwright";

const BASE = process.argv[2] || "https://awesome.video";
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

// ---- R3-29: lean 404 (real 404 status + no full sidebar) ----
{
  const resp = await page.goto(`${BASE}/definitely-not-a-page-xyz`, { waitUntil: "networkidle" });
  const h1 = (await page.locator("h1").first().textContent().catch(() => "")) || "";
  const sidebarCount = await page.locator('[data-sidebar="sidebar"]').count();
  const homeLink = await page.locator('a[href="/"]').count();
  const resourceLinks = await page.locator('a[href^="/category/"], a[href^="/subcategory/"]').count();
  ok("R3-29", "lean NotFound layout + 404 status",
    resp.status() === 404 && /404|not found/i.test(h1) && homeLink > 0 && resourceLinks < 20,
    `status=${resp.status()} h1="${h1.trim()}" sidebars=${sidebarCount} navLinks=${resourceLinks}`);
}

// ---- R3-14/21: Recommendations page renders items, truthful labels ----
{
  await page.goto(`${BASE}/recommendations`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  const body = await page.textContent("body");
  const cards = await page.locator('[data-testid*="recommendation"], a[href^="/resource/"]').count();
  const claudeClaim = /powered by claude|claude ai analyzed/i.test(body || "");
  ok("R3-14", "recommendations render items", cards > 0, `${cards} resource links/cards`);
  ok("R3-21", "no untruthful AI claim on rule-based recs", !claudeClaim,
    claudeClaim ? "found Claude claim text" : "no Claude claim in body");
}

// ---- R3-30: journey detail steps link resources ----
{
  const jr = await ctx.request.get(`${BASE}/api/journeys`);
  const jd = await jr.json();
  const journeys = jd.journeys || jd;
  const jid = journeys?.[0]?.id;
  if (jid) {
    await page.goto(`${BASE}/journey/${jid}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    const resLinks = await page.locator('a[href^="/resource/"]').count();
    ok("R3-30", "journey steps link resources", resLinks > 0, `/journey/${jid}: ${resLinks} resource links`);
  } else {
    ok("R3-30", "journey steps link resources", false, "no journeys returned by /api/journeys");
  }
}

// ---- R3-31: category page cards are real anchors ----
{
  await page.goto(`${BASE}/category/encoding-codecs`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  const cardAnchors = await page.locator('a[href^="/resource/"]').count();
  ok("R3-31", "resource cards are real <a> anchors", cardAnchors > 0, `${cardAnchors} anchors on category page`);
}

// ---- R3-15/24 user-visible: dup search returns (informational for residuals) ----
{
  await page.goto(`${BASE}/search?q=${encodeURIComponent("Ant Media Server")}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  const cards = await page.locator('a[href^="/resource/"]').count();
  ok("R3-15", "search renders results (dedup face)", cards > 0, `${cards} result cards for "Ant Media Server"`);
}

// ---- P0 smoke: search -> detail -> visit link has real href ----
{
  await page.goto(`${BASE}/search?q=ffmpeg`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  const first = page.locator('a[href^="/resource/"]').first();
  const href = await first.getAttribute("href").catch(() => null);
  if (href) {
    await page.goto(`${BASE}${href}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    const h1 = (await page.locator("h1").first().textContent().catch(() => "")) || "";
    const visit = await page
      .locator('a[href^="http"]:has-text("Visit"), a[target="_blank"][href^="http"]')
      .first()
      .getAttribute("href")
      .catch(() => null);
    ok("P0-detail", "search→detail→visit href", Boolean(h1.trim()) && Boolean(visit),
      `h1="${h1.trim().slice(0, 40)}" visit=${(visit || "none").slice(0, 60)}`);
  } else {
    ok("P0-detail", "search→detail→visit href", false, "no search result anchors");
  }
}

// ---- P0 smoke mobile 390px: no horizontal overflow on home + category ----
{
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mpage = await mctx.newPage();
  let overflow = [];
  for (const r of ["/", "/category/encoding-codecs"]) {
    await mpage.goto(`${BASE}${r}`, { waitUntil: "networkidle" });
    await mpage.waitForTimeout(1000);
    const sw = await mpage.evaluate(() => document.documentElement.scrollWidth);
    if (sw > 400) overflow.push(`${r}:${sw}`);
  }
  ok("P0-mobile", "no horizontal overflow @390px", overflow.length === 0,
    overflow.length ? overflow.join(", ") : "scrollWidth <= 400 on both routes");
  await mctx.close();
}

console.log("\npageerrors:", errors.length ? errors.slice(0, 5) : "none");
const failed = results.filter((r) => !r.pass);
console.log(`\n=== ${results.length - failed.length}/${results.length} PASS ===`);
await browser.close();
process.exit(failed.length ? 1 : 0);

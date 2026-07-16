// Confirmation-pass visual/route sweep against prod. No remediation — journal only.
// Usage: node scripts/confirm-pass-sweep.mjs <desktop|tablet|mobile> <pass-dir>
import { chromium } from "playwright";
import fs from "fs";
const EXEC = ".cache/ms-playwright/chromium-1223/chrome-linux64/chrome";
const BASE = "https://awesome.video";
const VP = { desktop: { width: 1440, height: 900 }, tablet: { width: 768, height: 1024 }, mobile: { width: 375, height: 812 } };
const mode = process.argv[2] || "desktop";
const passDir = process.argv[3] || "audit-evidence/confirm-pass-1";
const results = [];
const ok = (n, p, d = "") => { results.push({ n, p, d }); console.log(`${p ? "PASS" : "FAIL"} [${mode}] ${n}${d ? " — " + d : ""}`); };

const browser = await chromium.launch({ executablePath: EXEC });
const ctx = await browser.newContext({ viewport: VP[mode] });
const page = await ctx.newPage();
const consoleErrors = [];
page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text().slice(0, 200)); });
page.on("pageerror", (e) => consoleErrors.push("pageerror: " + String(e).slice(0, 200)));

await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 45000 });

// consent banner opacity (fresh context)
const banner = page.locator('[class*="fixed"][class*="bottom"]').filter({ hasText: /cookie|consent|analytics/i }).first();
if (await banner.isVisible().catch(() => false)) {
  const bg = await banner.evaluate((el) => getComputedStyle(el).backgroundColor);
  const alpha = bg.startsWith("rgba") ? parseFloat(bg.split(",")[3]) : 1;
  ok("consent banner opaque", alpha >= 0.95, bg);
  await banner.getByRole("button", { name: /accept/i }).click().catch(() => {});
  await page.waitForTimeout(400);
} else ok("consent banner visible on fresh context", false);

// pick real ids/slugs from the live tree
const tree = await page.evaluate(async () => {
  const r = await fetch("/api/awesome-list"); const d = await r.json();
  const cats = d.categories || [];
  const cat = cats.find((c) => (c.resources?.length || c.subcategories?.length)) || cats[0];
  const sub = cat?.subcategories?.[0];
  const subsub = sub?.subSubcategories?.[0] || sub?.subcategories?.[0];
  const firstRes = (cat?.resources?.[0] || sub?.resources?.[0] || subsub?.resources?.[0]);
  return { catCount: cats.length, catSlug: cat?.slug, subSlug: sub?.slug, subsubSlug: subsub?.slug, resId: firstRes?.id };
});
ok("tree category count == 9", tree.catCount === 9, `got ${tree.catCount}`);
const journeys = await page.evaluate(async () => (await (await fetch("/api/journeys")).json()));
const jid = (journeys?.journeys || journeys || [])[0]?.id;

const routes = [
  "/", "/categories", `/category/${tree.catSlug}`,
  tree.subSlug ? `/subcategory/${tree.subSlug}` : null,
  tree.subsubSlug ? `/sub-subcategory/${tree.subsubSlug}` : null,
  tree.resId ? `/resource/${tree.resId}` : null,
  "/journeys", jid ? `/journey/${jid}` : null,
  "/advanced", "/search?q=ffmpeg", "/recommendations", "/submit",
  "/about", "/terms", "/privacy", "/login", "/register", "/forgot-password",
  "/settings/theme", "/bogus-page-xyz",
].filter(Boolean);

for (const r of routes) {
  await page.evaluate((path) => { history.pushState({}, "", path); dispatchEvent(new PopStateEvent("popstate")); }, r);
  await page.waitForTimeout(900);
  const chk = await page.evaluate(() => {
    const main = document.querySelector("main");
    const overflowX = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    const brokenImgs = [...document.querySelectorAll("img")].filter((i) => i.complete && i.naturalWidth === 0 && i.offsetParent !== null).length;
    return { mainLen: (main?.innerText || "").trim().length, overflowX, brokenImgs };
  });
  const is404Route = r === "/bogus-page-xyz";
  const mainOk = is404Route ? true : chk.mainLen > 40;
  ok(`route ${r}: content`, mainOk, `mainLen=${chk.mainLen}`);
  ok(`route ${r}: no h-overflow`, chk.overflowX <= 1, `overflowX=${chk.overflowX}`);
  if (chk.brokenImgs) ok(`route ${r}: broken images`, false, `${chk.brokenImgs} broken`);
  if (is404Route) {
    // 404 renders a standalone card without <main> (by design, S-26) — read body
    const t = await page.locator("body").innerText().catch(() => "");
    ok("404 card rendered", /doesn't exist|couldn't find|not found/i.test(t));
  }
}

// alias redirects (full gotos — server/client redirect)
for (const [alias, dest] of [["/explore", "/search"], ["/signup", "/register"], ["/favorites", null]]) {
  await page.goto(BASE + alias, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(1200);
  const path = await page.evaluate(() => location.pathname);
  ok(`alias ${alias} redirects`, dest ? path === dest : path !== alias, `landed ${path}`);
}

// screenshots of key screens
for (const [name, r] of [["home", "/"], ["category", `/category/${tree.catSlug}`], ["resource", tree.resId ? `/resource/${tree.resId}` : "/"]]) {
  await page.goto(BASE + r, { waitUntil: "networkidle", timeout: 45000 }).catch(() => {});
  await page.screenshot({ path: `${passDir}/screens/${mode}_${name}.png` });
}

const realErrors = consoleErrors.filter((e) => !/google|gtag|analytics|net::ERR_BLOCKED_BY_CLIENT|favicon/i.test(e));
ok("no app console errors", realErrors.length === 0, realErrors.slice(0, 3).join(" | "));

await browser.close();
const fails = results.filter((x) => !x.p);
fs.mkdirSync(passDir, { recursive: true });
fs.writeFileSync(`${passDir}/sweep-${mode}.json`, JSON.stringify({ at: new Date().toISOString(), mode, results, consoleErrors }, null, 2));
console.log(`\n[${mode}] ${results.length - fails.length}/${results.length} PASS`);
process.exit(fails.length ? 1 : 0);

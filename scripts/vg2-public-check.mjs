// VG-2 public UX evidence against the LOCAL running app. Real browser, real data.
// Captures screenshots + functional assertions for search, theme, share, login,
// top-nav pages, at desktop/tablet/mobile. No mocks.
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "fs";

const BASE = process.env.VERIFY_BASE || "http://localhost:5055";
mkdirSync("evidence/vg2", { recursive: true });
const out = [];
const rec = (id, pass, detail) => { out.push({ id, pass, detail }); console.log(`${pass ? "PASS" : "FAIL"} ${id} — ${detail}`); };

const b = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const consoleErrs = [];
page.on("console", (m) => { if (m.type() === "error") consoleErrs.push(m.text().slice(0, 160)); });
page.on("pageerror", (e) => consoleErrs.push("[pageerror] " + String(e).slice(0, 160)));

// 1) landing loads with content
await page.goto(BASE + "/", { waitUntil: "networkidle" });
await page.waitForSelector('[data-testid^="row-cat-"]', { timeout: 10000 });
const landingTitle = await page.title();
rec("landing-loads", /Awesome Video/.test(landingTitle), `title="${landingTitle}"`);
await page.screenshot({ path: "evidence/vg2/landing-desktop.png", fullPage: false });

// 2) search affordance discoverable + functional (BUG-004/015)
const searchEl = page.locator('input[type="search"], input[placeholder*="earch" i], [data-testid*="search" i] input, [data-testid*="search" i]').first();
const hasSearch = await searchEl.count() > 0;
rec("search-affordance-present", hasSearch, `search input count=${await searchEl.count()}`);
// Use the API-backed search page directly as the functional check
await page.goto(BASE + "/search?q=ffmpeg", { waitUntil: "networkidle" }).catch(()=>{});
await page.waitForTimeout(1200);
const ffmpegVisible = await page.evaluate(() => document.body.innerText.toLowerCase().includes("ffmpeg") || document.body.innerText.toLowerCase().includes("ffsubsync") || document.body.innerText.toLowerCase().includes("pyav"));
rec("search-returns-results", ffmpegVisible, `/search?q=ffmpeg body mentions an ffmpeg-related result=${ffmpegVisible}`);
await page.screenshot({ path: "evidence/vg2/search-ffmpeg.png", fullPage: false });

// 3) login form: NOT pre-filled with admin@example.com (BUG-041)
await page.goto(BASE + "/login", { waitUntil: "networkidle" });
await page.waitForSelector('input[type="email"]', { timeout: 8000 });
const emailVal = await page.locator('input[type="email"]').first().inputValue();
const emailPlaceholder = await page.locator('input[type="email"]').first().getAttribute("placeholder");
rec("login-no-prefill", emailVal === "", `email value="${emailVal}" placeholder="${emailPlaceholder}"`);
// label/accessibility
const emailLabelled = await page.locator('input[type="email"]').first().evaluate((el) => {
  const id = el.id;
  const lbl = id ? document.querySelector(`label[for="${id}"]`) : null;
  return !!(el.getAttribute("aria-label") || lbl || el.closest("label"));
});
rec("login-email-labelled", emailLabelled, `email has label/aria-label=${emailLabelled}`);
await page.screenshot({ path: "evidence/vg2/login.png", fullPage: false });

// 4) top-nav pages render content (BUG-010/023/024/025/034)
for (const [path, key] of [["/about","about"],["/categories","categories"],["/recommendations","recs"],["/journeys","journeys"]]) {
  await page.goto(BASE + path, { waitUntil: "networkidle" }).catch(()=>{});
  await page.waitForTimeout(600);
  const info = await page.evaluate(() => {
    const main = document.querySelector("main") || document.body;
    const txt = (main.innerText || "").trim();
    const headings = document.querySelectorAll("h1,h2,h3").length;
    return { len: txt.length, headings, sample: txt.slice(0, 80).replace(/\n/g," ") };
  });
  rec(`nav-content ${path}`, info.len > 200 && info.headings >= 1, `textLen=${info.len} headings=${info.headings} sample="${info.sample}"`);
  await page.screenshot({ path: `evidence/vg2/nav-${key}.png`, fullPage: false });
}

// 5) share button present on a resource page (BUG-100) — presence + accessible label
const firstResourceId = await page.evaluate(async () => {
  const r = await fetch("/api/resources?limit=1"); const j = await r.json();
  return j.resources?.[0]?.id;
});
if (firstResourceId) {
  await page.goto(BASE + "/resource/" + firstResourceId, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const share = page.locator('[data-testid="button-share"], button[aria-label="Share resource"]');
  const shareCount = await share.count();
  rec("share-button-present", shareCount > 0, `share button count=${shareCount} on /resource/${firstResourceId}`);
  await page.screenshot({ path: "evidence/vg2/resource-detail.png", fullPage: false });
} else {
  rec("share-button-present", false, "could not resolve a resource id");
}

// 6) responsive: mobile + tablet landing (no horizontal overflow)
for (const [w,h,name] of [[375,812,"mobile"],[768,1024,"tablet"]]) {
  await page.setViewportSize({ width:w, height:h });
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  rec(`no-hscroll-${name}`, overflow <= 2, `scrollWidth-clientWidth=${overflow}px at ${w}px`);
  await page.screenshot({ path: `evidence/vg2/landing-${name}.png`, fullPage: false });
}

// 7) console error budget on public journey
rec("console-clean", consoleErrs.length === 0, `${consoleErrs.length} console errors${consoleErrs.length ? ": " + consoleErrs.slice(0,3).join(" | ") : ""}`);

await b.close();
writeFileSync("evidence/vg2/vg2-results.json", JSON.stringify({ results: out, consoleErrs }, null, 2));
const passed = out.filter(r => r.pass).length;
console.log(`\n=== VG-2 ${passed}/${out.length} PASS ===`);
process.exit(0);

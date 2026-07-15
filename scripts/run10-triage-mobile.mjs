import { chromium } from "playwright";
const BASE = "http://localhost:5000";
const EXE = ".cache/ms-playwright/chromium-1223/chrome-linux64/chrome";
const out = [];
const ok = (n, verdict, d) => { out.push({ n, verdict, d }); console.log(`${n}: ${verdict} — ${d}`); };
const browser = await chromium.launch({ executablePath: EXE });

// ===== Mobile 375x667 =====
const m = await browser.newPage({ viewport: { width: 375, height: 667 } });
m.setDefaultTimeout(30000);

// BUG-002: home category cards content on mobile
await m.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 40000 });
await m.waitForSelector("a[data-testid^='link-category-']", { timeout: 30000 });
await m.waitForTimeout(1200);
const homeCards = await m.evaluate(() => {
  const cards = [...document.querySelectorAll("a[data-testid^='link-category-']")].slice(0, 6);
  return cards.map(c => ({ text: c.innerText.replace(/\s+/g, " ").slice(0, 60), h: c.getBoundingClientRect().height }));
});
ok("BUG-002 home cards mobile", homeCards.every(c => c.text.length > 5) ? "content-visible" : "EMPTY", JSON.stringify(homeCards.slice(0, 3)));
await m.screenshot({ path: "evidence/run10/mobile-home.png", fullPage: false });

// BUG-043: count formatting header vs subtitle
const counts = await m.evaluate(() => {
  const t = document.body.innerText;
  return { withComma: t.match(/[\d,]+ resources/g)?.slice(0,3) ?? null, curated: t.match(/[\d,]+ curated resources/)?.[0] ?? null };
});
ok("BUG-043 count formats", "check", JSON.stringify(counts));

// BUG-013/014: mobile sidebar width + outside tap + Escape
const trigger = m.locator("button[data-sidebar='trigger'], button[aria-label*='sidebar' i], button[aria-label*='menu' i]").first();
await trigger.click().catch(e => ok("BUG-013 trigger", "NO-TRIGGER", String(e).slice(0, 80)));
await m.waitForTimeout(900);
const sb = await m.evaluate(() => {
  const el = document.querySelector("[data-sidebar='sidebar'], [data-mobile='true']");
  const sheet = document.querySelector("[role='dialog']");
  const target = sheet || el;
  if (!target) return null;
  const r = target.getBoundingClientRect();
  const overlay = document.querySelector("[data-radix-dialog-overlay], [data-state='open'].fixed.inset-0");
  return { w: r.width, vw: innerWidth, overlay: !!overlay };
});
ok("BUG-013 sidebar width", sb ? `${sb.w}px/${sb.vw}px = ${Math.round(sb.w / sb.vw * 100)}%` : "NOT-FOUND", JSON.stringify(sb));
await m.screenshot({ path: "evidence/run10/mobile-sidebar-open.png" });
// tap outside (far right edge)
await m.mouse.click(371, 400);
await m.waitForTimeout(700);
const closedByTap = await m.evaluate(() => !document.querySelector("[role='dialog'] [data-sidebar='sidebar'], [data-mobile='true']"));
ok("BUG-014 outside tap closes", closedByTap ? "closes" : "STAYS-OPEN", "");
if (!closedByTap) {
  await m.keyboard.press("Escape");
  await m.waitForTimeout(500);
  const closedByEsc = await m.evaluate(() => !document.querySelector("[role='dialog'] [data-sidebar='sidebar'], [data-mobile='true']"));
  ok("BUG-014 escape closes", closedByEsc ? "closes" : "STAYS-OPEN", "");
}

// BUG-034: search placeholder on mobile
const ph = await m.evaluate(() => {
  const t = [...document.querySelectorAll("button,input")].map(e => e.placeholder || e.innerText).filter(x => /search/i.test(x || ""));
  return t.slice(0, 3);
});
ok("BUG-034 search placeholder", "check", JSON.stringify(ph));

// BUG-038: filter/sort buttons at 320px on category page
await m.setViewportSize({ width: 320, height: 640 });
await m.goto(`${BASE}/category/encoding-codecs`, { waitUntil: "domcontentloaded", timeout: 40000 });
await m.waitForSelector("button[aria-label='Sort resources']", { timeout: 30000 });
await m.waitForTimeout(800);
const overflow = await m.evaluate(() => {
  const doc = document.documentElement;
  const over = doc.scrollWidth > doc.clientWidth;
  const sort = document.querySelector("button[aria-label='Sort resources']");
  const r = sort?.getBoundingClientRect();
  return { docOverflow: over, scrollW: doc.scrollWidth, clientW: doc.clientWidth, sortRight: r ? Math.round(r.right) : null };
});
ok("BUG-038 320px overflow", overflow.docOverflow ? "OVERFLOWS" : "fits", JSON.stringify(overflow));
await m.screenshot({ path: "evidence/run10/mobile-320-category.png" });
await m.close();

// ===== Tablet 768x1024 =====
const t = await browser.newPage({ viewport: { width: 768, height: 1024 } });
t.setDefaultTimeout(30000);

// BUG-011: category resource cards at tablet
await t.goto(`${BASE}/category/encoding-codecs`, { waitUntil: "domcontentloaded", timeout: 40000 });
await t.waitForSelector("[data-testid^='card-resource-'], .resource-card, a[href^='/resource/']", { timeout: 30000 });
await t.waitForTimeout(1500);
const tabCards = await t.evaluate(() => {
  const cards = [...document.querySelectorAll("a[href^='/resource/']")].slice(0, 6);
  return cards.map(c => ({ text: c.innerText.replace(/\s+/g, " ").slice(0, 50), h: Math.round(c.getBoundingClientRect().height) }));
});
ok("BUG-011 tablet cards", tabCards.every(c => c.text.length > 5) ? "content-visible" : "EMPTY", JSON.stringify(tabCards.slice(0, 3)));
await t.screenshot({ path: "evidence/run10/tablet-category.png" });

// BUG-035: tablet sidebar width
const tsb = await t.evaluate(() => {
  const el = document.querySelector("[data-sidebar='sidebar']");
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { w: Math.round(r.width), visible: r.width > 0 };
});
ok("BUG-035 tablet sidebar", "check", JSON.stringify(tsb));

// BUG-033: /recommendations tablet sidebar skeletons after settle
await t.goto(`${BASE}/recommendations`, { waitUntil: "domcontentloaded", timeout: 40000 });
await t.waitForTimeout(4000);
const skel = await t.evaluate(() => {
  const skels = document.querySelectorAll("[data-sidebar] .animate-pulse, [data-sidebar='sidebar'] [class*='skeleton' i]");
  const links = document.querySelectorAll("[data-sidebar='sidebar'] a");
  return { skeletons: skels.length, sidebarLinks: links.length, sample: [...links].slice(0, 3).map(a => a.innerText.trim().slice(0, 30)) };
});
ok("BUG-033 tablet rec sidebar", skel.skeletons === 0 && skel.sidebarLinks > 0 ? "names-visible" : "SKELETONS", JSON.stringify(skel));
await t.screenshot({ path: "evidence/run10/tablet-recommendations.png" });

// BUG-029/036: recommendation card titles truncation + tooltip
const recTitles = await t.evaluate(() => {
  const els = [...document.querySelectorAll("h3, [class*='card'] a")].filter(e => /\S/.test(e.innerText)).slice(0, 8);
  return els.map(e => ({ txt: e.innerText.slice(0, 40), title: e.getAttribute("title"), clamped: getComputedStyle(e).webkitLineClamp !== "none" || getComputedStyle(e).textOverflow === "ellipsis" }));
});
ok("BUG-029/036 rec titles", "check", JSON.stringify(recTitles.slice(0, 4)));
await t.close();
await browser.close();
console.log("DONE", JSON.stringify(out.map(o => o.n + "=" + o.verdict)));

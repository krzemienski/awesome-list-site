import { chromium } from "playwright";
const BASE = "http://localhost:5000";
const EXE = ".cache/ms-playwright/chromium-1223/chrome-linux64/chrome";
const out = [];
const ok = (n, verdict, d) => { out.push({ n, verdict, d }); console.log(`${n}: ${verdict} — ${d}`); };
const browser = await chromium.launch({ executablePath: EXE });
const p = await browser.newPage({ viewport: { width: 1280, height: 900 } });
p.setDefaultTimeout(25000);

// Category page: card heights, truncation, View Details, tags
await p.goto(`${BASE}/category/encoding-codecs`, { waitUntil: "domcontentloaded", timeout: 40000 });
await p.waitForSelector("a[href^='/resource/']", { timeout: 25000 });
await p.waitForTimeout(1500);
const cardInfo = await p.evaluate(() => {
  const cards = [...document.querySelectorAll("a[href^='/resource/']")].slice(0, 12);
  const heights = cards.map(c => Math.round(c.getBoundingClientRect().height));
  const descs = [...document.querySelectorAll("a[href^='/resource/'] p")].slice(0, 6).map(el => el.innerText.slice(-25));
  const badges = [...document.querySelectorAll("a[href^='/resource/'] span, a[href^='/resource/'] div")].filter(e => /view details/i.test(e.innerText || "") && e.children.length <= 1).slice(0, 1);
  const vdr = badges[0]?.getBoundingClientRect();
  const tagEls = [...cards[0]?.querySelectorAll("[class*='badge' i], [class*='Badge']") || []].map(b => b.innerText.trim()).slice(0, 6);
  return { heights, descTails: descs, viewDetails: vdr ? { w: Math.round(vdr.width), h: Math.round(vdr.height) } : null, firstCardBadges: tagEls };
});
ok("BUG-020/049 card heights", "check", JSON.stringify(cardInfo.heights));
ok("BUG-021 desc tails", "check", JSON.stringify(cardInfo.descTails));
ok("BUG-032 View Details size", cardInfo.viewDetails ? `${cardInfo.viewDetails.w}x${cardInfo.viewDetails.h}` : "not-found", "");
ok("BUG-022 category card badges", "check", JSON.stringify(cardInfo.firstCardBadges));
await p.screenshot({ path: "evidence/run10/desktop-category.png" });

// Subcategory tags parity
const subHref = await p.evaluate(() => document.querySelector("a[href^='/subcategory/']")?.getAttribute("href"));
if (subHref) {
  await p.goto(`${BASE}${subHref}`, { waitUntil: "domcontentloaded", timeout: 40000 });
  await p.waitForTimeout(1800);
  const subTags = await p.evaluate(() => {
    const card = document.querySelector("a[href^='/resource/']");
    return card ? [...card.querySelectorAll("[class*='badge' i]")].map(b => b.innerText.trim()).slice(0, 6) : null;
  });
  ok("BUG-022 subcategory card badges", "check", JSON.stringify(subTags));
}

// Footer text (BUG-044) + sidebar active contrast (BUG-046)
await p.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 40000 });
await p.waitForSelector("a[data-testid^='link-category-']", { timeout: 25000 });
const misc = await p.evaluate(() => {
  const f = document.querySelector("footer");
  const footer = f ? f.innerText.replace(/\s+/g, " | ").slice(0, 250) : "NO-FOOTER";
  const active = document.querySelector(".sub-item.active, [data-sidebar] .active, [aria-current='page']");
  const gs = e => e ? { bg: getComputedStyle(e).backgroundColor, color: getComputedStyle(e).color, bl: getComputedStyle(e).borderLeftColor } : null;
  return { footer, hasClose: /close/i.test(footer), active: gs(active) };
});
ok("BUG-044 footer", misc.hasClose ? "HAS-CLOSE" : "no-close", misc.footer);
ok("BUG-046 active styles", "check", JSON.stringify(misc.active));
await browser.close();
console.log("DONE");

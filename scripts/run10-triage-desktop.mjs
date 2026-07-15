import { chromium } from "playwright";
const BASE = "http://localhost:5000";
const EXE = ".cache/ms-playwright/chromium-1223/chrome-linux64/chrome";
const out = [];
const ok = (n, verdict, d) => { out.push({ n, verdict, d }); console.log(`${n}: ${verdict} — ${d}`); };
const browser = await chromium.launch({ executablePath: EXE });
const p = await browser.newPage({ viewport: { width: 1280, height: 900 } });
p.setDefaultTimeout(30000);

// BUG-015: subcategory heading count
await p.goto(`${BASE}/subcategory/ffmpeg`, { waitUntil: "domcontentloaded", timeout: 40000 }).catch(() => {});
await p.waitForTimeout(2000);
let subUrl = p.url();
let h1info = await p.evaluate(() => {
  const h1s = [...document.querySelectorAll("h1")].map(h => h.innerText.trim());
  const heading = h1s[0] || "";
  const occurrences = heading ? (document.body.innerText.match(new RegExp(heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length : 0;
  return { h1Count: h1s.length, h1s: h1s.slice(0, 4), occurrences };
});
// If /subcategory/ffmpeg 404'd, navigate from a category page
if (h1info.h1Count === 0 || /not found/i.test((h1info.h1s[0] || ""))) {
  await p.goto(`${BASE}/category/encoding-codecs`, { waitUntil: "domcontentloaded", timeout: 40000 });
  await p.waitForTimeout(1500);
  const link = p.locator("a[href^='/subcategory/']").first();
  const href = await link.getAttribute("href").catch(() => null);
  if (href) {
    await p.goto(`${BASE}${href}`, { waitUntil: "domcontentloaded", timeout: 40000 });
    await p.waitForTimeout(1800);
    subUrl = p.url();
    h1info = await p.evaluate(() => {
      const h1s = [...document.querySelectorAll("h1")].map(h => h.innerText.trim());
      const heading = h1s[0] || "";
      const occurrences = heading ? (document.body.innerText.match(new RegExp(heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length : 0;
      return { h1Count: h1s.length, h1s: h1s.slice(0, 4), occurrences };
    });
  }
}
ok("BUG-015 subcategory heading", `${h1info.h1Count} h1 / ${h1info.occurrences} text-occurrences`, subUrl + " " + JSON.stringify(h1info.h1s));
await p.screenshot({ path: "evidence/run10/desktop-subcategory.png" });

// BUG-020/049: card heights on category page; BUG-021 truncation; BUG-022 tags; BUG-032 View Details size
await p.goto(`${BASE}/category/encoding-codecs`, { waitUntil: "domcontentloaded", timeout: 40000 });
await p.waitForSelector("a[href^='/resource/']", { timeout: 30000 });
await p.waitForTimeout(1500);
const cardInfo = await p.evaluate(() => {
  const cards = [...document.querySelectorAll("a[href^='/resource/']")].slice(0, 12);
  const heights = cards.map(c => Math.round(c.getBoundingClientRect().height));
  const rows = {};
  cards.forEach(c => { const top = Math.round(c.getBoundingClientRect().top / 10) * 10; (rows[top] ||= []).push(Math.round(c.getBoundingClientRect().height)); });
  const descs = [...document.querySelectorAll("a[href^='/resource/'] p")].slice(0, 8).map(p => p.innerText.slice(-25));
  const vd = [...document.body.querySelectorAll("*")].find(e => e.children.length === 0 && /view details/i.test(e.innerText || ""));
  const vdr = vd?.closest("a, [class*='badge' i], span, div")?.getBoundingClientRect();
  const tagEls = [...document.querySelectorAll("a[href^='/resource/'] [class*='badge' i], a[href^='/resource/'] .chip")].slice(0, 5).map(b => b.innerText.trim());
  return { heights, rowsSameHeight: Object.values(rows).map(r => new Set(r).size), descTails: descs, viewDetails: vdr ? { w: Math.round(vdr.width), h: Math.round(vdr.height) } : null, tags: tagEls };
});
ok("BUG-020/049 card heights", JSON.stringify(cardInfo.rowsSameHeight), JSON.stringify(cardInfo.heights));
ok("BUG-021 desc truncation tails", "check", JSON.stringify(cardInfo.descTails));
ok("BUG-032 View Details size", cardInfo.viewDetails ? `${cardInfo.viewDetails.w}x${cardInfo.viewDetails.h}` : "not-found", "");
ok("BUG-022 category tags", "check", JSON.stringify(cardInfo.tags));
await p.screenshot({ path: "evidence/run10/desktop-category.png" });

// BUG-022 continued: subcategory page tags
await p.goto(`${BASE}${await p.evaluate(() => document.querySelector("a[href^='/subcategory/']")?.getAttribute("href")) || "/subcategory/ffmpeg"}`, { waitUntil: "domcontentloaded", timeout: 40000 }).catch(() => {});
await p.waitForTimeout(1500);
const subTags = await p.evaluate(() => [...document.querySelectorAll("a[href^='/resource/'] [class*='badge' i]")].slice(0, 5).map(b => b.innerText.trim()));
ok("BUG-022 subcategory tags", "check", JSON.stringify(subTags));

// BUG-030: home sort dropdown overlap (popover by design) + BUG-053 search 1-char enter
await p.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 40000 });
await p.waitForSelector("a[data-testid^='link-category-']", { timeout: 30000 });
// search dialog: type 1 char, press Enter
await p.keyboard.press("Meta+k").catch(() => {});
await p.waitForTimeout(600);
let dlgOpen = await p.evaluate(() => !!document.querySelector("[cmdk-root], [role='dialog']"));
if (!dlgOpen) { await p.locator("button", { hasText: /search/i }).first().click().catch(() => {}); await p.waitForTimeout(600); }
await p.keyboard.type("a");
await p.waitForTimeout(400);
await p.keyboard.press("Enter");
await p.waitForTimeout(800);
const afterEnter = await p.evaluate(() => ({ url: location.pathname + location.search, dialogStill: !!document.querySelector("[cmdk-root]") }));
ok("BUG-053 1-char enter", afterEnter.url.startsWith("/search") ? "NAVIGATED" : "blocked", JSON.stringify(afterEnter));
await p.keyboard.press("Escape").catch(() => {});

// BUG-044: footer "Close" text
const footer = await p.evaluate(() => {
  const f = document.querySelector("footer");
  return f ? f.innerText.replace(/\s+/g, " | ").slice(0, 300) : "NO-FOOTER";
});
ok("BUG-044 footer text", /close/i.test(footer) ? "HAS-CLOSE" : "no-close", footer);

// BUG-046: sidebar active vs inactive contrast
const contrast = await p.evaluate(() => {
  const active = document.querySelector("[data-sidebar='sidebar'] .active, [data-sidebar='sidebar'] [data-active='true'], [data-sidebar='sidebar'] [aria-current]");
  const items = [...document.querySelectorAll("[data-sidebar='sidebar'] a")];
  const inactive = items.find(a => a !== active && !a.matches(".active,[data-active='true'],[aria-current]"));
  const gs = e => e ? { bg: getComputedStyle(e).backgroundColor, color: getComputedStyle(e).color, borderLeft: getComputedStyle(e).borderLeftColor + " " + getComputedStyle(e).borderLeftWidth } : null;
  return { active: gs(active), inactive: gs(inactive), activeFound: !!active };
});
ok("BUG-046 sidebar active contrast", "check", JSON.stringify(contrast));

// BUG-045: /login guest escape
await p.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 40000 });
await p.waitForTimeout(1200);
const loginInfo = await p.evaluate(() => {
  const t = document.body.innerText;
  return { guest: /guest|without signing|continue browsing|browse/i.test(t) ? t.match(/[^\n]*?(guest|without signing|continue browsing|browse)[^\n]*/i)?.[0] : null };
});
ok("BUG-045 guest escape", loginInfo.guest ? "present" : "ABSENT", JSON.stringify(loginInfo));
await p.screenshot({ path: "evidence/run10/desktop-login.png" });

// BUG-017: resource breadcrumb raw id
const rid = await p.evaluate(async () => (await (await fetch("/api/resources?limit=1")).json()).resources?.[0]?.id);
await p.goto(`${BASE}/resource/${rid}`, { waitUntil: "domcontentloaded", timeout: 40000 });
await p.waitForTimeout(2000);
const crumb = await p.evaluate(() => {
  const nav = document.querySelector("nav[aria-label*='readcrumb' i], header nav, header");
  return nav ? nav.innerText.replace(/\s+/g, " ").slice(0, 150) : null;
});
ok("BUG-017 resource crumb", /\d{4,}/.test(crumb || "") ? "RAW-ID" : "titled", JSON.stringify({ rid, crumb }));

// BUG-019: approved badge visible anon
const badge = await p.evaluate(() => {
  const b = [...document.querySelectorAll("main *")].find(e => e.children.length === 0 && /^approved$/i.test((e.innerText || "").trim()));
  return b ? b.innerText : null;
});
ok("BUG-019 approved badge anon", badge ? "VISIBLE" : "hidden", JSON.stringify(badge));
await p.screenshot({ path: "evidence/run10/desktop-resource.png" });

await browser.close();
console.log("DONE", JSON.stringify(out.map(o => o.n + "=" + o.verdict)));

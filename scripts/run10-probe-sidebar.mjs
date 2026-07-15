import { chromium } from "playwright";
const BASE = "http://localhost:5000";
const EXE = ".cache/ms-playwright/chromium-1223/chrome-linux64/chrome";
const browser = await chromium.launch({ executablePath: EXE });
const m = await browser.newPage({ viewport: { width: 375, height: 667 } });
m.setDefaultTimeout(25000);
await m.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 40000 });
await m.waitForSelector("a[data-testid^='link-category-']", { timeout: 25000 });
await m.locator("button[data-sidebar='trigger']").first().click();
await m.waitForTimeout(1200);
const info = await m.evaluate(() => {
  const els = [...document.querySelectorAll("[role='dialog'], [data-mobile='true'], [data-sidebar='sidebar']")];
  return els.map(e => {
    const r = e.getBoundingClientRect();
    const cs = getComputedStyle(e);
    return { tag: e.tagName, cls: (e.className || "").toString().slice(0, 120), w: Math.round(r.width), csWidth: cs.width, maxW: cs.maxWidth, var: cs.getPropertyValue("--sidebar-width") };
  });
});
console.log(JSON.stringify(info, null, 1));
// Login page guest link check (BUG-045)
await m.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 40000 });
await m.waitForTimeout(1200);
const login = await m.evaluate(() => {
  const links = [...document.querySelectorAll("a")].map(a => ({ t: a.innerText.trim().slice(0, 40), href: a.getAttribute("href") })).filter(l => l.t);
  return links.slice(0, 12);
});
console.log("LOGIN-LINKS", JSON.stringify(login));
await browser.close();

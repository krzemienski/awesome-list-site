import { chromium } from "playwright";
const BASE = process.env.VERIFY_BASE || "http://localhost:5055";
const b = await chromium.launch({ args:["--no-sandbox","--disable-dev-shm-usage"] });
const p = await (await b.newContext({viewport:{width:1440,height:900}})).newPage();
await p.goto(BASE+"/", { waitUntil:"networkidle" });
await p.waitForTimeout(800);
// find the visible "Search resources" affordance regardless of tag
const info = await p.evaluate(() => {
  const els = [...document.querySelectorAll('*')].filter(e => {
    const t = (e.getAttribute('placeholder')||'') + ' ' + (e.textContent||'').slice(0,40) + ' ' + (e.getAttribute('aria-label')||'');
    return /search resources/i.test(t) && e.offsetParent !== null;
  });
  const e = els[0];
  if (!e) return { found:false };
  return { found:true, tag:e.tagName.toLowerCase(), role:e.getAttribute('role'), testid:e.getAttribute('data-testid'), aria:e.getAttribute('aria-label'), placeholder:e.getAttribute('placeholder') };
});
console.log("search-affordance:", JSON.stringify(info));
// try clicking it → does a search dialog open?
if (info.found) {
  const clickable = p.locator('text=/search resources/i').first();
  await clickable.click({ timeout: 4000 }).catch(()=>{});
  await p.waitForTimeout(600);
  const dialogOpen = await p.evaluate(() => !!document.querySelector('[role="dialog"], [cmdk-root], [data-testid*="search-dialog" i]'));
  console.log("clicking opens search dialog:", dialogOpen);
  await p.screenshot({ path:"evidence/vg2/search-dialog-open.png" });
}
await b.close();

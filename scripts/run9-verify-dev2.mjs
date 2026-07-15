import { chromium } from "playwright";
const BASE = "http://localhost:5000";
const EXE = ".cache/ms-playwright/chromium-1223/chrome-linux64/chrome";
const results = [];
const ok = (n,p,d)=>{results.push({n,p});console.log(`${p?"PASS":"FAIL"} ${n} — ${d}`)};
const browser = await chromium.launch({ executablePath: EXE });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.setDefaultTimeout(25000);

await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("[data-testid='list-categories']", { timeout: 25000 });

// BUG-024: pick a sub-item that is NOT accent-colored (non-active)
const probe = await page.evaluate(() => {
  const items = [...document.querySelectorAll(".sub-item")];
  const el = items.find((e) => {
    const c = getComputedStyle(e);
    return !/1 0\.239216 0\.321569/.test(c.color + c.backgroundColor) && !c.color.includes("255, 61, 82");
  });
  if (!el) return null;
  el.setAttribute("data-run9-probe", "1");
  el.scrollIntoView({ block: "center" });
  return el.textContent.trim().slice(0, 30);
});
if (probe) {
  const sel = "[data-run9-probe='1']";
  const b = await page.$eval(sel, (el)=>{const s=getComputedStyle(el);return `${s.backgroundColor}|${s.borderColor}|${s.color}`});
  await page.hover(sel); await page.waitForTimeout(400);
  const a = await page.$eval(sel, (el)=>{const s=getComputedStyle(el);return `${s.backgroundColor}|${s.borderColor}|${s.color}`});
  ok("BUG-024 sidebar item hover", b !== a, `"${probe}" ${b} -> ${a}`);
} else ok("BUG-024 sidebar item hover", false, "no non-active sub-item found");

// BUG-023 home card hover
const card = page.locator("a[data-testid^='link-category-'] > div").first();
await card.scrollIntoViewIfNeeded();
const b23 = await card.evaluate((el)=>getComputedStyle(el).borderColor);
await card.hover(); await page.waitForTimeout(400);
const a23 = await card.evaluate((el)=>getComputedStyle(el).borderColor);
ok("BUG-023 home card hover border", b23 !== a23, `border ${b23} -> ${a23}`);

// login
await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
const pw = page.locator("[data-testid='input-password']");
await pw.fill("secret123");
const t1 = await pw.getAttribute("type");
await page.locator("[data-testid='button-toggle-password']").click();
const t2 = await pw.getAttribute("type");
await page.locator("[data-testid='button-toggle-password']").click();
const t3 = await pw.getAttribute("type");
ok("BUG-026 password toggle", t1==="password"&&t2==="text"&&t3==="password", `type ${t1}->${t2}->${t3}`);
const tb = await page.locator("[data-testid='button-toggle-password']").boundingBox();
ok("BUG-026 toggle target size", tb && tb.width>=44 && tb.height>=44, tb?`${Math.round(tb.width)}x${Math.round(tb.height)}`:"none");
const em = await page.evaluate(()=>{const el=document.querySelector("[data-testid='input-email'], input[type='email']");if(!el)return "NO INPUT";el.value="notanemail";return `valid=${el.checkValidity()} message="${el.validationMessage}"`});
ok("BUG-015 native email validation (evidence)", /valid=false/.test(em), em);

// submit whitespace
await page.goto(`${BASE}/submit`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1500);
const ti = page.locator("input[name='title'], #title").first();
if (await ti.count()) {
  await ti.fill("   ");
  await page.locator("button[type='submit']").first().click({force:true}).catch(()=>{});
  await page.waitForTimeout(800);
  const err = await page.locator("text=/title is required/i").count();
  ok("BUG-011 whitespace title rejected", err>0, `'Title is required' visible=${err>0}`);
} else ok("BUG-011 whitespace title rejected", false, "no title input");

// filter/sort exclusion
await page.goto(`${BASE}/category/encoding-codecs`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);
const fb = page.locator("button", { hasText: "Filter by Tag" }).first();
if (await fb.count()) {
  await fb.click(); await page.waitForTimeout(400);
  const open1 = await page.evaluate(()=>!!document.querySelector("[data-radix-popper-content-wrapper]"));
  await page.locator("button[aria-label='Sort resources']").first().click();
  await page.waitForTimeout(400);
  const st = await page.evaluate(()=>{
    const wraps=[...document.querySelectorAll("[data-radix-popper-content-wrapper]")];
    return { sortOpen: wraps.some(w=>w.querySelector("[role='listbox']")), filterOpen: wraps.some(w=>!w.querySelector("[role='listbox']")) };
  });
  ok("BUG-027 filter/sort exclusion", open1 && st.sortOpen && !st.filterOpen, `filter was open=${open1}; after: sort=${st.sortOpen} filter=${st.filterOpen}`);
} else ok("BUG-027 filter/sort exclusion", false, "no filter button");

// advanced metrics
await page.goto(`${BASE}/advanced`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1500);
const m = await page.evaluate(()=>{const b=document.body.innerText;return {hint:/tracked in this browser only/i.test(b), zeroPct:/(^|\s)0%\s*engagement/i.test(b.replace(/\n/g," ")), noLocal:/no local activity yet/i.test(b)}});
ok("BUG-016 local-metrics honest zero-state", m.hint && !m.zeroPct, JSON.stringify(m));

const amf = await page.evaluate(async()=>{const r=await fetch("/api/search?q=Advanced%20Media%20Framework").then(r=>r.json());return (r.results||r).filter(x=>/AMF/i.test(x.title)).map(x=>x.title)});
ok("BUG-022 AMF titles differentiated (dev)", new Set(amf).size===amf.length && amf.some(t=>/guide/i.test(t)), JSON.stringify(amf));

await browser.close();
const f = results.filter(r=>!r.p);
console.log(`\n${results.length-f.length}/${results.length} PASS`);
process.exit(f.length?1:0);

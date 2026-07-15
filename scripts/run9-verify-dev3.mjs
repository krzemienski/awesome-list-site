import { chromium } from "playwright";
const BASE = "http://localhost:5000";
const EXE = ".cache/ms-playwright/chromium-1223/chrome-linux64/chrome";
const results = [];
const ok = (n,p,d)=>{results.push({n,p});console.log(`${p?"PASS":"FAIL"} ${n} — ${d}`)};
const browser = await chromium.launch({ executablePath: EXE });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.setDefaultTimeout(20000);

// BUG-023: home card hover via mouse coordinates
await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("a[data-testid^='link-category-']", { timeout: 20000 });
const rect = await page.evaluate(() => {
  const a = document.querySelector("a[data-testid^='link-category-']");
  a.scrollIntoView({ block: "center" });
  const card = a.firstElementChild;
  card.setAttribute("data-run9-card", "1");
  const r = card.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2, tag: card.tagName };
});
const b23 = await page.$eval("[data-run9-card]", (el)=>getComputedStyle(el).borderColor);
await page.mouse.move(rect.x, rect.y);
await page.waitForTimeout(450);
const a23 = await page.$eval("[data-run9-card]", (el)=>getComputedStyle(el).borderColor);
ok("BUG-023 home card hover border", b23 !== a23, `${rect.tag} border ${b23} -> ${a23}`);

// login checks
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

// submit whitespace title
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

// filter/sort mutual exclusion
await page.goto(`${BASE}/category/encoding-codecs`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("button[aria-label='Sort resources']", { timeout: 20000 });
const fb = page.locator("button", { hasText: "Filter by Tag" }).first();
if (await fb.count()) {
  await fb.click(); await page.waitForTimeout(400);
  const open1 = await page.evaluate(()=>!!document.querySelector("[data-radix-popper-content-wrapper]"));
  await page.locator("button[aria-label='Sort resources']").first().click();
  await page.waitForTimeout(450);
  const st = await page.evaluate(()=>{
    const wraps=[...document.querySelectorAll("[data-radix-popper-content-wrapper]")];
    return { sortOpen: wraps.some(w=>w.querySelector("[role='listbox']")), filterOpen: wraps.some(w=>!w.querySelector("[role='listbox']")) };
  });
  ok("BUG-027 filter/sort exclusion", open1 && st.sortOpen && !st.filterOpen, `filter was open=${open1}; after: sort=${st.sortOpen} filter=${st.filterOpen}`);
} else ok("BUG-027 filter/sort exclusion", false, "no filter button");

// advanced metrics zero-state
await page.goto(`${BASE}/advanced`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2000);
const m = await page.evaluate(()=>{const b=document.body.innerText;return {hint:/tracked in this browser only/i.test(b), zeroPct:/(^|\s)0%\s*engagement/i.test(b.replace(/\n/g," ")), noLocal:/no local activity yet/i.test(b)}});
ok("BUG-016 local-metrics honest zero-state", m.hint && !m.zeroPct, JSON.stringify(m));

const amf = await page.evaluate(async()=>{const r=await fetch("/api/search?q=Advanced%20Media%20Framework").then(r=>r.json());return (r.results||r).filter(x=>/AMF/i.test(x.title)).map(x=>x.title)});
ok("BUG-022 AMF titles differentiated (dev)", new Set(amf).size===amf.length && amf.some(t=>/guide/i.test(t)), JSON.stringify(amf));

await browser.close();
const f = results.filter(r=>!r.p);
console.log(`\n${results.length-f.length}/${results.length} PASS`);
process.exit(f.length?1:0);

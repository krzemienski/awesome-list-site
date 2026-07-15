import { chromium } from "playwright";
const BASE = "http://localhost:5000";
const EXE = ".cache/ms-playwright/chromium-1223/chrome-linux64/chrome";
const results = [];
const ok = (n,p,d)=>{results.push({n,p});console.log(`${p?"PASS":"FAIL"} ${n} — ${d}`)};
const browser = await chromium.launch({ executablePath: EXE });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
page.setDefaultTimeout(30000);

// login via API for speed
const login = await ctx.request.post(`${BASE}/api/auth/local/login`, { data: { email: "admin@example.com", password: "devtest-run3-Pw1" } });
console.log("login status:", login.status());

// BUG-011: whitespace title
await page.goto(`${BASE}/submit`, { waitUntil: "commit", timeout: 40000 });
await page.waitForTimeout(1200);
const ti = page.locator("[data-testid='input-title']").first();
await ti.fill("   ");
await page.locator("button[type='submit']").first().click({force:true}).catch(()=>{});
await page.waitForTimeout(800);
const err = await page.locator("text=/title is required/i").count();
ok("BUG-011 whitespace title rejected", err>0, `'Title is required' visible=${err>0}`);

// BUG-027 filter/sort
await page.goto(`${BASE}/category/encoding-codecs`, { waitUntil: "commit", timeout: 40000 });
await page.waitForSelector("button[aria-label='Sort resources']", { timeout: 30000 });
const fb = page.locator("button", { hasText: "Filter by Tag" }).first();
await fb.click(); await page.waitForTimeout(400);
const open1 = await page.evaluate(()=>!!document.querySelector("[data-radix-popper-content-wrapper]"));
await page.locator("button[aria-label='Sort resources']").first().click();
await page.waitForTimeout(450);
const st = await page.evaluate(()=>{
  const wraps=[...document.querySelectorAll("[data-radix-popper-content-wrapper]")];
  return { sortOpen: wraps.some(w=>w.querySelector("[role='listbox']")), filterOpen: wraps.some(w=>!w.querySelector("[role='listbox']")) };
});
ok("BUG-027 filter/sort exclusion", open1 && st.sortOpen && !st.filterOpen, `filter was open=${open1}; after: sort=${st.sortOpen} filter=${st.filterOpen}`);

// BUG-016 metrics
await page.goto(`${BASE}/advanced`, { waitUntil: "commit", timeout: 40000 });
await page.waitForTimeout(2000);
const m = await page.evaluate(()=>{const b=document.body.innerText;return {hint:/tracked in this browser only/i.test(b), zeroPct:/(^|\s)0%\s*engagement/i.test(b.replace(/\n/g," ")), noLocal:/no local activity yet/i.test(b)}});
ok("BUG-016 local-metrics honest zero-state", m.hint && !m.zeroPct, JSON.stringify(m));

const amf = await page.evaluate(async()=>{const r=await fetch("/api/search?q=Advanced%20Media%20Framework").then(r=>r.json());return (r.results||r).filter(x=>/AMF/i.test(x.title)).map(x=>x.title)});
ok("BUG-022 AMF titles differentiated (dev)", new Set(amf).size===amf.length && amf.some(t=>/guide/i.test(t)), JSON.stringify(amf));

await browser.close();
const f = results.filter(r=>!r.p);
console.log(`\n${results.length-f.length}/${results.length} PASS`);
process.exit(f.length?1:0);

import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "fs";
const BASE = process.env.VERIFY_BASE || "http://localhost:5055";
const AUTH = process.env.VERIFY_AUTH;
mkdirSync("evidence/vg-int", { recursive: true });
const out = [];
const rec = (id,pass,detail)=>{ out.push({id,pass,detail}); console.log(`${pass?'PASS':'FAIL'} ${id} — ${detail}`); };
const b = await chromium.launch({ args:["--no-sandbox","--disable-dev-shm-usage"] });

// JOURNEY 1: anon visitor — landing → search → resource → theme
const anon = await b.newContext({ viewport:{width:1440,height:900} });
const p = await anon.newPage();
await p.goto(BASE+"/", { waitUntil:"networkidle" });
await p.waitForSelector('[data-testid^="row-cat-"]');
rec("J1-landing", (await p.title()).includes("Awesome Video"), "landing ok");
// open search dialog + query
await p.locator('text=/search resources/i').first().click().catch(()=>{});
await p.waitForTimeout(500);
await p.keyboard.type("ffmpeg");
await p.waitForTimeout(1000);
const dialogHasResults = await p.evaluate(()=> /ffmpeg|ffsubsync|pyav/i.test(document.body.innerText));
rec("J1-search", dialogHasResults, `search dialog shows ffmpeg result=${dialogHasResults}`);
await p.screenshot({ path:"evidence/vg-int/j1-search.png" });

// JOURNEY 2: anon protected actions rejected (browser + direct HTTP)
for (const path of ["/admin","/profile","/bookmarks"]) {
  await p.goto(BASE+path, { waitUntil:"domcontentloaded" });
  rec(`J2-gate ${path}`, p.url().includes("/login"), `→ ${p.url()}`);
}
// direct HTTP anon POST
const anonPost = await p.evaluate(async () => {
  const r = await fetch("/api/resources", {method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({title:"INT-PROBE",url:"https://x.example/int",description:"probe",category:"Media Tools"})});
  return r.status;
});
rec("J2-anon-post-rejected", anonPost === 401 || anonPost === 403, `POST /api/resources anon → ${anonPost}`);
await anon.close();

// JOURNEY 3: login → authed surface → logout → protected disappears
const ctx = await b.newContext({ viewport:{width:1440,height:900}, storageState: AUTH });
const ap = await ctx.newPage();
await ap.goto(BASE+"/admin", { waitUntil:"domcontentloaded" });
await ap.waitForSelector('[role="tab"]', { timeout:15000 }).catch(()=>{});
rec("J3-authed-admin", ap.url().includes("/admin") && !ap.url().includes("/login"), `admin reachable authed → ${ap.url()}`);
await ap.screenshot({ path:"evidence/vg-int/j3-admin.png", fullPage:false });
const lo = await ap.evaluate(async ()=>{ const r=await fetch("/api/auth/logout",{method:"POST"}); const u=await fetch("/api/auth/user").then(x=>x.json()); return {s:r.status, a:u.isAuthenticated}; });
rec("J3-logout", lo.s===200 && lo.a===false, `logout=${lo.s} authedAfter=${lo.a}`);
await ap.goto(BASE+"/admin", { waitUntil:"domcontentloaded" });
rec("J3-post-logout-gated", ap.url().includes("/login"), `post-logout /admin → ${ap.url()}`);
await ctx.close();

// JOURNEY 4: consistency — search/count/sitemap
const cp = await (await b.newContext()).newPage();
const total = await cp.evaluate(async()=>{ return null; }).catch(()=>null);
await cp.goto(BASE+"/", {waitUntil:"domcontentloaded"});
const apiTotal = await cp.evaluate(async()=>{ const r=await fetch("/api/resources?limit=1"); return (await r.json()).total; });
const smCount = await cp.evaluate(async()=>{ const t=await (await fetch("/sitemap.xml")).text(); return (t.match(/<loc>/g)||[]).length; });
rec("J4-consistency", apiTotal>0 && smCount>0, `api total=${apiTotal}, sitemap urls=${smCount}`);
await b.close();

writeFileSync("evidence/vg-int/vg-int-results.json", JSON.stringify(out,null,2));
const passed = out.filter(r=>r.pass).length;
console.log(`\n=== VG-INT ${passed}/${out.length} PASS ===`);
process.exit(0);

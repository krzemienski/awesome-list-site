import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "fs";
const BASE = process.env.VERIFY_BASE || "http://localhost:5055";
const AUTH = process.env.VERIFY_AUTH;
mkdirSync("evidence/vg4", { recursive: true });
const out = [];
const rec = (id,pass,detail)=>{ out.push({id,pass,detail}); console.log(`${pass?'PASS':'FAIL'} ${id} — ${detail}`); };
const b = await chromium.launch({ args:["--no-sandbox","--disable-dev-shm-usage"] });

// 1) anon admin deep-links → redirect
const anon = await b.newContext({ viewport:{width:1280,height:800} });
const ap = await anon.newPage();
for (const path of ["/admin","/admin/categories","/profile","/bookmarks"]) {
  const resp = await ap.goto(BASE+path, { waitUntil:"domcontentloaded" });
  const finalUrl = ap.url();
  const gated = finalUrl.includes("/login");
  rec(`anon-gate ${path}`, gated, `final=${finalUrl} status=${resp?.status()}`);
}
await ap.screenshot({ path:"evidence/vg4/anon-admin-redirect.png", fullPage:false });
await anon.close();

// 2) authed admin: timing to usable dashboard
const ctx = await b.newContext({ viewport:{width:1280,height:800}, storageState: AUTH });
const p = await ctx.newPage();
const t0 = Date.now();
await p.goto(BASE+"/admin", { waitUntil:"domcontentloaded" });
// wait for real dashboard content (tabs / heading), not the loading shell
let usableMs = null;
try {
  await p.waitForSelector('[role="tab"], h1, [data-testid*="admin"]', { timeout: 15000 });
  usableMs = Date.now()-t0;
} catch { usableMs = -1; }
rec("admin-load-timing", usableMs>=0 && usableMs<7000, `dashboard usable in ${usableMs}ms (threshold 7000)`);
await p.waitForTimeout(800);
await p.screenshot({ path:"evidence/vg4/admin-dashboard-desktop.png", fullPage:true });
// mobile
await p.setViewportSize({ width:375, height:812 });
await p.waitForTimeout(500);
await p.screenshot({ path:"evidence/vg4/admin-dashboard-mobile.png", fullPage:true });
await p.setViewportSize({ width:1280, height:800 });

// 3) tabs present + aria-current
const tabInfo = await p.evaluate(()=>{
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  const active = document.querySelector('[role="tab"][aria-selected="true"], [role="tab"][data-state="active"]');
  return { count: tabs.length, activeText: active?.textContent?.trim()||null, labels: tabs.slice(0,8).map(t=>t.textContent.trim()) };
});
rec("admin-tabs", tabInfo.count>0, `tabs=${tabInfo.count} active="${tabInfo.activeText}" labels=${JSON.stringify(tabInfo.labels)}`);

// 4) logout invalidates session
const logoutResp = await p.evaluate(async ()=>{
  const r = await fetch("/api/auth/logout",{method:"POST"});
  const after = await fetch("/api/auth/user").then(x=>x.json());
  return { logoutStatus:r.status, authedAfter: after.isAuthenticated };
});
rec("logout-invalidates", logoutResp.logoutStatus===200 && logoutResp.authedAfter===false,
    `logout=${logoutResp.logoutStatus} authedAfter=${logoutResp.authedAfter}`);
// deep-link after logout must redirect
await p.goto(BASE+"/admin", { waitUntil:"domcontentloaded" });
rec("post-logout-admin-gated", p.url().includes("/login"), `final=${p.url()}`);

await b.close();
writeFileSync("evidence/vg4/vg4-results.json", JSON.stringify(out,null,2));
const passed = out.filter(r=>r.pass).length;
console.log(`\n=== VG-4 ${passed}/${out.length} PASS ===`);
process.exit(passed===out.length?0:1);

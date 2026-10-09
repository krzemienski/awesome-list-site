// Read-only admin sweep. Every non-GET /api request from the page is aborted
// (except the explicit admin-login/logout calls made via ctx.request).
import { chromium } from "@playwright/test";
import fs from "node:fs";
const BASE = process.env.BASE || "https://awesome.video";
const VW = Number(process.env.VW || 1440);
const OUT = "/tmp/a578/shots";
const sections = (process.env.SECTIONS || "overview,approvals,edits,resources,categories,journeys,users,export,linkhealth,github,research,enrichment").split(",");
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: VW, height: 900 } });
const host = new URL(BASE).hostname;
await ctx.addCookies([{ name: "analytics-consent", value: "denied", domain: host, path: "/" }]);
const login = await ctx.request.post(BASE + "/api/auth/admin-login", {
  headers: { Origin: BASE, "Content-Type": "application/json" },
  data: { password: process.env.OWNER_PASSWORD },
});
console.log("admin-login", login.status());
const me = await ctx.request.get(BASE + "/api/auth/user");
const meJson = await me.json().catch(() => ({}));
console.log("auth/user", me.status(), "role=", meJson?.role ?? meJson?.user?.role);
const blocked = [];
await ctx.route("**/api/**", (route) => {
  const m = route.request().method();
  if (m !== "GET" && m !== "HEAD") { blocked.push(`${m} ${new URL(route.request().url()).pathname}`); return route.abort(); }
  return route.continue();
});
const results = [];
for (const s of sections) {
  const page = await ctx.newPage();
  const consoleErrors = [], pageErrors = [], bad = [], apis = new Set();
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text().slice(0, 240)); });
  page.on("pageerror", (e) => pageErrors.push(String(e).slice(0, 240)));
  page.on("response", (r) => { const u = new URL(r.url()); if (u.hostname === host && u.pathname.startsWith("/api/")) { apis.add(`${r.status()} ${u.pathname}`); if (r.status() >= 400) bad.push(`${r.status()} ${u.pathname}${u.search}`); } });
  const t0 = Date.now();
  const resp = await page.goto(`${BASE}/admin/${s}`, { waitUntil: "domcontentloaded", timeout: 30000 }).catch((e) => null);
  await page.waitForTimeout(6000);
  const info = await page.evaluate(() => {
    const txt = document.body.innerText;
    const sel = document.querySelector('[role="tab"][aria-selected="true"]')?.textContent?.trim() || null;
    const panel = document.querySelector('[role="tabpanel"][data-state="active"], main');
    return {
      url: location.pathname, title: document.title, selectedTab: sel,
      h: [...document.querySelectorAll("h1,h2,h3")].slice(0, 4).map((h) => h.textContent.trim().slice(0, 60)),
      errorText: (txt.match(/(something went wrong|failed to load[^\n]{0,80}|error loading[^\n]{0,80}|access denied|unauthorized|page not found)/i) || [null])[0],
      skeletons: document.querySelectorAll('.animate-pulse,[aria-busy="true"]').length,
      panelTextLen: panel ? panel.innerText.length : 0,
    };
  });
  await page.screenshot({ path: `${OUT}/admin-${VW}-${s}.jpg`, type: "jpeg", quality: 55 });
  results.push({ section: s, status: resp?.status(), ms: Date.now() - t0, ...info, consoleErrors, pageErrors, bad, apis: [...apis] });
  console.log(`${s.padEnd(11)} ${resp?.status()} tab=${JSON.stringify(info.selectedTab)} h=${JSON.stringify(info.h.slice(0, 2))} err=${JSON.stringify(info.errorText)} skel=${info.skeletons} len=${info.panelTextLen} cerr=${consoleErrors.length} perr=${pageErrors.length} bad=${JSON.stringify(bad)}`);
  await page.close();
}
const out = await ctx.request.post(BASE + "/api/auth/admin-logout", { headers: { Origin: BASE } });
console.log("admin-logout", out.status(), "blocked non-GET:", JSON.stringify(blocked));
fs.writeFileSync(`${OUT}/admin-${VW}.json`, JSON.stringify({ blocked, results }, null, 2));
await browser.close();

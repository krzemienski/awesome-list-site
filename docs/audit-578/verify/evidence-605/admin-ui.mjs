// Read-only production admin UI probe (Export, Link Health, GitHub, Database).
// Every non-GET /api request from the page is aborted and recorded; the only
// non-GET calls are the explicit owner admin-login/logout via ctx.request.
import { chromium } from "@playwright/test";
import fs from "node:fs";
const BASE = process.env.BASE || "https://awesome.video";
const OUT = new URL("./shots/", import.meta.url).pathname;
const host = new URL(BASE).hostname;
const browser = await chromium.launch();
const results = {};
for (const vw of [1440, 390]) {
  const ctx = await browser.newContext({ viewport: { width: vw, height: 900 }, colorScheme: "dark" });
  await ctx.addCookies([{ name: "analytics-consent", value: "denied", domain: host, path: "/" }]);
  const login = await ctx.request.post(BASE + "/api/auth/admin-login", { headers: { Origin: BASE, "Content-Type": "application/json" }, data: { password: process.env.OWNER_PASSWORD } });
  console.log(`\n### viewport ${vw}: admin-login ${login.status()}`);
  const blocked = [];
  await ctx.route("**/api/**", (route) => {
    const m = route.request().method();
    if (m !== "GET" && m !== "HEAD") { blocked.push(`${m} ${new URL(route.request().url()).pathname}`); return route.abort(); }
    return route.continue();
  });
  const page = await ctx.newPage();
  const pageErrors = []; page.on("pageerror", (e) => pageErrors.push(String(e).slice(0, 200)));
  const bad = []; page.on("response", (r) => { const u = new URL(r.url()); if (u.hostname === host && u.pathname.startsWith("/api/") && r.status() >= 400) bad.push(`${r.status()} ${u.pathname}`); });

  // ---- /admin/export
  await page.goto(`${BASE}/admin/export`, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForSelector('[data-testid="button-export-json"]', { timeout: 30000 });
  await page.waitForTimeout(2500);
  for (let pass = 0; pass < 3; pass++) {
    for (const s of await page.locator("main details:not([open]) > summary").all()) {
      if (!(await s.isVisible())) continue;
      await s.scrollIntoViewIfNeeded(); await s.click();
    }
  }
  await page.waitForSelector('[data-testid="table-export-history"]', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const exp = await page.evaluate(() => {
    const cards = [...document.querySelectorAll(".admin-ops-export-card")].map((c) => ({
      title: c.querySelector(".admin-ops-export-card__title")?.textContent?.trim(),
      desc: c.querySelector(".admin-ops-export-card__description")?.textContent?.trim(),
      button: c.querySelector("button")?.textContent?.trim(),
    }));
    const text = document.querySelector("main")?.innerText ?? document.body.innerText;
    const rows = [...document.querySelectorAll('[data-testid="table-export-history"] tbody tr')].slice(0, 8).map((r) => ({ action: r.getAttribute("data-export-action"), text: r.innerText.replace(/\s+/g, " ").trim() }));
    const job = document.querySelector('[data-testid="export-link-check-job"]');
    const buttons = [...document.querySelectorAll("main button")].map((b) => b.textContent.trim()).filter(Boolean);
    return {
      cards, hasSqlDump: /sql dump/i.test(text), hasApiToken: /api token/i.test(text), historyRows: rows,
      linkJobPanel: job ? job.innerText.replace(/\s+/g, " ").trim() : null,
      runLinkCheckButton: !!document.querySelector('[data-testid="button-run-link-check"]'),
      buttons, docScrollW: document.documentElement.scrollWidth,
    };
  });
  await page.screenshot({ path: `${OUT}/export-${vw}.jpg`, type: "jpeg", quality: 60, fullPage: true });
  console.log("EXPORT", JSON.stringify(exp, null, 1));

  // ---- /admin/linkhealth
  await page.goto(`${BASE}/admin/linkhealth`, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(7000);
  const lh = await page.evaluate(() => {
    const t = (document.querySelector("main")?.innerText ?? "").replace(/\n{2,}/g, "\n");
    return {
      alerts: [...document.querySelectorAll('main [role="alert"]')].map((a) => a.innerText.replace(/\s+/g, " ").trim()),
      noDataCopy: /No link health data available yet/i.test(t),
      cancelBtn: [...document.querySelectorAll("main button")].some((b) => /Cancel running scan/i.test(b.textContent)),
      head: t.slice(0, 900),
    };
  });
  await page.screenshot({ path: `${OUT}/linkhealth-${vw}.jpg`, type: "jpeg", quality: 60 });
  console.log("LINKHEALTH", JSON.stringify(lh, null, 1));

  // ---- /admin/github
  const ghReqs = []; const onReq = (r) => { const u = new URL(r.url()); if (u.pathname === "/api/github/sync-status") ghReqs.push(new Date().toISOString().slice(11, 23)); };
  page.on("request", onReq);
  await page.goto(`${BASE}/admin/github`, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(9000);
  page.off("request", onReq);
  const gh = await page.evaluate(() => {
    const t = (document.querySelector("main")?.innerText ?? "");
    return {
      alerts: [...document.querySelectorAll('main [role="alert"]')].map((a) => a.innerText.replace(/\s+/g, " ").trim().slice(0, 300)),
      importedLines: (t.match(/Imported: \d+; updated: \d+; skipped: \d+; failed: \d+[^\n]*/g) || []).slice(0, 6),
      partialMentions: (t.match(/PARTIAL[^\n]*/gi) || []).slice(0, 4),
      head: t.replace(/\n{2,}/g, "\n").slice(0, 1400),
    };
  });
  await page.screenshot({ path: `${OUT}/github-${vw}.jpg`, type: "jpeg", quality: 60 });
  console.log("GITHUB sync-status GETs during 9s idle:", JSON.stringify(ghReqs));
  console.log("GITHUB", JSON.stringify(gh, null, 1));

  // ---- /admin/database (render only; no reseed/seed)
  await page.goto(`${BASE}/admin/database`, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(6000);
  const dbt = await page.evaluate(() => ({
    buttons: [...document.querySelectorAll("main button")].map((b) => b.textContent.trim()).filter(Boolean),
    resultPanels: [...document.querySelectorAll('[data-testid^="seed-result"]')].map((e) => e.getAttribute("data-testid")),
    head: (document.querySelector("main")?.innerText ?? "").replace(/\n{2,}/g, "\n").slice(0, 700),
  }));
  await page.screenshot({ path: `${OUT}/database-${vw}.jpg`, type: "jpeg", quality: 60 });
  console.log("DATABASE", JSON.stringify(dbt, null, 1));

  const out = await ctx.request.post(BASE + "/api/auth/admin-logout", { headers: { Origin: BASE } });
  console.log(`admin-logout ${out.status()} | blocked non-GET: ${JSON.stringify(blocked)} | api>=400: ${JSON.stringify(bad)} | pageErrors: ${JSON.stringify(pageErrors)}`);
  results[vw] = { exp, lh, gh, ghReqs, dbt, blocked, bad, pageErrors };
  await ctx.close();
}
fs.writeFileSync(new URL("./admin-ui-out.json", import.meta.url), JSON.stringify(results, null, 2));
await browser.close();

// H02/H03 parity: SSR HTML ids/total vs the exact API the hydrated client calls vs settled DOM.
import { chromium } from "playwright";
import fs from "node:fs";
const B = process.env.B || "http://127.0.0.1:5000";
const EXE = "/home/runner/workspace/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome";
const cases = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const width = Number(process.env.W || 1440), system = process.env.SYS || "editorial";
const shotDir = process.env.SHOTS || "";
const browser = await chromium.launch({ headless: true, executablePath: EXE });
const out = [];
for (const c of cases) {
  const html = await (await fetch(B + c.path, { redirect: "manual" })).text();
  const status = (await fetch(B + c.path, { redirect: "manual" })).status;
  const ssrSection = c.kind === "search" ? html : (html.match(/data-seo-section="listing-resources">([\s\S]*?)<\/section>/) || [, ""])[1];
  const ssrIds = [...ssrSection.matchAll(/<a href="\/resource\/(\d+)"/g)].map(m => +m[1]);
  const ssrTotal = c.kind === "search" ? (html.match(/([\d,]+) results? for/) || html.match(/([\d,]+) results?/) || [, null])[1] : (html.match(/of ([\d,]+)\)<\/span>/) || [, null])[1];
  const robots = (html.match(/<meta name="robots" content="([^"]+)"/) || [, ""])[1];
  const canonical = (html.match(/<link rel="canonical" href="([^"]+)"/) || [, null])[1];
  const ssrTitle = (html.match(/<title[^>]*>([^<]*)<\/title>/) || [, ""])[1].replace(/&amp;/g, "&");
  const ssrDesc = (html.match(/<meta name="description" content="([^"]*)"/) || [, ""])[1].replace(/&amp;/g, "&");
  const ctx = await browser.newContext({ viewport: { width, height: width < 500 ? 844 : 900 } });
  await ctx.addInitScript(([s]) => { try { localStorage.setItem("ds-system", s); localStorage.setItem("analytics-consent", "denied"); } catch {} }, [system]);
  const page = await ctx.newPage();
  const apis = [];
  page.on("response", async r => { const u = r.url(); if (/\/api\/(resources\?|awesome-list\/listing)/.test(u)) { try { const j = await r.json(); apis.push({ url: u.replace(B, ""), status: r.status(), total: j.total, ids: (j.resources || []).map(x => +x.id) }); } catch {} } });
  await page.goto(B + c.path, { waitUntil: "domcontentloaded" });
  const sel = c.kind === "search" ? '[data-testid="search-results-grid"] [data-testid^="card-resource-"]' : '[data-testid="taxonomy-results-region"] [data-testid^="card-resource-"]';
  try { await page.waitForSelector(sel, { timeout: 20000 }); } catch {}
  await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(800);
  const domIds = await page.$$eval(sel, els => els.map(e => +e.getAttribute("data-testid").replace("card-resource-", "")));
  const countText = await page.evaluate(k => { const el = k === "search" ? document.querySelector('[data-testid="text-result-count"]') : document.querySelector('[data-testid="taxonomy-results-region"]'); return el ? (k === "search" ? el.textContent : (el.textContent.match(/[^.]{0,40}(of|·)\s*[\d,]+[^.]{0,20}/) || [""])[0]).trim().slice(0, 120) : null; }, c.kind);
  const finalUrl = page.url().replace(B, "");
  const title = await page.title();
  const domHead = await page.evaluate(() => ({ desc: document.querySelector('meta[name="description"]')?.content ?? null, robots: [...document.querySelectorAll('meta[name="robots"]')].map(m => m.content), canonicals: [...document.querySelectorAll('link[rel="canonical"]')].map(l => l.href) }));
  if (shotDir && c.shot) await page.screenshot({ path: `${shotDir}/${c.shot}-${system}-${width}.png` });
  await ctx.close();
  const api = apis.filter(a => a.status === 200).at(-1) || null;
  const row = { path: c.path, httpStatus: status, robots: robots.slice(0, 20), canonical, ssrTotal, ssrIds: ssrIds.slice(0, 24), apiUrl: api?.url, apiTotal: api?.total, apiIds: api?.ids?.slice(0, 24), domIds: domIds.slice(0, 24), domCount: countText, finalUrl, title, ssrTitle, ssrDesc, domHead, titleEq: title === ssrTitle, descEq: domHead.desc === ssrDesc,
    ssrEqApi: JSON.stringify(ssrIds) === JSON.stringify(api?.ids ?? []), ssrEqDom: JSON.stringify(ssrIds) === JSON.stringify(domIds), totalEq: String(ssrTotal ?? "").replace(/,/g, "") === String(api?.total ?? "") };
  out.push(row);
  console.log(JSON.stringify({ path: c.path, st: status, ssrTotal, apiTotal: api?.total, nSsr: ssrIds.length, nDom: domIds.length, ssrEqApi: row.ssrEqApi, ssrEqDom: row.ssrEqDom, totalEq: row.totalEq, titleEq: row.titleEq, descEq: row.descEq, first3: ssrIds.slice(0,3), dom3: domIds.slice(0,3), apiUrl: api?.url?.slice(0,160) }));
}
await browser.close();
if (process.env.OUT) fs.writeFileSync(process.env.OUT, JSON.stringify(out, null, 2));

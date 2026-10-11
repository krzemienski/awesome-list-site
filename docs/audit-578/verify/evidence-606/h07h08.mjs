// H07/H08 against a deployed base URL, read-only.
// H07: server title/description of bookmarks and missing resource = browser head after reload and after SPA nav.
// H08: the dead-link telemetry beacon fires exactly once per missing page. The beacon is INTERCEPTED in the
// test browser (fulfilled locally with 204) so no telemetry row is written to the deployment.
import { chromium } from "playwright";
const B = process.env.B || "https://awesome.video";
const SHOTS = process.env.SHOTS || "/tmp/h606/shots";
const EXE = "/home/runner/workspace/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome";
const browser = await chromium.launch({ headless: true, executablePath: EXE });
const ent = s => s.replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'");
const head = html => ({ title: ent((html.match(/<title[^>]*>([^<]*)<\/title>/) || [, ""])[1]), desc: ent((html.match(/<meta name="description" content="([^"]*)"/) || [, ""])[1]), robots: (html.match(/<meta name="robots" content="([^"]+)"/) || [, ""])[1], canonicals: (html.match(/<link rel="canonical"/g) || []).length });
const domHead = page => page.evaluate(() => ({ title: document.title, desc: document.querySelector('meta[name="description"]')?.content ?? null, robots: [...document.querySelectorAll('meta[name="robots"]')].map(m => m.content), canonicals: document.querySelectorAll('link[rel="canonical"]').length, h1: document.querySelector("h1")?.textContent?.trim() }));
const blockTelemetry = async (ctx, posts) => ctx.route(/\/api\/telemetry\/dead-link/, async r => { posts.push({ method: r.request().method(), url: r.request().url().replace(B, ""), body: r.request().postData() }); await r.fulfill({ status: 204, body: "" }); });
const out = { base: B, h07: [], h08: [] };
for (const [system, w] of [["editorial", 1440], ["brutalist", 390]]) {
  for (const c of [{ path: "/bookmarks", seed: false, label: "bookmarks-empty" }, { path: "/bookmarks", seed: true, label: "bookmarks-populated" }, { path: "/resource/99999999", label: "resource-missing" }]) {
    const res = await fetch(B + c.path); const ssr = head(await res.text());
    const ctx = await browser.newContext({ viewport: { width: w, height: w < 500 ? 844 : 900 } });
    const posts = []; await blockTelemetry(ctx, posts);
    await ctx.addInitScript(([s, seed]) => { localStorage.setItem("ds-system", s); localStorage.setItem("analytics-consent", "denied"); if (seed) localStorage.setItem("guest-bookmarks-v1", JSON.stringify([{ id: 184739, savedAt: new Date().toISOString() }])); }, [system, !!c.seed]);
    const page = await ctx.newPage();
    await page.goto(B + c.path); await page.waitForLoadState("networkidle").catch(() => {}); await page.waitForTimeout(1500);
    const reload = await domHead(page);
    await page.screenshot({ path: `${SHOTS}/h07-${c.label}-${system}-${w}.png` });
    await page.goto(B + "/"); await page.waitForTimeout(1500);
    await page.evaluate(p => { history.pushState(null, "", p); dispatchEvent(new PopStateEvent("popstate")); }, c.path);
    await page.waitForLoadState("networkidle").catch(() => {}); await page.waitForTimeout(2000);
    const spa = await domHead(page);
    await ctx.close();
    const eq = h => h.title === ssr.title && h.desc === ssr.desc && h.canonicals === ssr.canonicals && h.robots.length === 1 && h.robots[0] === ssr.robots;
    out.h07.push({ system, w, case: c.label, status: res.status, ssr, reload, spa, reloadEq: eq(reload), spaEq: eq(spa) });
  }
}
for (const c of [{ path: "/resource/99999999" }, { path: "/category/nope-xyz-606" }, { path: "/no-such-route-606" }, { path: "/journey/2147483000" }, { path: "/resource/184739", fail503: true }, { path: "/resource/184739" }]) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => localStorage.setItem("analytics-consent", "denied"));
  const posts = []; await blockTelemetry(ctx, posts);
  const page = await ctx.newPage();
  if (c.fail503) await page.route(/\/api\/resources\/184739$/, r => r.fulfill({ status: 503, contentType: "application/json", body: "{}" }));
  const resp = await page.goto(B + c.path); await page.waitForLoadState("networkidle").catch(() => {}); await page.waitForTimeout(2000);
  await page.setViewportSize({ width: 800, height: 900 }); await page.evaluate(() => { dispatchEvent(new Event("focus")); dispatchEvent(new Event("online")); }); await page.waitForTimeout(2500);
  const h1 = await page.locator("h1").first().textContent().catch(() => null);
  await ctx.close();
  out.h08.push({ path: c.path, fail503: !!c.fail503, docStatus: resp?.status(), h1: h1?.trim(), beacons: posts.length, detail: posts });
}
console.log(JSON.stringify(out, null, 1));
await browser.close();

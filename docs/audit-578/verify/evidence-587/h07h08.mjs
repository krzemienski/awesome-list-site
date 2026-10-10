import { chromium } from "playwright";
const DEV = "http://127.0.0.1:5000", PROD = "http://127.0.0.1:5055";
const EXE = "/home/runner/workspace/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome";
const browser = await chromium.launch({ headless: true, executablePath: EXE });
const head = html => ({ title: (html.match(/<title[^>]*>([^<]*)<\/title>/) || [, ""])[1].replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'"), desc: (html.match(/<meta name="description" content="([^"]*)"/) || [, ""])[1].replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'"), robots: (html.match(/<meta name="robots" content="([^"]+)"/) || [, ""])[1], canonicals: (html.match(/<link rel="canonical"/g) || []).length });
const domHead = page => page.evaluate(() => ({ title: document.title, desc: document.querySelector('meta[name="description"]')?.content ?? null, robots: [...document.querySelectorAll('meta[name="robots"]')].map(m => m.content), canonicals: document.querySelectorAll('link[rel="canonical"]').length, h1: document.querySelector("h1")?.textContent?.trim() }));
const out = { h07: [], h08: [] };
for (const B of [DEV, PROD]) for (const [system, w] of [["editorial", 1440], ["brutalist", 390]]) {
  for (const c of [{ path: "/bookmarks", seed: false, label: "bookmarks-empty" }, { path: "/bookmarks", seed: true, label: "bookmarks-populated" }, { path: "/resource/99999999", label: "resource-missing" }]) {
    const res = await fetch(B + c.path); const ssr = head(await res.text());
    const ctx = await browser.newContext({ viewport: { width: w, height: w < 500 ? 844 : 900 } });
    await ctx.addInitScript(([s, seed]) => { localStorage.setItem("ds-system", s); localStorage.setItem("analytics-consent", "denied"); if (seed) localStorage.setItem("guest-bookmarks-v1", JSON.stringify([{ id: 184739, savedAt: new Date().toISOString() }])); }, [system, !!c.seed]);
    const page = await ctx.newPage();
    await page.goto(B + c.path); await page.waitForLoadState("networkidle").catch(() => {}); await page.waitForTimeout(1500);
    const reload = await domHead(page);
    if (B === DEV) await page.screenshot({ path: `/tmp/h587/shots/h07-${c.label}-${system}-${w}.png` });
    // SPA navigation into the same route from home.
    await page.goto(B + "/"); await page.waitForTimeout(1500);
    await page.evaluate(p => { history.pushState(null, "", p); dispatchEvent(new PopStateEvent("popstate")); }, c.path);
    await page.waitForLoadState("networkidle").catch(() => {}); await page.waitForTimeout(2000);
    const spa = await domHead(page);
    await ctx.close();
    out.h07.push({ base: B, system, w, case: c.label, status: res.status, ssr, reload, spa, reloadEq: reload.title === ssr.title && reload.desc === ssr.desc, spaEq: spa.title === ssr.title && spa.desc === ssr.desc });
  }
}
// H08: production-mode build only (DEV is console-only by design).
for (const c of [{ path: "/resource/99999999" }, { path: "/category/nope-xyz-587" }, { path: "/no-such-route-587" }, { path: "/resource/184739", fail503: true }, { path: "/resource/184739" }]) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => localStorage.setItem("analytics-consent", "denied"));
  const page = await ctx.newPage();
  const posts = [];
  page.on("request", r => { if (r.url().includes("/api/telemetry/dead-link")) posts.push({ method: r.method(), url: r.url(), body: r.postData() }); });
  const statuses = [];
  page.on("response", r => { if (r.url().includes("/api/telemetry/dead-link")) statuses.push(r.status()); });
  if (c.fail503) await page.route(/\/api\/resources\/184739$/, r => r.fulfill({ status: 503, contentType: "application/json", body: "{}" }));
  await page.goto(PROD + c.path); await page.waitForLoadState("networkidle").catch(() => {}); await page.waitForTimeout(2000);
  // Force re-renders: resize + focus/visibility events trigger query refetch/rerender.
  await page.setViewportSize({ width: 800, height: 900 }); await page.evaluate(() => { dispatchEvent(new Event("focus")); dispatchEvent(new Event("online")); }); await page.waitForTimeout(2500);
  const h1 = await page.locator("h1").first().textContent().catch(() => null);
  await ctx.close();
  out.h08.push({ path: c.path, fail503: !!c.fail503, h1: h1?.trim(), posts: posts.length, detail: posts.map(p => ({ url: p.url.replace(PROD, ""), body: p.body })), statuses });
}
console.log(JSON.stringify(out, null, 1));
await browser.close();

import { chromium } from "playwright";
const b = await chromium.launch({ executablePath: "/home/runner/workspace/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome" });
for (const [sys, vp] of [["editorial", { width: 1440, height: 900 }], ["brutalist", { width: 390, height: 844 }]]) {
  const ctx = await b.newContext({ viewport: vp });
  await ctx.addInitScript(s => { localStorage.setItem("ds-system", s); localStorage.setItem("analytics-consent", "denied"); }, sys);
  const p = await ctx.newPage();
  for (const u of ["/category/encoding%2Dcodecs", "/category/encoding%2dcodecs", "/subcategory/community%2Dgroups", "/sub-subcategory/web%2dplayers", "/sub-subcategory/quality%2Dtesting?page=2"]) {
    const redirects = [];
    p.on("response", r => { if (r.request().isNavigationRequest() && r.status() >= 300 && r.status() < 400) redirects.push(r.status()); });
    const resp = await p.goto("http://127.0.0.1:5000" + u, { waitUntil: "networkidle" }).catch(e => null);
    await p.waitForTimeout(500);
    const r = await p.evaluate(() => ({ url: location.pathname + location.search, h1: document.querySelector("h1")?.textContent?.trim(), canon: [...document.querySelectorAll('link[rel=canonical]')].map(l => l.href) }));
    console.log(JSON.stringify({ sys, w: vp.width, request: u, redirects, status: resp?.status(), ...r }));
    p.removeAllListeners("response");
  }
  await p.goto("http://127.0.0.1:5000/category/encoding%2Dcodecs", { waitUntil: "networkidle" });
  await p.screenshot({ path: `shots/h04-encoded-${sys}-${vp.width}.png` });
  await ctx.close();
}
await b.close();

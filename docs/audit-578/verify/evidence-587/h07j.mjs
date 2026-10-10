import { chromium } from "playwright";
const B = "http://127.0.0.1:5000", P = "/journey/99999999";
const html = await (await fetch(B + P)).text();
const pick = (re) => (html.match(re) || [])[1];
const ssr = { status: (await fetch(B + P)).status, title: pick(/<title data-react-helmet="true">([^<]*)</), desc: pick(/<meta name="description" content="([^"]*)"/), robots: pick(/<meta name="robots" content="([^"]*)"/), canonicals: (html.match(/rel="canonical"/g) || []).length };
console.log("SSR", JSON.stringify(ssr));
const b = await chromium.launch({ executablePath: "/home/runner/workspace/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome" });
const head = p => p.evaluate(() => ({ title: document.title, desc: document.querySelector('meta[name="description"]')?.content, robots: [...document.querySelectorAll('meta[name="robots"]')].map(m => m.content), canonicals: document.querySelectorAll('link[rel="canonical"]').length, h1: document.querySelector("h1")?.textContent.trim() }));
for (const [sys, vp] of [["editorial", { width: 1440, height: 900 }], ["brutalist", { width: 390, height: 844 }]]) {
  const ctx = await b.newContext({ viewport: vp });
  await ctx.addInitScript(s => { localStorage.setItem("ds-system", s); localStorage.setItem("analytics-consent", "denied"); }, sys);
  const p = await ctx.newPage();
  await p.goto(B + P, { waitUntil: "networkidle" }); await p.waitForTimeout(2500);
  const reload = await head(p);
  await p.screenshot({ path: `shots/h07-journey-missing-${sys}-${vp.width}.png` });
  await p.goto(B + "/journeys", { waitUntil: "networkidle" });
  await p.evaluate(path => { history.pushState({}, "", path); dispatchEvent(new PopStateEvent("popstate")); }, P);
  await p.waitForTimeout(3000);
  const spa = await head(p);
  const eq = h => h.title === ssr.title && h.desc === ssr.desc && h.canonicals === 0 && h.robots.length === 1 && h.robots[0] === ssr.robots;
  console.log(JSON.stringify({ sys, w: vp.width, reload, spa, reloadEq: eq(reload), spaEq: eq(spa) }));
  await ctx.close();
}
await b.close();

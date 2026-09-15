import { chromium } from "playwright";
const base = process.argv[2] || "http://127.0.0.1:5101";
const browser = await chromium.launch({ executablePath: "/home/runner/workspace/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome" });
for (const route of ["/", "/category/encoding-codecs", "/resource/185020"]) {
  const page = await browser.newPage({ viewport: { width: 412, height: 823 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text().slice(0, 160)); });
  const t0 = Date.now();
  await page.goto(base + route, { waitUntil: "load" });
  // hydration proof: a React-owned interactive element responds
  await page.waitForFunction(() => {
    const root = document.getElementById("root");
    return root && Object.keys(root).some((k) => k.startsWith("__reactContainer$") || k.startsWith("_reactRootContainer"));
  }, null, { timeout: 15000 });
  const hydratedAt = Date.now() - t0;
  const info = await page.evaluate(() => ({
    entryScripts: [...document.scripts].filter((s) => /\/assets\/index-[^/]+\.js$/.test(s.src)).map((s) => s.src.split("/").pop()),
    preloads: [...document.querySelectorAll('link[rel="modulepreload"]')].length,
    h1: document.querySelector("h1")?.textContent?.trim().slice(0, 60),
    dataSystem: document.documentElement.dataset.system,
  }));
  // interaction proof: theme selector route works after hydration (client nav)
  const nav = await page.evaluate(async () => {
    const a = document.querySelector('a[href="/settings/theme"], a[href^="/category/"]');
    if (!a) return "no-anchor";
    a.click();
    await new Promise((r) => setTimeout(r, 800));
    return location.pathname;
  });
  console.log(JSON.stringify({ route, hydratedAt, ...info, navAfterClick: nav, errors }));
  await page.close();
}
await browser.close();

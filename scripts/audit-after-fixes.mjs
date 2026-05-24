import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "fs";
import { dirname } from "path";

const BASE = "http://localhost:5000";
const VIEWPORTS = [
  { name: "400", width: 400, height: 900 },
  { name: "1280", width: 1280, height: 800 },
];
const ROUTES = [
  { path: "/", slug: "home" },
  { path: "/login", slug: "login" },
  { path: "/settings/theme", slug: "theme" },
  { path: "/advanced", slug: "advanced" },
  { path: "/category/encoding-codecs", slug: "category-encoding" },
];
const captures = [];
const consoleErr = {};
function ensure(p) { mkdirSync(dirname(p), { recursive: true }); }

(async () => {
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") {
      const k = page.url().replace(BASE, "");
      (consoleErr[k] ||= []).push(`[${m.type()}] ${m.text().slice(0, 200)}`);
    }
  });
  for (const r of ROUTES) {
    for (const vp of VIEWPORTS) {
      const dest = `screenshots/after-fixes/${r.slug}_${vp.name}.jpg`;
      ensure(dest);
      try {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(BASE + r.path, { waitUntil: "networkidle", timeout: 20000 });
        await page.waitForTimeout(700);
        await page.screenshot({ path: dest, fullPage: true, type: "jpeg", quality: 75 });
        captures.push({ route: r.path, vp: vp.name, dest, ok: true });
      } catch (e) {
        captures.push({ route: r.path, vp: vp.name, dest, ok: false, err: String(e).slice(0, 200) });
      }
    }
  }
  await browser.close();
  writeFileSync("screenshots/after-fixes/manifest.json", JSON.stringify({ captures, consoleErr }, null, 2));
  console.log("DONE", captures.filter(c => c.ok).length, "/", captures.length);
})();

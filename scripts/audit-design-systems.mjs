import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "fs";

const BASE = "http://localhost:5000";
const VIEWPORT = { width: 1280, height: 900 };

const SYSTEMS = [
  { id: "editorial", accent: "crimson" },
  { id: "terminal",  accent: "matrix"  },
  { id: "geist",     accent: "cyan"    },
  { id: "brutalist", accent: "amber"   },
  { id: "swiss",     accent: "orange"  },
];

const ROUTES = [
  { path: "/",                          slug: "01_home" },
  { path: "/about",                     slug: "02_about" },
  { path: "/login",                     slug: "03_login" },
  { path: "/settings/theme",            slug: "04_theme_picker" },
  { path: "/advanced",                  slug: "05_advanced" },
  { path: "/journeys",                  slug: "06_journeys" },
  { path: "/category/encoding-codecs",  slug: "07_category" },
  { path: "/submit",                    slug: "08_submit" },
];

const manifest = { runAt: new Date().toISOString(), captures: [], errors: [] };

(async () => {
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  for (const sys of SYSTEMS) {
    const ctx = await browser.newContext({ viewport: VIEWPORT });
    // Seed localStorage BEFORE any app code loads
    await ctx.addInitScript(({ s, a }) => {
      try {
        localStorage.setItem("ds-system", s);
        localStorage.setItem("ds-accent", a);
      } catch {}
    }, { s: sys.id, a: sys.accent });

    const page = await ctx.newPage();
    page.on("pageerror", (err) => {
      manifest.errors.push({ system: sys.id, where: page.url(), msg: String(err).slice(0, 200) });
    });
    page.on("console", (m) => {
      if (m.type() === "error") {
        manifest.errors.push({ system: sys.id, where: page.url(), msg: m.text().slice(0, 200) });
      }
    });

    for (const route of ROUTES) {
      const dest = `evidence/design-system-proof/${sys.id}/${route.slug}.jpg`;
      mkdirSync(`evidence/design-system-proof/${sys.id}`, { recursive: true });
      try {
        await page.goto(`${BASE}${route.path}`, { waitUntil: "domcontentloaded", timeout: 20000 });
        await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
        await page.waitForTimeout(400);
        // Verify attributes are actually applied
        const applied = await page.evaluate(() => ({
          system: document.documentElement.getAttribute("data-system"),
          accent: document.documentElement.getAttribute("data-accent"),
          bg: getComputedStyle(document.body).backgroundColor,
          fontFamily: getComputedStyle(document.body).fontFamily.split(",")[0].replace(/['"]/g, ""),
          accentVar: getComputedStyle(document.documentElement).getPropertyValue("--accent").trim(),
          bgVar: getComputedStyle(document.documentElement).getPropertyValue("--bg").trim(),
        }));
        await page.screenshot({ path: dest, type: "jpeg", quality: 75, fullPage: false });
        manifest.captures.push({ system: sys.id, accent: sys.accent, route: route.path, slug: route.slug, file: dest, applied });
        console.log(`✓ ${sys.id.padEnd(10)} ${route.path.padEnd(34)} system=${applied.system} accent=${applied.accent} font=${applied.fontFamily} bg=${applied.bg}`);
      } catch (e) {
        manifest.captures.push({ system: sys.id, route: route.path, slug: route.slug, file: dest, error: String(e).slice(0, 200) });
        console.log(`✗ ${sys.id} ${route.path} — ${String(e).slice(0, 80)}`);
      }
    }
    await ctx.close();
  }
  await browser.close();
  writeFileSync("evidence/design-system-proof/manifest.json", JSON.stringify(manifest, null, 2));
  console.log(`\nDone — ${manifest.captures.length} captures, ${manifest.errors.length} console/page errors`);
})();

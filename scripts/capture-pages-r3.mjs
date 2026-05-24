import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "fs";

const BASE = "http://localhost:5000";
const ROUTES = [
  ["/",                                  "01_home"],
  ["/about",                             "02_about"],
  ["/advanced",                          "03_advanced"],
  ["/journeys",                          "04_journeys"],
  ["/journey/1",                         "05_journey_detail"],
  ["/login",                             "06_login"],
  ["/submit",                            "07_submit"],
  ["/settings/theme",                    "08_theme_settings"],
  ["/category/community-events",         "09_category_community_events"],
  ["/category/encoding-codecs",          "10_category_encoding_codecs"],
  ["/category/general-tools",            "11_category_general_tools"],
  ["/category/infrastructure-delivery",  "12_category_infrastructure_delivery"],
  ["/category/intro-learning",           "13_category_intro_learning"],
  ["/category/media-tools",              "14_category_media_tools"],
  ["/category/players-clients",          "15_category_players_clients"],
  ["/category/protocols-transport",      "16_category_protocols_transport"],
  ["/category/standards-industry",       "17_category_standards_industry"],
  ["/subcategory/ai-ml-tools",           "18_subcategory_ai_ml_tools"],
  ["/sub-subcategory/hls",               "19_subsub_hls"],
  ["/sub-subcategory/dash",              "20_subsub_dash"],
  ["/resource/1",                        "21_resource_detail"],
  ["/this-route-does-not-exist",         "22_404"],
];
const BREAKPOINTS = [
  { name: "desktop", w: 1920, h: 1080 },
  { name: "tablet",  w: 768,  h: 1024 },
  { name: "mobile",  w: 400,  h: 900  },
];

mkdirSync("screenshots/pages-r3", { recursive: true });
mkdirSync("evidence/audit-r3", { recursive: true });

const manifest = { captures: [], errors: [], started: new Date().toISOString() };

const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"] });

for (const bp of BREAKPOINTS) {
  const ctx = await browser.newContext({ viewport: { width: bp.w, height: bp.h } });
  const page = await ctx.newPage();
  page.on("pageerror", e => manifest.errors.push({ where: page.url(), bp: bp.name, kind: "pageerror", msg: String(e).slice(0,300) }));
  page.on("console", m => { if (m.type() === "error") manifest.errors.push({ where: page.url(), bp: bp.name, kind: "console", msg: m.text().slice(0,300) }); });
  for (const [path, slug] of ROUTES) {
    const dest = `screenshots/pages-r3/${slug}_${bp.name}.jpg`;
    try {
      const resp = await page.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(700);
      const httpStatus = resp ? resp.status() : null;
      const applied = await page.evaluate(() => ({
        system: document.documentElement.getAttribute("data-system"),
        accent: document.documentElement.getAttribute("data-accent"),
        bgVar: getComputedStyle(document.documentElement).getPropertyValue("--bg").trim(),
        accentVar: getComputedStyle(document.documentElement).getPropertyValue("--accent").trim(),
        font: getComputedStyle(document.body).fontFamily.split(",")[0].replace(/['"]/g, ""),
        title: document.title,
        h1: document.querySelector("h1")?.textContent?.slice(0,80) ?? null,
      }));
      await page.screenshot({ path: dest, type: "jpeg", quality: 78, fullPage: false });
      manifest.captures.push({ bp: bp.name, route: path, slug, file: dest, httpStatus, applied });
      console.log(`✓ ${bp.name.padEnd(7)} ${path.padEnd(40)} h1="${applied.h1}"`);
    } catch (e) {
      manifest.captures.push({ bp: bp.name, route: path, slug, file: dest, error: String(e).slice(0,200) });
      console.log(`✗ ${bp.name} ${path}: ${String(e).slice(0,80)}`);
    }
  }
  await ctx.close();
}
await browser.close();

manifest.finished = new Date().toISOString();
manifest.summary = {
  total: manifest.captures.length,
  ok: manifest.captures.filter(c => !c.error).length,
  failed: manifest.captures.filter(c => c.error).length,
  consoleErrors: manifest.errors.length,
};
writeFileSync("evidence/audit-r3/page_captures.json", JSON.stringify(manifest, null, 2));
console.log("\n", JSON.stringify(manifest.summary, null, 2));

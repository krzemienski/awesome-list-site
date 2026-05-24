import { chromium } from "playwright";
import { writeFileSync, readdirSync } from "fs";
const BASE = "http://localhost:5000";
const ROUTES = [
  ["/", "01_home"],["/about","02_about"],["/advanced","03_advanced"],
  ["/journeys","04_journeys"],["/journey/1","05_journey_detail"],
  ["/login","06_login"],["/submit","07_submit"],["/settings/theme","08_theme_settings"],
  ["/category/community-events","09_category_community_events"],
  ["/category/encoding-codecs","10_category_encoding_codecs"],
  ["/category/general-tools","11_category_general_tools"],
  ["/category/infrastructure-delivery","12_category_infrastructure_delivery"],
  ["/category/intro-learning","13_category_intro_learning"],
  ["/category/media-tools","14_category_media_tools"],
  ["/category/players-clients","15_category_players_clients"],
  ["/category/protocols-transport","16_category_protocols_transport"],
  ["/category/standards-industry","17_category_standards_industry"],
  ["/subcategory/ai-ml-tools","18_subcategory_ai_ml_tools"],
  ["/sub-subcategory/hls","19_subsub_hls"],
  ["/sub-subcategory/dash","20_subsub_dash"],
  ["/resource/1","21_resource_detail"],
  ["/this-route-does-not-exist","22_404"],
];
const have = new Set(readdirSync("screenshots/pages-r3").filter(f=>f.endsWith("_mobile.jpg")).map(f=>f.replace("_mobile.jpg","")));
const todo = ROUTES.filter(([,s])=>!have.has(s));
console.log("Capturing", todo.length, "mobile routes");
const errs = [];
const browser = await chromium.launch({ args: ["--no-sandbox","--disable-dev-shm-usage"] });
const ctx = await browser.newContext({ viewport: { width: 400, height: 900 } });
const page = await ctx.newPage();
page.on("console", m => { if (m.type()==="error") errs.push({url:page.url(), msg:m.text().slice(0,200)}); });
for (const [p, slug] of todo) {
  try {
    await page.goto(BASE+p, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `screenshots/pages-r3/${slug}_mobile.jpg`, type: "jpeg", quality: 78 });
    console.log("✓", slug);
  } catch (e) { console.log("✗", slug, String(e).slice(0,60)); }
}
await browser.close();
writeFileSync("evidence/audit-r3/mobile_errors.json", JSON.stringify(errs, null, 2));
console.log("done; console errors:", errs.length);

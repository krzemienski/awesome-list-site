import { chromium } from "playwright";
const BASE="http://localhost:5000";
const start=parseInt(process.argv[2]); const end=parseInt(process.argv[3]);
const ALL=[
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
const todo=ALL.slice(start,end);
const browser=await chromium.launch({args:["--no-sandbox","--disable-dev-shm-usage"]});
const ctx=await browser.newContext({viewport:{width:400,height:900}});
const page=await ctx.newPage();
for(const [p,s] of todo){try{await page.goto(BASE+p,{waitUntil:"domcontentloaded",timeout:10000});await page.waitForTimeout(400);await page.screenshot({path:`screenshots/pages-r3/${s}_mobile.jpg`,type:"jpeg",quality:78});console.log("✓",s);}catch(e){console.log("✗",s,String(e).slice(0,50));}}
await browser.close();

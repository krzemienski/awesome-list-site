import { chromium } from "playwright";
const EXEC = ".cache/ms-playwright/chromium-1223/chrome-linux64/chrome";
const BASE = "https://awesome.video";
const results = [];
const ok = (n, p, d = "") => { results.push({ n, p }); console.log(`${p ? "PASS" : "FAIL"} ${n}${d ? " — " + d : ""}`); };

const browser = await chromium.launch({ executablePath: EXEC });

// F-001: consent banner must be opaque (fresh context = no stored consent)
const ctx1 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const p1 = await ctx1.newPage();
await p1.goto(BASE + "/", { waitUntil: "networkidle", timeout: 45000 });
const banner = p1.locator('[class*="fixed"][class*="bottom"]').filter({ hasText: /cookie|consent|analytics/i }).first();
const bannerVisible = await banner.isVisible().catch(() => false);
if (bannerVisible) {
  const bg = await banner.evaluate((el) => getComputedStyle(el).backgroundColor);
  const alpha = bg.startsWith("rgba") ? parseFloat(bg.split(",")[3]) : 1;
  ok("F-001 consent banner opaque", alpha >= 0.95, `bg=${bg}`);
} else {
  ok("F-001 consent banner present", false, "banner not found on fresh context");
}
await ctx1.close();

// F-004: tablet 768x1024 — category header stacks (flex-col) and h1 doesn't shatter
const ctx2 = await browser.newContext({ viewport: { width: 768, height: 1024 } });
const p2 = await ctx2.newPage();
await p2.goto(BASE + "/category/encoding-codecs", { waitUntil: "networkidle", timeout: 45000 });
const h1 = p2.locator("h1").first();
await h1.waitFor({ timeout: 15000 });
const h1Text = (await h1.textContent())?.trim();
const info = await h1.evaluate((el) => {
  const cs = getComputedStyle(el);
  const parent = el.closest("div.flex") || el.parentElement;
  const pcs = parent ? getComputedStyle(parent).flexDirection : "n/a";
  const lh = parseFloat(cs.lineHeight);
  return { h: el.getBoundingClientRect().height, lh, parentFlexDir: pcs, w: el.getBoundingClientRect().width };
});
const lines = Math.round(info.h / info.lh);
ok("F-004 tablet header stacked", info.parentFlexDir === "column", `parent flex-direction=${info.parentFlexDir}`);
ok("F-004 tablet h1 single line", lines <= 1, `"${h1Text}" lines=${lines} (h=${info.h}, lh=${info.lh})`);

// spot-check: /category/test now shows the 404 card in SPA
await p2.goto(BASE + "/category/test", { waitUntil: "networkidle", timeout: 45000 });
const body2 = await p2.locator("body").innerText();
ok("F-002 /category/test 404 card", /404|not found/i.test(body2), body2.slice(0, 80).replace(/\n/g, " "));
await ctx2.close();

await browser.close();
const fails = results.filter((r) => !r.p).length;
console.log(`\n${results.length - fails}/${results.length} PASS`);
process.exit(fails ? 1 : 0);

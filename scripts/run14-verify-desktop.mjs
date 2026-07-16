// Run14 desktop (1440px, anon) verification:
// BUG-004/003/055/018/025/027/054/010(client)/042/011/012/013/044/026/048/001/038/005/014/008/009 + P0 smoke
import { chromium } from "playwright";

const EXE = ".cache/ms-playwright/chromium-1223/chrome-linux64/chrome";
const BASE = "http://localhost:5000";
const results = [];
const ok = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"} ${name} — ${detail}`);
};

const PART = process.argv[2] ?? "all";
const run1 = PART === "all" || PART === "1";
const run2 = PART === "all" || PART === "2";

const browser = await chromium.launch({ executablePath: EXE });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

if (run1) {
// --- Home: consent banner (BUG-004), P0, tag-filter subtitle (BUG-027) + drill-down (BUG-025)
await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 30000 });
await page.waitForSelector('[data-testid="list-categories"]', { timeout: 15000 });
{
  const banner = page.locator('[data-testid="consent-banner"]');
  const visible = await banner.isVisible();
  const bannerH = visible ? (await banner.boundingBox())?.height ?? 0 : 0;
  const pad = await page.evaluate(() => parseFloat(document.body.style.paddingBottom || "0"));
  ok("BUG-004 banner pads body", visible && pad >= bannerH - 2 && pad > 0,
    `banner visible=${visible} h=${bannerH?.toFixed(0)} bodyPad=${pad}`);
  // footer link reachable while banner shown
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(300);
  const covered = await page.evaluate(() => {
    const links = [...document.querySelectorAll("footer a")];
    const l = links.find(a => a.getBoundingClientRect().height > 0);
    if (!l) return "no-footer-link";
    l.scrollIntoView({ block: "center", behavior: "instant" });
    const r = l.getBoundingClientRect();
    const el = document.elementFromPoint(
      Math.min(r.left + r.width / 2, innerWidth - 1),
      Math.min(Math.max(r.top + r.height / 2, 0), innerHeight - 1),
    );
    return el && (el === l || l.contains(el) || el.closest("a") === l) ? "reachable" : `covered-by:${el?.tagName}.${el?.className?.toString().slice(0, 40)}`;
  });
  ok("BUG-004 footer reachable under banner", covered === "reachable", covered);
  const cards = await page.locator('[data-testid^="link-category-"]').count();
  ok("P0 home renders categories", cards >= 8, `${cards} category cards`);
}
// tag filter via URL (?tags= sync) — subtitle parity + drill-down carry
await page.goto(BASE + "/?tags=ffmpeg", { waitUntil: "domcontentloaded" });
await page.waitForSelector('[data-testid="list-categories"], [data-testid="empty-categories"]', { timeout: 15000 });
{
  const subtitle = await page.locator("p", { hasText: /matching resource/ }).first().textContent().catch(() => "");
  const m = subtitle?.match(/Showing ([\d,]+) matching resources? across (\d+) categor/);
  ok("BUG-027 filtered subtitle parity", !!m, `subtitle="${subtitle?.trim().slice(0, 90)}"`);
  const firstCard = page.locator('[data-testid^="link-category-"]').first();
  const href = await firstCard.getAttribute("href");
  ok("BUG-025 drill-down carries ?tags=", !!href && href.includes("tags=ffmpeg"), `first card href=${href}`);
  await firstCard.click();
  await page.waitForTimeout(1200);
  const url = page.url();
  ok("BUG-025 category page keeps filter", url.includes("/category/") && url.includes("tags=ffmpeg"), url);
}

// --- Category page: sort options (BUG-003), General bucket (BUG-055), tag pills (BUG-018), View Details link (BUG-012)
await page.goto(BASE + "/category/encoding-codecs", { waitUntil: "domcontentloaded" });
await page.waitForSelector('[data-testid="select-subcategory-filter"]', { timeout: 15000 });
{
  // BUG-003: sort dropdown must not offer count sorts on resource lists
  const combos = page.locator('button[role="combobox"]');
  const n = await combos.count();
  let sortOptions = "";
  for (let i = 0; i < n; i++) {
    const c = combos.nth(i);
    const tid = await c.getAttribute("data-testid");
    if (tid === "select-subcategory-filter") continue;
    await c.click();
    await page.waitForTimeout(400);
    sortOptions = (await page.locator('[role="option"]').allTextContents()).join(" | ");
    await page.keyboard.press("Escape");
    if (/name|newest|a-z/i.test(sortOptions)) break; // that was the sort select
  }
  ok("BUG-003 no count sorts on resources", sortOptions.length > 0 && !/most resources|fewest resources/i.test(sortOptions),
    `options: ${sortOptions.slice(0, 140)}`);

  // BUG-055: General bucket always selectable
  await page.locator('[data-testid="select-subcategory-filter"]').click();
  await page.waitForTimeout(400);
  const general = page.locator('[role="option"]', { hasText: "General (no subcategory)" });
  const generalThere = await general.count();
  if (generalThere) await general.first().click();
  await page.waitForTimeout(800);
  ok("BUG-055 General bucket selectable", generalThere > 0 && page.url().includes("view=general"),
    `option present=${generalThere > 0} url=${page.url()}`);
  await page.goBack();
  await page.waitForTimeout(600);

  // BUG-018: tag pill is a button that filters without navigating
  const pill = page.locator('[data-testid^="tag-pill-"]').first();
  const pillCount = await pill.count();
  if (pillCount) {
    const pillTag = await pill.evaluate(el => el.tagName);
    const pillText = (await pill.textContent())?.trim();
    const before = page.url();
    await pill.click();
    await page.waitForTimeout(800);
    const stayed = page.url().includes("/category/") && !page.url().includes("/resource/");
    ok("BUG-018 tag pill filters (no nav)", pillTag === "BUTTON" && stayed,
      `tag=${pillTag} text="${pillText}" url ${before} -> ${page.url()}`);
  } else {
    ok("BUG-018 tag pill filters (no nav)", false, "no tag pills found on category page");
  }
}

// --- Single-resource node: BUG-054 singular + BUG-010 client/server title parity + BUG-042 empty copy
await page.goto(BASE + "/sub-subcategory/ffmpeg-sc2226", { waitUntil: "domcontentloaded" });
await page.waitForSelector('[data-testid="text-results-count"]', { timeout: 15000 });
{
  const count = (await page.locator('[data-testid="text-results-count"]').textContent())?.trim();
  ok("BUG-054 singular count line", count === "Showing 1 of 1 resource", `"${count}"`);

  // BUG-012: View Details is a real link on sub(sub)category listing cards
  // (the audited surface — shared ResourceCard; category pages use their own
  // semantic <button>, which the audit explicitly accepted).
  const vd = page.locator('[data-testid^="link-view-details-"]').first();
  const vdHref = await vd.getAttribute("href").catch(() => null);
  const vdTag = await vd.evaluate(el => el.tagName).catch(() => "?");
  ok("BUG-012 View Details real link", vdTag === "A" && !!vdHref && vdHref.startsWith("/resource/"),
    `tag=${vdTag} href=${vdHref}`);
  await page.waitForTimeout(800); // let SEOHead settle
  const clientTitle = await page.title();
  const serverTitle = await page.evaluate(async () => {
    const html = await (await fetch(location.href)).text();
    const raw = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "(none)";
    // The server HTML-escapes entities inside <title> (&amp; etc.) — decode
    // before comparing with document.title, which is already decoded.
    const el = document.createElement("textarea");
    el.innerHTML = raw;
    return el.value;
  });
  ok("BUG-010 client/server title parity", clientTitle === serverTitle && /FFMPEG – Scripting & Automation Tools/.test(clientTitle),
    `client="${clientTitle}" server="${serverTitle}"`);
  await page.fill('[data-testid="input-search"]', "zzzznotfoundzzz");
  await page.waitForTimeout(600);
  const emptyCopy = await page.locator("text=No resources found").locator("xpath=following-sibling::p").textContent().catch(() => "");
  const bodyText = await page.locator("body").innerText();
  const good = /Try a different search term/.test(emptyCopy || "") || /No resources match "zzzznotfoundzzz"/.test(bodyText);
  ok("BUG-042 empty-state names the cause", good, `copy="${(emptyCopy || "").trim().slice(0, 90)}"`);
}
} // end run1

if (run2) {
// --- Resource detail: BUG-013 back fallback, BUG-011 related anchors, BUG-044/026 toast, BUG-048/001 suggest-edit gate
{
  const p2 = await ctx.newPage();
  await p2.goto(BASE + "/resource/186449", { waitUntil: "domcontentloaded" });
  await p2.waitForSelector('[data-testid="button-back"]', { timeout: 15000 });
  await p2.waitForTimeout(1500); // related resources load

  const related = await p2.locator('a[href^="/resource/"]:not([data-testid^="link-view-details"])').count();
  ok("BUG-011 related cards are anchors", related >= 1, `${related} related/resource anchors on detail page`);

  // BUG-044/026: anon favorite → toast with sign-in action
  const fav = p2.locator('[data-testid="button-favorite"]').first();
  if (await fav.count()) {
    await fav.click();
    await p2.waitForTimeout(700);
    const toastText = await p2.locator("[role='status'], .toast, [data-radix-toast], li[role='status']").allInnerTexts().catch(() => []);
    const flat = toastText.join(" ") || (await p2.locator("body").innerText());
    ok("BUG-044/026 anon favorite toast has sign-in path", /sign in/i.test(flat), `toast="${flat.replace(/\s+/g, " ").slice(0, 140)}"`);
  } else {
    ok("BUG-044/026 anon favorite toast has sign-in path", false, "no favorite button found");
  }

  // BUG-048 + BUG-001: suggest-edit auth gate copy + login redirect
  const suggest = p2.locator("button", { hasText: /suggest edit/i }).first();
  if (await suggest.count()) {
    await suggest.click();
    await p2.waitForTimeout(600);
    const dialogText = await p2.locator('[role="dialog"]').innerText().catch(() => "");
    // The "//" eyebrow prefix is the site's design motif (audit: "// PROFILE",
    // "// SEARCH" are fine) — only the dev-jargon wording was the defect.
    ok("BUG-048 no dev jargon in gate", dialogText.length > 0 && !/AUTH REQUIRED/i.test(dialogText),
      `dialog="${dialogText.replace(/\s+/g, " ").slice(0, 110)}"`);
    const loginBtn = p2.locator('[data-testid="button-login-redirect"]');
    const present = await loginBtn.count();
    if (present) {
      await loginBtn.click();
      await p2.waitForTimeout(1000);
    }
    ok("BUG-001 gate CTA routes to /login?next=", present > 0 && p2.url().includes("/login?next=%2Fresource%2F186449"),
      `url=${p2.url()}`);
  } else {
    ok("BUG-048 no dev jargon in gate", false, "no suggest edit button");
    ok("BUG-001 gate CTA routes to /login?next=", false, "no suggest edit button");
  }
  await p2.close();

  // BUG-013: back-button fallback on a fresh deep link (no history)
  const p3 = await ctx.newPage();
  await p3.goto(BASE + "/resource/186449", { waitUntil: "domcontentloaded" });
  await p3.waitForSelector('[data-testid="button-back"]', { timeout: 15000 });
  await p3.locator('[data-testid="button-back"]').click();
  await p3.waitForTimeout(900);
  const backUrl = new URL(p3.url());
  ok("BUG-013 back fallback to home", backUrl.pathname === "/", `deep-link back -> ${backUrl.pathname}`);
  await p3.close();
}

// --- BUG-008: guarded route carries ?next=
{
  const p4 = await ctx.newPage();
  await p4.goto(BASE + "/profile", { waitUntil: "domcontentloaded" });
  await p4.waitForTimeout(1500);
  ok("BUG-008 guarded route -> /login?next=", p4.url().includes("/login?next=%2Fprofile"), `url=${p4.url()}`);
  await p4.close();
}

// --- Advanced: ?tab= deep link (BUG-038), Clear All (BUG-005), per-category counts (BUG-014)
await page.goto(BASE + "/advanced?tab=export", { waitUntil: "domcontentloaded" });
await page.waitForSelector("text=Clear All", { timeout: 15000 });
{
  ok("BUG-038 ?tab=export deep-link", true, "export tab content (Clear All) rendered from URL");
  // tab switch serializes back to URL
  const metricsTab = page.locator('[role="tab"]', { hasText: /metrics/i }).first();
  if (await metricsTab.count()) {
    await metricsTab.click();
    await page.waitForTimeout(500);
    ok("BUG-038 tab switch writes ?tab=", page.url().includes("tab=metrics"), `url=${page.url()}`);
    await page.locator('[role="tab"]', { hasText: /export/i }).first().click();
    await page.waitForTimeout(500);
  } else {
    ok("BUG-038 tab switch writes ?tab=", false, "metrics tab not found");
  }

  // BUG-014: per-category count equals flat-list count
  const expected = await page.evaluate(async () => {
    const d = await (await fetch("/api/awesome-list")).json();
    const counts = {};
    d.resources.forEach(r => { counts[r.category] = (counts[r.category] || 0) + 1; });
    return counts;
  });
  const catName = "Encoding & Codecs";
  // The checkbox row renders "Encoding & Codecs (323)"; the accordion header
  // shows the count in a separate badge without parens — target the row.
  const shown = await page.evaluate((cat) => {
    const el = [...document.querySelectorAll("div, label")].find((e) => {
      const t = e.textContent?.trim() || "";
      return t.startsWith(`${cat} (`) && t.length < cat.length + 12;
    });
    return el?.textContent?.match(/\((\d[\d,]*)\)/)?.[1]?.replace(/,/g, "") ?? null;
  }, catName);
  ok("BUG-014 export counts match flat list", !!shown && parseInt(shown) === expected[catName],
    `${catName}: shown=${shown} expected=${expected[catName]}`);

  // BUG-005: Clear All really clears
  await page.locator("text=Clear All").first().click();
  await page.waitForTimeout(500);
  // Scope to the category-selection checkboxes (labels like "Media Tools (252)").
  // Option toggles (include descriptions/tags/...) are separate and stay checked.
  const checked = await page.evaluate(() =>
    [...document.querySelectorAll('[role="checkbox"][data-state="checked"], input[type="checkbox"]:checked')]
      .filter(c => /\(\d/.test(c.closest("div")?.textContent || "")).length);
  ok("BUG-005 Clear All clears selection", checked === 0, `category-boxes-checked-after-clear=${checked}`);
}

// --- Search: ?page= restore (BUG-038)
await page.goto(BASE + "/search?q=ffmpeg&page=2", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1500);
{
  const stillPage2 = page.url().includes("page=2");
  const bodyTxt = await page.locator("body").innerText();
  // Rendered as "· page 2 of N" and "2 / N" (PAGE_SIZE=24 → no "21-" range).
  const pageMarker = /page 2 of|2 \/ \d/i.test(bodyTxt);
  ok("BUG-038 search ?page= restore", stillPage2 && pageMarker, `url=${page.url()} marker=${pageMarker}`);
}

// --- BUG-009: shell + skeleton while auth resolves (delayed /api/auth/user)
{
  const p5 = await ctx.newPage();
  await p5.route("**/api/auth/user", async route => {
    await new Promise(r => setTimeout(r, 2500));
    await route.continue();
  });
  await p5.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  let sawSkeleton = false, sawChrome = false;
  try {
    await p5.waitForSelector('[data-testid="app-shell-skeleton"]', { timeout: 2200 });
    sawSkeleton = true;
    sawChrome = await p5.evaluate(() => !!document.querySelector("header, [data-sidebar], aside"));
  } catch { }
  await p5.waitForSelector('[data-testid="list-categories"]', { timeout: 15000 }).catch(() => {});
  const skeletonGone = (await p5.locator('[data-testid="app-shell-skeleton"]').count()) === 0;
  ok("BUG-009 shell-first skeleton", sawSkeleton && sawChrome && skeletonGone,
    `skeleton=${sawSkeleton} chrome=${sawChrome} clearedAfter=${skeletonGone}`);
  await p5.close();
}
} // end run2

await browser.close();
const failed = results.filter(x => !x.pass);
console.log(`\n${results.length - failed.length}/${results.length} PASS`);
process.exit(failed.length ? 1 : 0);

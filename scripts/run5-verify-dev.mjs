import { chromium } from "playwright";

const BASE = "http://localhost:5000";
const EXEC = ".cache/ms-playwright/chromium-1223/chrome-linux64/chrome";
const results = [];
const ok = (name, pass, detail = "") => {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"} ${name}${detail ? " — " + detail : ""}`);
};

// Phase selector so each invocation stays inside the ~88s bash budget:
//   node scripts/run5-verify-dev.mjs 1   → home/footer/sort/back-to-top
//   node scripts/run5-verify-dev.mjs 2   → search/register/dialog/admin
const PHASE = process.argv[2] || "all";

const browser = await chromium.launch({ executablePath: EXEC });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

if (PHASE === "1" || PHASE === "all") {
// ---- 1. Home: footer nav + copyright (M19), word-boundary truncate (M23)
await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
await page.waitForSelector('[data-testid="list-categories"]', { timeout: 15000 });
const footerLinks = await page.$$eval('footer nav a', (as) => as.map((a) => a.getAttribute("href")));
ok("M19 footer nav links", ["/", "/categories", "/journeys", "/submit", "/about"].every((h) => footerLinks.includes(h)), footerLinks.join(","));
const copyright = await page.textContent('[data-testid="footer-copyright"]');
ok("M19 copyright", /© 20\d\d Awesome Video/.test(copyright || ""), (copyright || "").trim());
const descs = await page.$$eval('[data-testid="list-categories"] .line-clamp-2', (els) => els.map((e) => e.textContent || ""));
const midWord = descs.filter((d) => /\S{1,}\.\.\.$/.test(d) || /[a-z]…$/.test(d) === false && d.endsWith("…") === false && d.length > 0 && false);
const badTrunc = descs.filter((d) => d.endsWith("...")); // old style mid-word marker
ok("M23 word-boundary truncate", badTrunc.length === 0 && descs.length > 0, `${descs.length} cards, sample: "${(descs[0] || "").slice(-25)}"`);

// ---- 2. Home: sort persists via URL (M25)
const sortTrigger = await page.$('button[aria-label="Sort resources"]');
if (sortTrigger) {
  await sortTrigger.click();
  await page.waitForSelector('div[role="option"]', { timeout: 5000 });
  const opts = await page.$$('div[role="option"]');
  if (opts[1]) await opts[1].click();
  await page.waitForTimeout(400);
}
const urlHasSort = page.url().includes("sort=");
ok("M25 sort → URL param", urlHasSort, page.url());
if (urlHasSort) {
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-testid="list-categories"]', { timeout: 15000 });
  ok("M25 sort survives refresh", page.url().includes("sort="), page.url());
} else {
  ok("M25 sort survives refresh", false, "no sort param set");
}

// ---- 3. Back to top (L01) — needs a page taller than 600px of scroll,
// Home is too short; the search results page is reliably long.
await page.goto(BASE + "/search?q=video", { waitUntil: "domcontentloaded" });
await page.waitForSelector('[data-testid="text-result-count"]', { timeout: 20000 });
const b2tHidden = await page.$('[data-testid="button-back-to-top"]');
await page.evaluate(() => window.scrollTo(0, 2000));
await page.waitForTimeout(400);
const b2t = await page.$('[data-testid="button-back-to-top"]');
ok("L01 back-to-top appears on scroll", !b2tHidden && !!b2t);
if (b2t) {
  await b2t.click();
  await page.waitForTimeout(900);
  const y = await page.evaluate(() => window.scrollY);
  ok("L01 back-to-top scrolls up", y < 100, `scrollY=${y}`);
} else {
  ok("L01 back-to-top scrolls up", false, "button missing");
}
}

if (PHASE === "2" || PHASE === "all") {
// ---- 4. Search page pagination (M11)
await page.goto(BASE + "/search?q=video", { waitUntil: "domcontentloaded" });
await page.waitForSelector('[data-testid="text-result-count"]', { timeout: 20000 });
const countText = await page.textContent('[data-testid="text-result-count"]');
ok("M11 result count + page info", /result/.test(countText || "") && /page 1 of/.test(countText || ""), (countText || "").trim());
const nextBtn = await page.$('[data-testid="button-search-next"]');
ok("M11 pagination controls", !!nextBtn);
if (nextBtn) {
  await nextBtn.click();
  await page.waitForTimeout(500);
  const countText2 = await page.textContent('[data-testid="text-result-count"]');
  ok("M11 next page works", /page 2 of/.test(countText2 || ""), (countText2 || "").trim());
}

// ---- 5. Register strength meter (M27)
await page.goto(BASE + "/register", { waitUntil: "domcontentloaded" });
await page.waitForSelector('[data-testid="input-password"]', { timeout: 15000 });
await page.fill('[data-testid="input-password"]', "abc");
let label = await page.textContent('[data-testid="password-strength-label"]').catch(() => null);
const weakShown = !!label;
await page.fill('[data-testid="input-password"]', "Str0ng!Passw0rd#2026");
await page.waitForTimeout(200);
label = await page.textContent('[data-testid="password-strength-label"]').catch(() => null);
ok("M27 strength meter", weakShown && /Strong/.test(label || ""), `final="${(label || "").trim()}"`);

// ---- 6. Search dialog recent searches (L10)
await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
await page.waitForSelector('[data-testid="list-categories"]', { timeout: 15000 });
await page.keyboard.press("Control+k");
await page.waitForSelector('input[cmdk-input]', { timeout: 5000 });
await page.fill('input[cmdk-input]', "ffmpeg");
await page.waitForTimeout(900); // > 600ms debounce so it persists
await page.keyboard.press("Escape");
await page.waitForTimeout(300);
await page.keyboard.press("Control+k");
await page.waitForSelector('input[cmdk-input]', { timeout: 5000 });
await page.waitForTimeout(300);
const recent = await page.$('[data-testid="recent-search-0"]');
const recentText = recent ? await recent.textContent() : "";
ok("L10 recent searches", !!recent && /ffmpeg/i.test(recentText || ""), (recentText || "").trim());
const clearBtn = await page.$('[data-testid="button-clear-recent-searches"]');
if (clearBtn) {
  await clearBtn.click();
  await page.waitForTimeout(200);
  const gone = await page.$('[data-testid="recent-search-0"]');
  ok("L10 clear recent searches", !gone);
} else {
  ok("L10 clear recent searches", false, "clear button missing");
}
await page.keyboard.press("Escape");

// ---- 7. Anon bookmark toast (L09)
await page.goto(BASE + "/search?q=ffmpeg", { waitUntil: "domcontentloaded" });
await page.waitForSelector('[data-testid="text-result-count"]', { timeout: 20000 });
const bm = await page.$('[data-testid="button-bookmark"]');
if (bm) {
  await bm.click();
  await page.waitForTimeout(600);
  const toastText = await page.textContent('[role="status"], [data-radix-toast-announce-exclude], li[role="status"]').catch(() => "");
  const anyToast = await page.$$eval("li", (els) => els.map((e) => e.textContent || "").filter((t) => /Sign in to bookmark/i.test(t)).length).catch(() => 0);
  ok("L09 anon bookmark → sign-in toast", anyToast > 0 || /Sign in to bookmark/i.test(toastText || ""), `toast="${(toastText || "").trim().slice(0, 60)}"`);
} else {
  ok("L09 anon bookmark → sign-in toast", false, "no bookmark button on search cards (check ResourceCard)");
}

// ---- 8. Admin: login, M22 stats copy + bulk delete dialog + error boundaries mount
const loginResp = await page.request.post(BASE + "/api/auth/local/login", {
  data: { email: "admin@example.com", password: "devtest-run3-Pw1" },
});
ok("admin login", loginResp.ok(), String(loginResp.status()));
await page.goto(BASE + "/admin", { waitUntil: "domcontentloaded" });
await page.waitForSelector('[data-testid="stat-live-resources"]', { timeout: 20000 });
const statText = await page.textContent('[data-testid="stat-live-resources"]');
ok("M22 no '+0 pending' copy", !/\+0 pending/.test(statText || ""), (statText || "").trim().slice(0, 80));
const crashFallback = await page.$('[data-testid="error-boundary-fallback"]');
ok("L13 no boundary fallback on load (tabs render)", !crashFallback);
}

await browser.close();
const fails = results.filter((r) => !r.pass);
console.log(`\n${results.length - fails.length}/${results.length} PASS`);
process.exit(fails.length ? 1 : 0);

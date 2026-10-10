// J05 browser proof for user-facing screens whose hook/promise code changed.
import fs from "node:fs";
import path from "node:path";
const ROOT = "/home/runner/workspace";
const { chromium } = await import(path.join(ROOT, "node_modules/playwright/index.mjs"));
const BASE = "http://127.0.0.1:5000";
const KEY = process.env.ADMIN_PASSWORD;
const OUT = "/tmp/j05/shots";
const RID = 188015, JID = 7;
const cache = path.join(ROOT, ".cache/ms-playwright");
const dir = fs.readdirSync(cache).filter((d) => /^chromium-\d+$/.test(d)).sort().pop();
const browser = await chromium.launch({ headless: true, executablePath: path.join(cache, dir, "chrome-linux64/chrome"), args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const results = [];
const ok = (name, pass, detail = "") => { results.push({ name, pass, detail }); console.log(pass ? "PASS" : "FAIL", name, detail); };
const errors = [];
function watch(page, tag) {
  page.on("pageerror", (e) => errors.push(`${tag} PAGEERROR ${e.message.slice(0, 200)}`));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|clerk|ERR_|net::/i.test(m.text())) errors.push(`${tag} ${m.text().slice(0, 200)}`); });
}

// ---------- Anonymous context: consent banner, admin password form, search, journey anchor
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage(); watch(page, "anon");
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  const banner = page.locator('[data-testid="consent-banner"]');
  await banner.waitFor({ timeout: 30000 });
  ok("consent banner shows for a new visitor", await banner.isVisible());
  await page.click('[data-testid="consent-decline"]');
  await banner.waitFor({ state: "hidden", timeout: 10000 }).catch(() => {});
  ok("consent Decline hides the banner", !(await banner.isVisible().catch(() => false)));
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  ok("consent choice persists across reload", !(await banner.isVisible().catch(() => false)));

  await page.goto(`${BASE}/sign-in?admin`, { waitUntil: "domcontentloaded" });
  const pw = page.locator('[data-testid="input-admin-password"]');
  await pw.waitFor({ timeout: 30000 });
  await pw.fill("__qa_test_plan_wrong_pw");
  await page.click('[data-testid="button-admin-password-submit"]');
  const err = page.locator('[data-testid="text-admin-password-error"]');
  await err.waitFor({ timeout: 15000 }).catch(() => {});
  ok("admin password form submit runs and shows an error for a wrong password", await err.isVisible(), (await err.innerText().catch(() => "")).slice(0, 100));
  ok("still on sign-in after wrong password", new URL(page.url()).pathname === "/sign-in", page.url());
  await page.screenshot({ path: `${OUT}/10-admin-password-error.png` });

  await page.goto(`${BASE}/search?q=hls`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-testid="text-result-count"]', { timeout: 30000 });
  const count = await page.locator('[data-testid="text-result-count"]').innerText();
  ok("search page renders results for q=hls", /result/.test(count) && /hls/.test(count), count);

  await page.goto(`${BASE}/journey/${JID}#step-2`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#step-2", { timeout: 30000 });
  await page.waitForTimeout(1500);
  const focused = await page.evaluate(() => document.activeElement?.id || "");
  const top = await page.evaluate(() => Math.round(document.getElementById("step-2").getBoundingClientRect().top));
  ok("journey #step-2 anchor scrolls into view and takes focus", focused === "step-2" && top < 400, `active=${focused} top=${top}`);
  await page.screenshot({ path: `${OUT}/11-journey-step-anchor.png` });
  await ctx.close();
}

// ---------- Admin context (audit key, same-origin only)
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, permissions: ["clipboard-read", "clipboard-write"] });
await ctx.addInitScript(() => { try { localStorage.setItem("analytics-consent", "denied"); } catch {} });
await ctx.route("**/*", (route) => {
  let same = false;
  try { same = new URL(route.request().url()).origin === BASE; } catch {}
  if (same) route.continue({ headers: { ...route.request().headers(), "x-admin-audit-key": KEY } });
  else route.continue();
});
const api = async (u) => (await ctx.request.get(BASE + u, { headers: { "x-admin-audit-key": KEY } })).json();
const isBookmarked = async () => (await api("/api/bookmarks")).some((b) => b.id === RID || b.resourceId === RID);
const page = await ctx.newPage(); watch(page, "admin");
const startBookmarked = await isBookmarked();
ok("fixture precondition: resource not bookmarked by admin", startBookmarked === false);

await page.goto(`${BASE}/resource/${RID}`, { waitUntil: "domcontentloaded" });
const bm = page.locator('[data-testid="button-bookmark"]').first();
await bm.waitFor({ timeout: 30000 });
await bm.click();
await page.click('[data-testid="button-save-without-notes"]', { timeout: 10000 });
await page.waitForTimeout(1500);
ok("bookmark click opens notes dialog and Save saves", await isBookmarked());
await bm.click();
await page.waitForTimeout(1500);
ok("second click removes", !(await isBookmarked()));
const undo = page.locator('li[data-state] button', { hasText: /undo/i }).first();
await undo.waitFor({ timeout: 8000 }).catch(() => {});
ok("removal toast offers Undo", await undo.isVisible().catch(() => false));
await page.screenshot({ path: `${OUT}/12-bookmark-undo-toast.png` });
await undo.click().catch(() => {});
await page.waitForTimeout(2000);
ok("Undo action (wrapped async handler) restores the bookmark", await isBookmarked());
await page.locator('[data-testid="button-bookmark"]').first().click();
await page.waitForTimeout(1500);
ok("cleanup: bookmark removed again (net zero)", !(await isBookmarked()));

await page.click('[data-testid="button-share"]');
await page.waitForTimeout(1200);
const clip = await page.evaluate(() => navigator.clipboard.readText().catch(() => ""));
const toastText = await page.locator("li[data-state]").allInnerTexts();
ok("share button (wrapped handler) copies the resource URL or shows feedback", clip.includes(`/resource/${RID}`) || toastText.some((t) => /cop|share|link/i.test(t)), `clip=${clip} toast=${JSON.stringify(toastText).slice(0, 120)}`);

await page.click('[data-testid="button-suggest-edit"]');
await page.waitForSelector('[data-testid="select-edit-category"]', { timeout: 15000 });
const subBefore = await page.locator('[data-testid="select-edit-subcategory"]').innerText().catch(() => "");
await page.click('[data-testid="select-edit-category"]');
const catOpts = await page.getByRole("option").allInnerTexts();
const other = catOpts.find((o) => !/Protocols & Transport/.test(o) && !/__qa_test_plan/.test(o));
await page.getByRole("option", { name: other, exact: true }).click();
await page.waitForTimeout(500);
await page.click('[data-testid="select-edit-subcategory"]');
const subOpts = await page.getByRole("option").allInnerTexts();
await page.keyboard.press("Escape");
const navTree = await api("/api/categories");
const catNode = (Array.isArray(navTree) ? navTree : navTree.categories || []).find((c) => c.name === other);
const expectSubs = (catNode?.subcategories || []).map((s) => s.name);
ok("suggest-edit: subcategory options follow the newly chosen category (watched value)", subOpts.length > 0 && (expectSubs.length === 0 || subOpts.every((o) => expectSubs.includes(o) || /none|select/i.test(o))), `category=${other} before=${subBefore} options=${JSON.stringify(subOpts).slice(0, 160)}`);
await page.screenshot({ path: `${OUT}/13-suggest-edit-cascade.png` });
await page.click('[data-testid="button-cancel-edit"]');
const editsAfter = await api("/api/admin/resource-edits").catch(() => null);

for (const [route, sel, label] of [
  ["/bookmarks", "main", "bookmarks page"],
  ["/settings", "main", "settings page"],
  ["/continue-learning", "main", "continue-learning page"],
  ["/profile", "main", "profile page"],
]) {
  await page.goto(BASE + route, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(sel, { timeout: 30000 });
  await page.waitForTimeout(2500);
  const txt = await page.locator("main").innerText();
  ok(`${label} renders`, txt.length > 50, txt.replace(/\s+/g, " ").slice(0, 80));
  if (route === "/continue-learning" || route === "/profile") ok(`${label} eyebrow comment text renders literally`, /\/\/ (Learning dashboard|Profile)/i.test(txt));
  await page.screenshot({ path: `${OUT}/14-${route.slice(1)}.png` });
}

for (const tab of ["researcher", "github", "edits"]) {
  await page.goto(`${BASE}/admin#${tab}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(4000);
  const txt = await page.locator("main").innerText();
  ok(`admin ${tab} tab renders`, txt.length > 100, txt.replace(/\s+/g, " ").slice(0, 80));
  await page.screenshot({ path: `${OUT}/15-admin-${tab}.png` });
}

await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2000);
await page.keyboard.press("Control+k");
const dlg = page.locator('[role="dialog"] input').first();
await dlg.waitFor({ timeout: 10000 }).catch(() => {});
await dlg.fill("ffmpeg").catch(() => {});
await page.waitForTimeout(2000);
const opts = await page.locator('[role="dialog"] [role="option"]').count();
ok("search dialog (Ctrl+K) returns results", opts > 0, `options=${opts}`);
await page.screenshot({ path: `${OUT}/16-search-dialog.png` });

ok("no page errors / unexpected console errors", errors.length === 0, JSON.stringify(errors).slice(0, 600));
fs.writeFileSync("/tmp/j05/user-browser.json", JSON.stringify({ results, errors }, null, 2));
await browser.close();
console.log(`${results.filter((r) => r.pass).length}/${results.length} passed`);

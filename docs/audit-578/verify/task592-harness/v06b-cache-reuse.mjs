// V06 supplement (free, cold-start user → rule-based, no model calls):
//  1. device-cache reuse across surfaces: /recommendations → /advanced (AI Recommendations tab) → /?context=account
//     must not send another POST /api/recommendations (each POST spends the shared 10/15-min AI rate limit).
//  2. Hide → toast Undo → reload within 5 min: the restored card must come back (the device cache is dropped
//     on restore, so the reload asks the server instead of reusing a list that lacks the card).
//  3. A second device (fresh context, 390px) on account Home asks the server once and renders the panel.
import { BASE, mintUser, ensureLocal, teardownAll, writeJson, sleep, q, PREFIX } from "./lib.mjs";
import { launch, newPage, signIn, shot, VPS } from "./browser-lib.mjs";

const out = { started: new Date().toISOString(), steps: [] };
const step = (name, data) => { out.steps.push({ name, ...data }); console.log(name, JSON.stringify(data).slice(0, 1500)); };
const cardIds = (page) => page.locator('[data-testid^="recommendation-explanation-"]').evaluateAll((els) => els.map((e) => Number(e.dataset.testid.split("-").pop())));
const posts = [];
const track = (pg, label) => pg.on("request", (r) => { if (r.method() === "POST" && /\/api\/recommendations\?limit=/.test(r.url())) posts.push({ label, url: r.url().replace(/^https?:\/\/[^/]+/, ""), at: new Date().toISOString() }); });
const waitCards = (pg) => pg.waitForFunction(() => document.querySelectorAll('[data-testid^="recommendation-explanation-"]').length > 0, null, { timeout: 45_000 });
process.on("unhandledRejection", (e) => console.error("unhandled (ignored)", String(e).slice(0, 200)));
const browser = await launch();
try {
  const C = await mintUser("v06reuse"); await ensureLocal(C);
  const { context, page } = await newPage(browser, VPS.desktop);
  track(page, "desktop");
  await signIn(page, C, "/recommendations");
  await page.goto(`${BASE}/recommendations`, { waitUntil: "domcontentloaded" }); await waitCards(page); await sleep(800);
  const ids0 = await cardIds(page);
  const n0 = posts.length;
  await page.goto(`${BASE}/advanced`, { waitUntil: "domcontentloaded" });
  await page.getByRole("tab", { name: /AI Recommendations/ }).click();
  await waitCards(page); await sleep(2500);
  const advIds = await cardIds(page);
  await shot(page, "V06-reuse-advanced-tab-desktop");
  await page.goto(`${BASE}/?context=account`, { waitUntil: "domcontentloaded" });
  await waitCards(page).catch(() => {}); await sleep(2500);
  const homeIds = await cardIds(page);
  await shot(page, "V06-reuse-home-account-desktop");
  step("reuse", { recommendationsCards: ids0.length, postsOnFirstMount: n0, advancedCards: advIds.length, homeCards: homeIds.length,
    postsAfterAdvancedAndHome: posts.length - n0, sameOrder: JSON.stringify(advIds) === JSON.stringify(ids0) });

  // Hide → Undo → reload: restored card must return.
  await page.goto(`${BASE}/recommendations`, { waitUntil: "domcontentloaded" }); await waitCards(page); await sleep(800);
  const before = await cardIds(page); const x = before[0];
  let r = page.waitForResponse((res) => res.url().includes(`/api/recommendations/${x}/feedback`) && res.request().method() === "PUT");
  await page.locator(`[data-testid="recommendation-feedback-hidden-${x}"]`).click(); await r; await sleep(700);
  const cacheAfterHide = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("ai_recommendations_cache:")).length);
  r = page.waitForResponse((res) => res.url().includes(`/api/recommendations/${x}/feedback`));
  await page.locator("li[data-state]").getByRole("button", { name: /Undo/ }).first().click(); await r; await sleep(700);
  const cacheAfterUndo = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("ai_recommendations_cache:")).length);
  const p1 = posts.length;
  await page.reload({ waitUntil: "domcontentloaded" }); await waitCards(page); await sleep(1500);
  const afterReload = await cardIds(page);
  await shot(page, "V06-reuse-undo-reload-desktop");
  step("undo-reload", { hidden: x, cacheEntriesAfterHide: cacheAfterHide, cacheEntriesAfterUndo: cacheAfterUndo, reloadPosted: posts.length - p1,
    restoredCardBackAfterReload: afterReload.includes(x), positionAfterReload: afterReload.indexOf(x), positionBefore: before.indexOf(x) });
  await context.close();

  // Second device at 390px, account Home.
  const { page: m } = await newPage(browser, VPS["390"]);
  track(m, "390");
  await signIn(m, C, "/?context=account");
  const p2 = posts.length;
  await m.goto(`${BASE}/?context=account`, { waitUntil: "domcontentloaded" }); await waitCards(m).catch(() => {}); await sleep(1500);
  const mIds = await cardIds(m);
  const overflow = await m.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  await m.locator('[data-testid^="recommendation-explanation-"]').first().scrollIntoViewIfNeeded().catch(() => {});
  await shot(m, "V06-reuse-home-account-390");
  step("second-device-390", { posts: posts.length - p2, cards: mIds.length, horizontalOverflow: overflow });
} catch (e) { out.error = String(e.stack ?? e); console.error(e); }
finally {
  await browser.close();
  await teardownAll();
  out.posts = posts;
  const like = PREFIX.replace(/_/g, "\\_") + "%";
  out.residue = (await q(`SELECT (SELECT count(*) FROM users WHERE id LIKE $1)::int users,
    (SELECT count(*) FROM user_recommendation_feedback WHERE user_id LIKE $1)::int feedback`, [like]))[0];
  console.log("residue", JSON.stringify(out.residue));
  writeJson("/tmp/v592out/v06b-cache-reuse.json", out); process.exit(0);
}

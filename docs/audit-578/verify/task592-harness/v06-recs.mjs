// V06 — recommendations across panels.
//  Part A (free): fresh cold-start user → rule-based. Feedback helpful / not-for-me / already-known / hide,
//    toast Undo after the hidden card unmounted, hide again + Restore, reload + second tab agree, offline
//    Refresh + Try again, 390 + keyboard. Guest CTAs.
//  Part B (paid, ≤2 calls): established user (saved prefs + bookmark). First mount on /recommendations
//    (cache miss → 1 Claude call), Refresh (forced → 1 Claude call). Account Home, Profile, /advanced mounts
//    must be served from the server cache (requestCount unchanged). Reload shows the persisted local cache.
//  Part C (free): AI outage — second instance whose AI endpoint is a closed port; same established user.
import { BASE, q, mintUser, ensureLocal, token, call, teardownAll, writeJson, sleep, PREFIX } from "./lib.mjs";
import { launch, newPage, signIn, shot, toasts, pageFetch, VPS } from "./browser-lib.mjs";

const OUTAGE = process.env.OUTAGE_BASE; // e.g. http://127.0.0.1:5162 (AI base URL → closed port)
const out = { started: new Date().toISOString(), steps: [], paidCalls: [] };
const step = (name, data) => { out.steps.push({ name, ...data }); console.log(name, JSON.stringify(data).slice(0, 1500)); };
const aiCount = async (base = BASE) => {
  const r = await fetch(`${base}/api/health/ai`, { headers: { "X-Admin-Audit-Key": process.env.ADMIN_PASSWORD, Origin: base } });
  return (await r.json()).requestCount;
};
const cardIds = (page) => page.locator('[data-testid^="recommendation-explanation-"]').evaluateAll((els) => els.map((e) => Number(e.dataset.testid.split("-").pop())));
const waitList = async (page) => { await page.locator('[data-testid="recommendations-list"], [data-testid="no-recommendations"], [data-testid="error-state"]').first().waitFor({ timeout: 60_000 }); await sleep(800); };
process.on("unhandledRejection", (e) => console.error("unhandled (ignored)", String(e).slice(0, 200)));
const openHidden = async (pg) => { const d = pg.locator("details:has(summary:has-text('Hidden recommendations'))"); if (await d.count() && !(await d.evaluate((el) => el.open))) { await d.locator("summary").click(); await sleep(300); } };
const recPosts = []; // every POST /api/recommendations the browser sends, per page
const trackPosts = (pg, label) => pg.on("request", (r) => { if (r.method() === "POST" && /\/api\/recommendations\?limit=/.test(r.url())) recPosts.push({ label, url: r.url().replace(/^https?:\/\/[^/]+/, ""), at: new Date().toISOString() }); });
const browser = await launch();
try {
  // ---------- Part A: cold-start user ----------
  const C = await mintUser("v06cold"); await ensureLocal(C);
  const a0 = await aiCount();
  const { context: ctxA, page } = await newPage(browser, VPS.desktop);
  trackPosts(page, "cold-desktop");
  await signIn(page, C, "/recommendations");
  await page.goto(`${BASE}/recommendations`, { waitUntil: "domcontentloaded" });
  await waitList(page);
  const ids0 = await cardIds(page);
  step("A-cold-mount", { cards: ids0.length, ids: ids0, aiCalls: (await aiCount()) - a0 });
  await shot(page, "V06-cold-recommendations-desktop");
  const fb = async (value, id) => {
    const resp = page.waitForResponse((r) => r.url().includes(`/api/recommendations/${id}/feedback`) && r.request().method() === "PUT");
    await page.locator(`[data-testid="recommendation-feedback-${value}-${id}"]`).click();
    const r = await resp; await sleep(700);
    return { status: r.status(), body: await r.json().catch(() => null) };
  };
  const [h, n, k, x] = ids0;
  const fHelpful = await fb("helpful", h);
  const fNot = await fb("not_for_me", n);
  const fKnown = await fb("already_known", k);
  const fHide = await fb("hidden", x);
  const afterHide = await cardIds(page);
  const toastText = await toasts(page);
  await shot(page, "V06-cold-hidden-toast-desktop");
  // Undo from the toast: the card was already unmounted.
  const undoResp = page.waitForResponse((r) => r.url().includes(`/api/recommendations/${x}/feedback`));
  await page.locator("li[data-state]").getByRole("button", { name: /Undo/ }).first().click();
  const ur = await undoResp; await sleep(900);
  const afterUndo = await cardIds(page);
  const fbState1 = (await pageFetch(page, "/api/recommendations/feedback")).json;
  step("A-feedback", { helpful: fHelpful.status, notForMe: fNot.status, alreadyKnown: fKnown.status, hide: fHide.status,
    hiddenCardGone: !afterHide.includes(x), toast: toastText, undo: [ur.request().method(), ur.status()], cardBackAfterUndo: afterUndo.includes(x),
    positionRestored: afterUndo.indexOf(x) === ids0.indexOf(x), serverState: fbState1 });
  // Hide again → Restore from the hidden list.
  await fb("hidden", x);
  await page.locator('li[data-state]').first().waitFor({ state: "detached", timeout: 15_000 }).catch(() => {});
  await openHidden(page);
  const restoreBtn = page.locator(`[data-testid="restore-hidden-${x}"]`);
  const hiddenListVisible = await restoreBtn.isVisible().catch(() => false);
  await shot(page, "V06-cold-hidden-list-desktop");
  const rr = page.waitForResponse((r) => r.url().includes(`/api/recommendations/${x}/feedback`));
  await restoreBtn.click(); const rres = await rr; await sleep(900);
  const afterRestore = await cardIds(page);
  // Hide a different card and leave it hidden for the reload / cross-tab checks.
  const y = afterRestore.find((id) => ![h, n, k, x].includes(id));
  await fb("hidden", y);
  const tab2 = await ctxA.newPage(); trackPosts(tab2, "cold-tab2");
  await tab2.goto(`${BASE}/recommendations`, { waitUntil: "domcontentloaded" }); await waitList(tab2);
  const tab2Ids = await cardIds(tab2);
  const tab2Restore = (await tab2.locator(`[data-testid="restore-hidden-${y}"]`).count()) > 0;
  const tab2Pressed = await tab2.locator(`[data-testid="recommendation-feedback-helpful-${h}"]`).getAttribute("aria-pressed").catch(() => null);
  await tab2.close();
  await page.reload({ waitUntil: "domcontentloaded" }); await waitList(page);
  const reloadIds = await cardIds(page);
  step("A-restore-reload-crosstab", { hiddenListVisible, restore: [rres.request().method(), rres.status()], cardBackAfterRestore: afterRestore.includes(x),
    secondHidden: y, tab2: { hasHiddenCard: tab2Ids.includes(y), restoreOffered: tab2Restore, helpfulPressed: tab2Pressed },
    reload: { hasHiddenCard: reloadIds.includes(y), restoreOffered: (await page.locator(`[data-testid="restore-hidden-${y}"]`).count()) > 0 },
    serverState: (await pageFetch(page, "/api/recommendations/feedback")).json, aiCalls: (await aiCount()) - a0 });
  // (1) Device offline → Refresh: observe what is rendered, then reconnect.
  const ERR = '[data-testid="stale-recommendations-state"], [data-testid="error-state"]';
  await ctxA.setOffline(true);
  await page.locator('[data-testid="button-generate-recommendations"]').click().catch(() => {});
  await sleep(5000);
  const offline = { button: await page.locator('[data-testid="button-generate-recommendations"]').innerText().catch(() => null),
    alert: await page.locator(ERR).first().innerText().catch(() => null), offlineNotice: await page.locator('[data-testid="offline-refresh-state"]').innerText().catch(() => null), cards: (await cardIds(page)).length };
  await shot(page, "V06-cold-offline-refresh-desktop");
  const resumed = page.waitForResponse((r) => /\/api\/recommendations\?limit=10/.test(r.url()), { timeout: 30_000 }).catch(() => null);
  await ctxA.setOffline(false);
  const rs = await resumed; await sleep(1500);
  step("A-offline", { offline: { ...offline, alert: offline.alert?.replace(/\s+/g, " ") }, afterReconnect: { request: rs ? rs.status() : "none",
    button: await page.locator('[data-testid="button-generate-recommendations"]').innerText().catch(() => null), alert: await page.locator(ERR).first().isVisible().catch(() => false), offlineNoticeGone: !(await page.locator('[data-testid="offline-refresh-state"]').isVisible().catch(() => false)), cards: (await cardIds(page)).length } });
  // (2) Network failure while the browser believes it is online (request aborted at the network layer).
  await page.route(/\/api\/recommendations\?limit=10/, (r) => r.abort("internetdisconnected"));
  await page.locator('[data-testid="button-generate-recommendations"]').click();
  await page.locator(ERR).first().waitFor({ timeout: 30_000 });
  const failState = (await page.locator(ERR).first().innerText()).replace(/\s+/g, " ");
  const failCards = (await cardIds(page)).length;
  await shot(page, "V06-cold-network-fail-desktop");
  await page.unroute(/\/api\/recommendations\?limit=10/);
  const retry = page.waitForResponse((r) => /\/api\/recommendations\?limit=10/.test(r.url()));
  await page.locator(ERR).first().getByRole("button", { name: "Try again" }).click();
  const retryResp = await retry; await sleep(1500);
  step("A-netfail-retry", { failState, cardsKeptDuringFailure: failCards, retry: retryResp.status(), errorGone: !(await page.locator(ERR).first().isVisible().catch(() => false)), cardsAfter: (await cardIds(page)).length });
  // (3) Feedback write fails at the network layer.
  const ids3 = await cardIds(page);
  const fbt = ids3.find((id) => ![h, n, k, x, y].includes(id));
  await page.route(new RegExp(`/api/recommendations/${fbt}/feedback`), (r) => r.abort("internetdisconnected"));
  await page.locator(`[data-testid="recommendation-feedback-helpful-${fbt}"]`).click(); await sleep(1500);
  const fbFailToast = await toasts(page);
  const fbFailPressed = await page.locator(`[data-testid="recommendation-feedback-helpful-${fbt}"]`).getAttribute("aria-pressed");
  await shot(page, "V06-cold-feedback-fail-desktop");
  await page.unroute(new RegExp(`/api/recommendations/${fbt}/feedback`));
  const fbServer = ((await pageFetch(page, "/api/recommendations/feedback")).json ?? []).find((s) => s.resourceId === fbt) ?? null;
  step("A-feedback-netfail", { resourceId: fbt, toast: fbFailToast, pressedAfterFailure: fbFailPressed, serverRow: fbServer });
  // 390 + keyboard: tab to a feedback button and press Enter.
  const { page: m } = await newPage(browser, VPS["390"]);
  trackPosts(m, "cold-390");
  await signIn(m, C, "/recommendations");
  await m.goto(`${BASE}/recommendations`, { waitUntil: "domcontentloaded" }); await waitList(m);
  await m.waitForFunction(() => document.querySelectorAll('[data-testid^="recommendation-explanation-"]').length > 0, null, { timeout: 30_000 }).catch(() => {});
  const mIds = await cardIds(m);
  console.log("mobile ids", JSON.stringify(mIds), "excluded", JSON.stringify([h, n, k, x, y, fbt]));
  const target = mIds.find((id) => ![h, n, k, x, y, fbt].includes(id));
  await m.locator(`[data-testid="recommendation-feedback-helpful-${target}"]`).focus();
  const kResp = m.waitForResponse((r) => r.url().includes(`/api/recommendations/${target}/feedback`));
  await m.keyboard.press("Enter"); const kr = await kResp; await sleep(600);
  const overflow = await m.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  await shot(m, "V06-cold-390");
  step("A-390-keyboard", { cards: mIds.length, keyboardEnter: kr.status(), pressed: await m.locator(`[data-testid="recommendation-feedback-helpful-${target}"]`).getAttribute("aria-pressed"), horizontalOverflow: overflow, aiCalls: (await aiCount()) - a0 });
  await m.close();
  await page.close();

  // Guest CTAs.
  const { page: g } = await newPage(browser, VPS.desktop);
  await g.goto(`${BASE}/recommendations`, { waitUntil: "domcontentloaded" }); await sleep(4000);
  const guestLinks = await g.locator('a[href*="sign-in"], a[href*="preferences"], a[href*="onboarding"], a[href*="settings"]').evaluateAll((els) => els.map((e) => [e.textContent.trim().slice(0, 40), e.getAttribute("href")]));
  await shot(g, "V06-guest-desktop");
  const signInLink = g.locator('a[href*="sign-in"]').first();
  await signInLink.click(); await sleep(2500);
  step("A-guest", { links: guestLinks, afterClick: g.url() });
  await g.close();

  // ---------- Part B: established user, paid ----------
  const E = await mintUser("v06est"); await ensureLocal(E);
  await q(`INSERT INTO user_preferences (user_id, preferred_categories, learning_goals, preferred_resource_types, skill_level, time_commitment, onboarding_status, onboarding_step, onboarding_completed_at)
    VALUES ($1, '["Encoding & Codecs"]'::jsonb, '["optimize-encoding"]'::jsonb, '["article"]'::jsonb, 'intermediate', 'weekly', 'completed', 5, now())`, [E.bridgeId]);
  const [bm] = await q(`SELECT id, title FROM resources WHERE status='approved' AND category='Encoding & Codecs' ORDER BY id LIMIT 1`);
  await q(`INSERT INTO user_bookmarks (user_id, resource_id) VALUES ($1,$2)`, [E.bridgeId, bm.id]);
  const b0 = await aiCount();
  const { page: p } = await newPage(browser, VPS.desktop);
  trackPosts(p, "established");
  await signIn(p, E, "/recommendations");
  const t0 = Date.now();
  const firstResp = p.waitForResponse((r) => /\/api\/recommendations\?limit=10/.test(r.url()) && r.request().method() === "POST", { timeout: 90_000 });
  await p.goto(`${BASE}/recommendations`, { waitUntil: "domcontentloaded" });
  const fr = await firstResp; const frBody = await fr.json().catch(() => null);
  await waitList(p);
  const b1 = await aiCount();
  out.paidCalls.push({ at: new Date().toISOString(), endpoint: "POST /api/recommendations?limit=10", purpose: "V06 first mount, established user", delta: b1 - b0 });
  const estIds = await cardIds(p);
  const explanations = (frBody ?? []).slice(0, 4).map((r) => ({ id: r.resource?.id, title: r.resource?.title, reason: (r.reason ?? r.explanation ?? "").slice(0, 140), confidence: r.confidence, type: r.type ?? r.source }));
  await shot(p, "V06-est-first-mount-desktop");
  step("B-first-mount", { status: fr.status(), ms: Date.now() - t0, aiDelta: b1 - b0, cards: estIds.length, bookmarkedExcluded: !estIds.includes(bm.id), explanations });
  // Refresh (forced).
  const refreshResp = p.waitForResponse((r) => r.url().includes("refresh=true"), { timeout: 90_000 });
  await p.locator('[data-testid="button-generate-recommendations"]').click();
  await sleep(300);
  const busyLabel = await p.locator('[data-testid="button-generate-recommendations"]').innerText().catch(() => null);
  const busyAria = await p.locator('[data-testid="loading-state"], [aria-busy="true"]').count();
  const rf = await refreshResp; const rfBody = await rf.json().catch(() => null); await sleep(1200);
  const b2 = await aiCount();
  out.paidCalls.push({ at: new Date().toISOString(), endpoint: "POST /api/recommendations?limit=10&refresh=true", purpose: "V06 Refresh button, established user", delta: b2 - b1 });
  const refreshedIds = await cardIds(p);
  const cache = await p.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("ai_recommendations_cache:")).map((k) => ({ k: k.slice(0, 60), ts: JSON.parse(localStorage.getItem(k)).timestamp })));
  await shot(p, "V06-est-after-refresh-desktop");
  step("B-refresh", { status: rf.status(), aiDelta: b2 - b1, busyLabel, busyAria, before: estIds, after: refreshedIds, changed: JSON.stringify(estIds) !== JSON.stringify(refreshedIds),
    reasons: (rfBody ?? []).slice(0, 3).map((r) => (r.reason ?? r.explanation ?? "").slice(0, 120)), localCache: cache });
  // Other panels must hit the server cache.
  const panels = {};
  for (const path of ["/?context=account", "/profile", "/advanced"]) {
    const resp = p.waitForResponse((r) => /\/api\/recommendations\?limit=10/.test(r.url()), { timeout: 10_000 }).catch(() => null);
    await p.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
    const r = await resp; await sleep(2500);
    panels[path] = { request: r ? [r.request().method(), r.status()] : "none (device cache reused)", cards: (await cardIds(p)).length, aiDelta: (await aiCount()) - b2 };
    await shot(p, `V06-est-panel-${path.replace(/[^a-z]/g, "") || "home"}`);
  }
  await p.goto(`${BASE}/recommendations`, { waitUntil: "domcontentloaded" }); await waitList(p);
  const lastUpdatedShown = await p.locator("main").innerText().then((t) => (t.match(/Last updated[^.]*\./) ?? [null])[0]);
  step("B-panels-cache", { panels, reloadCards: (await cardIds(p)).length, lastUpdatedShown, aiTotalDelta: (await aiCount()) - b0 });
  await p.close();

  // ---------- Part C: AI outage instance ----------
  if (OUTAGE) {
    const o0 = await aiCount(OUTAGE);
    const r = await fetch(`${OUTAGE}/api/recommendations?limit=10`, { method: "POST", headers: { Authorization: `Bearer ${await token(E)}`, "Content-Type": "application/json", Origin: OUTAGE }, body: "{}" });
    const body = await r.json().catch(() => null);
    step("C-outage-api", { status: r.status, count: Array.isArray(body) ? body.length : body, firstReason: Array.isArray(body) ? (body[0]?.reason ?? "").slice(0, 140) : null, outageInstanceAiCount: [o0, await aiCount(OUTAGE)] });
  }
} catch (e) { out.error = String(e.stack ?? e); console.error(e); }
finally {
  await browser.close();
  await teardownAll();
  const like = PREFIX.replace(/_/g, "\\_") + "%";
  out.recommendationPosts = recPosts;
  out.residue = (await q(`SELECT (SELECT count(*) FROM users WHERE id LIKE $1)::int users,
    (SELECT count(*) FROM user_recommendation_feedback WHERE user_id LIKE $1)::int feedback,
    (SELECT count(*) FROM user_preferences WHERE user_id LIKE $1)::int prefs,
    (SELECT count(*) FROM user_bookmarks WHERE user_id LIKE $1)::int bookmarks,
    (SELECT count(*) FROM user_interactions WHERE user_id LIKE $1)::int interactions`, [like]))[0];
  console.log("residue", JSON.stringify(out.residue));
  writeJson("/tmp/v592out/v06-recs.json", out); process.exit(0);
}

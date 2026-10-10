// V08 — About/Privacy deletion links → Profile security tab; deletion request cancel/confirm/
// idempotent/withdraw with focus; logout-all across two real sessions; ordinary sign-out keeps the
// other session, clears private device state, protected-route return destination, user switch.
import { BASE, q, mintUser, newSession, call, token, ensureLocal, teardownAll, residue, writeJson, sleep, clerk } from "./lib.mjs";
import { launch, newPage, signIn, shot, toasts, VPS, pageFetch } from "./browser-lib.mjs";

const vpName = process.argv[2] ?? "desktop";
const out = { started: new Date().toISOString(), vp: vpName, steps: [] };
const step = (name, data) => { out.steps.push({ name, ...data }); console.log(name, JSON.stringify(data).slice(0, 1000)); };
const focused = (page) => page.evaluate(() => document.activeElement?.getAttribute("data-testid") || document.activeElement?.tagName);
const authed = async (page) => (await pageFetch(page, "/api/auth/user")).json?.isAuthenticated;
const browser = await launch();
try {
  const A = await mintUser("v08a"); const B = await mintUser("v08b");
  const la = await ensureLocal(A); await ensureLocal(B);
  const approvedBefore = (await q(`SELECT count(*)::int n FROM resources WHERE status='approved'`))[0].n;
  const c1 = await newPage(browser, VPS[vpName]); const p1 = c1.page;
  await signIn(p1, A, "/about");
  // About + Privacy links.
  const links = {};
  for (const [path, tid] of [["/about", "link-about-deletion"], ["/privacy", "link-privacy-deletion"]]) {
    await p1.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
    await p1.locator(`[data-testid="${tid}"]`).click();
    await p1.locator('[data-testid="card-account-deletion"]').waitFor({ timeout: 20_000 });
    links[path] = { url: p1.url(), securityPanelState: await p1.locator('[data-testid="tab-security"]').getAttribute("data-state"), securityTrigger: await p1.getByRole("tab", { name: /security/i }).getAttribute("aria-selected").catch(() => null) };
  }
  step("links", links);
  const dbMark = async () => (await q(`SELECT deletion_requested_at FROM users WHERE id=$1`, [A.bridgeId]))[0].deletion_requested_at;
  // Cancel.
  await p1.locator('[data-testid="button-request-deletion"]').click();
  await p1.locator('[data-testid="dialog-deletion-confirm"]').waitFor();
  await shot(p1, `V08-deletion-dialog-${vpName}`);
  await p1.locator('[data-testid="button-deletion-cancel"]').click();
  await sleep(600);
  step("cancel", { db: await dbMark(), focus: await focused(p1) });
  // Keyboard: Escape also cancels.
  await p1.locator('[data-testid="button-request-deletion"]').focus(); await p1.keyboard.press("Enter");
  await p1.locator('[data-testid="dialog-deletion-confirm"]').waitFor(); await p1.keyboard.press("Escape"); await sleep(600);
  step("escape", { db: await dbMark(), focus: await focused(p1) });
  // Confirm.
  await p1.locator('[data-testid="button-request-deletion"]').click();
  await p1.locator('[data-testid="button-deletion-confirm"]').click();
  await p1.locator('[data-testid="text-deletion-pending"]').waitFor({ timeout: 15_000 });
  const t1 = await dbMark(); const toast1 = await toasts(p1);
  await p1.reload({ waitUntil: "domcontentloaded" });
  await p1.locator('[data-testid="text-deletion-pending"]').waitFor({ timeout: 20_000 });
  const pendingText = await p1.locator('[data-testid="text-deletion-pending"]').innerText();
  await shot(p1, `V08-deletion-pending-${vpName}`);
  const again = await pageFetch(p1, "/api/user/deletion-request", { method: "POST" });
  step("confirm", { db: t1, toast: toast1, pendingText, withdrawVisible: await p1.locator('[data-testid="button-withdraw-deletion"]').count(), repeatPost: { status: again.status, already: again.json?.alreadyRequested, sameTs: new Date(again.json?.deletionRequestedAt).getTime() === new Date(t1).getTime() }, approvedDelta: (await q(`SELECT count(*)::int n FROM resources WHERE status='approved'`))[0].n - approvedBefore });
  await p1.locator('[data-testid="button-withdraw-deletion"]').click();
  await p1.locator('[data-testid="button-request-deletion"]').waitFor({ timeout: 15_000 });
  await sleep(500);
  step("withdraw", { db: await dbMark(), focus: await focused(p1), toast: await toasts(p1) });

  // Logout-all across two real sessions.
  const c2 = await newPage(browser, VPS[vpName]); const p2 = c2.page;
  await signIn(p2, A, "/bookmarks");
  const s2Before = await authed(p2);
  await p1.locator('[data-testid="button-logout-all"]').click();
  await p1.locator('[data-testid="dialog-logout-all-confirm"]').waitFor();
  await p1.locator('[data-testid="button-logout-all-cancel"]').click(); await sleep(800);
  const afterCancel = { p1: await authed(p1), p2: await authed(p2), focus: await focused(p1) };
  await p1.locator('[data-testid="button-logout-all"]').click();
  await p1.locator('[data-testid="button-logout-all-confirm"]').click();
  await p1.waitForURL((u) => new URL(u).pathname === "/", { timeout: 20_000 }); await sleep(2500);
  const p1After = await authed(p1);
  await p2.reload({ waitUntil: "domcontentloaded" }); await sleep(4000);
  const p2After = await authed(p2);
  const sessions = (await clerk("GET", `/sessions?user_id=${A.clerkUserId}&limit=20`)).map((s) => s.status);
  step("logout-all", { s2Before, afterCancel, p1After, p2After, clerkSessionStatuses: sessions });
  await c2.context.close();

  // Ordinary sign-out: two fresh sessions; only the current one ends.
  await call("POST", `/api/bookmarks/${(await q(`SELECT id FROM resources WHERE status='approved' ORDER BY id LIMIT 1`))[0].id}`, { jwt: await token(A, await newSession(A)), body: {} });
  const c3 = await newPage(browser, VPS[vpName]); const p3 = c3.page;
  const c4 = await newPage(browser, VPS[vpName]); const p4 = c4.page;
  await signIn(p3, A, "/submit"); await signIn(p4, A, "/bookmarks");
  await p3.evaluate(() => localStorage.setItem("submit-resource-draft", JSON.stringify({ title: "__qa_test_plan_592_v08 draft" })));
  await p3.goto(`${BASE}/profile`, { waitUntil: "domcontentloaded" });
  await p3.locator('[data-testid="card-account-deletion"], main h1').first().waitFor({ timeout: 20_000 });
  await p3.getByRole("button", { name: /^Sign out$/ }).click();
  for (let i = 0; i < 40 && new URL(p3.url()).pathname !== "/"; i++) await sleep(500);
  out.signOutDebug = { url: p3.url(), toast: await toasts(p3), banner: await p3.locator('[data-testid="banner-logout-error"]').innerText().catch(() => null) };
  console.log("signOutDebug", JSON.stringify(out.signOutDebug)); await sleep(2500);
  const p3State = { authed: await authed(p3), draft: await p3.evaluate(() => localStorage.getItem("submit-resource-draft")) };
  await p4.reload({ waitUntil: "domcontentloaded" }); await sleep(3500);
  const p4Authed = await authed(p4);
  await p3.goto(`${BASE}/bookmarks`, { waitUntil: "domcontentloaded" }); await sleep(3500);
  const protectedUrl = p3.url();
  const protectedText = (await p3.locator("main").innerText().catch(() => "")).replace(/\s+/g, " ").slice(0, 200);
  const signinHref = await p3.locator('a[href*="/sign-in"]').first().getAttribute("href").catch(() => null);
  await p3.goto(`${BASE}/profile`, { waitUntil: "domcontentloaded" }); await sleep(3500);
  const profileSignedOutUrl = p3.url();
  const cta = p3.locator('main a:has-text("Sign in"), main button:has-text("Sign in")').first();
  let ctaUrl = null; if (await cta.count()) { await cta.click(); await sleep(3000); ctaUrl = p3.url(); }
  await shot(p3, `V08-protected-signedout-${vpName}`);
  out.protectedRoute = { profileSignedOutUrl, ctaUrl }; console.log("protected", JSON.stringify(out.protectedRoute));
  step("sign-out", { p3State, p4Authed, protectedUrl, protectedText, signinHref });
  // Switch to user B in the same device.
  await signIn(p3, B, null);
  await p3.goto(`${BASE}/bookmarks`, { waitUntil: "domcontentloaded" }); await sleep(4000);
  const me = (await pageFetch(p3, "/api/auth/user")).json?.user;
  const bm = (await pageFetch(p3, "/api/bookmarks")).json;
  const html = await p3.content();
  step("switch-user", { me: me?.id, isB: me?.id === B.bridgeId, bookmarksForB: Array.isArray(bm) ? bm.length : bm?.bookmarks?.length ?? bm, mentionsA: html.includes(A.bridgeId) || html.includes("v08a"), draft: await p3.evaluate(() => localStorage.getItem("submit-resource-draft")), recCacheA: await p3.evaluate((id) => localStorage.getItem(`ai_recommendations_cache:${id}`), A.bridgeId) });
  await shot(p3, `V08-userB-bookmarks-${vpName}`);
  out.pageErrors = [p1.__errors, p3.__errors];
} catch (e) { out.error = String(e.stack ?? e); console.error(e); }
finally {
  await browser.close();
  await teardownAll();
  out.residue = await residue(); console.log("residue", JSON.stringify(out.residue));
  writeJson(`/tmp/v592out/V08-${vpName}.json`, out); process.exit(0);
}

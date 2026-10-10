// V02 — guest bookmark merge on real sign-in: dedupe vs existing annotated save,
// offline detail request stays local and retries next load, identity switch mid-merge.
import { BASE, q, mintUser, call, token, ensureLocal, teardownAll, residue, writeJson, sleep, PREFIX } from "./lib.mjs";
import { launch, newPage, signIn, shot, toasts, VPS } from "./browser-lib.mjs";

const vpName = process.argv[2] ?? "desktop";
const vp = VPS[vpName];
const out = { started: new Date().toISOString(), vp: vpName, steps: [] };
const step = (name, data) => { out.steps.push({ name, ...data }); console.log(name, JSON.stringify(data)); };
const R = (await q(`SELECT id FROM resources WHERE status='approved' ORDER BY id LIMIT 7`)).map((r) => r.id);
const guestLS = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("guest-bookmarks-v1") ?? "[]").map((e) => e.id));
const bookmarks = (u) => q(`SELECT resource_id, notes, queue_status, personal_tags FROM user_bookmarks WHERE user_id=$1 ORDER BY resource_id`, [u.bridgeId]);
async function guestSave(page, id) {
  await page.goto(`${BASE}/resource/${id}`, { waitUntil: "domcontentloaded" });
  const btn = page.locator('[data-testid="button-bookmark"]').first();
  await btn.waitFor({ timeout: 45_000 });
  await btn.click();
  await page.waitForFunction((rid) => JSON.parse(localStorage.getItem("guest-bookmarks-v1") ?? "[]").some((e) => e.id === rid), id, { timeout: 10_000 });
}
const tap = (page) => {
  const log = [];
  page.on("request", (r) => { const u = new URL(r.url()); if (/^\/api\/(bookmarks|resources\/\d+$)/.test(u.pathname)) log.push(`${r.method()} ${u.pathname}`); });
  return log;
};

const browser = await launch();
try {
  const A = await mintUser("v02a");
  const B = await mintUser("v02b");
  await ensureLocal(A); await ensureLocal(B);
  const jA = await token(A);
  // A already owns R[0] with notes, queue state, personal tag and a collection membership.
  const s1 = await call("POST", `/api/bookmarks/${R[0]}`, { jwt: jA, body: { notes: `${PREFIX}private note` } });
  const s2 = await call("PATCH", `/api/bookmarks/${R[0]}/state`, { jwt: jA, body: { queueStatus: "in-progress", personalTags: ["qa592tag"] } });
  const col = await call("POST", "/api/collections", { jwt: jA, body: { name: `${PREFIX}v02` } });
  const mem = await call("POST", `/api/collections/${col.json.id}/items/${R[0]}`, { jwt: jA });
  step("A-fixture", { bookmark: s1.status, state: s2.status, collection: col.status, membership: mem.status, before: await bookmarks(A) });

  // ── Phase 1: guest saves R0 (dup) + R1 (new), then signs in as A.
  const g1 = await newPage(browser, vp);
  const log1 = tap(g1.page);
  await guestSave(g1.page, R[0]);
  await guestSave(g1.page, R[1]);
  await shot(g1.page, `V02-guest-saved-${vpName}`);
  step("guest-saved", { localIds: await guestLS(g1.page) });
  log1.length = 0;
  await signIn(g1.page, A, `/resource/${R[1]}`);
  await g1.page.getByText("Your saves are in your library").first().waitFor({ timeout: 30_000 });
  const t1 = await toasts(g1.page);
  await shot(g1.page, `V02-merge-toast-${vpName}`);
  await sleep(500);
  step("merge", { requests: log1.filter((l) => !l.startsWith("GET /api/bookmarks")), toast: t1, localIdsAfter: await guestLS(g1.page), after: await bookmarks(A), collectionItems: await q(`SELECT resource_id FROM bookmark_collection_items WHERE collection_id=$1`, [col.json.id]) });

  // ── Phase 2: one public-detail request fails at the network layer; it stays local, then retries on the next app load.
  const g2 = await newPage(browser, vp);
  await guestSave(g2.page, R[2]);
  await guestSave(g2.page, R[3]);
  await g2.page.route(`**/api/resources/${R[3]}`, (route) => route.abort("internetdisconnected"));
  const log2 = tap(g2.page);
  await signIn(g2.page, A, "/about");
  await g2.page.getByText("Your saves are in your library").first().waitFor({ timeout: 30_000 });
  const t2 = await toasts(g2.page);
  await shot(g2.page, `V02-partial-failure-toast-${vpName}`);
  step("offline-detail", { requests: log2.filter((l) => !l.startsWith("GET /api/bookmarks")), toast: t2, localIdsAfter: await guestLS(g2.page), accountIds: (await bookmarks(A)).map((b) => b.resource_id) });
  await g2.page.unroute(`**/api/resources/${R[3]}`);
  log2.length = 0;
  await g2.page.reload({ waitUntil: "domcontentloaded" });
  await g2.page.getByText("Your saves are in your library").first().waitFor({ timeout: 40_000 });
  step("next-load-retry", { requests: log2.filter((l) => !l.startsWith("GET /api/bookmarks")), toast: await toasts(g2.page), localIdsAfter: await guestLS(g2.page), accountIds: (await bookmarks(A)).map((b) => b.resource_id) });

  // ── Phase 3: identity switch during a delayed merge (detail requests slowed by 4 s at the network layer).
  const g3 = await newPage(browser, vp);
  await guestSave(g3.page, R[4]);
  await guestSave(g3.page, R[5]);
  await guestSave(g3.page, R[6]);
  const log3 = [];
  g3.page.on("request", (r) => { const u = new URL(r.url()); if (/^\/api\/(bookmarks\/\d+|resources\/\d+$)/.test(u.pathname)) log3.push({ t: Date.now(), req: `${r.method()} ${u.pathname}`, auth: r.headers()["authorization"] ? "bearer" : "cookie" }); });
  await g3.page.route(/\/api\/resources\/\d+$/, async (route) => { await sleep(4000); await route.continue(); });
  await signIn(g3.page, A, "/about");
  const switchAt = Date.now();
  await sleep(1500); // merge loop is now waiting on the first slowed detail request
  await g3.page.evaluate(() => window.Clerk.signOut());
  await g3.page.waitForFunction(() => !window.Clerk?.user, null, { timeout: 20_000 });
  const inSpa = process.argv[3] === "spa";
  await signIn(g3.page, B, inSpa ? null : "/about");
  out.switchMode = inSpa ? "in-SPA (no reload; Clerk.signOut + ticket sign-in)" : "navigation (full app load, as the app's own Sign out does)";
  await g3.page.getByText("Your saves are in your library").first().waitFor({ timeout: 40_000 }).catch(() => {});
  const switchToast = await toasts(g3.page);
  await shot(g3.page, `V02-identity-switch-toast-${vpName}`);
  await sleep(2000);
  out.switchToast = switchToast;
  const aIds = (await bookmarks(A)).map((b) => b.resource_id);
  const bIds = (await bookmarks(B)).map((b) => b.resource_id);
  step("identity-switch", { switchAt, requests: log3.map((l) => ({ ...l, dt: l.t - switchAt })), toast: switchToast, localIdsAfter: await guestLS(g3.page), aHas: R.slice(4).filter((id) => aIds.includes(id)), bHas: R.slice(4).filter((id) => bIds.includes(id)) });
  await shot(g3.page, `V02-identity-switch-${vpName}`);
  out.pageErrors = [...g1.page.__errors, ...g2.page.__errors, ...g3.page.__errors];
  await call("DELETE", `/api/collections/${col.json.id}`, { jwt: await token(A) });
} catch (e) {
  out.error = String(e.stack ?? e); console.error(e);
} finally {
  await browser.close();
  await teardownAll();
  out.residue = await residue();
  console.log("residue", JSON.stringify(out.residue));
  writeJson(`/tmp/v592out/V02-${vpName}.json`, out);
  process.exit(0);
}

// V01 — signed-in theme persistence: rapid save, reload, fresh context hydration,
// offline failure + Retry, cross-tab revision conflict, second user wins.
import { BASE, q, mintUser, call, token, ensureLocal, teardownAll, residue, writeJson, sleep } from "./lib.mjs";
import { launch, newPage, signIn, shot, toasts, pageFetch, VPS } from "./browser-lib.mjs";

const out = { started: new Date().toISOString(), steps: [] };
const step = (name, data) => { out.steps.push({ name, ...data }); console.log(name, JSON.stringify(data)); };
const attrs = (page) => page.evaluate(() => ({ system: document.documentElement.dataset.system, accent: document.documentElement.dataset.accent, lsSystem: localStorage.getItem("ds-system"), lsAccent: localStorage.getItem("ds-accent") }));
const status = (page) => page.locator('[aria-live="polite"]').first().innerText().catch(() => "");
const waitSaved = (page) => page.getByText("Theme saved to your account.").waitFor({ timeout: 20_000 });

const browser = await launch();
try {
  const A = await mintUser("v01a");
  const B = await mintUser("v01b");
  await ensureLocal(A); await ensureLocal(B);
  const vpName = process.argv[2] ?? "desktop";
  const vp = VPS[vpName];

  // Tab 1: sign in, open /settings/theme
  const t1 = await newPage(browser, vp);
  await signIn(t1.page, A, "/settings/theme");
  await t1.page.goto(`${BASE}/settings/theme`, { waitUntil: "domcontentloaded" });
  await t1.page.locator('[data-testid="system-option-terminal"]').waitFor({ timeout: 45_000 });
  step("initial", { attrs: await attrs(t1.page), prefs: (await pageFetch(t1.page, "/api/user/preferences")).json?.theme ?? null });

  // Rapid Terminal → Matrix → Swiss → Violet with no waits in between.
  const puts = [];
  t1.page.on("request", (r) => { if (r.url().includes("/api/user/preferences") && r.method() === "PUT") puts.push(r.postDataJSON()); });
  for (const id of ["system-option-terminal", "accent-option-matrix", "system-option-swiss", "accent-option-violet"]) {
    await t1.page.locator(`[data-testid="${id}"]`).click();
  }
  await waitSaved(t1.page);
  await sleep(800);
  const afterRapid = await pageFetch(t1.page, "/api/user/preferences");
  step("rapid-save", { putBodies: puts.map((p) => ({ s: p.themeSystem, a: p.themeAccent, rev: p.expectedRevision })), serverTheme: afterRapid.json?.theme, revision: afterRapid.json?.revision, attrs: await attrs(t1.page), status: await status(t1.page) });
  await shot(t1.page, `V01-rapid-saved-${vpName}`);

  // Reload
  await t1.page.reload({ waitUntil: "domcontentloaded" });
  await t1.page.locator('[data-testid="system-option-swiss"]').waitFor({ timeout: 45_000 });
  await sleep(1500);
  step("reload", { attrs: await attrs(t1.page), swissChecked: await t1.page.locator('[data-testid="system-option-swiss"]').getAttribute("aria-checked"), violetChecked: await t1.page.locator('[data-testid="accent-option-violet"]').getAttribute("aria-checked") });

  // Fresh context, no theme localStorage: sign in and hydrate from the account.
  const t2 = await newPage(browser, vp);
  await t2.page.goto(`${BASE}/about`, { waitUntil: "domcontentloaded" });
  const preSignIn = await attrs(t2.page);
  await signIn(t2.page, A, "/about");
  await t2.page.waitForFunction(() => document.documentElement.dataset.system === "swiss", null, { timeout: 30_000 }).catch(() => {});
  step("fresh-context-hydration", { beforeSignIn: preSignIn, afterSignIn: await attrs(t2.page) });
  await t2.page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await sleep(2500);
  step("fresh-context-new-page", { attrs: await attrs(t2.page) });
  await shot(t2.page, `V01-fresh-context-${vpName}`);

  // Real offline failure + Retry on tab 1.
  await t1.context.setOffline(true);
  await t1.page.locator('[data-testid="system-option-brutalist"]').click();
  await sleep(4000);
  const offlineServer = (await call("GET", "/api/user/preferences", { jwt: await token(A) })).json?.theme;
  step("offline-pending", { attrs: await attrs(t1.page), status: await status(t1.page), toast: await toasts(t1.page), serverTheme: offlineServer });
  await shot(t1.page, `V01-offline-pending-${vpName}`);
  await t1.context.setOffline(false);
  await waitSaved(t1.page);
  await sleep(800);
  step("online-recovered", { serverTheme: (await call("GET", "/api/user/preferences", { jwt: await token(A) })).json?.theme, status: await status(t1.page), toastAfter: await toasts(t1.page) });
  await shot(t1.page, `V01-online-recovered-${vpName}`);

  // Cross-tab revision conflict: tab2 is stale (loaded before tab1's brutalist save).
  await t2.page.goto(`${BASE}/settings/theme`, { waitUntil: "domcontentloaded" });
  await t2.page.locator('[data-testid="system-option-geist"]').waitFor({ timeout: 45_000 });
  await sleep(1500);
  // tab1 writes a newer value, tab2 has not refetched.
  await t1.page.locator('[data-testid="system-option-terminal"]').click();
  await waitSaved(t1.page);
  const putStatus = [];
  t2.page.on("response", (r) => { if (r.url().includes("/api/user/preferences") && r.request().method() === "PUT") putStatus.push(r.status()); });
  await t2.page.locator('[data-testid="system-option-geist"]').click();
  await t2.page.waitForTimeout(3000);
  const conflictMsg = await status(t2.page);
  const serverAfterConflict = (await call("GET", "/api/user/preferences", { jwt: await token(A) })).json?.theme;
  step("conflict", { tab2PutStatuses: [...putStatus], tab2Status: conflictMsg, serverTheme: serverAfterConflict });
  await shot(t2.page, `V01-conflict-${vpName}`);
  if (putStatus.includes(409)) {
    await t2.page.getByRole("button", { name: /Retry/ }).first().click();
    await t2.page.getByText("Theme saved to your account.").waitFor({ timeout: 20_000 });
    step("conflict-retry", { tab2PutStatuses: [...putStatus], serverTheme: (await call("GET", "/api/user/preferences", { jwt: await token(A) })).json?.theme });
  }

  // Second user's preferences win: give B a distinct account pair, then switch tab1 from A to B.
  const bPut = await call("PUT", "/api/user/preferences", { jwt: await token(B), body: { themeSystem: "editorial", themeAccent: "emerald", expectedRevision: null } });
  step("B-seed", { status: bPut.status, theme: bPut.json?.theme });
  await t1.page.evaluate(() => window.Clerk.signOut());
  await t1.page.waitForFunction(() => !window.Clerk?.user, null, { timeout: 20_000 });
  await signIn(t1.page, B, "/settings/theme");
  await t1.page.goto(`${BASE}/settings/theme`, { waitUntil: "domcontentloaded" });
  await t1.page.waitForFunction(() => document.documentElement.dataset.system === "editorial", null, { timeout: 30_000 }).catch(() => {});
  await sleep(1500);
  step("second-user-wins", { attrs: await attrs(t1.page), serverB: (await call("GET", "/api/user/preferences", { jwt: await token(B) })).json?.theme, serverA: (await call("GET", "/api/user/preferences", { jwt: await token(A) })).json?.theme });
  await shot(t1.page, `V01-second-user-${vpName}`);
  out.pageErrors = [...t1.page.__errors, ...t2.page.__errors];
} catch (e) {
  out.error = String(e.stack ?? e);
  console.error(e);
} finally {
  await browser.close();
  await teardownAll();
  out.residue = await residue();
  console.log("residue", JSON.stringify(out.residue));
  writeJson(`/tmp/v592out/V01-${process.argv[2] ?? "desktop"}.json`, out);
  process.exit(0);
}

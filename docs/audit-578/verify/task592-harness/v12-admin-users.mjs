// V12 — /admin/users role change (cancel + confirm + restore) with focus/audit, delete flow with
// owned child rows + tombstone/no-JIT-reprovision, and two-user isolation A↔B incl. non-admin 403.
import { BASE, q, mintUser, newSession, call, token, ensureLocal, teardownAll, residue, writeJson, sleep, clerk, PREFIX } from "./lib.mjs";
import { launch, newPage, signIn, shot, toasts, VPS } from "./browser-lib.mjs";

const vpName = process.argv[2] ?? "desktop";
const doIsolation = process.argv.includes("--isolation");
const out = { started: new Date().toISOString(), vp: vpName, steps: [] };
const step = (name, data) => { out.steps.push({ name, ...data }); console.log(name, JSON.stringify(data).slice(0, 1200)); };
const focused = (page) => page.evaluate(() => document.activeElement?.getAttribute("data-testid") || document.activeElement?.getAttribute("aria-label") || document.activeElement?.tagName);
const browser = await launch();
const createdResourceIds = [];
let adminId = null;
try {
  const ADM = await mintUser("v12adm");
  adminId = (await ensureLocal(ADM)).id;
  await q(`UPDATE users SET role='admin' WHERE id=$1`, [ADM.bridgeId]);
  const T1 = await mintUser("v12role"); await ensureLocal(T1);
  const T2 = await mintUser("v12del"); await ensureLocal(T2);
  const jT2 = await token(T2);
  // Owned child rows for T2.
  const res = await q(`SELECT id FROM resources WHERE status='approved' ORDER BY id LIMIT 2`);
  const cat = (await q(`SELECT name FROM categories ORDER BY id LIMIT 1`))[0].name;
  const bm = await call("POST", `/api/bookmarks/${res[0].id}`, { jwt: jT2, body: { notes: "v12" } });
  const fav = await call("POST", `/api/favorites/${res[1].id}`, { jwt: jT2 });
  const key = await call("POST", "/api/user/api-keys", { jwt: jT2, body: { name: `${PREFIX}v12key` } });
  const sub = await call("POST", "/api/resources", { jwt: jT2, body: { title: `${PREFIX}v12 submitted ${vpName}`, url: `https://example.com/${PREFIX}v12-${vpName}-${Date.now()}`, description: "QA fixture for V12 delete flow; safe to delete.", category: cat } });
  const subId = sub.json?.id ?? sub.json?.resource?.id; if (subId) createdResourceIds.push(subId);
  const [edit] = await q(`INSERT INTO resource_edits (resource_id, submitted_by, original_resource_updated_at, proposed_changes, proposed_data) SELECT id, $1, updated_at, '{"title":{"old":"a","new":"b"}}', '{"title":"b"}' FROM resources WHERE id=$2 RETURNING id`, [T2.bridgeId, res[0].id]);
  const children = async () => (await q(`SELECT
     (SELECT count(*) FROM user_bookmarks WHERE user_id=$1)::int bookmarks,
     (SELECT count(*) FROM user_favorites WHERE user_id=$1)::int favorites,
     (SELECT count(*) FROM api_keys WHERE user_id=$1)::int api_keys,
     (SELECT count(*) FROM resource_edits WHERE submitted_by=$1)::int edits,
     (SELECT count(*) FROM users WHERE id=$1)::int user_row`, [T2.bridgeId]))[0];
  step("fixtures", { bookmark: bm.status, favorite: fav.status, apiKey: key.status, submit: { status: sub.status, id: subId }, editId: edit.id, children: await children() });

  const { page } = await newPage(browser, VPS[vpName]);
  await signIn(page, ADM, "/admin/users");
  await page.goto(`${BASE}/admin/users`, { waitUntil: "domcontentloaded" });
  const search = page.locator('[data-testid="input-user-search"]');
  await search.waitFor({ timeout: 30_000 });
  const findRow = async (u) => { await search.fill(u.bridgeId); await page.locator(`[data-testid="button-edit-user-${u.bridgeId}"]`).waitFor({ timeout: 15_000 }); };
  const roleOf = async (id) => (await q(`SELECT role FROM users WHERE id=$1`, [id]))[0]?.role;
  const chip = (id) => page.locator(`tr:has([data-testid="button-edit-user-${id}"]) td.admin-ops-cell-role`).innerText();
  const pick = async (u, label) => {
    await page.locator(`[data-testid="button-edit-user-${u.bridgeId}"]`).click();
    await page.getByRole("option", { name: label, exact: true }).click();
    await page.getByRole("alertdialog").waitFor();
  };

  // Role: cancel path writes nothing.
  await findRow(T1);
  await pick(T1, "Moderator");
  const dialogText = (await page.getByRole("alertdialog").innerText()).replace(/\s+/g, " ");
  await shot(page, `V12-role-confirm-${vpName}`);
  await page.locator('[data-testid="button-cancel-role-change"]').click(); await sleep(700);
  step("role-cancel", { dialogText, sqlRole: await roleOf(T1.bridgeId), focus: await focused(page) });
  // Confirm → moderator.
  await pick(T1, "Moderator");
  await page.locator('[data-testid="button-confirm-role-change"]').click();
  await sleep(1500);
  const auditMod = await q(`SELECT action, notes, performed_by FROM resource_audit_log WHERE action='user.role_changed' AND changes->'target'->>'id'=$1 ORDER BY id DESC LIMIT 1`, [T1.bridgeId]).catch((e) => [{ err: e.message }]);
  step("role-confirm", { toast: await toasts(page), chip: await chip(T1.bridgeId), sqlRole: await roleOf(T1.bridgeId), focus: await focused(page), audit: auditMod });
  await shot(page, `V12-role-moderator-${vpName}`);
  // Restore → user via the same UI.
  await pick(T1, "User");
  await page.locator('[data-testid="button-confirm-role-change"]').click();
  await sleep(1500);
  step("role-restore", { chip: await chip(T1.bridgeId), sqlRole: await roleOf(T1.bridgeId), focus: await focused(page), auditCount: (await q(`SELECT count(*)::int n FROM resource_audit_log WHERE action='user.role_changed' AND performed_by=$1`, [ADM.bridgeId]))[0].n });

  // Delete: cancel first, then confirm.
  await findRow(T2);
  const toolsBefore = await page.locator(`[data-testid="button-delete-user-${T2.bridgeId}"]`).isVisible();
  await page.locator('[data-testid="button-user-tools"]').click();
  await sleep(400); step("row-actions", { deleteVisibleBefore: toolsBefore, deleteVisibleAfter: await page.locator(`[data-testid="button-delete-user-${T2.bridgeId}"]`).isVisible(), expanded: await page.locator('[data-testid="button-user-tools"]').getAttribute("aria-expanded") });
  await page.locator(`[data-testid="button-delete-user-${T2.bridgeId}"]`).click();
  await page.getByRole("alertdialog").waitFor();
  await page.getByRole("button", { name: "Cancel" }).click(); await sleep(700);
  step("delete-cancel", { children: await children(), focus: await focused(page) });
  await page.locator(`[data-testid="button-delete-user-${T2.bridgeId}"]`).click();
  await shot(page, `V12-delete-confirm-${vpName}`);
  const delResp = page.waitForResponse((r) => r.url().includes(`/api/admin/users/${T2.bridgeId}`) && r.request().method() === "DELETE");
  await page.locator('[data-testid="button-confirm-delete-user"]').click();
  const dr = await delResp; const delBody = await dr.json().catch(() => null);
  await sleep(1500);
  const rowsLeft = await page.locator(`[data-testid="button-edit-user-${T2.bridgeId}"]`).count();
  const tableText = (await page.locator("table").innerText()).replace(/\s+/g, " ").slice(0, 160);
  const subRow = subId ? (await q(`SELECT status, submitted_by FROM resources WHERE id=$1`, [subId]))[0] : null;
  const auditDel = await q(`SELECT action, notes, changes->>'clerkIdentity' clerk FROM resource_audit_log WHERE action='user.deleted' AND performed_by=$1 ORDER BY id DESC LIMIT 1`, [ADM.bridgeId]);
  const tomb = await q(`SELECT bridge_user_id, clerk_user_id IS NOT NULL has_clerk FROM deleted_user_tombstones WHERE bridge_user_id=$1`, [T2.bridgeId]);
  let clerkAfter; try { await clerk("GET", `/users/${T2.clerkUserId}`); clerkAfter = "exists"; } catch (e) { clerkAfter = String(e.message).match(/→ (\d+)/)?.[1]; }
  await shot(page, `V12-after-delete-${vpName}`);
  step("delete-confirm", { status: dr.status(), body: delBody, toast: await toasts(page), rowsLeft, tableText, focus: await focused(page), children: await children(), submittedResource: subRow, audit: auditDel, tombstone: tomb, clerkUser: clerkAfter });
  // Old session JWT (minted before delete) cannot re-provision.
  const old = await call("GET", "/api/auth/user", { jwt: jT2 });
  await sleep(2000);
  step("old-session", { status: old.status, isAuthenticated: old.json?.isAuthenticated, userRow: (await children()).user_row });
  out.pageErrors = page.__errors;

  if (doIsolation) {
    const A = await mintUser("v12a"); const B = await mintUser("v12b");
    await ensureLocal(A); await ensureLocal(B);
    const jA = await token(A), jB = await token(B);
    const col = await call("POST", "/api/collections", { jwt: jA, body: { name: `${PREFIX}v12A` } });
    const bA = await call("POST", `/api/bookmarks/${res[0].id}`, { jwt: jA, body: { notes: "A private note" } });
    const kA = await call("POST", "/api/user/api-keys", { jwt: jA, body: { name: `${PREFIX}v12Akey` } });
    const sA = await call("POST", "/api/resources", { jwt: jA, body: { title: `${PREFIX}v12 A submission`, url: `https://example.com/${PREFIX}v12A-${Date.now()}`, description: "QA fixture for V12 isolation; safe to delete.", category: cat } });
    const sAId = sA.json?.id ?? sA.json?.resource?.id; if (sAId) createdResourceIds.push(sAId);
    const jr = (await q(`SELECT id FROM learning_journeys WHERE status='published' ORDER BY id LIMIT 1`))[0];
    const st = await call("POST", `/api/journeys/${jr.id}/start`, { jwt: jA });
    const [nA] = await q(`INSERT INTO in_app_notifications (user_id, kind, title, description, href, idempotency_key, expires_at) VALUES ($1::varchar,'new_resource','${PREFIX}v12 note','QA','/bookmarks/', '${PREFIX}v12-'||$1::text, now()+interval '1 day') RETURNING id`, [A.bridgeId]);
    const keyId = kA.json?.apiKey?.id;
    const probes = {
      "GET collection": await call("GET", `/api/collections/${col.json.id}`, { jwt: jB }),
      "PATCH collection": await call("PATCH", `/api/collections/${col.json.id}`, { jwt: jB, body: { name: "hijack" } }),
      "POST publish": await call("POST", `/api/collections/${col.json.id}/publish`, { jwt: jB }),
      "DELETE collection": await call("DELETE", `/api/collections/${col.json.id}`, { jwt: jB }),
      "DELETE A api key": await call("DELETE", `/api/user/api-keys/${keyId}`, { jwt: jB }),
      "DELETE A submission": await call("DELETE", `/api/user/submissions/${sAId}`, { jwt: jB }),
      "PATCH A notification read": await call("PATCH", `/api/notifications/${nA.id}/read`, { jwt: jB }),
      "GET B bookmarks": await call("GET", "/api/bookmarks", { jwt: jB }),
      "GET B collections": await call("GET", "/api/collections", { jwt: jB }),
      "GET B submissions": await call("GET", "/api/user/submissions", { jwt: jB }),
      "GET B api keys": await call("GET", "/api/user/api-keys", { jwt: jB }),
      "GET B notifications": await call("GET", "/api/notifications", { jwt: jB }),
      "GET B journey progress": await call("GET", `/api/journeys/${jr.id}/progress`, { jwt: jB }),
      "non-admin GET /api/admin/users": await call("GET", "/api/admin/users", { jwt: jB }),
      "non-admin PUT role": await call("PUT", `/api/admin/users/${A.bridgeId}/role`, { jwt: jB, body: { role: "admin" } }),
      "non-admin DELETE user": await call("DELETE", `/api/admin/users/${A.bridgeId}`, { jwt: jB }),
    };
    const summary = Object.fromEntries(Object.entries(probes).map(([k, r]) => [k, { status: r.status, leaksA: r.text.includes(A.bridgeId) || r.text.includes("A private note") || r.text.includes("v12A") || r.text.includes("v12 A submission") || r.text.includes("v12 note") }]));
    const aState = (await q(`SELECT
      (SELECT name FROM bookmark_collections WHERE id=$2) col_name, (SELECT published_at FROM bookmark_collections WHERE id=$2) col_published,
      (SELECT count(*) FROM api_keys WHERE user_id=$1)::int keys, (SELECT status FROM resources WHERE id=$3) sub_status,
      (SELECT read_at FROM in_app_notifications WHERE id=$4) notif_read, (SELECT role FROM users WHERE id=$1) role`, [A.bridgeId, col.json.id, sAId ?? 0, nA.id]))[0];
    // Owner A can do it (positive control).
    const own = { revoke: (await call("DELETE", `/api/user/api-keys/${keyId}`, { jwt: jA })).status, withdraw: (await call("DELETE", `/api/user/submissions/${sAId}`, { jwt: jA })).status, read: (await call("PATCH", `/api/notifications/${nA.id}/read`, { jwt: jA })).status, delCol: (await call("DELETE", `/api/collections/${col.json.id}`, { jwt: jA })).status };
    step("isolation", { setup: { col: col.status, bookmark: bA.status, key: kA.status, sub: sA.status, start: st.status }, probes: summary, aStateAfterB: aState, ownerPositive: own });
    await q(`DELETE FROM in_app_notifications WHERE id=$1`, [nA.id]);
    await q(`DELETE FROM user_journey_progress WHERE user_id=$1`, [A.bridgeId]).catch(() => {});
  }
} catch (e) { out.error = String(e.stack ?? e); console.error(e); }
finally {
  await browser.close();
  await teardownAll();
  for (const id of createdResourceIds) { await q(`DELETE FROM resource_audit_log WHERE resource_id=$1 OR original_resource_id=$1`, [id]).catch(() => {}); await q(`DELETE FROM resources WHERE id=$1`, [id]).catch((e) => console.error("res del", e.message)); }
  await q(`DELETE FROM deleted_user_tombstones WHERE bridge_user_id LIKE $1`, [PREFIX.replace(/_/g, "\\_") + "%"]);
  out.residue = { ...(await residue()), tombstones: (await q(`SELECT count(*)::int n FROM deleted_user_tombstones WHERE bridge_user_id LIKE $1`, [PREFIX.replace(/_/g, "\\_") + "%"]))[0].n, notifications: (await q(`SELECT count(*)::int n FROM in_app_notifications WHERE title LIKE $1`, [PREFIX.replace(/_/g, "\\_") + "%"]))[0].n };
  console.log("residue", JSON.stringify(out.residue));
  writeJson(`/tmp/v592out/V12-${vpName}.json`, out); process.exit(0);
}

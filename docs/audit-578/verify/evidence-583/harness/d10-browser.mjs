// D10 browser half: /admin Resources editor Status + Save transitions.
import { api, sqlJson, expect, residue, flush, mkResource, base, P, RUN, BASE } from "./lib.mjs";
import { openAdminBrowser, shot } from "./browser.mjs";
const I = "D10-ui";
let b, catId, resId;
try {
  const cat = (await api(I, "QA base category", "POST", "/api/admin/categories", { name: `${P}d10ui_cat_${RUN}`, slug: `qa-583-d10ui-cat-${RUN}` })).json;
  catId = cat.id; base.category = cat.name;
  const res = await mkResource(I, "d10ui", { status: "pending", description: "QA fixture resource for status transitions through the admin editor UI." });
  resId = res.id;
  const row = (label) => sqlJson(I, label, `select status, status_changed_at, approved_by, approved_at, contributor_rejection_reason, length(description) dlen from resources where id = ${resId}`)[0];
  let prev = row("initial (pending)");

  b = await openAdminBrowser();
  const { page } = b;
  await page.goto(`${BASE}/admin?tab=resources&status=all`, { waitUntil: "domcontentloaded" });
  const search = page.getByTestId("input-search-resources");
  await search.waitFor({ state: "attached", timeout: 60000 });
  if (!(await search.isVisible())) await page.getByTestId("input-search-resources-header").fill(`d10ui_${RUN}`);
  else await search.fill(`d10ui_${RUN}`);
  await page.getByTestId(`row-resource-${resId}`).waitFor({ timeout: 30000 });

  for (const target of ["approved", "pending", "rejected"]) {
    await page.waitForTimeout(1100); // distinct timestamps per transition
    await page.getByTestId(`button-edit-${resId}`).click();
    await page.getByTestId("select-edit-status").click();
    await page.getByRole("option", { name: new RegExp(`^${target}$`, "i") }).click();
    const respP = page.waitForResponse((r) => r.url().endsWith(`/api/admin/resources/${resId}`) && r.request().method() === "PUT");
    await page.getByTestId("button-save-edit").click();
    const resp = await respP;
    const body = await resp.json().catch(() => ({}));
    await page.waitForTimeout(800);
    await shot(page, "D10", `after-save-${target}`);
    const now = row(`SQL after UI Save -> ${target}`);
    expect(I, resp.status() === 200 && now.status === target, `UI Save -> ${target}: PUT ${resp.status()}, SQL status=${now.status}`);
    expect(I, now.status_changed_at > (prev.status_changed_at ?? ""), `status_changed_at advanced ${prev.status_changed_at} -> ${now.status_changed_at}`);
    if (target === "approved") expect(I, !!now.approved_by && !!now.approved_at && now.approved_at === now.status_changed_at, `approval attribution set (approved_by=${now.approved_by}, approved_at=${now.approved_at})`);
    else expect(I, now.approved_by === null && now.approved_at === null, `approval attribution cleared on ${target}`);
    // Re-open the editor from the (cached) admin table: it must show the saved status without reload.
    await page.getByTestId(`button-edit-${resId}`).click();
    const shown = ((await page.getByTestId("select-edit-status").textContent()) ?? "").trim();
    await shot(page, "D10", `reopened-editor-${target}`);
    expect(I, new RegExp(`^${target}$`, "i").test(shown), `re-opened editor shows Status "${shown}" without reload`);
    await page.keyboard.press("Escape");
    await page.getByRole("dialog").waitFor({ state: "detached", timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(400);
    expect(I, (body?.status ?? body?.resource?.status) === target, `PUT response body status=${body?.status ?? body?.resource?.status}`);
    prev = now;
  }
  const audit = sqlJson(I, "audit trail (resource_audit_log)", `select action, performed_by is not null as has_actor, changes->>'previousStatus' prev, changes->>'newStatus' new, created_at from resource_audit_log where resource_id = ${resId} order by id`);
  const transitions = audit.filter((a) => a.prev !== a.new).map((a) => `${a.prev}->${a.new}`);
  expect(I, JSON.stringify(transitions.slice(-3)) === JSON.stringify(["pending->approved", "approved->pending", "pending->rejected"]) && audit.slice(-3).every((a) => a.has_actor && a.action === a.new), `audit shows each transition with actor: ${transitions.join(", ")}`);
  const adminApi = await api(I, "admin API listing exposes attribution fields", "GET", `/api/admin/resources?search=${encodeURIComponent(`d10ui_${RUN}`)}`);
  const pub = await api(I, "anonymous public GET (rejected => not public)", "GET", `/api/resources/${resId}`, undefined, { admin: false });
  expect(I, pub.status === 404 || !/approvedBy|statusChangedAt|contributorRejectionReason/.test(JSON.stringify(pub.json)), `public GET ${pub.status} leaks no attribution`);
  void adminApi;
  expect(I, b.consoleErrors.length === 0, `no page errors (${b.consoleErrors.join("; ").slice(0, 200)})`);
} catch (e) { console.error(e); process.exitCode = 1; if (b) await b.page.screenshot({ path: "/tmp/p583/shots/D10-failure.png" }).catch(() => {}); }
finally {
  await b?.browser.close();
  if (resId) await api(I, "cleanup resource", "DELETE", `/api/admin/resources/${resId}`);
  if (catId) await api(I, "cleanup category", "DELETE", `/api/admin/categories/${catId}`);
  console.log("RESIDUE", JSON.stringify(residue(I)));
  flush("/tmp/p583/out-ui");
}

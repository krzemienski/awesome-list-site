// D06 part A: one SPA session (no reload) — approve resource, approve edit,
// editor edit, delete; public listing / detail / sidebar / admin table follow.
import { api, sql, expect, residue, flush, mkResource, base, P, RUN, BASE } from "./lib.mjs";
import { openAdminBrowser, shot, spaNav } from "./browser.mjs";
const I = "D06";
const created = { resources: [], subs: [], cats: [], edits: [] };
let b;
const catSlug = `qa-583-d06-cat-${RUN}`;
try {
  const cat = (await api(I, "fixture category", "POST", "/api/admin/categories", { name: `${P}d06_cat_${RUN}`, slug: catSlug })).json;
  created.cats.push(cat.id); base.category = cat.name;
  const sub = (await api(I, "fixture subcategory", "POST", "/api/admin/subcategories", { name: `${P}d06_sub_${RUN}`, slug: `qa-583-d06-sub-${RUN}`, categoryId: cat.id })).json;
  created.subs.push(sub.id);
  const A = await mkResource(I, "d06_A", { status: "approved", subcategory: sub.name, description: "QA fixture approved resource that receives a suggested title edit." });
  const Pn = await mkResource(I, "d06_P", { status: "pending", subcategory: sub.name, description: "QA fixture pending resource approved from the admin queue in one SPA session." });
  created.resources.push(A.id, Pn.id);
  const newTitle = `${P}d06_A_edited_by_suggestion_${RUN}`;
  const edit = await api(I, "submit QA title edit suggestion for A", "POST", `/api/resources/${A.id}/edits`, {
    proposedChanges: { title: { old: A.title, new: newTitle } }, proposedData: { title: newTitle },
  });
  const editId = edit.json?.id ?? edit.json?.edit?.id; if (editId) created.edits.push(editId);

  b = await openAdminBrowser();
  const { page } = b;
  const cards = () => page.locator('[data-testid^="link-resource-title-"]').filter({ hasText: RUN });
  const sidebarCount = async () => {
    const btn = page.locator(`[data-testid^="accordion-cat-"][title="${base.category}"]`);
    if (!(await btn.count())) return null;
    return Number(((await btn.locator(".av-sidebar-category-meta .font-mono").first().textContent()) ?? "").replace(/\D/g, ""));
  };
  const waitCards = async (n) => { await page.waitForFunction(([run, n]) => [...document.querySelectorAll('[data-testid^="link-resource-title-"]')].filter((e) => e.textContent.includes(run)).length === n, [RUN, n], { timeout: 15000 }).catch(() => {}); return cards().count(); };
  const waitSidebar = async (n) => { await page.waitForFunction(([name, n]) => { const btn = document.querySelector(`[data-testid^="accordion-cat-"][title="${name}"]`); const v = btn ? Number(btn.querySelector(".av-sidebar-category-meta .font-mono")?.textContent.replace(/\D/g, "")) : null; return v === n; }, [base.category, n], { timeout: 15000 }).catch(() => {}); return sidebarCount(); };

  // ---- Warm every consumer in ONE document ----
  await page.goto(`${BASE}/category/${catSlug}`, { waitUntil: "domcontentloaded" });
  await page.evaluate((m) => { window.__d06marker = m; }, RUN);
  let n = await waitCards(1);
  let sc = await waitSidebar(1);
  await shot(page, "D06", "1-warm-category-listing");
  expect(I, n === 1 && sc === 1, `warm: category listing shows ${n} QA card(s), sidebar count ${sc} (expect 1/1)`);
  await spaNav(page, `/resource/${A.id}`);
  await page.getByTestId("text-resource-title").waitFor({ timeout: 20000 });
  expect(I, (await page.getByTestId("text-resource-title").textContent()) === A.title, "warm: detail of A shows original title");
  await spaNav(page, `/resource/${Pn.id}`);
  await page.waitForTimeout(2500);
  await shot(page, "D06", "2-warm-pending-detail-admin-preview");
  const anonBefore = await api(I, "anonymous GET pending P (before approval)", "GET", `/api/resources/${Pn.id}`, undefined, { admin: false });
  expect(I, anonBefore.status === 404, `warm: P detail cached in the admin session (admins may preview pending); anonymous GET is ${anonBefore.status} (not public)`);
  await spaNav(page, `/admin?tab=approvals`);
  await page.getByTestId(`row-pending-resource-${Pn.id}`).waitFor({ timeout: 30000 });

  // ---- Approve P from the Approvals tab ----
  await page.getByTestId(`button-approve-${Pn.id}`).click();
  let respP = page.waitForResponse((r) => r.url().includes(`/api/admin/resources/${Pn.id}/approve`) && r.request().method() === "POST");
  await page.getByTestId("button-confirm-approve").click();
  let resp = await respP;
  expect(I, resp.status() === 200, `approve P from Approvals tab -> ${resp.status()}`);
  await page.getByTestId(`row-pending-resource-${Pn.id}`).waitFor({ state: "detached", timeout: 10000 }).catch(() => {});
  await shot(page, "D06", "3-approved-from-queue");

  // ---- Approve the edit from the Edits tab ----
  await page.getByTestId("tab-edits").click();
  await page.getByTestId(`row-pending-edit-${editId}`).waitFor({ timeout: 20000 });
  await page.getByTestId(`button-approve-edit-${editId}`).click();
  respP = page.waitForResponse((r) => r.url().includes(`/api/admin/resource-edits/${editId}/approve`) && r.request().method() === "POST");
  await page.getByTestId("button-confirm-approve-edit").click();
  resp = await respP;
  expect(I, resp.status() === 200, `approve edit ${editId} from Edits tab -> ${resp.status()}`);
  await page.waitForTimeout(600);

  // ---- Back to the warmed public consumers (SPA, no reload) ----
  await spaNav(page, `/category/${catSlug}`);
  n = await waitCards(2); sc = await waitSidebar(2);
  const titles = await cards().allTextContents();
  await shot(page, "D06", "4-listing-after-approvals");
  expect(I, n === 2 && sc === 2, `after approvals: listing ${n} QA cards, sidebar ${sc} (expect 2/2)`);
  expect(I, titles.some((t) => t.includes("d06_A_edited_by_suggestion")) && titles.some((t) => t.includes("d06_P")), `listing shows P and A's approved-edit title: ${JSON.stringify(titles)}`);
  await spaNav(page, `/resource/${Pn.id}`);
  await page.getByTestId("text-resource-title").waitFor({ timeout: 15000 }).catch(() => {});
  const pTitle = await page.getByTestId("text-resource-title").textContent().catch(() => null);
  await shot(page, "D06", "5-pending-detail-now-public");
  const anonAfter = await api(I, "anonymous GET P (after approval)", "GET", `/api/resources/${Pn.id}`, undefined, { admin: false });
  expect(I, pTitle === Pn.title && anonAfter.status === 200, `P detail renders "${pTitle}"; anonymous GET now ${anonAfter.status} (public)`);
  await spaNav(page, `/resource/${A.id}`);
  await page.waitForFunction((t) => document.querySelector('[data-testid="text-resource-title"]')?.textContent === t, newTitle, { timeout: 15000 }).catch(() => {});
  const aTitle = await page.getByTestId("text-resource-title").textContent();
  await shot(page, "D06", "6-A-detail-after-edit-approval");
  expect(I, aTitle === newTitle, `A detail (cached with old title) now shows edit-approved title "${aTitle}"`);

  // ---- Admin table: editor edit of A's title, then delete P ----
  await spaNav(page, `/admin?tab=resources&status=all`);
  await page.getByTestId("tab-resources").click().catch(() => {});
  const search = page.getByTestId("input-search-resources");
  await search.waitFor({ state: "attached", timeout: 20000 });
  if (await search.isVisible()) await search.fill(`d06_`); else await page.getByTestId("input-search-resources-header").fill(`d06_`);
  await page.getByTestId(`row-resource-${A.id}`).waitFor({ timeout: 20000 });
  const rowA = (await page.getByTestId(`row-resource-${A.id}`).textContent()) ?? "";
  expect(I, rowA.includes("d06_A_edited_by_suggestion"), "admin table shows A's edit-approved title without reload");
  await page.getByTestId(`button-edit-${Pn.id}`).click();
  const pStatus = ((await page.getByTestId("select-edit-status").textContent()) ?? "").trim();
  expect(I, /approved/i.test(pStatus), `admin editor shows P status "${pStatus}" after queue approval`);
  await page.keyboard.press("Escape"); await page.waitForTimeout(400);
  const editorTitle = `${P}d06_A_editor_saved_${RUN}`;
  await page.getByTestId(`button-edit-${A.id}`).click();
  await page.getByTestId("input-edit-title").fill(editorTitle);
  respP = page.waitForResponse((r) => r.url().endsWith(`/api/admin/resources/${A.id}`) && r.request().method() === "PUT");
  await page.getByTestId("button-save-edit").click();
  resp = await respP;
  expect(I, resp.status() === 200, `editor Save title -> ${resp.status()}`);
  await page.waitForTimeout(600);
  await page.getByTestId(`button-delete-${Pn.id}`).click();
  respP = page.waitForResponse((r) => r.url().endsWith(`/api/admin/resources/${Pn.id}`) && r.request().method() === "DELETE");
  await page.getByTestId("button-confirm-delete").click();
  resp = await respP;
  expect(I, resp.status() === 200 || resp.status() === 204, `delete P from admin table -> ${resp.status()}`);
  created.resources = created.resources.filter((id) => id !== Pn.id);
  await page.waitForTimeout(600);
  await shot(page, "D06", "7-admin-table-after-edit-delete");

  await spaNav(page, `/category/${catSlug}`);
  n = await waitCards(1); sc = await waitSidebar(1);
  const titles2 = await cards().allTextContents();
  await shot(page, "D06", "8-listing-after-edit-delete");
  expect(I, n === 1 && sc === 1 && titles2[0]?.includes("d06_A_editor_saved"), `after editor edit + delete: listing ${n} card(s) ${JSON.stringify(titles2)}, sidebar ${sc} (expect 1/1, editor title)`);
  await spaNav(page, `/resource/${A.id}`);
  await page.waitForFunction((t) => document.querySelector('[data-testid="text-resource-title"]')?.textContent === t, editorTitle, { timeout: 15000 }).catch(() => {});
  expect(I, (await page.getByTestId("text-resource-title").textContent()) === editorTitle, "A detail shows the editor-saved title");
  const marker = await page.evaluate(() => window.__d06marker);
  const navs = await page.evaluate(() => performance.getEntriesByType("navigation").length);
  expect(I, marker === RUN && navs === 1, `same document throughout (marker=${marker}, navigation entries=${navs}) — no hard reload`);
  expect(I, b.consoleErrors.length === 0, `no page errors (${b.consoleErrors.join("; ").slice(0, 300)})`);
} catch (e) { console.error(e); process.exitCode = 1; if (b) await b.page.screenshot({ path: "/tmp/p583/shots/D06-failure.png" }).catch(() => {}); }
finally {
  await b?.browser.close();
  if (created.edits.length) sql(I, "delete QA edit rows by exact id", `delete from resource_edits where id in (${created.edits.join(",")})`);
  for (const id of created.resources) await api(I, "cleanup resource", "DELETE", `/api/admin/resources/${id}`);
  for (const id of created.subs) await api(I, "cleanup subcategory", "DELETE", `/api/admin/subcategories/${id}`);
  for (const id of created.cats) await api(I, "cleanup category", "DELETE", `/api/admin/categories/${id}`);
  console.log("RESIDUE", JSON.stringify(residue(I)));
  flush("/tmp/p583/out-ui-d06a");
}

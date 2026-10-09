// D06 part B: one SPA session (no reload) — admin create, category rename,
// subcategory move; public listings + sidebar counts follow without reload.
import { api, sqlJson, expect, residue, flush, mkResource, base, P, RUN, BASE } from "./lib.mjs";
import { openAdminBrowser, shot, spaNav } from "./browser.mjs";
const I = "D06b";
const created = { resources: [], subs: [], cats: [] };
let b;
const s1 = `qa-583-d06b-c1-${RUN}`, s2 = `qa-583-d06b-c2-${RUN}`;
try {
  const C1 = (await api(I, "fixture category C1", "POST", "/api/admin/categories", { name: `${P}d06b_c1_${RUN}`, slug: s1 })).json;
  const C2 = (await api(I, "fixture category C2", "POST", "/api/admin/categories", { name: `${P}d06b_c2_${RUN}`, slug: s2 })).json;
  created.cats.push(C1.id, C2.id);
  const S = (await api(I, "fixture subcategory S under C1", "POST", "/api/admin/subcategories", { name: `${P}d06b_sub_${RUN}`, slug: `qa-583-d06b-sub-${RUN}`, categoryId: C1.id })).json;
  created.subs.push(S.id);
  base.category = C1.name;
  const A = await mkResource(I, "d06b_A", { status: "approved", subcategory: S.name, description: "QA fixture approved resource that moves with its subcategory." });
  base.category = C2.name;
  const B = await mkResource(I, "d06b_B", { status: "approved", description: "QA fixture approved resource that keeps category C2 visible." });
  created.resources.push(A.id, B.id);

  b = await openAdminBrowser();
  const { page } = b;
  const cardCount = () => page.evaluate((run) => [...document.querySelectorAll('[data-testid^="link-resource-title-"]')].filter((e) => e.textContent.includes(run)).length, RUN);
  const waitCards = async (n) => { await page.waitForFunction(([run, n]) => [...document.querySelectorAll('[data-testid^="link-resource-title-"]')].filter((e) => e.textContent.includes(run)).length === n, [RUN, n], { timeout: 15000 }).catch(() => {}); return cardCount(); };
  const sidebar = (name) => page.evaluate((name) => { const btn = document.querySelector(`[data-testid^="accordion-cat-"][title="${name}"]`); return btn ? Number(btn.querySelector(".av-sidebar-category-meta .font-mono")?.textContent.replace(/\D/g, "")) : null; }, name);
  const waitSidebar = async (name, n) => { await page.waitForFunction(([name, n]) => { const btn = document.querySelector(`[data-testid^="accordion-cat-"][title="${name}"]`); const v = btn ? Number(btn.querySelector(".av-sidebar-category-meta .font-mono")?.textContent.replace(/\D/g, "")) : null; return v === n; }, [name, n], { timeout: 15000 }).catch(() => {}); return sidebar(name); };
  const heading = () => page.locator("h1").first().textContent();
  const adminTab = async (tab) => { await spaNav(page, `/admin?tab=${tab}`); await page.getByTestId(`tab-${tab}`).click(); await page.waitForTimeout(800); };
  const taxSearch = async (plural, q) => {
    const box = page.getByTestId(`input-search-${plural}`);
    if (!(await box.isVisible().catch(() => false))) await page.getByTestId(`button-more-${plural}`).click();
    await box.fill(q);
    await page.waitForTimeout(600);
  };

  // ---- Warm both public listings + sidebar in ONE document ----
  await page.goto(`${BASE}/category/${s1}`, { waitUntil: "domcontentloaded" });
  await page.evaluate((m) => { window.__d06marker = m; }, RUN);
  let n1 = await waitCards(1), sc1 = await waitSidebar(C1.name, 1);
  await spaNav(page, `/category/${s2}`);
  let n2 = await waitCards(1), sc2 = await waitSidebar(C2.name, 1);
  await shot(page, "D06b", "1-warm-listings");
  expect(I, n1 === 1 && sc1 === 1 && n2 === 1 && sc2 === 1, `warm: C1 listing ${n1}/sidebar ${sc1}, C2 listing ${n2}/sidebar ${sc2} (expect all 1)`);

  // ---- Create an approved resource in C1 from the admin Add dialog ----
  await adminTab("resources");
  await page.getByTestId("button-add-resource").click();
  const nTitle = `${P}d06b_N_created_in_ui_${RUN}`;
  await page.getByTestId("input-create-title").fill(nTitle);
  await page.getByTestId("input-create-url").fill(`https://example.com/${P}d06b_N_${RUN}`);
  await page.getByTestId("input-create-description").fill("QA fixture created through the admin Add dialog in one SPA session.");
  await page.getByTestId("select-create-category").click();
  await page.getByRole("option", { name: C1.name, exact: true }).click();
  await page.getByTestId("select-create-status").click();
  await page.getByRole("option", { name: /^approved$/i }).click();
  const createP = page.waitForResponse((r) => r.url().endsWith("/api/admin/resources") && r.request().method() === "POST");
  await page.getByTestId("button-create-resource").click();
  const cr = await createP; const crBody = await cr.json().catch(() => ({}));
  const nId = crBody?.id ?? crBody?.resource?.id; if (nId) created.resources.push(nId);
  expect(I, cr.status() === 201 && !!nId, `admin Add dialog create -> ${cr.status()} id=${nId}`);
  await page.waitForTimeout(600);
  await spaNav(page, `/category/${s1}`);
  n1 = await waitCards(2); sc1 = await waitSidebar(C1.name, 2);
  await shot(page, "D06b", "2-C1-after-create");
  expect(I, n1 === 2 && sc1 === 2, `after create: C1 listing ${n1}, sidebar ${sc1} (expect 2/2)`);

  // ---- Rename C1 (name only) from the Categories tab ----
  const newC1 = `${P}d06b_c1_renamed_${RUN}`;
  await adminTab("categories");
  await taxSearch("categories", `d06b_c1_${RUN}`);
  await page.getByTestId(`button-edit-${C1.id}`).click();
  await page.getByTestId("input-edit-name").fill(newC1);
  await page.getByTestId("input-edit-slug").fill(s1); // name-only rename keeps the slug
  const renP = page.waitForResponse((r) => r.url().endsWith(`/api/admin/categories/${C1.id}`) && r.request().method() === "PATCH");
  await page.getByTestId("button-confirm-edit").click();
  const ren = await renP;
  expect(I, ren.status() === 200, `rename C1 in dialog -> ${ren.status()}`);
  await page.waitForTimeout(600);
  await spaNav(page, `/category/${s1}`);
  await page.waitForFunction((t) => document.querySelector("h1")?.textContent?.includes(t), newC1, { timeout: 15000 }).catch(() => {});
  n1 = await waitCards(2); sc1 = await waitSidebar(newC1, 2);
  const h = await heading(); const oldInSidebar = await sidebar(C1.name);
  await shot(page, "D06b", "3-C1-after-rename");
  expect(I, h?.includes(newC1) && n1 === 2 && sc1 === 2 && oldInSidebar === null, `after rename: heading "${h}", listing ${n1}, sidebar[new]=${sc1}, sidebar[old]=${oldInSidebar} (expect new name, 2, 2, null)`);

  // ---- Move S (with A) from C1 to C2 from the Subcategories tab ----
  await adminTab("subcategories");
  await taxSearch("subcategories", `d06b_sub_${RUN}`);
  await page.getByTestId(`button-edit-${S.id}`).click();
  await page.getByTestId("select-edit-category-id").click();
  await page.getByRole("option", { name: C2.name, exact: true }).click();
  const mvP = page.waitForResponse((r) => r.url().endsWith(`/api/admin/subcategories/${S.id}`) && r.request().method() === "PATCH");
  await page.getByTestId("button-confirm-edit").click();
  const mv = await mvP;
  expect(I, mv.status() === 200, `move S to C2 in dialog -> ${mv.status()}`);
  await page.waitForTimeout(600);
  await spaNav(page, `/category/${s2}`);
  n2 = await waitCards(2); sc2 = await waitSidebar(C2.name, 2);
  await shot(page, "D06b", "4-C2-after-move");
  await spaNav(page, `/category/${s1}`);
  n1 = await waitCards(1); sc1 = await waitSidebar(newC1, 1);
  await shot(page, "D06b", "5-C1-after-move");
  expect(I, n2 === 2 && sc2 === 2 && n1 === 1 && sc1 === 1, `after move: C2 listing ${n2}/sidebar ${sc2} (expect 2/2), C1 listing ${n1}/sidebar ${sc1} (expect 1/1)`);
  const rows = sqlJson(I, "resource hierarchy after rename+move", `select id, category, subcategory from resources where id in (${created.resources.join(",")}) order by id`);
  expect(I, rows.find((r) => r.id === A.id)?.category === C2.name && rows.find((r) => r.id === nId)?.category === newC1, "SQL: A follows S to C2, N carries the renamed C1 label");
  const slugRow = sqlJson(I, "C1 slug preserved", `select name, slug from categories where id = ${C1.id}`)[0];
  expect(I, slugRow.slug === s1 && slugRow.name === newC1, `C1 renamed with slug preserved (${slugRow.slug})`);
  const marker = await page.evaluate(() => window.__d06marker);
  const navs = await page.evaluate(() => performance.getEntriesByType("navigation").length);
  expect(I, marker === RUN && navs === 1, `same document throughout (marker=${marker}, navigation entries=${navs}) — no hard reload`);
  expect(I, b.consoleErrors.length === 0, `no page errors (${b.consoleErrors.join("; ").slice(0, 300)})`);
} catch (e) { console.error(e); process.exitCode = 1; if (b) await b.page.screenshot({ path: "/tmp/p583/shots/D06b-failure.png" }).catch(() => {}); }
finally {
  await b?.browser.close();
  for (const id of created.resources) await api(I, "cleanup resource", "DELETE", `/api/admin/resources/${id}`);
  for (const id of created.subs) await api(I, "cleanup subcategory", "DELETE", `/api/admin/subcategories/${id}`);
  for (const id of created.cats) await api(I, "cleanup category", "DELETE", `/api/admin/categories/${id}`);
  console.log("RESIDUE", JSON.stringify(residue(I)));
  flush("/tmp/p583/out-ui-d06b");
}

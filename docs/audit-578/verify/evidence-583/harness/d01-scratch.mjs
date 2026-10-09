// D01 executed proof on a scratch DB clone served by a separate instance.
import { api, sql, sqlJson, expect, residue, flush, P, RUN } from "./lib.mjs";
const I = "D01";
const ids = { res: [], cats: [], subs: [], leaves: [], journey: null };
const desc = "QA fixture resource used to prove taxonomy rename and move cascades on resources.";
const mkCat = async (tag) => { const r = await api(I, `fixture category ${tag}`, "POST", "/api/admin/categories", { name: `${P}${tag}_${RUN}`, slug: `qa-583-${tag.replace(/_/g, "-")}-${RUN}` }); ids.cats.push(r.json.id); return r.json; };
const mkSub = async (name, slug, categoryId) => { const r = await api(I, `fixture subcategory ${slug}`, "POST", "/api/admin/subcategories", { name, slug, categoryId }); ids.subs.push(r.json.id); return r.json; };
let n = 0;
const mkRes = async (fields) => {
  n += 1;
  const r = await fetch(process.env.BASE_URL + "/api/admin/resources", { method: "POST", headers: { "Content-Type": "application/json", Origin: new URL(process.env.BASE_URL).origin, "X-Admin-Audit-Key": process.env.ADMIN_PASSWORD },
    body: JSON.stringify({ title: `${P}d01_res_${n}_${RUN}`, url: `https://example.com/${P}d01_res_${n}_${RUN}`, description: desc, ...fields }) });
  const j = await r.json(); if (r.status !== 201) throw new Error(`fixture create failed ${r.status} ${JSON.stringify(j)}`);
  ids.res.push(j.id);
};
const hierarchy = (label) => sqlJson(I, label, `select category, subcategory, sub_subcategory, status, count(*)::int n from resources where id in (${ids.res.join(",")}) group by 1,2,3,4 order by 1,2,3,4`);

try {
  const cat1 = await mkCat("d01_cat1"), cat2 = await mkCat("d01_cat2"), decoyCat = await mkCat("d01_decoy");
  const sub = await mkSub(`${P}d01_sub_${RUN}`, `qa-583-d01-sub-${RUN}`, cat1.id);
  const decoySub = await mkSub(sub.name, `qa-583-d01-decoysub-${RUN}`, decoyCat.id);
  const leafR = await api(I, "fixture leaf", "POST", "/api/admin/sub-subcategories", { name: `${P}d01_leaf_${RUN}`, slug: `qa-583-d01-leaf-${RUN}`, subcategoryId: sub.id });
  const leaf = leafR.json; ids.leaves.push(leaf.id);
  for (let i = 0; i < 20; i++) await mkRes({ category: cat1.name, subcategory: sub.name, status: "approved" });
  for (let i = 0; i < 5; i++) await mkRes({ category: cat1.name, subcategory: sub.name, status: "pending" });
  for (let i = 0; i < 10; i++) await mkRes({ category: cat1.name, subcategory: sub.name, subSubcategory: leaf.name, status: "approved" });
  for (let i = 0; i < 3; i++) await mkRes({ category: cat1.name, status: "approved" });
  for (let i = 0; i < 2; i++) await mkRes({ category: decoyCat.name, subcategory: decoySub.name, status: "approved" });
  log2("created 40 resources: 20 approved sub, 5 pending sub, 10 approved leaf, 3 approved category-level, 2 decoy (same-name subcategory under another category)");
  ids.journey = sql(I, "fixture journey labelled with category 1 (scratch DB)", `insert into learning_journeys (title, description, difficulty, estimated_duration, category, status) values ('${P}d01_journey_${RUN}', 'QA journey', 'beginner', '1 hour', '${cat1.name}', 'draft') returning id`).split("\n")[0];
  const before = hierarchy("BEFORE: resource hierarchy");

  // 1) category rename
  const cat1New = `${P}d01_cat1_renamed_${RUN}`;
  let r = await api(I, "PATCH category rename", "PATCH", `/api/admin/categories/${cat1.id}`, { name: cat1New });
  expect(I, r.status === 200 && r.json.slug === cat1.slug, "category rename 200 and slug preserved");
  let h = hierarchy("after category rename");
  expect(I, h.every((g) => g.category !== cat1.name) && h.filter((g) => g.category === cat1New).reduce((a, g) => a + g.n, 0) === 38, "all 38 category-1 resources follow the new category name");
  expect(I, h.filter((g) => g.category === decoyCat.name).reduce((a, g) => a + g.n, 0) === 2, "decoy resources untouched");
  expect(I, sql(I, "journey category label", `select category from learning_journeys where id = ${ids.journey}`) === cat1New, "journey category label follows rename");

  // 2) subcategory rename
  const subNew = `${P}d01_sub_renamed_${RUN}`;
  r = await api(I, "PATCH subcategory rename", "PATCH", `/api/admin/subcategories/${sub.id}`, { name: subNew });
  expect(I, r.status === 200 && r.json.slug === sub.slug, "subcategory rename 200 and slug preserved");
  h = hierarchy("after subcategory rename");
  expect(I, h.filter((g) => g.subcategory === subNew).reduce((a, g) => a + g.n, 0) === 35, "35 subcategory resources (incl. leaf + pending) carry the new subcategory name");
  expect(I, h.filter((g) => g.category === decoyCat.name && g.subcategory === sub.name).reduce((a, g) => a + g.n, 0) === 2, "same-name decoy subcategory under another category keeps its label (scoped cascade)");

  // 3) leaf rename
  const leafNew = `${P}d01_leaf_renamed_${RUN}`;
  r = await api(I, "PATCH leaf rename", "PATCH", `/api/admin/sub-subcategories/${leaf.id}`, { name: leafNew });
  expect(I, r.status === 200 && r.json.slug === leaf.slug, "leaf rename 200 and slug preserved");
  h = hierarchy("after leaf rename");
  expect(I, h.filter((g) => g.sub_subcategory === leafNew && g.subcategory === subNew && g.category === cat1New).reduce((a, g) => a + g.n, 0) === 10, "10 leaf resources carry the full new chain");

  // 4) move subcategory to category 2
  r = await api(I, "PATCH move subcategory -> category 2", "PATCH", `/api/admin/subcategories/${sub.id}`, { categoryId: cat2.id });
  expect(I, r.status === 200 && r.json.categoryId === cat2.id, "move 200");
  h = hierarchy("AFTER move: resource hierarchy");
  expect(I, h.filter((g) => g.category === cat2.name && g.subcategory === subNew).reduce((a, g) => a + g.n, 0) === 35, "all 35 subcategory resources (incl. leaf) moved to category 2");
  expect(I, h.filter((g) => g.category === cat1New).reduce((a, g) => a + g.n, 0) === 3 && h.filter((g) => g.category === cat1New).every((g) => g.subcategory === null), "3 category-level resources stay in renamed category 1");
  expect(I, sql(I, "orphan labels (resources whose chain does not exist in taxonomy)", `
    select count(*) from resources r where r.id in (${ids.res.join(",")}) and not exists (
      select 1 from categories c left join subcategories s on s.category_id = c.id and s.name = r.subcategory
      left join sub_subcategories ss on ss.subcategory_id = s.id and ss.name = r.sub_subcategory
      where c.name = r.category and (r.subcategory is null or s.id is not null) and (r.sub_subcategory is null or ss.id is not null))`) === "0", "every resource label chain resolves to a real taxonomy chain");

  // 5) public + admin reachability / counts
  const nav = await api(I, "public nav", "GET", "/api/awesome-list/nav", undefined, { admin: false });
  const navCat2 = nav.json.categories.find((c) => c.name === cat2.name), navCat1 = nav.json.categories.find((c) => c.name === cat1New);
  log2(`nav cat2=${JSON.stringify(navCat2)?.slice(0, 400)} cat1=${JSON.stringify(navCat1)?.slice(0, 200)}`);
  // nav nodes carry DIRECT counts; the sidebar sums them (client navTotalCount).
  const total = (node) => (node?.resourceCount ?? 0) + (node?.subcategories ?? []).reduce((a, x) => a + total(x), 0) + (node?.subSubcategories ?? []).reduce((a, x) => a + total(x), 0);
  const navSub = navCat2?.subcategories?.find((s) => s.name === subNew);
  expect(I, total(navCat2) === 30 && total(navSub) === 30 && navSub?.subSubcategories?.find((l) => l.name === leafNew)?.resourceCount === 10, `public nav (sidebar sum): category 2 = ${total(navCat2)}, moved subcategory = ${total(navSub)}, renamed leaf = 10 approved`);
  expect(I, total(navCat1) === 3, `public nav: renamed category 1 sums to its 3 remaining approved (got ${total(navCat1)})`);
  expect(I, !nav.json.categories.some((c) => c.name === cat1.name), "old category name gone from public nav");
  const ls = await api(I, "public listing: moved subcategory", "GET", `/api/awesome-list/listing?level=subcategory&slug=${sub.slug}&page=1`, undefined, { admin: false });
  expect(I, ls.status === 200 && ls.json.totalAll === 30 && ls.json.parents?.category?.name === cat2.name, `subcategory listing reachable under category 2 with 30 (got ${ls.json.totalAll})`);
  const ll = await api(I, "public listing: renamed leaf", "GET", `/api/awesome-list/listing?level=sub-subcategory&slug=${leaf.slug}&page=1`, undefined, { admin: false });
  expect(I, ll.status === 200 && ll.json.totalAll === 10, `leaf listing reachable with 10 (got ${ll.json.totalAll})`);
  const lc = await api(I, "public listing: renamed category 1", "GET", `/api/awesome-list/listing?level=category&slug=${cat1.slug}&page=1`, undefined, { admin: false });
  expect(I, lc.status === 200 && lc.json.totalAll === 3, `category 1 listing reachable with 3 (got ${lc.json.totalAll})`);
  const adm = await api(I, "admin resource listing filtered to category 2", "GET", `/api/admin/resources?category=${encodeURIComponent(cat2.name)}&limit=100`);
  const admRows = adm.json.resources ?? adm.json.data ?? adm.json;
  expect(I, Array.isArray(admRows) && admRows.length === 35 && admRows.every((x) => x.subcategory === subNew), `admin listing shows 35 rows in category 2 with new subcategory label (got ${admRows?.length})`);
  const adSub = await api(I, "admin subcategory listing for category 2", "GET", `/api/admin/subcategories?categoryId=${cat2.id}`);
  expect(I, adSub.json.find((s) => s.id === sub.id)?.resourceCount === 35, "admin subcategory count (all statuses) = 35 under category 2");
  void before;
} catch (e) { console.error(e); process.exitCode = 1; }
finally {
  if (ids.journey) sql(I, "delete journey by id", `delete from learning_journeys where id = ${ids.journey}`);
  if (ids.res.length) await api(I, "cleanup bulk delete resources", "POST", "/api/admin/resources/bulk/delete", { ids: ids.res });
  for (const id of ids.leaves) await api(I, "cleanup leaf", "DELETE", `/api/admin/sub-subcategories/${id}`);
  for (const id of ids.subs.reverse()) await api(I, "cleanup sub", "DELETE", `/api/admin/subcategories/${id}`);
  for (const id of ids.cats) await api(I, "cleanup cat", "DELETE", `/api/admin/categories/${id}`);
  console.log("RESIDUE", JSON.stringify(residue(I)), "journeys", sql(I, "journey residue", `select count(*) from learning_journeys where title like '${P}%'`));
  flush(process.argv[2] || "/tmp/p583/out-d01");
}
function log2(note) { console.log(`[D01] ${note}`); }

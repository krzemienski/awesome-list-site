import pg from "pg"; import fs from "node:fs";
const BASE = process.env.BASE_URL || "http://127.0.0.1:5000";
const c = new pg.Client({ connectionString: process.env.DATABASE_URL }); await c.connect();
const q = async (s) => (await c.query(s)).rows;
const sub = await q(`select category, subcategory, count(*)::int n from resources where status='approved' and subcategory is not null and subcategory<>'' group by 1,2`);
const ss = await q(`select category, subcategory, sub_subcategory, count(*)::int n from resources where status='approved' and sub_subcategory is not null and sub_subcategory<>'' group by 1,2,3`);
const tree = await (await fetch(BASE + "/api/awesome-list")).json();
const cats = tree.categories || tree;
const rows = []; let mism = 0, nodes = 0;
const key = (...a) => a.map(x => (x || "").toLowerCase()).join("|");
const sqlSub = new Map(sub.map(r => [key(r.category, r.subcategory), r.n]));
const sqlSS = new Map(ss.map(r => [key(r.category, r.subcategory, r.sub_subcategory), r.n]));
const cnt = (n) => n.resourceCount ?? n.count ?? (n.resources?.length) ?? null;
const seenSub = new Set(), seenSS = new Set();
for (const cat of cats) for (const s of cat.subcategories || []) {
  nodes++; const k = key(cat.name, s.name); seenSub.add(k);
  // tree total for a subcategory = direct + all sub-sub resources
  const direct = s.resources?.length ?? 0; const nested = (s.subSubcategories || []).reduce((a, x) => a + (x.resources?.length ?? 0), 0);
  const treeTotal = direct + nested; const sqlTotal = sqlSub.get(k) ?? 0;
  if (treeTotal !== sqlTotal) { mism++; rows.push({ level: "sub", cat: cat.name, sub: s.name, slug: s.slug, tree: treeTotal, sql: sqlTotal }); }
  for (const x of s.subSubcategories || []) { nodes++; const kk = key(cat.name, s.name, x.name); seenSS.add(kk); const t = x.resources?.length ?? 0, q2 = sqlSS.get(kk) ?? 0; if (t !== q2) { mism++; rows.push({ level: "subsub", cat: cat.name, sub: s.name, ss: x.name, slug: x.slug, tree: t, sql: q2 }); } }
}
const sqlOnly = [...sqlSub.keys()].filter(k => !seenSub.has(k)).map(k => ({ k, n: sqlSub.get(k) }));
const sqlOnlySS = [...sqlSS.keys()].filter(k => !seenSS.has(k)).map(k => ({ k, n: sqlSS.get(k) }));
const out = { base: BASE, rev: await (await fetch(BASE + "/api/version")).json(), nodes, mismatches: mism, rows, sqlOnlySub: sqlOnly, sqlOnlySubSub: sqlOnlySS, sampleKeys: Object.keys(cats[0].subcategories[0]) };
fs.writeFileSync(`proof/N-02/tree-vs-sql-${BASE.includes("127") ? "dev" : "prod"}.json`, JSON.stringify(out, null, 1));
console.log(JSON.stringify({ ...out, rows: rows.slice(0, 15) }, null, 0)); await c.end();

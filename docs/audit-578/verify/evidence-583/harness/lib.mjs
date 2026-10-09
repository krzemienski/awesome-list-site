// Shared helpers for task 583 executed proofs (real app, real DB, no mocks).
import { execFileSync } from "node:child_process";
import fs from "node:fs";

export const BASE = process.env.BASE_URL || "http://127.0.0.1:5000";
export const DB = process.env.PROOF_DATABASE_URL || process.env.DATABASE_URL;
const KEY = process.env.ADMIN_PASSWORD;
export const P = "__qa_test_plan_583_";
export const RUN = Date.now().toString(36);

const logs = {};
export function log(item, entry) {
  (logs[item] ||= []).push(entry);
  const line = `[${item}] ${entry.label ?? ""} ${entry.method ?? ""} ${entry.path ?? ""} -> ${entry.status ?? ""} ${entry.excerpt ?? entry.note ?? ""}`;
  console.log(line.slice(0, 600));
}
export function flush(dir) {
  fs.mkdirSync(dir, { recursive: true });
  for (const [item, entries] of Object.entries(logs)) {
    fs.writeFileSync(`${dir}/${item}.json`, JSON.stringify(entries, null, 2));
  }
}

export async function api(item, label, method, path, body, { admin = true } = {}) {
  const headers = { "Content-Type": "application/json", Origin: new URL(BASE).origin };
  if (admin) headers["X-Admin-Audit-Key"] = KEY;
  const res = await fetch(BASE + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = text; }
  const excerpt = typeof json === "string" ? json.slice(0, 300) : JSON.stringify(json).slice(0, 400);
  log(item, { label, method, path, body, status: res.status, excerpt });
  return { status: res.status, json };
}

export function sql(item, label, query) {
  const out = execFileSync("psql", [DB, "-AtX", "-v", "ON_ERROR_STOP=1", "-c", query], { encoding: "utf8" }).trim();
  log(item, { label, sql: query, note: `SQL => ${out.slice(0, 500)}`, result: out });
  return out;
}
export const sqlJson = (item, label, query) => {
  const out = sql(item, label, `select coalesce(json_agg(t), '[]') from (${query}) t`);
  return JSON.parse(out || "[]");
};

export function expect(item, cond, what) {
  log(item, { label: cond ? "PASS" : "FAIL", note: what });
  if (!cond) process.exitCode = 1;
  return cond;
}

export async function mkTree(item, tag) {
  const cat = await api(item, "fixture category", "POST", "/api/admin/categories",
    { name: `${P}${tag}_cat_${RUN}`, slug: `qa-583-${tag}-cat-${RUN}` });
  const sub = await api(item, "fixture subcategory", "POST", "/api/admin/subcategories",
    { name: `${P}${tag}_sub_${RUN}`, slug: `qa-583-${tag}-sub-${RUN}`, categoryId: cat.json.id });
  const leaf = await api(item, "fixture leaf", "POST", "/api/admin/sub-subcategories",
    { name: `${P}${tag}_leaf_${RUN}`, slug: `qa-583-${tag}-leaf-${RUN}`, subcategoryId: sub.json.id });
  return { cat: cat.json, sub: sub.json, leaf: leaf.json };
}

export const base = { category: null };
export async function mkResource(item, tag, fields) {
  const r = await api(item, `fixture resource ${tag}`, "POST", "/api/admin/resources", {
    category: base.category,
    title: `${P}${tag}_${RUN}`,
    url: `https://example.com/${P}${tag}_${RUN}`,
    ...fields,
  });
  return r.json;
}

export function residue(item, extraIds = {}) {
  return sqlJson(item, "residue check (must all be 0)", `
    select (select count(*) from resources where title like '${P}%' or url like '%${P}%') as resources,
           (select count(*) from categories where name like '${P}%') as categories,
           (select count(*) from subcategories where name like '${P}%') as subcategories,
           (select count(*) from sub_subcategories where name like '${P}%') as sub_subcategories,
           (select count(*) from resource_edits e where not exists (select 1 from resources r where r.id = e.resource_id)) as orphan_edits`)[0];
}

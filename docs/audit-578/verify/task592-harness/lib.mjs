// Shared helpers for task-592 V-item proofs: real app, real Clerk sessions, real DB.
import pg from "pg";
import fs from "node:fs";
export const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5000";
export const PREFIX = "__qa_test_plan_592_";
const CLERK_API = "https://api.clerk.com/v1";
export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
export const q = async (text, params = []) => (await pool.query(text, params)).rows;
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function clerk(method, path, body) {
  const res = await fetch(`${CLERK_API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Clerk ${method} ${path} → ${res.status}: ${JSON.stringify(json).slice(0, 300)}`);
  return json;
}

const minted = [];
export async function mintUser(tag) {
  const bridgeId = `${PREFIX}${tag}_${Date.now()}`;
  const user = await clerk("POST", "/users", {
    email_address: [`${bridgeId}@example.com`],
    external_id: bridgeId,
    first_name: "QA",
    last_name: tag,
    skip_password_requirement: true,
  });
  const session = await clerk("POST", "/sessions", { user_id: user.id });
  const u = { bridgeId, clerkUserId: user.id, sessionId: session.id, email: `${bridgeId}@example.com` };
  minted.push(u);
  return u;
}
export async function newSession(u) {
  return (await clerk("POST", "/sessions", { user_id: u.clerkUserId })).id;
}
export async function token(u, sessionId = u.sessionId) {
  return (await clerk("POST", `/sessions/${sessionId}/tokens`, {})).jwt;
}

export async function call(method, path, { body, jwt, admin, raw, headers: extra } = {}) {
  const headers = { "Content-Type": "application/json", Origin: BASE, ...(extra ?? {}) };
  if (jwt) headers.Authorization = `Bearer ${jwt}`;
  if (admin) headers["X-Admin-Audit-Key"] = process.env.ADMIN_PASSWORD;
  const res = await fetch(`${BASE}${path}`, {
    method, headers,
    body: raw !== undefined ? raw : body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, json, text, headers: Object.fromEntries(res.headers) };
}

/** Ensure the JIT local row exists (first authed request provisions it). */
export async function ensureLocal(u) {
  for (let i = 0; i < 20; i++) {
    const r = await q(`SELECT id, role FROM users WHERE id=$1`, [u.bridgeId]);
    if (r.length) return r[0];
    await call("GET", "/api/auth/user", { jwt: await token(u) });
    await sleep(300);
  }
  throw new Error("local row never provisioned for " + u.bridgeId);
}

/** Clerk-first teardown, then the local row and the non-cascading child refs. */
export async function teardownUser(u) {
  try { await clerk("DELETE", `/users/${u.clerkUserId}`); } catch (e) { if (!/404/.test(String(e))) throw e; }
  await sleep(1500);
  const id = u.bridgeId;
  await q(`DELETE FROM resource_edits WHERE submitted_by=$1`, [id]);
  await q(`UPDATE resource_edits SET handled_by=NULL WHERE handled_by=$1`, [id]);
  await q(`UPDATE resources SET approved_by=NULL WHERE approved_by=$1`, [id]);
  await q(`UPDATE github_sync_history SET performed_by=NULL WHERE performed_by=$1`, [id]);
  await q(`UPDATE enrichment_jobs SET started_by=NULL WHERE started_by=$1`, [id]);
  await q(`UPDATE research_jobs SET started_by=NULL WHERE started_by=$1`, [id]);
  await q(`DELETE FROM resource_audit_log WHERE performed_by=$1`, [id]);
  await q(`DELETE FROM users WHERE id=$1`, [id]);
}
export async function teardownAll() { for (const u of minted.splice(0)) await teardownUser(u).catch((e) => console.error("teardown", e.message)); }

/** Residue across the tables a 592 run can touch. Every count must be 0. */
export async function residue(prefix = PREFIX) {
  const like = prefix.replace(/_/g, "\\_") + "%";
  const [r] = await q(`SELECT
    (SELECT count(*) FROM users WHERE id LIKE $1 OR email LIKE $1)::int AS users,
    (SELECT count(*) FROM resources WHERE title LIKE $1 OR url LIKE '%'||$2||'%')::int AS resources,
    (SELECT count(*) FROM learning_journeys WHERE title LIKE $1)::int AS journeys,
    (SELECT count(*) FROM categories WHERE name LIKE $1)::int AS categories,
    (SELECT count(*) FROM subcategories WHERE name LIKE $1)::int AS subcategories,
    (SELECT count(*) FROM bookmark_collections WHERE name LIKE $1)::int AS collections,
    (SELECT count(*) FROM resource_edits WHERE submitted_by LIKE $1)::int AS edits`, [like, prefix]);
  return r;
}

export function writeJson(file, obj) { fs.mkdirSync(file.replace(/\/[^/]+$/, ""), { recursive: true }); fs.writeFileSync(file, JSON.stringify(obj, null, 2)); }
export function log(...args) { console.log(...args); }

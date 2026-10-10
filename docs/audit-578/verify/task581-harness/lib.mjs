// Shared helpers for task-581 proofs: real app, real Clerk sessions, real DB.
import pg from "pg";
export const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5000";
export const PREFIX = "__qa_test_plan_581_";
const CLERK_API = "https://api.clerk.com/v1";
export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
export const q = async (text, params = []) => (await pool.query(text, params)).rows;

export async function clerk(method, path, body) {
  const res = await fetch(`${CLERK_API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Clerk ${method} ${path} → ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

export async function mintUser(tag) {
  const bridgeId = `${PREFIX}${tag}_${Date.now()}`;
  const user = await clerk("POST", "/users", {
    email_address: [`${bridgeId}@example.com`],
    external_id: bridgeId,
    skip_password_requirement: true,
  });
  const session = await clerk("POST", "/sessions", { user_id: user.id });
  return { bridgeId, clerkUserId: user.id, sessionId: session.id };
}
export async function token(u) {
  return (await clerk("POST", `/sessions/${u.sessionId}/tokens`, {})).jwt;
}

export async function call(method, path, { body, jwt, admin, raw } = {}) {
  const headers = { "Content-Type": "application/json", Origin: BASE };
  if (jwt) headers.Authorization = `Bearer ${jwt}`;
  if (admin) headers["X-Admin-Audit-Key"] = process.env.ADMIN_PASSWORD;
  const res = await fetch(`${BASE}${path}`, {
    method, headers,
    body: raw !== undefined ? raw : body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, json, text };
}

export async function deleteUser(u) {
  await clerk("DELETE", `/users/${u.clerkUserId}`);
}

export function log(...args) { console.log(...args); }

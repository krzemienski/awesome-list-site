// Shared helpers for task 582 live proofs (real app, real Clerk, real DB).
import { createRequire } from "node:module";
import fs from "node:fs";
const require = createRequire("/home/runner/workspace/package.json");
const { Pool } = require("pg");

export const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5000";
const CLERK_API = "https://api.clerk.com/v1";
const KEY = process.env.CLERK_SECRET_KEY;
if (!KEY) throw new Error("CLERK_SECRET_KEY missing");
export const PREFIX = "__qa_test_plan_582_";
export const STATE = "/tmp/qa582/state.json";
export const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });

export const loadState = () => (fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, "utf8")) : {});
export const saveState = (s) => fs.writeFileSync(STATE, JSON.stringify(s, null, 2));

export async function clerk(method, path, body) {
  const res = await fetch(`${CLERK_API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Clerk ${method} ${path} -> ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

export async function token(user) {
  const t = await clerk("POST", `/sessions/${user.sessionId}/tokens`, {});
  return t.jwt;
}

export async function api(user, method, path, body, { raw } = {}) {
  const headers = { "Content-Type": "application/json", Origin: BASE };
  if (user) headers.Authorization = `Bearer ${await token(user)}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: raw !== undefined ? raw : body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let parsed;
  try { parsed = JSON.parse(text); } catch { parsed = text.slice(0, 300); }
  return { status: res.status, body: parsed };
}

export const q = async (sql, params = []) => (await pool.query(sql, params)).rows;

const log = [];
export function record(label, data) {
  const line = { label, ...data };
  log.push(line);
  console.log(JSON.stringify(line));
}
export function flush(file) {
  fs.writeFileSync(file, JSON.stringify(log, null, 2));
}

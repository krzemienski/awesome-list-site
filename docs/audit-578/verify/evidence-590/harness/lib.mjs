// Shared helpers for the task-590 proofs: real HTTP against a running app
// instance plus psql against the database that instance serves. No mocks.
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

export const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:5190";
export const DB_URL = process.env.PROOF_DATABASE_URL;
if (!DB_URL) throw new Error("PROOF_DATABASE_URL is required (the DB the instance at BASE_URL serves)");
const KEY = process.env.ADMIN_PASSWORD;
if (!KEY || KEY.length < 8) throw new Error("ADMIN_PASSWORD (audit key) missing or too short");

export const log = [];
let pass = 0;
let fail = 0;

/** Run SQL and return rows parsed from json_agg (one JSON value). */
export function sql(query) {
  const out = execFileSync("psql", [DB_URL, "-Atq", "-v", "ON_ERROR_STOP=1", "-c", query], { encoding: "utf8" }).trim();
  return out;
}
export function sqlJson(query) {
  const out = sql(`with t as (${query}) select coalesce(json_agg(t), '[]'::json) from t`);
  return JSON.parse(out);
}
export function sqlOne(query) {
  return sqlJson(query)[0];
}

export async function api(method, path, body) {
  const res = await fetch(BASE_URL + path, {
    method,
    headers: {
      "X-Admin-Audit-Key": KEY,
      Origin: BASE_URL,
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text.slice(0, 400); }
  log.push({ at: new Date().toISOString(), request: `${method} ${path}`, body, status: res.status, response: json });
  return { status: res.status, json };
}

export function check(name, ok, detail) {
  if (ok) pass++; else fail++;
  log.push({ check: name, result: ok ? "PASS" : "FAIL", detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined ? `  ${JSON.stringify(detail)}` : ""}`);
}

export function note(step, data) {
  log.push({ step, data });
  console.log(`--- ${step}: ${JSON.stringify(data)}`);
}

export function finish(outFile) {
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, JSON.stringify({ baseUrl: BASE_URL, pass, fail, log }, null, 2));
  console.log(`\n${pass} PASS, ${fail} FAIL → ${outFile}`);
  process.exitCode = fail ? 1 : 0;
}

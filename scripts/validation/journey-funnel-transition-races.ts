/**
 * Real-API regression gate for journey funnel analytics transitions.
 *
 * Two stale browser tabs can submit the same idempotent start/progress write.
 * The server response must report the transition exactly once, so clients can
 * emit journey_start / journey_step_complete / journey_complete without
 * inflating the funnel.
 *
 * Requirements: running app at BASE_URL (default http://127.0.0.1:5000),
 * CLERK_SECRET_KEY, DATABASE_URL.
 */
import { Pool } from "pg";

const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:5000";
const CLERK_API = "https://api.clerk.com/v1";
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
const DATABASE_URL = process.env.DATABASE_URL;
if (!CLERK_SECRET_KEY) throw new Error("CLERK_SECRET_KEY is required");
if (!DATABASE_URL) throw new Error("DATABASE_URL is required");

const PREFIX = "__qa_test_journey_funnel_races_";
const bridgeId = `${PREFIX}${Date.now()}`;
const email = `${bridgeId}@example.com`;
// Journey 8 has multi-row logical steps, exercising the all-row invariant too.
const JOURNEY_ID = 8;
const pool = new Pool({ connectionString: DATABASE_URL, max: 1, connectionTimeoutMillis: 15_000 });
let clerkUserId: string | undefined;
let sessionId: string | undefined;
let failures = 0;

function check(ok: boolean, label: string, detail?: unknown) {
  if (ok) console.log(`PASS: ${label}`);
  else {
    failures += 1;
    console.error(`FAIL: ${label}${detail === undefined ? "" : ` — ${JSON.stringify(detail)}`}`);
  }
}

async function clerk(method: string, path: string, body?: unknown): Promise<any> {
  const res = await fetch(`${CLERK_API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${CLERK_SECRET_KEY}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Clerk ${method} ${path} → ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

async function token(): Promise<string> {
  const result = await clerk("POST", `/sessions/${sessionId}/tokens`, {});
  if (!result?.jwt) throw new Error("Clerk returned no session JWT");
  return result.jwt;
}

async function api(jwt: string, method: string, path: string, body?: unknown) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

async function cleanup() {
  try {
    await pool.query(`DELETE FROM user_journey_progress WHERE user_id LIKE $1`, [`${PREFIX}%`]);
    await pool.query(`DELETE FROM users WHERE id LIKE $1`, [`${PREFIX}%`]);
    if (clerkUserId) await clerk("DELETE", `/users/${clerkUserId}`);
    const { rows } = await pool.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM users WHERE id LIKE $1 OR email LIKE $1`,
      [`${PREFIX}%`],
    );
    check(Number(rows[0]?.count) === 0, "net-zero teardown", rows);
  } catch (error) {
    failures += 1;
    console.error("FAIL: teardown", error);
  }
}

try {
  const user = await clerk("POST", "/users", {
    email_address: [email],
    external_id: bridgeId,
    skip_password_requirement: true,
  });
  clerkUserId = user.id;
  const session = await clerk("POST", "/sessions", { user_id: clerkUserId });
  sessionId = session.id;
  const jwt = await token();

  // Two requests from stale tabs race the first enrollment. The UPSERT exposes
  // exactly one created=true, regardless of ordering.
  const [startA, startB] = await Promise.all([
    api(jwt, "POST", `/api/journeys/${JOURNEY_ID}/start`),
    api(jwt, "POST", `/api/journeys/${JOURNEY_ID}/start`),
  ]);
  check(
    [startA.status, startB.status].every((status) => status === 200) &&
      [startA.body?.created, startB.body?.created].filter(Boolean).length === 1,
    "concurrent starts return exactly one created=true",
    { startA, startB },
  );

  const { rows: stepRows } = await pool.query<{ id: number; step_number: number }>(
    `SELECT id, step_number FROM journey_steps WHERE journey_id = $1 ORDER BY step_number, id`,
    [JOURNEY_ID],
  );
  const byStep = new Map<number, number[]>();
  for (const row of stepRows) byStep.set(row.step_number, [...(byStep.get(row.step_number) ?? []), row.id]);
  const stepNumbers = [...byStep.keys()].sort((a, b) => a - b);
  check(stepNumbers.length >= 2 && (byStep.get(stepNumbers[1])?.length ?? 0) > 1, "fixture has a multi-row logical step");

  const progress = (ids: number[]) =>
    api(jwt, "PUT", `/api/journeys/${JOURNEY_ID}/progress`, { stepIds: ids, completed: true });

  // Race a multi-row step: the winner is the sole logical-step transition.
  const firstIds = byStep.get(stepNumbers[0])!;
  const [stepA, stepB] = await Promise.all([progress(firstIds), progress(firstIds)]);
  check(
    [stepA.body?.logicalStepBecameComplete, stepB.body?.logicalStepBecameComplete].filter(Boolean).length === 1,
    "concurrent duplicate logical-step writes return exactly one transition",
    { stepA, stepB },
  );

  // Bring the journey to its last logical step, then race final completion.
  for (const stepNumber of stepNumbers.slice(1, -1)) {
    const result = await progress(byStep.get(stepNumber)!);
    check(result.status === 200 && result.body?.logicalStepBecameComplete === true, `step ${stepNumber} transitions once`, result);
  }
  const finalIds = byStep.get(stepNumbers[stepNumbers.length - 1])!;
  const [finalA, finalB] = await Promise.all([progress(finalIds), progress(finalIds)]);
  check(
    [finalA.body?.logicalStepBecameComplete, finalB.body?.logicalStepBecameComplete].filter(Boolean).length === 1,
    "concurrent final-step writes return exactly one logical-step transition",
    { finalA, finalB },
  );
  check(
    [finalA.body?.journeyBecameComplete, finalB.body?.journeyBecameComplete].filter(Boolean).length === 1,
    "concurrent final-step writes return exactly one journey-complete transition",
    { finalA, finalB },
  );
} catch (error) {
  failures += 1;
  console.error("FAIL: unexpected journey funnel race error", error);
} finally {
  await cleanup();
  await pool.end();
}

if (failures > 0) {
  process.exitCode = 1;
  console.error(`journey-funnel-transition-races: ${failures} failure(s)`);
} else {
  console.log("journey-funnel-transition-races: all checks passed");
}
/**
 * Regression gate for learning-preference revision races (Task: stale settings
 * tabs must never revive reset learning choices).
 *
 * Runs REAL concurrent API calls against the live server with a throwaway
 * Clerk-authenticated account:
 *
 *  A. Two same-revision PUT /api/user/preferences fire concurrently →
 *     exactly one 200 and one 409 (monotonic revision guard).
 *  B. With the row physically deleted, a "no row observed" save
 *     (expectedRevision:null) races DELETE (reset). Whatever the interleaving,
 *     the final public state must be preferences:null (tombstone wins or the
 *     reset clears the freshly inserted row — stale values can never survive).
 *  C. A stale save carrying a pre-reset revision is rejected with 409 and the
 *     old preference values are NOT restored.
 *
 * Teardown is net-zero: the Clerk user and all local rows are removed and a
 * residue sweep over the __qa_test_prefs_races_ prefix must come back empty.
 *
 * Requirements: server on BASE_URL (default http://127.0.0.1:5000),
 * CLERK_SECRET_KEY, DATABASE_URL.
 */
import { Pool } from "pg";

const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:5000";
const CLERK_API = "https://api.clerk.com/v1";
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
const DATABASE_URL = process.env.DATABASE_URL;
if (!CLERK_SECRET_KEY) throw new Error("CLERK_SECRET_KEY is required");
if (!DATABASE_URL) throw new Error("DATABASE_URL is required");

const RESIDUE_PREFIX = "__qa_test_prefs_races_";
const bridgeId = `${RESIDUE_PREFIX}${Date.now()}`;
const email = `${bridgeId}@example.com`;

const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 1,
  connectionTimeoutMillis: 15_000,
});

let failures = 0;
function check(ok: boolean, label: string, detail?: unknown) {
  if (ok) {
    console.log(`PASS: ${label}`);
  } else {
    failures += 1;
    console.error(`FAIL: ${label}${detail === undefined ? "" : ` — ${JSON.stringify(detail)}`}`);
  }
}

async function clerk(method: string, path: string, body?: unknown) {
  const res = await fetch(`${CLERK_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${CLERK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Clerk ${method} ${path} → ${res.status}: ${JSON.stringify(json)}`);
  }
  return json as any;
}

let clerkUserId: string | undefined;
let sessionId: string | undefined;

/** Session tokens expire after ~60s; mint a fresh one per scenario. */
async function freshToken(): Promise<string> {
  const token = await clerk("POST", `/sessions/${sessionId}/tokens`, {});
  if (!token?.jwt) throw new Error("Clerk returned no session JWT");
  return token.jwt as string;
}

type ApiResult = { status: number; body: any };
async function api(
  jwt: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<ApiResult> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const parsed = await res.json().catch(() => null);
  return { status: res.status, body: parsed };
}

const SAVE_A = {
  skillLevel: "beginner",
  learningGoals: ["learn-fundamentals"],
  preferredResourceTypes: ["video"],
  timeCommitment: "flexible",
};
const SAVE_B = {
  skillLevel: "advanced",
  learningGoals: ["optimize-encoding"],
  preferredResourceTypes: ["article"],
  timeCommitment: "flexible",
};

async function teardown() {
  if (clerkUserId) {
    try {
      await clerk("DELETE", `/users/${clerkUserId}`);
    } catch (error) {
      console.error("Clerk user delete failed:", error);
      failures += 1;
    }
  }
  // Sweep ALL residue for this prefix, not just this run's account, so prior
  // aborted runs cannot accumulate (net-zero across sessions).
  await pool.query(
    `DELETE FROM user_preferences WHERE user_id LIKE $1`,
    [`${RESIDUE_PREFIX}%`],
  );
  await pool.query(`DELETE FROM users WHERE id LIKE $1`, [`${RESIDUE_PREFIX}%`]);
  const { rows } = await pool.query<{ surface: string; count: string }>(
    `SELECT 'users' AS surface, count(*)::text AS count FROM users WHERE id LIKE $1 OR email LIKE $1
     UNION ALL
     SELECT 'user_preferences', count(*)::text FROM user_preferences WHERE user_id LIKE $1`,
    [`${RESIDUE_PREFIX}%`],
  );
  const dirty = rows.filter((row) => Number(row.count) > 0);
  check(
    dirty.length === 0,
    "net-zero teardown (no QA residue remains)",
    dirty.map((row) => `${row.surface}=${row.count}`),
  );
}

try {
  // ---- Setup: throwaway Clerk account whose bridge id is our QA prefix ----
  const user = await clerk("POST", "/users", {
    email_address: [email],
    external_id: bridgeId,
    skip_password_requirement: true,
  });
  clerkUserId = user.id;
  const session = await clerk("POST", "/sessions", { user_id: clerkUserId });
  sessionId = session.id;

  let jwt = await freshToken();
  const initial = await api(jwt, "GET", "/api/user/preferences");
  check(
    initial.status === 200 &&
      initial.body?.preferences === null &&
      initial.body?.revision === null,
    "fresh account starts with preferences:null, revision:null",
    initial,
  );

  // ---- Scenario A: two same-revision saves race → exactly one 200 + one 409
  const seeded = await api(jwt, "PUT", "/api/user/preferences", {
    ...SAVE_A,
    expectedRevision: null,
  });
  check(seeded.status === 200, "seed save with expectedRevision:null succeeds", seeded);
  const seedRevision = seeded.body?.revision;
  check(Number.isInteger(seedRevision), "seed save returns an integer revision", seeded.body);

  const [raceA1, raceA2] = await Promise.all([
    api(jwt, "PUT", "/api/user/preferences", { ...SAVE_A, expectedRevision: seedRevision }),
    api(jwt, "PUT", "/api/user/preferences", { ...SAVE_B, expectedRevision: seedRevision }),
  ]);
  const statusesA = [raceA1.status, raceA2.status].sort();
  check(
    statusesA[0] === 200 && statusesA[1] === 409,
    "concurrent same-revision saves → exactly one 200 and one 409",
    { first: raceA1.status, second: raceA2.status },
  );
  const winner = raceA1.status === 200 ? raceA1 : raceA2;
  check(
    winner.body?.revision === seedRevision + 1,
    "winning save advanced the revision monotonically",
    winner.body?.revision,
  );

  // ---- Scenario B: physically missing row — first save races reset --------
  // Delete the row out from under the API to reproduce the "no row exists"
  // state both tabs can observe.
  await pool.query(`DELETE FROM user_preferences WHERE user_id = $1`, [bridgeId]);
  jwt = await freshToken();
  const preB = await api(jwt, "GET", "/api/user/preferences");
  check(
    preB.status === 200 && preB.body?.preferences === null && preB.body?.revision === null,
    "row physically removed: API reports no preferences and no revision",
    preB,
  );

  const [saveB, resetB] = await Promise.all([
    api(jwt, "PUT", "/api/user/preferences", { ...SAVE_A, expectedRevision: null }),
    api(jwt, "DELETE", "/api/user/preferences", { expectedRevision: null }),
  ]);
  check(
    [saveB.status, resetB.status].every((status) => status === 200 || status === 409),
    "missing-row save vs reset: both requests resolve to 200 or 409",
    { save: saveB.status, reset: resetB.status },
  );
  const afterB = await api(jwt, "GET", "/api/user/preferences");
  check(
    afterB.status === 200 && afterB.body?.preferences === null,
    "after save-vs-reset race the public state is preferences:null",
    afterB,
  );
  check(
    Number.isInteger(afterB.body?.revision),
    "cleared-state tombstone retains a revision after the race",
    afterB.body,
  );

  // ---- Scenario C: stale save after reset must not revive old choices -----
  const tombstoneRevision = afterB.body?.revision;
  const saveC = await api(jwt, "PUT", "/api/user/preferences", {
    ...SAVE_B,
    expectedRevision: tombstoneRevision,
  });
  check(saveC.status === 200, "save on top of the tombstone succeeds", saveC);
  const staleRevision = saveC.body?.revision;

  jwt = await freshToken();
  const resetC = await api(jwt, "DELETE", "/api/user/preferences", {
    expectedRevision: staleRevision,
  });
  check(
    resetC.status === 200 && resetC.body?.preferences === null,
    "reset with the current revision succeeds and returns preferences:null",
    resetC,
  );

  const staleSave = await api(jwt, "PUT", "/api/user/preferences", {
    ...SAVE_B,
    expectedRevision: staleRevision,
  });
  check(
    staleSave.status === 409,
    "stale save carrying the pre-reset revision is rejected with 409",
    staleSave,
  );
  const finalC = await api(jwt, "GET", "/api/user/preferences");
  check(
    finalC.status === 200 && finalC.body?.preferences === null,
    "old preference values were NOT restored (preferences stays null)",
    finalC,
  );
  check(
    finalC.body?.revision === resetC.body?.revision,
    "revision unchanged by the rejected stale save",
    { final: finalC.body?.revision, reset: resetC.body?.revision },
  );

  const { rows: dbRows } = await pool.query(
    `SELECT skill_level, learning_goals, preferred_resource_types, preferred_categories
     FROM user_preferences WHERE user_id = $1`,
    [bridgeId],
  );
  check(
    dbRows.length === 1 &&
      dbRows[0].skill_level === "beginner" &&
      Array.isArray(dbRows[0].learning_goals) &&
      dbRows[0].learning_goals.length === 0 &&
      dbRows[0].preferred_resource_types.length === 0 &&
      dbRows[0].preferred_categories.length === 0,
    "physical row is the cleared tombstone (no stale values on disk)",
    dbRows,
  );
} catch (error) {
  failures += 1;
  console.error("FAIL: unexpected error during preference race checks:", error);
} finally {
  try {
    await teardown();
  } finally {
    await pool.end();
  }
}

if (failures > 0) {
  console.error(`preferences-revision-races: ${failures} failure(s)`);
  process.exitCode = 1;
} else {
  console.log("preferences-revision-races: all checks passed");
}

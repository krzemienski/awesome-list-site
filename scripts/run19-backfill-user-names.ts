/**
 * Run19 BUG-009 — backfill display names for users registered before names
 * were derived at signup (register endpoint now stores firstName = email
 * local part; see server/routes.ts /api/auth/register).
 *
 * Works entirely through the live admin API so the SAME code path runs
 * against dev (validation) and prod (prod DB is not agent-writable):
 *   1. Login as admin (local login) → session cookie.
 *   2. Page through GET /api/admin/users.
 *   3. For every user with no firstName AND no lastName, PATCH
 *      /api/admin/users/:id/name with firstName = email local part.
 *
 * Idempotent: a second run finds 0 users with null names and no-ops.
 *
 * Usage:
 *   ADMIN_PASSWORD=$ADMIN_PASSWORD PROD_BASE=http://localhost:5000 npx tsx scripts/run19-backfill-user-names.ts
 *   ADMIN_PASSWORD=$PROD_ADMIN_PASSWORD PROD_BASE=https://awesome.video npx tsx scripts/run19-backfill-user-names.ts
 */

const BASE = process.env.PROD_BASE || "http://localhost:5000";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@example.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_PASSWORD) {
  console.error("ADMIN_PASSWORD env var is required");
  process.exit(1);
}

interface AdminUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string | null;
}

async function main() {
  // 1. Login — pin the session cookie from the login response only.
  const loginRes = await fetch(`${BASE}/api/auth/local/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  if (!loginRes.ok) {
    console.error(`Login failed: ${loginRes.status} ${await loginRes.text()}`);
    process.exit(1);
  }
  const setCookie = loginRes.headers.get("set-cookie") || "";
  const sid = setCookie.split(";")[0];
  if (!sid.startsWith("connect.sid=")) {
    console.error("No connect.sid cookie in login response");
    process.exit(1);
  }
  const headers = { Cookie: sid, "Content-Type": "application/json" };

  // 2. Collect all users (page through).
  const all: AdminUser[] = [];
  let page = 1;
  for (;;) {
    const res = await fetch(`${BASE}/api/admin/users?page=${page}&limit=100`, { headers });
    if (!res.ok) {
      console.error(`GET users page ${page} failed: ${res.status}`);
      process.exit(1);
    }
    const body = (await res.json()) as { users: AdminUser[]; total: number };
    all.push(...body.users);
    if (all.length >= body.total || body.users.length === 0) break;
    page += 1;
  }
  console.log(`Fetched ${all.length} users from ${BASE}`);

  // 3. Backfill nameless local users. Skip QA throwaways — they get torn down.
  const nameless = all.filter(
    (u) => !u.firstName && !u.lastName && u.email && !u.email.startsWith("__qa_test"),
  );
  console.log(`Users with no name: ${nameless.length}`);

  let ok = 0;
  let failed = 0;
  for (const u of nameless) {
    const local = (u.email as string).split("@")[0].slice(0, 100);
    const res = await fetch(`${BASE}/api/admin/users/${u.id}/name`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ firstName: local }),
    });
    if (res.ok) {
      ok += 1;
      console.log(`  ✓ ${u.id} → firstName "${local}"`);
    } else {
      failed += 1;
      console.error(`  ✗ ${u.id}: ${res.status} ${(await res.text()).slice(0, 120)}`);
    }
  }

  console.log(JSON.stringify({ base: BASE, totalUsers: all.length, nameless: nameless.length, updated: ok, failed }));
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

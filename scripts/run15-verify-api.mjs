// Run15 API verification — server-verifiable findings:
// BUG-001/003/008/010/013/017/029/037/042/049 (+BUG-011 stuck-row check hook)
const BASE = "http://localhost:5000";
const results = [];
const ok = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"} ${name} — ${detail}`);
};
const j = async (path, opts = {}) => {
  const r = await fetch(BASE + path, { redirect: "manual", ...opts });
  let body = null;
  try { body = await r.clone().json(); } catch { body = await r.text().catch(() => null); }
  return { r, body };
};
const cookieOf = (r) => (r.headers.getSetCookie?.() ?? []).map(c => c.split(";")[0]).join("; ");

const TS = Date.now();
const QA_EMAIL = `__qa_test_run15_case_${TS}@example.com`;
const QA_PASS = "Xk9#mQ2$wPz7Lr4!";

// --- BUG-001: duplicate accounts via email case variants -------------------
let qaCookie = "";
{
  const first = await j("/api/auth/register", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: QA_EMAIL, password: QA_PASS }),
  });
  qaCookie = cookieOf(first.r);
  const upper = QA_EMAIL.replace("__qa_test_run15_case_", "__QA_TEST_RUN15_CASE_");
  const second = await j("/api/auth/register", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: upper, password: QA_PASS }),
  });
  ok("BUG-001 case-variant register blocked",
    (first.r.status === 200 || first.r.status === 201) && second.r.status === 409,
    `first=${first.r.status}, case-variant=${second.r.status} ${JSON.stringify(second.body).slice(0, 100)}`);
  // register does not auto-login — establish a session for the QA user
  const login = await j("/api/auth/local/login", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: QA_EMAIL, password: QA_PASS }),
  });
  qaCookie = cookieOf(login.r) || qaCookie;
  if (login.r.status !== 200) console.error("QA LOGIN FAILED", login.r.status, login.body);
}

// --- Admin login (single attempt — login burst limit is 5/min) --------------
let adminCookie = "";
{
  const { r, body } = await j("/api/auth/local/login", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@example.com", password: process.env.ADMIN_PASSWORD }),
  });
  adminCookie = cookieOf(r);
  if (r.status !== 200) { console.error("ADMIN LOGIN FAILED", r.status, body); process.exit(2); }
}

// --- BUG-003 (server half): real server pagination on /api/resources -------
{
  const p1 = await j("/api/resources?page=1&limit=50");
  const p2 = await j("/api/resources?page=2&limit=50");
  const l1 = p1.body?.resources ?? p1.body?.items ?? [];
  const l2 = p2.body?.resources ?? p2.body?.items ?? [];
  const ids1 = new Set(l1.map(x => x.id));
  const overlap = l2.filter(x => ids1.has(x.id)).length;
  const total = p1.body?.total ?? p1.body?.totalCount;
  ok("BUG-003 server pagination", l1.length === 50 && l2.length === 50 && overlap === 0 && Number(total) > 100,
    `p1=${l1.length} p2=${l2.length} overlap=${overlap} total=${total}`);
}

// --- BUG-008: server rejects >10 tags on submit ------------------------------
{
  const tags = Array.from({ length: 12 }, (_, i) => `qa-tag-${i}`);
  const { r, body } = await j("/api/resources", {
    method: "POST", headers: { "Content-Type": "application/json", Cookie: qaCookie },
    body: JSON.stringify({
      title: "__qa_test_run15 tag cap probe", url: `https://example.com/__qa_run15_${TS}`,
      description: "QA probe — should be rejected for 12 tags before insert.",
      category: "Intro & Learning", metadata: { tags },
    }),
  });
  ok("BUG-008 server tag cap", r.status === 400,
    `metadata.tags×12 -> ${r.status} ${JSON.stringify(body).slice(0, 140)}`);
}

// --- BUG-010: admin journeys stepCount == public distinct stepNumber count --
{
  const admin = await j("/api/admin/journeys", { headers: { Cookie: adminCookie } });
  const journeys = Array.isArray(admin.body) ? admin.body : admin.body?.journeys ?? [];
  let allMatch = journeys.length > 0, det = [];
  for (const jn of journeys) {
    const pub = await j(`/api/journeys/${jn.id}`);
    const steps = pub.body?.steps ?? [];
    const distinct = new Set(steps.map(s => Number(s.stepNumber))).size;
    const adminCount = jn.stepCount ?? jn.steps;
    det.push(`j${jn.id}: admin=${adminCount} public=${distinct}`);
    if (Number(adminCount) !== distinct) allMatch = false;
  }
  ok("BUG-010 admin/public step-count parity", allMatch, det.join(" | "));
}

// --- BUG-013: recommendations vary (not all 75% "Popular among users") ------
{
  const { r, body } = await j("/api/recommendations");
  const recs = body?.recommendations ?? body ?? [];
  const arr = Array.isArray(recs) ? recs : [];
  const scores = new Set(arr.map(x => x.score ?? x.matchScore));
  const reasons = new Set(arr.map(x => x.reason));
  ok("BUG-013 rec variance", r.status === 200 && arr.length > 0 && (scores.size > 1 || reasons.size > 1),
    `n=${arr.length} scores=${[...scores].slice(0,5).join(",")} reasons=${reasons.size} distinct`);
}

// --- BUG-017: /api/user/progress reflects favorites/bookmarks ---------------
{
  const before = await j("/api/user/progress", { headers: { Cookie: qaCookie } });
  await j("/api/favorites/187906", { method: "POST", headers: { Cookie: qaCookie } });
  const after = await j("/api/user/progress", { headers: { Cookie: qaCookie } });
  const pick = (b) => JSON.stringify(b);
  const changed = pick(before.body) !== pick(after.body);
  ok("BUG-017 progress reflects activity", before.r.status === 200 && changed,
    `before=${pick(before.body)?.slice(0, 120)} after=${pick(after.body)?.slice(0, 120)}`);
}

// --- BUG-029: change-password rejects new === current ------------------------
{
  const { r, body } = await j("/api/user/change-password", {
    method: "POST", headers: { "Content-Type": "application/json", Cookie: qaCookie },
    body: JSON.stringify({ currentPassword: QA_PASS, newPassword: QA_PASS }),
  });
  ok("BUG-029 same-password rejected", r.status === 400,
    `same pw -> ${r.status} ${JSON.stringify(body).slice(0, 120)}`);
}

// --- BUG-037: trailing-space URL accepted (trimmed) --------------------------
{
  const list = await j("/api/resources?page=1&limit=1");
  const existing = (list.body?.resources ?? list.body?.items ?? [])[0]?.url;
  const clean = await j(`/api/resources/check-url?url=${encodeURIComponent(existing)}`);
  const spaced = await j(`/api/resources/check-url?url=${encodeURIComponent(existing + "  ")}`);
  ok("BUG-037 trailing-space URL trimmed",
    clean.r.status === 200 && spaced.r.status === 200 &&
    clean.body?.exists === true && spaced.body?.exists === true,
    `url=${existing?.slice(0, 60)} clean=${JSON.stringify(clean.body).slice(0, 60)} spaced=${JSON.stringify(spaced.body).slice(0, 60)}`);
}

// --- BUG-042: CSV export masks emails ----------------------------------------
{
  const r = await fetch(BASE + "/api/admin/users/export", { headers: { Cookie: adminCookie } });
  const csv = await r.text();
  const fullEmailLeak = /[A-Za-z0-9._%+-]{2,}@(?!example\.com,?$)[A-Za-z0-9.-]+\.[A-Za-z]{2,}/m
    .test(csv.split("\n").slice(1).map(l => l.split(",")[1] ?? "").join("\n"));
  const hasMasked = /•{2,}/.test(csv);
  ok("BUG-042 CSV emails masked", r.status === 200 && hasMasked && !fullEmailLeak,
    `status=${r.status} masked-cells=${hasMasked} leak=${fullEmailLeak} sample=${csv.split("\n")[1]?.slice(0, 80)}`);
}

// --- BUG-049: PATCH /api/user/profile display name ---------------------------
{
  const { r, body } = await j("/api/user/profile", {
    method: "PATCH", headers: { "Content-Type": "application/json", Cookie: qaCookie },
    body: JSON.stringify({ firstName: "QA", lastName: "Probe" }),
  });
  const me = await j("/api/auth/user", { headers: { Cookie: qaCookie } });
  const gotName = body?.firstName === "QA" && body?.lastName === "Probe" &&
    me.body?.user?.name === "QA Probe";
  ok("BUG-049 profile name PATCH", r.status === 200 && gotName,
    `patch=${r.status} ${JSON.stringify(body).slice(0, 100)} authUser.name=${me.body?.user?.name}`);
}

const fails = results.filter(x => !x.pass);
console.log(`\n${results.length - fails.length}/${results.length} PASS`);
process.exit(fails.length ? 1 : 0);

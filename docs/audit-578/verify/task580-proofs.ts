/**
 * Task 580 end-user proofs (A01–A05 live recipes; A06 spec/curl checks).
 *
 * Real running app only (BASE_URL, default http://127.0.0.1:5000), two
 * throwaway Clerk users minted through the Clerk backend, fixtures created
 * through the real submission/admin APIs, all prefixed __qa_test_plan_580_.
 * Teardown: Clerk users first, then local rows by exact id, then a residue
 * SQL sweep that must return 0.
 *
 *   npx tsx docs/audit-578/verify/task580-proofs.ts
 *
 * Writes a JSON evidence log to /tmp/task580/proofs.json (copied into
 * docs/audit-578/verify/ by hand after the run).
 */
import { Pool } from "pg";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:5000";
const CLERK_API = "https://api.clerk.com/v1";
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY!;
const ADMIN_KEY = process.env.ADMIN_PASSWORD!;
const DATABASE_URL = process.env.DATABASE_URL!;
for (const [k, v] of Object.entries({ CLERK_SECRET_KEY, ADMIN_KEY, DATABASE_URL })) {
  if (!v) throw new Error(`${k} is required`);
}

const TS = Date.now();
const PREFIX = "__qa_test_plan_580_";
const RUN = `${PREFIX}${TS}`;
const MARK = "__qa_test_plan_marker"; // every private value carries this
const WORD = `zqxplan${TS.toString(36)}`; // unique searchable word in titles
const TAG = `qa-test-plan-580-${TS.toString(36)}`;
const ONLY = (process.env.ONLY ?? "A01,A02,A03,A04,A05,A06").split(",");

const pool = new Pool({ connectionString: DATABASE_URL, max: 1 });
const log: any = { run: RUN, base: BASE, startedAt: new Date().toISOString(), checks: [] as any[] };
let failures = 0;
function check(item: string, ok: boolean, label: string, detail?: unknown) {
  log.checks.push({ item, ok, label, detail });
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"} [${item}] ${label}${!ok && detail !== undefined ? " — " + JSON.stringify(detail).slice(0, 400) : ""}`);
}

async function clerk(method: string, path: string, body?: unknown) {
  const res = await fetch(`${CLERK_API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${CLERK_SECRET_KEY}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Clerk ${method} ${path} → ${res.status}: ${JSON.stringify(json)}`);
  return json as any;
}

type U = { label: string; bridgeId: string; clerkId?: string; sessionId?: string };
async function mintUser(label: string): Promise<U> {
  const bridgeId = `${RUN}_${label}`;
  const u = await clerk("POST", "/users", {
    email_address: [`${bridgeId}@example.com`],
    external_id: bridgeId,
    skip_password_requirement: true,
  });
  const s = await clerk("POST", "/sessions", { user_id: u.id });
  return { label, bridgeId, clerkId: u.id, sessionId: s.id };
}
async function jwt(u: U) {
  const t = await clerk("POST", `/sessions/${u.sessionId}/tokens`, {});
  return t.jwt as string;
}

type R = { status: number; body: any; text: string; headers: Headers };
async function call(method: string, path: string, opts: { token?: string; body?: unknown; admin?: boolean; auth?: string } = {}): Promise<R> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  if (opts.auth) headers.Authorization = opts.auth;
  if (opts.admin) {
    headers["X-Admin-Audit-Key"] = ADMIN_KEY;
    headers.Origin = BASE;
  }
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  const text = await res.text();
  let body: any = null;
  try { body = JSON.parse(text); } catch { /* html */ }
  return { status: res.status, body, text, headers: res.headers };
}
const excerpt = (r: R, n = 300) => ({ status: r.status, body: r.text.slice(0, n) });

const users: U[] = [];
const resourceIds: number[] = [];
const apiKeyIds: string[] = [];
const collectionIds: number[] = [];

async function submit(token: string, n: string, extraMeta: Record<string, unknown> = {}) {
  const r = await call("POST", "/api/resources", {
    token,
    body: {
      title: `${RUN} ${WORD} ${n}`,
      url: `https://example.com/${RUN}/${n}`,
      description: `${RUN} public description for fixture ${n}, used by the task 580 proofs.`,
      category: "Encoding & Codecs",
      metadata: { tags: [TAG], ...extraMeta },
    },
  });
  if (r.status !== 201) throw new Error(`submit ${n} → ${JSON.stringify(excerpt(r))}`);
  resourceIds.push(r.body.id);
  return r.body.id as number;
}

const PRIVATE_META = {
  agent: `${MARK}_agent`,
  cost: `${MARK}_cost_0.42`,
  costUsd: `${MARK}_costUsd`,
  email: `${MARK}@example.com`,
  submitterEmail: `${MARK}_submitter@example.com`,
  ip: `${MARK}_ip_10.9.9.9`,
  ipAddress: `${MARK}_ipAddress`,
  internalNotes: `${MARK}_internalNotes`,
  notes: `${MARK}_notes`,
  model: `${MARK}_model`,
  researchJobId: `${MARK}_researchJobId`,
  nested: { secret: `${MARK}_nested` },
};

async function main() {
  const A = await mintUser("a");
  users.push(A);
  const B = await mintUser("b");
  users.push(B);
  let tA = await jwt(A);
  let tB = await jwt(B);
  const meA = await call("GET", "/api/auth/user", { token: tA });
  const meB = await call("GET", "/api/auth/user", { token: tB });
  check("setup", meA.body?.user?.id === A.bridgeId && meB.body?.user?.id === B.bridgeId, "two throwaway Clerk users JIT-provisioned", { a: meA.body?.user?.id, b: meB.body?.user?.id, aRole: meA.body?.user?.role, bRole: meB.body?.user?.role });

  // ---- Fixtures through the real submission + moderation APIs ----
  const R1 = await submit(tA, "r1-approved", PRIVATE_META);
  const R2 = await submit(tA, "r2-pending", PRIVATE_META);
  const R3 = await submit(tA, "r3-rejected", PRIVATE_META);
  const R4 = await submit(tA, "r4-withdrawn", PRIVATE_META);
  const R5 = await submit(tA, "r5-formerly-approved", PRIVATE_META);
  log.fixtures = { R1, R2, R3, R4, R5 };
  const ap1 = await call("PUT", `/api/resources/${R1}/approve`, { admin: true });
  const ap5 = await call("PUT", `/api/resources/${R5}/approve`, { admin: true });
  const rj3 = await call("PUT", `/api/resources/${R3}/reject`, { admin: true });
  tA = await jwt(A);
  const wd4 = await call("POST", `/api/user/contributions/resource/${R4}/withdraw`, { token: tA });
  const { rows: st } = await pool.query(`SELECT id, status, metadata ? 'internalNotes' AS has_private FROM resources WHERE id = ANY($1::int[]) ORDER BY id`, [`{${resourceIds.join(",")}}`]);
  check("setup", ap1.status === 200 && ap5.status === 200 && rj3.status === 200 && wd4.status === 200, "fixtures moderated via real admin/owner APIs", { ap1: ap1.status, ap5: ap5.status, rj3: rj3.status, wd4: excerpt(wd4, 150), db: st });

  // ===================== A01 =====================
  if (ONLY.includes("A01")) {
    const surfaces: Array<[string, () => Promise<R>, boolean]> = [
      ["anon GET /api/resources/:id", () => call("GET", `/api/resources/${R1}`), true],
      ["anon GET /api/resources?tags=<fixture tag>", () => call("GET", `/api/resources?tags=${TAG}`), true],
      ["anon GET /api/resources?q=<fixture word>&facets=true", () => call("GET", `/api/resources?q=${WORD}&facets=true`), true],
      ["anon GET /api/search?q=<fixture word>", () => call("GET", `/api/search?q=${WORD}`), true],
      ["anon GET /api/home", () => call("GET", `/api/home`), false],
      ["anon GET /api/resources/:id/related", () => call("GET", `/api/resources/${R1}/related`), false],
      ["anon GET /api/awesome-list", () => call("GET", `/api/awesome-list`), true],
      ["anon GET /api/awesome-list?category=Encoding & Codecs", () => call("GET", `/api/awesome-list?category=${encodeURIComponent("Encoding & Codecs")}`), true],
      ["anon GET /api/awesome-list/listing?level=category&slug=encoding-codecs", () => call("GET", `/api/awesome-list/listing?level=category&slug=encoding-codecs`), false],
      ["anon GET /api/public/resources?search=<word>", () => call("GET", `/api/public/resources?search=${WORD}`), true],
      ["anon GET /api/public/resources/:id", () => call("GET", `/api/public/resources/${R1}`), true],
      ["anon GET /api/recommendations (guest, no refresh)", () => call("GET", `/api/recommendations?limit=50`), false],
      ["anon GET /resource/:id (SSR HTML)", () => call("GET", `/resource/${R1}`), true],
    ];
    for (const [label, fn, mustContain] of surfaces) {
      const r = await fn();
      const leaks = r.text.includes(MARK);
      const present = r.text.includes(RUN);
      check("A01", r.status === 200 && !leaks && (!mustContain || present), `${label}: 200, fixture ${present ? "present" : "absent"}, private markers ${leaks ? "LEAKED" : "absent"}`, excerpt(r, 200));
    }
    // Signed-in owner surfaces: bookmark, favorite, collection, recent view.
    tA = await jwt(A);
    const bm = await call("POST", `/api/bookmarks/${R1}`, { token: tA, body: { notes: `${RUN} owner note` } });
    const fv = await call("POST", `/api/favorites/${R1}`, { token: tA });
    const vw = await call("POST", `/api/interactions`, { token: tA, body: { resourceId: R1, interactionType: "view" } });
    const col = await call("POST", `/api/collections`, { token: tA, body: { name: `${RUN} collection` } });
    if (col.body?.id) collectionIds.push(col.body.id);
    const add = await call("POST", `/api/collections/${col.body?.id}/items/${R1}`, { token: tA });
    const pub = await call("POST", `/api/collections/${col.body?.id}/publish`, { token: tA });
    check("A01", [bm.status, fv.status, vw.status].every((s) => s === 200 || s === 201) && col.status === 201 && [200, 201].includes(add.status) && pub.status === 200 && !!pub.body?.shareId, "owner bookmark/favorite/view/collection publish succeed for the approved fixture", { bm: bm.status, fv: fv.status, vw: vw.status, col: col.status, add: add.status, pub: pub.status });
    {
      // Documented exemption (docs/API.md): the shared-collection read is a site
      // endpoint, not the developer API — Authorization is ignored entirely, so
      // a bad key gets the same body as anonymous and no developer-tier limit.
      const sharePath = `/api/public/collections/${pub.body?.shareId}`;
      const anonShare = await call("GET", sharePath);
      const badShare = await call("GET", sharePath, { auth: "Bearer not-a-real-key" });
      const shareInfo = (r: R) => ({ status: r.status, limit: r.headers.get("ratelimit-limit"), vary: r.headers.get("vary"), cc: r.headers.get("cache-control"), bytes: r.text.length });
      log.sharedCollectionExemption = { anon: shareInfo(anonShare), badKey: shareInfo(badShare) };
      check("A01", anonShare.status === 200 && badShare.status === 200 && anonShare.text === badShare.text && !["60", "1000"].includes(badShare.headers.get("ratelimit-limit") ?? ""), "shared collection read ignores Authorization (documented site-endpoint exemption from the developer key policy)", log.sharedCollectionExemption);
    }
    const signed: Array<[string, () => Promise<R>]> = [
      ["signed-in GET /api/bookmarks", () => call("GET", `/api/bookmarks`, { token: tA })],
      ["signed-in GET /api/favorites", () => call("GET", `/api/favorites`, { token: tA })],
      ["signed-in GET /api/user/continue-learning", () => call("GET", `/api/user/continue-learning`, { token: tA })],
      ["signed-in GET /api/collections", () => call("GET", `/api/collections`, { token: tA })],
      ["signed-in GET /api/resources/:id", () => call("GET", `/api/resources/${R1}`, { token: tA })],
      ["anon GET /api/public/collections/:shareId", () => call("GET", `/api/public/collections/${pub.body?.shareId}`)],
    ];
    tA = await jwt(A);
    for (const [label, fn] of signed) {
      const r = await fn();
      const leaks = r.text.includes(MARK);
      // The collections list carries collection rows (no resource payloads).
      const present = label.endsWith("/api/collections") ? r.text.includes(RUN) : r.text.includes(String(R1));
      check("A01", r.status === 200 && !leaks && present, `${label}: 200, fixture present, private markers ${leaks ? "LEAKED" : "absent"}`, excerpt(r, 200));
    }
    const detail = await call("GET", `/api/resources/${R1}`);
    log.a01DetailSample = { keys: Object.keys(detail.body ?? {}), metadata: detail.body?.metadata };
    check("A01", !!detail.body?.metadata && !("internalNotes" in detail.body.metadata) && Array.isArray(detail.body.metadata.tags), "detail metadata is the allowlisted projection (tags kept, private keys dropped)", log.a01DetailSample);
  }

  // ===================== A02 =====================
  if (ONLY.includes("A02")) {
    tB = await jwt(B);
    // B saves R5 while it is still approved (must work).
    const preF = await call("POST", `/api/favorites/${R5}`, { token: tB });
    const preB = await call("POST", `/api/bookmarks/${R5}`, { token: tB, body: { notes: `${RUN} b note on r5` } });
    const okF = await call("POST", `/api/favorites/${R1}`, { token: tB });
    const okB = await call("POST", `/api/bookmarks/${R1}`, { token: tB });
    check("A02", preF.status === 200 && preB.status === 200 && okF.status === 200 && okB.status === 200, "approved saves still work (R1, R5 while approved)", { preF: preF.status, preB: preB.status, okF: okF.status, okB: okB.status });
    // Admin moves R5 out of public status.
    const arch = await call("PUT", `/api/admin/resources/${R5}`, { admin: true, body: { status: "archived" } });
    check("A02", arch.status === 200 && arch.body?.status === "archived", "admin archives formerly approved R5", excerpt(arch, 150));
    tB = await jwt(B);
    for (const [name, id] of [["pending R2", R2], ["rejected R3", R3], ["withdrawn R4", R4], ["formerly-approved R5", R5]] as const) {
      const d = await call("GET", `/api/resources/${id}`, { token: tB });
      const f = await call("POST", `/api/favorites/${id}`, { token: tB });
      const b = await call("POST", `/api/bookmarks/${id}`, { token: tB, body: { notes: "x" } });
      check("A02", d.status === 404 && f.status === 404 && b.status === 404, `B on ${name}: detail ${d.status}, favorite ${f.status}, bookmark ${b.status}`, { d: excerpt(d, 120), f: excerpt(f, 120), b: excerpt(b, 120) });
    }
    // Owner A gets the same answer for its own non-public submissions.
    tA = await jwt(A);
    const ownF = await call("POST", `/api/favorites/${R2}`, { token: tA });
    const ownB = await call("POST", `/api/bookmarks/${R2}`, { token: tA });
    check("A02", ownF.status === 404 && ownB.status === 404, `owner A saving own pending R2: favorite ${ownF.status}, bookmark ${ownB.status}`);
    tB = await jwt(B);
    const nonPublic = [R2, R3, R4, R5];
    for (const [who, tok] of [["B", tB], ["A", tA]] as const) {
      for (const path of ["/api/bookmarks", "/api/favorites"]) {
        const r = await call("GET", path, { token: tok });
        const ids = Array.isArray(r.body) ? r.body.map((x: any) => x.id) : [];
        const leakIds = ids.filter((id: number) => nonPublic.includes(id));
        const leakText = ["r2-pending", "r3-rejected", "r4-withdrawn", "r5-formerly-approved"].filter((s) => r.text.includes(s));
        check("A02", r.status === 200 && leakIds.length === 0 && leakText.length === 0 && ids.includes(R1), `${who} GET ${path}: R1 listed, no non-public ids/titles/urls`, { ids, leakIds, leakText });
      }
    }
    const vw = await call("POST", `/api/interactions`, { token: tB, body: { resourceId: R5, interactionType: "view" } });
    const cl = await call("GET", `/api/user/continue-learning`, { token: tB });
    check("A02", vw.status === 404 && !cl.text.includes("r5-formerly-approved"), `B view of archived R5 → ${vw.status}; continue-learning shows no R5 title`, excerpt(cl, 200));
    const { rows } = await pool.query(`SELECT count(*)::int AS n FROM user_bookmarks WHERE user_id = $1 AND resource_id = $2`, [B.bridgeId, R5]);
    log.a02 = { bRowForR5Retained: rows[0].n };
  }

  // ===================== A03 =====================
  if (ONLY.includes("A03")) {
    tB = await jwt(B);
    const readNote = async () => {
      tB = await jwt(B);
      const r = await call("GET", "/api/bookmarks", { token: tB });
      return (r.body as any[]).find((x) => x.id === R1)?.notes;
    };
    const multi = `${RUN} line one\nline two\r\n\ttabbed <script>alert(1)</script> & "quotes"`;
    const set = await call("POST", `/api/bookmarks/${R1}`, { token: tB, body: { notes: multi } });
    check("A03", set.status === 200 && (await readNote()) === multi, "multiline/tab/markup text note round-trips verbatim", { status: set.status, echoed: set.body?.notes });
    const bad: Array<[string, unknown]> = [
      ["object", { bad: true }],
      ["array", ["a", "b"]],
      ["boolean", true],
      ["number", 42],
      ["null", null],
      ["501 chars", "x".repeat(501)],
      ["control char \\u0007", "bell\u0007"],
      ["NUL", "nul\u0000"],
    ];
    for (const [label, value] of bad) {
      tB = await jwt(B);
      const r = await call("POST", `/api/bookmarks/${R1}`, { token: tB, body: { notes: value } });
      const after = await readNote();
      check("A03", r.status === 400 && after === multi, `notes=${label} → ${r.status}, prior note kept`, { resp: excerpt(r, 160), kept: after === multi });
    }
    tB = await jwt(B);
    const n500 = "y".repeat(500);
    const ok500 = await call("POST", `/api/bookmarks/${R1}`, { token: tB, body: { notes: n500 } });
    check("A03", ok500.status === 200 && (await readNote()) === n500, "500-character note → 200 and stored");
    const bare = await call("POST", `/api/bookmarks/${R1}`, { token: tB, body: {} });
    check("A03", bare.status === 200 && (await readNote()) === n500, "bare duplicate save (no notes) → 200, annotation preserved");
    tB = await jwt(B);
    const clr = await call("POST", `/api/bookmarks/${R1}`, { token: tB, body: { notes: "" } });
    const cleared = await readNote();
    // The list omits empty annotations (notes: row.notes || undefined); the DB
    // row is the source of truth for "cleared".
    const { rows: dbNote } = await pool.query(`SELECT notes FROM user_bookmarks WHERE user_id = $1 AND resource_id = $2`, [B.bridgeId, R1]);
    check("A03", clr.status === 200 && (cleared === "" || cleared === null || cleared === undefined) && (dbNote[0]?.notes ?? "") === "", "empty-string notes clears the annotation", { clr: excerpt(clr, 200), listNotes: cleared === undefined ? "<omitted>" : cleared, dbNotes: dbNote[0]?.notes });
  }

  // ===================== A04 =====================
  if (ONLY.includes("A04")) {
    tA = await jwt(A);
    const prem = await call("POST", "/api/user/api-keys", { token: tA, body: { name: `${RUN} premium`, scopes: ["premium"] } });
    const std = await call("POST", "/api/user/api-keys", { token: tA, body: { name: `${RUN} standard`, scopes: ["Standard"] } });
    check("A04", prem.status === 400 && std.status === 400, "self-assigning a tier scope (premium / Standard) → 400", { prem: excerpt(prem, 200), std: std.status });
    const mk = async (n: string) => {
      const r = await call("POST", "/api/user/api-keys", { token: tA, body: { name: `${RUN} ${n}`, scopes: ["read"] } });
      if (r.status !== 201) throw new Error(`key ${n}: ${JSON.stringify(excerpt(r))}`);
      apiKeyIds.push(r.body.apiKey.id);
      return { id: String(r.body.apiKey.id), key: r.body.key as string };
    };
    const K1 = await mk("k1");
    const K2 = await mk("k2-revoked");
    const K3 = await mk("k3-expired");
    const rv = await call("DELETE", `/api/user/api-keys/${K2.id}`, { token: tA });
    await pool.query(`UPDATE api_keys SET expires_at = now() - interval '1 minute' WHERE id = $1`, [K3.id]);
    log.a04Keys = { K1: K1.id, K2: K2.id, K3: K3.id, revoke: rv.status };
    const hdr = (r: R) => ({ status: r.status, limit: r.headers.get("ratelimit-limit"), remaining: r.headers.get("ratelimit-remaining"), policy: r.headers.get("ratelimit-policy") });
    const g1 = hdr(await call("GET", "/api/public/resources?limit=1"));
    const g2 = hdr(await call("GET", "/api/public/resources?limit=1"));
    check("A04", g1.limit === "60" && Number(g2.remaining) === Number(g1.remaining) - 1, "guest: RateLimit-Limit 60, IP bucket decrements", { g1, g2 });
    const kAuth = `Bearer ${K1.key}`;
    const endpoints = ["/api/public/resources?limit=1", `/api/public/resources/${R1}`, "/api/public/categories", "/api/public/tags"];
    const kh: any[] = [];
    for (const ep of endpoints) kh.push({ ep, ...hdr(await call("GET", ep, { auth: kAuth })) });
    const decrements = kh.every((h, i) => i === 0 || Number(h.remaining) === Number(kh[i - 1].remaining) - 1);
    check("A04", kh.every((h) => h.status === 200 && h.limit === "1000") && decrements, "valid key: RateLimit-Limit 1000 on all 4 public endpoints, own bucket decrements", kh);
    const g3 = hdr(await call("GET", "/api/public/resources?limit=1"));
    check("A04", Number(g3.remaining) === Number(g2.remaining) - 1, "key calls did not consume the guest IP bucket", { g2, g3 });
    const me = await call("GET", "/api/public/me", { auth: kAuth });
    check("A04", me.status === 200 && me.body?.tier === "standard" && me.body?.rateLimit?.limit === 1000, "/api/public/me reports server-assigned standard tier", me.body);
    // A legacy key row that already carries a "premium" scope (pre-fix data)
    // still gets the standard limit: scopes never drive the tier.
    await pool.query(`UPDATE api_keys SET scopes = '["premium"]'::jsonb WHERE id = $1`, [K1.id]);
    const legacy = hdr(await call("GET", "/api/public/categories", { auth: kAuth }));
    check("A04", legacy.status === 200 && legacy.limit === "1000", "legacy key row with scopes=[premium] still limited at 1000 (no upgrade)", legacy);
    for (const [label, auth, expect] of [
      ["invalid key", "Bearer not-a-real-key", "Invalid API key"],
      ["revoked key", `Bearer ${K2.key}`, "revoked"],
      ["expired key", `Bearer ${K3.key}`, "expired"],
      ["malformed header", `Token ${K1.key}`, "Invalid Authorization header"],
    ] as const) {
      const r = await call("GET", "/api/public/resources?limit=1", { auth });
      check("A04", r.status === 401 && String(r.body?.message).includes(expect), `${label} → 401 (${r.body?.message})`, excerpt(r, 160));
    }
    // Cache partitioning: shared caches must key on Authorization; keyed
    // responses are never shared-cached; 401s are never stored.
    const cc = (r: R) => ({ status: r.status, cc: r.headers.get("cache-control"), vary: r.headers.get("vary"), limit: r.headers.get("ratelimit-limit") });
    const varies = (v: string | null) => (v ?? "").toLowerCase().split(/\s*,\s*/).includes("authorization");
    const cacheRows: any[] = [];
    for (const ep of endpoints) {
      const anon = cc(await call("GET", ep));
      const keyed = cc(await call("GET", ep, { auth: kAuth }));
      const badk = cc(await call("GET", ep, { auth: "Bearer not-a-real-key" }));
      cacheRows.push({ ep, anon, keyed, bad: badk });
    }
    log.a04Cache = cacheRows;
    check("A04", cacheRows.every((x) => x.anon.status === 200 && x.anon.cc === "public, max-age=60" && varies(x.anon.vary)), "anonymous public responses: public, max-age=60 + Vary: Authorization", cacheRows.map((x) => ({ ep: x.ep, ...x.anon })));
    check("A04", cacheRows.every((x) => x.keyed.status === 200 && x.keyed.cc === "private, no-store" && varies(x.keyed.vary)), "keyed public responses: private, no-store + Vary: Authorization", cacheRows.map((x) => ({ ep: x.ep, ...x.keyed })));
    check("A04", cacheRows.every((x) => x.bad.status === 401 && x.bad.cc === "no-store" && varies(x.bad.vary)), "bad-key 401s: no-store + Vary: Authorization", cacheRows.map((x) => ({ ep: x.ep, ...x.bad })));
    const meCc = cc(await call("GET", "/api/public/me", { auth: kAuth }));
    check("A04", meCc.status === 200 && meCc.limit === "1000" && meCc.cc === "private, no-store", "/api/public/me is rate-limited in the key's standard bucket and never cached", meCc);
    const { rows } = await pool.query(`SELECT limiter, key, hits FROM rate_limit_hits WHERE key LIKE $1 ORDER BY limiter`, [`%apikey:${K1.id}%`]);
    log.a04Buckets = rows;
    check("A04", rows.length > 0 && rows.every((r: any) => String(r.limiter).includes("standard")), "shared store holds a standard-tier bucket keyed by the key id", rows);
  }

  // ===================== A05 =====================
  if (ONLY.includes("A05")) {
    const pubT = await call("GET", "/api/public/tags");
    const catT = await call("GET", "/api/tags");
    const { rows } = await pool.query(`SELECT count(DISTINCT lower(t))::int AS n FROM resources r, jsonb_array_elements_text(CASE WHEN jsonb_typeof(r.metadata->'tags')='array' THEN r.metadata->'tags' ELSE '[]'::jsonb END) t WHERE r.status = 'approved'`);
    const same = JSON.stringify(pubT.body) === JSON.stringify(catT.body);
    log.a05 = { publicTotal: pubT.body?.total, catalogTotal: catT.body?.total, sqlDistinctApprovedTags: rows[0].n, first5: pubT.body?.tags?.slice(0, 5) };
    check("A05", pubT.status === 200 && same && pubT.body?.tags?.length > 1000, `/api/public/tags deep-equals /api/tags (${pubT.body?.tags?.length} tags)`, log.a05);
    const fx = pubT.body?.tags?.find((t: any) => t.tag === TAG);
    const top = pubT.body?.tags?.[0]?.tag;
    const browse = await call("GET", `/api/resources?tags=${encodeURIComponent(top)}&limit=1`);
    check("A05", fx?.count === 1 && browse.status === 200 && browse.body?.total === pubT.body.tags[0].count, `fixture tag counted (1); top tag "${top}" browse total equals its count`, { fx, browseTotal: browse.body?.total, topCount: pubT.body.tags[0].count });
  }

  // ===================== A06 =====================
  if (ONLY.includes("A06")) {
    const spec = (await call("GET", "/api/openapi.json")).body;
    const params = (p: string) => (spec.paths?.[p]?.get?.parameters ?? []).map((x: any) => x.name);
    const res = params("/api/resources");
    const srch = params("/api/search");
    const lst = params("/api/awesome-list/listing");
    const pubR = params("/api/public/resources");
    log.a06 = { resources: res, search: srch, listing: lst, publicResources: pubR, publicTags: params("/api/public/tags") };
    const need = ["q", "search", "category", "subcategory", "subSubcategory", "tags", "tag", "provider", "format", "skillLevel", "kind", "sort", "facets", "page", "limit", "offset", "cursor"];
    const unrelated = ["afterSeq", "jobId", "resourceId", "categoryId", "subcategoryId", "per_page"];
    check("A06", need.every((n) => res.includes(n)) && !unrelated.some((n) => res.includes(n)), "/api/resources documents every real filter and no unrelated generic keys", res);
    check("A06", srch.includes("q") && !unrelated.some((n) => srch.includes(n)), "/api/search documents q/search/limit/offset only", srch);
    check("A06", lst.includes("kind") && !unrelated.some((n) => lst.includes(n)), "/api/awesome-list/listing documents kind", lst);
    check("A06", ["page", "limit", "category", "subcategory", "search"].every((n) => pubR.includes(n)) && !unrelated.some((n) => pubR.includes(n)) && params("/api/public/tags").length === 0, "/api/public/resources documents its real filters; /api/public/tags has none", { pubR });
    const kindParam = spec.paths["/api/resources"].get.parameters.find((x: any) => x.name === "kind");
    log.a06.kindParam = kindParam;
    const examples: Array<[string, (r: R) => boolean]> = [
      ["/api/resources?q=hls&kind=tools&sort=name-asc&limit=5", (r) => r.status === 200 && Array.isArray(r.body?.resources)],
      ["/api/resources?tags=open-source&facets=true&limit=1", (r) => r.status === 200 && !!r.body?.facets],
      ["/api/search?q=webrtc&limit=5", (r) => r.status === 200 && r.body?.results?.length > 0],
      ["/api/awesome-list/listing?level=category&slug=encoding-codecs&kind=tools", (r) => r.status === 200 && Array.isArray(r.body?.resources)],
      ["/api/resources?provider=YouTube&limit=1", (r) => r.status === 200],
      ["/api/resources?kind=bogus", (r) => r.status === 400 && r.body?.error === "invalid_kind" && Array.isArray(r.body?.allowed)],
      ["/api/resources?sort=bogus", (r) => r.status === 400 && r.body?.error === "invalid_sort"],
      ["/api/resources?provider=nope", (r) => r.status === 400 && r.body?.error === "invalid_provider"],
      ["/api/resources?limit=500", (r) => r.status === 400],
      ["/api/resources?q=hls&q=dash&limit=1", (r) => r.status === 200],
      ["/api/search?q=webrtc&limit=abc", (r) => r.status === 400 && r.body?.error === "validation_failed"],
      ["/api/search?q=webrtc&limit=999", (r) => r.status === 200 && r.body?.limit === 200],
      ["/api/awesome-list/listing?level=category&slug=encoding-codecs&kind=bogus", (r) => r.status === 400],
    ];
    for (const [path, ok] of examples) {
      const r = await call("GET", path);
      check("A06", ok(r), `GET ${path} → ${r.status}`, excerpt(r, 220));
    }
  }
}

async function teardown() {
  for (const u of users) {
    try { await clerk("DELETE", `/users/${u.clerkId}`); } catch (e) { failures += 1; console.error("clerk delete failed", e); }
  }
  await new Promise((r) => setTimeout(r, 1500));
  const ids = `{${resourceIds.join(",")}}`;
  const uids = users.map((u) => u.bridgeId);
  await pool.query(`DELETE FROM resource_edits WHERE resource_id = ANY($1::int[]) OR submitted_by = ANY($2::text[])`, [ids, uids]);
  await pool.query(`UPDATE research_discoveries SET created_resource_id = NULL WHERE created_resource_id = ANY($1::int[])`, [ids]);
  await pool.query(`DELETE FROM resources WHERE id = ANY($1::int[])`, [ids]);
  await pool.query(`DELETE FROM api_keys WHERE id = ANY($1::text[])`, [apiKeyIds]);
  await pool.query(`DELETE FROM rate_limit_hits WHERE key = ANY($1::text[])`, [apiKeyIds.map((id) => `apikey:${id}`)]);
  await pool.query(`DELETE FROM users WHERE id = ANY($1::text[])`, [uids]);
  const { rows } = await pool.query(`
    SELECT 'resources' s, count(*)::int n FROM resources WHERE title LIKE '${PREFIX}%' OR url LIKE '%${PREFIX}%'
    UNION ALL SELECT 'users', count(*)::int FROM users WHERE id LIKE '${PREFIX}%' OR email LIKE '${PREFIX}%'
    UNION ALL SELECT 'api_keys', count(*)::int FROM api_keys WHERE name LIKE '${PREFIX}%'
    UNION ALL SELECT 'bookmark_collections', count(*)::int FROM bookmark_collections WHERE name LIKE '${PREFIX}%'
    UNION ALL SELECT 'user_bookmarks', count(*)::int FROM user_bookmarks WHERE user_id LIKE '${PREFIX}%'
    UNION ALL SELECT 'user_favorites', count(*)::int FROM user_favorites WHERE user_id LIKE '${PREFIX}%'
    UNION ALL SELECT 'user_interactions', count(*)::int FROM user_interactions WHERE user_id LIKE '${PREFIX}%'
    UNION ALL SELECT 'rate_limit_hits(api keys)', count(*)::int FROM rate_limit_hits WHERE key = ANY($1::text[])`, [apiKeyIds.map((id) => `apikey:${id}`)]);
  log.residue = rows;
  check("teardown", rows.every((r: any) => r.n === 0), "residue SQL returns 0 on every surface", rows);
}

try {
  await main();
} catch (e: any) {
  failures += 1;
  console.error("ABORT:", e?.stack ?? e);
  log.abort = String(e?.message ?? e);
} finally {
  try { await teardown(); } catch (e) { failures += 1; console.error("teardown error", e); }
  log.failures = failures;
  log.finishedAt = new Date().toISOString();
  mkdirSync("/tmp/task580", { recursive: true });
  writeFileSync(`/tmp/task580/proofs-${ONLY.join("-")}.json`, JSON.stringify(log, null, 2));
  await pool.end();
  console.log(`\n${failures === 0 ? "ALL PASS" : `${failures} FAILURE(S)`} — log /tmp/task580/proofs-${ONLY.join("-")}.json`);
  process.exit(failures === 0 ? 0 : 1);
}

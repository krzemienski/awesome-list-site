/**
 * Run22 data fixes (BUG-028) — applied via the live admin HTTP API (prod DB is
 * not directly writable from the agent environment; mirrors
 * scripts/run22-link-fixes-prod.ts). Base-configurable so the exact same code
 * path is validated against dev first (PROD_BASE=http://localhost:5000).
 *
 * BUG-028 — ten destinations use plain HTTP. Disposition (July 20, 2026):
 *   - avisynth.nl + umezawa.dyndns.info were already repointed to secure
 *     GitHub URLs (BUG-004/005, scripts/run22-link-fixes-prod.ts).
 *   - zuggy.wz.cz: HTTPS serves the hoster's 403 "HTTPS není dostupné"
 *     (HTTPS not available) page — the https:// form present in dev is
 *     BROKEN and is reverted to the working http:// original.
 *   - The remaining 7 hosts were TLS-probed live (openssl s_client): every
 *     cert presented is for a DIFFERENT domain (kindahl.com,
 *     *.web-hosting.com, ffmpeg.org, *.securedata.net, bareware.granjow.net)
 *     or the connection is refused/reset — browsers would hard-fail. These
 *     keep their official HTTP URLs.
 *   - All 8 HTTP-only resources get a clear user-facing annotation appended
 *     to the description (idempotent — marker-checked before write).
 *
 * BUG-029 — the directory lists itself as a resource. Resource 184919
 *   (url https://awesome.video/) is rejected via PUT /api/resources/:id/reject
 *   (the approved-state status path; zero FK references verified in dev).
 *   The upstream GitHub repo entry (github.com/krzemienski/awesome-video)
 *   stays — that IS the externalized form of the list.
 *
 * Idempotent: a rule whose condition no longer matches is a no-op.
 * Journaled to evidence/run22/data-fixes-<env>.json.
 *
 * Run AFTER republish: ADMIN_PASSWORD=... npx tsx scripts/run22-data-fixes-prod.ts
 * Dev validation:      PROD_BASE=http://localhost:5000 ADMIN_PASSWORD=... npx tsx scripts/run22-data-fixes-prod.ts
 */
import fs from "fs";

const BASE = process.env.PROD_BASE || "https://awesome.video";
const EMAIL = process.env.ADMIN_EMAIL || "admin@example.com";
const PASSWORD = process.env.ADMIN_PASSWORD;
const ENV_TAG = BASE.includes("localhost") ? "dev" : "prod";

if (!PASSWORD) {
  console.error("ADMIN_PASSWORD not set in env — aborting.");
  process.exit(1);
}

const journal: any = { startedAt: new Date().toISOString(), base: BASE, actions: [] };
function log(entry: any) {
  journal.actions.push(entry);
  console.log(JSON.stringify(entry).slice(0, 300));
}

let cookie = "";
async function api(path: string, init: RequestInit = {}) {
  const r = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      ...(init.headers || {}),
    },
  });
  let body: any = null;
  try {
    body = await r.json();
  } catch {
    /* non-JSON */
  }
  return { status: r.status, body };
}

async function login(): Promise<void> {
  for (let attempt = 1; attempt <= 4; attempt++) {
    const r = await fetch(`${BASE}/api/auth/local/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    });
    if (r.ok) {
      const setCookies: string[] =
        (r.headers as any).getSetCookie?.() ??
        [r.headers.get("set-cookie")].filter(Boolean);
    const sid = setCookies.find((c) => c.startsWith("connect.sid="));
      if (!sid) throw new Error("login OK but no connect.sid in response");
      cookie = sid.split(";")[0];
      console.log(`[login] ok (attempt ${attempt})`);
      return;
    }
    console.log(`[login] attempt ${attempt} -> ${r.status}`);
    await new Promise((res) => setTimeout(res, 5000 * attempt));
  }
  throw new Error("login failed after retries");
}

// ---------------------------------------------------------------- rule table

const host = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

// Marker string that makes the annotation append idempotent.
const HTTP_NOTE_MARKER = "served over plain HTTP";
const HTTP_NOTE =
  " Note: the official site is served over plain HTTP — the host does not support HTTPS.";
const DESCRIPTION_MAX = 1000;

// Hosts verified TLS-incapable on July 20, 2026 (openssl s_client transcript
// in fix-evidence/BUG-028/tls-transcript.txt).
const HTTP_ONLY_HOSTS = new Set([
  "cinepaint.org",
  "infrarecorder.org",
  "lives-video.com",
  "live555.com",
  "mplayerhq.hu",
  "dranger.com",
  "slowmovideo.granjow.net",
  "zuggy.wz.cz",
]);

// --------------------------------------------------------------------- main

async function fetchAllResources(): Promise<
  Array<{ id: number; url: string; title: string; status: string }>
> {
  const out: Array<{ id: number; url: string; title: string; status: string }> = [];
  let page = 1;
  for (;;) {
    const { status, body } = await api(`/api/admin/resources?limit=100&page=${page}`);
    if (status !== 200) throw new Error(`admin resources page ${page} -> ${status}`);
    const rows = body.resources || body.data || body;
    if (!Array.isArray(rows) || rows.length === 0) break;
    for (const r of rows) out.push({ id: r.id, url: r.url, title: r.title, status: r.status });
    if (rows.length < 100) break;
    page++;
  }
  return out;
}

async function main() {
  await login();
  const resources = await fetchAllResources();
  console.log(`fetched ${resources.length} resources from ${BASE}`);

  const candidates = resources.filter((r) => r.url && HTTP_ONLY_HOSTS.has(host(r.url)));
  log({ finding: "BUG-028", candidates: candidates.map((r) => ({ id: r.id, url: r.url })) });

  for (const c of candidates) {
    // Fresh read before every write decision (bulk list can be 60s stale).
    const freshRes = await api(`/api/resources/${c.id}`);
    if (freshRes.status !== 200 || !freshRes.body) {
      log({ finding: "BUG-028", id: c.id, action: "fresh-read-failed", status: freshRes.status });
      continue;
    }
    const fresh = freshRes.body.resource || freshRes.body;
    const update: Record<string, any> = {};
    const reasons: string[] = [];

    // zuggy.wz.cz: revert broken https:// to the working http:// original.
    if (host(fresh.url) === "zuggy.wz.cz" && fresh.url.startsWith("https://")) {
      update.url = fresh.url.replace(/^https:\/\//, "http://");
      reasons.push("revert-broken-https");
    }

    // Annotation append (idempotent via marker).
    const desc: string = fresh.description || "";
    if (!desc.includes(HTTP_NOTE_MARKER)) {
      const annotated = (desc.trimEnd() + HTTP_NOTE).trim();
      if (annotated.length <= DESCRIPTION_MAX) {
        update.description = annotated;
        reasons.push("annotate-http-only");
      } else {
        log({ finding: "BUG-028", id: c.id, action: "skip-annotation-too-long", len: annotated.length });
      }
    }

    if (Object.keys(update).length === 0) {
      log({ finding: "BUG-028", id: c.id, action: "noop-already-applied" });
      continue;
    }
    const put = await api(`/api/admin/resources/${c.id}`, {
      method: "PUT",
      body: JSON.stringify(update),
    });
    log({
      finding: "BUG-028",
      id: c.id,
      url: fresh.url,
      action: "write",
      reasons,
      fields: Object.keys(update),
      status: put.status,
      ...(put.status !== 200 ? { error: put.body?.message || put.body } : {}),
    });
  }

  // ---- BUG-029: self-entry -----------------------------------------------
  // Matched by URL host (not id) so it applies identically to both corpora.
  const selfEntries = resources.filter(
    (r) => r.url && host(r.url) === "awesome.video",
  );
  for (const s of selfEntries) {
    const freshRes = await api(`/api/resources/${s.id}`);
    if (freshRes.status !== 200 || !freshRes.body) {
      log({ finding: "BUG-029", id: s.id, action: "fresh-read-failed", status: freshRes.status });
      continue;
    }
    const fresh = freshRes.body.resource || freshRes.body;
    if (fresh.status !== "approved") {
      log({ finding: "BUG-029", id: s.id, action: "noop-already-non-approved", status: fresh.status });
      continue;
    }
    const put = await api(`/api/resources/${s.id}/reject`, { method: "PUT" });
    log({
      finding: "BUG-029",
      id: s.id,
      url: fresh.url,
      action: "reject-self-entry",
      status: put.status,
      ...(put.status !== 200 ? { error: put.body?.message || put.body } : {}),
    });
  }
  if (selfEntries.length === 0) log({ finding: "BUG-029", action: "noop", matched: 0 });

  // ---- BUG-034: Journey 8 step 6 — Part I must precede Part 2 -------------
  // The API/UI order rows sharing a stepNumber by row id (deterministic
  // tiebreaker added in LearningJourneyRepository). On prod the two
  // "FFmpeg vs TwitchTranscoder" rows were inserted Part 2 first, so the
  // id-order shows Part 2 before Part I. Fix = swap the two rows'
  // resourceIds via the admin steps API. Idempotent: noop when the
  // lower-id row already carries Part I.
  {
    const jr = await api(`/api/journeys/8`);
    const step6 = ((jr.body?.steps as any[]) || [])
      .filter((s) => s.stepNumber === 6 && s.resource?.title)
      .sort((a, b) => a.id - b.id);
    const first = step6[0];
    const second = step6[1];
    if (!first || !second) {
      log({ finding: "BUG-034", action: "skip-unexpected-shape", rows: step6.length });
    } else if (/part\s*(i\b|1)/i.test(first.resource.title) && /part\s*2/i.test(second.resource.title)) {
      log({ finding: "BUG-034", action: "noop-already-ordered", firstId: first.id, secondId: second.id });
    } else if (/part\s*2/i.test(first.resource.title) && /part\s*(i\b|1)/i.test(second.resource.title)) {
      const p1 = await api(`/api/admin/journeys/8/steps/${first.id}`, {
        method: "PATCH",
        body: JSON.stringify({ resourceId: second.resource.id }),
      });
      const p2 = await api(`/api/admin/journeys/8/steps/${second.id}`, {
        method: "PATCH",
        body: JSON.stringify({ resourceId: first.resource.id }),
      });
      log({
        finding: "BUG-034",
        action: "swap-resource-ids",
        firstRow: { id: first.id, was: first.resource.id, now: second.resource.id, status: p1.status },
        secondRow: { id: second.id, was: second.resource.id, now: first.resource.id, status: p2.status },
      });
    } else {
      log({
        finding: "BUG-034",
        action: "skip-titles-unrecognized",
        titles: [first.resource.title, second.resource.title],
      });
    }
  }

  journal.finishedAt = new Date().toISOString();
  fs.mkdirSync("evidence/run22", { recursive: true });
  fs.writeFileSync(
    `evidence/run22/data-fixes-${ENV_TAG}.json`,
    JSON.stringify(journal, null, 2),
  );
  console.log(`journal written to evidence/run22/data-fixes-${ENV_TAG}.json`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

/**
 * Task 290 final pass: apply the actionable findings surfaced by the first
 * post-triage full scan (job 8). The script is idempotent:
 * - rows already carrying the target URL are reported as healthy no-ops
 * - a missing duplicate row is reported as an already-completed delete
 *
 * Run: npx tsx scripts/fix-dead-links-task290-final-prod.ts
 */
import fs from "fs";

const BASE = process.env.PROD_BASE || "https://awesome.video";
const EMAIL = process.env.ADMIN_EMAIL || "admin@example.com";
const PASSWORD = process.env.ADMIN_PASSWORD;
const ENV_TAG = BASE.includes("localhost") ? "dev" : "prod";

if (!PASSWORD) {
  console.error("ADMIN_PASSWORD not set");
  process.exit(1);
}

const FIXES = [
  {
    id: 189570,
    to: "https://rtcon.swmansion.com/",
    note: "follow the second redirect hop from rtcon.live",
  },
  {
    id: 189566,
    to: "https://www.cs.princeton.edu/courses/archive/fall16/cos561/papers/NetFlix12.pdf",
    note: "the Princeton server uses a case-sensitive filename",
  },
  {
    id: 189475,
    to: "https://static.vsf.tv/activity_groups/RIST_poster_for_VidTrans2018Feb25.pdf",
    note: "the VSF server uses a case-sensitive filename",
  },
  {
    id: 188897,
    to: "https://foms-workshop.org/foms2024/Notes/CommonMediaLibrary.html",
    note: "the FOMS page requires the .html suffix",
  },
  {
    id: 188315,
    to: "https://www.cta.tech/media/41ehiilm/cta-5001-e-final.pdf",
    note: "CTA-5001-C was retired; use the current E revision",
  },
  {
    id: 187932,
    to: "https://www.cta.tech/wave-project/specifications/",
    note: "CTA-5005-A PDF was retired; use the current and archived specification index",
  },
  {
    id: 184760,
    to: "https://github.com/mozilla/popcorn-js/",
    note: "the retired project site redirects to the archived repository",
  },
] as const;

const DUPLICATE = {
  id: 188800,
  ownerId: 188798,
  canonicalUrl: "https://dashif.org/Ingest/",
  note: "the dead Azure-hosted living spec duplicates the canonical DASH-IF Ingest resource",
} as const;

let cookie = "";

async function api(path: string, init: RequestInit = {}) {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Origin: BASE,
      Cookie: cookie,
      ...(init.headers || {}),
    },
  });
  let body: any = null;
  try {
    body = await response.json();
  } catch {
    // Some admin failures have an empty response body.
  }
  return { status: response.status, body };
}

async function login() {
  const response = await fetch(`${BASE}/api/auth/local/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!response.ok) throw new Error(`login failed: ${response.status}`);

  const setCookies: string[] =
    (response.headers as any).getSetCookie?.() ??
    [response.headers.get("set-cookie")].filter(Boolean);
  const sessionCookie = setCookies.find((value) =>
    value.startsWith("connect.sid="),
  );
  if (!sessionCookie) throw new Error("login succeeded without connect.sid");
  cookie = sessionCookie.split(";")[0];
}

async function fetchAllResources() {
  const resources: Array<{ id: number; title: string; url: string }> = [];
  for (let page = 1; ; page++) {
    const { status, body } = await api(
      `/api/admin/resources?limit=100&page=${page}`,
    );
    if (status !== 200) throw new Error(`resource page ${page}: ${status}`);
    const rows = body.resources || body.data || body;
    if (!Array.isArray(rows) || rows.length === 0) break;
    resources.push(...rows);
    if (rows.length < 100) break;
  }
  return resources;
}

async function main() {
  await login();
  const resources = await fetchAllResources();
  const byId = new Map(resources.map((resource) => [resource.id, resource]));
  const actions: any[] = [];
  const log = (action: any) => {
    actions.push(action);
    console.log(JSON.stringify(action));
  };

  for (const fix of FIXES) {
    const resource = byId.get(fix.id);
    if (!resource) {
      log({ ...fix, action: "skip-row-missing" });
      continue;
    }
    if (resource.url === fix.to) {
      log({ ...fix, action: "noop-already-fixed" });
      continue;
    }
    const result = await api(`/api/admin/resources/${fix.id}`, {
      method: "PUT",
      body: JSON.stringify({ url: fix.to }),
    });
    log({
      ...fix,
      from: resource.url,
      action: "repoint",
      httpStatus: result.status,
    });
  }

  const duplicate = byId.get(DUPLICATE.id);
  const owner = byId.get(DUPLICATE.ownerId);
  if (!duplicate) {
    log({ ...DUPLICATE, action: "noop-duplicate-already-deleted" });
  } else if (!owner || owner.url !== DUPLICATE.canonicalUrl) {
    log({
      ...DUPLICATE,
      action: "skip-canonical-owner-mismatch",
      actualOwnerUrl: owner?.url,
    });
  } else {
    const result = await api(`/api/admin/resources/${DUPLICATE.id}`, {
      method: "DELETE",
    });
    log({
      ...DUPLICATE,
      title: duplicate.title,
      from: duplicate.url,
      action: "delete-duplicate",
      httpStatus: result.status,
    });
  }

  const journal = {
    startedAt: new Date().toISOString(),
    base: BASE,
    actions,
  };
  fs.mkdirSync("evidence/task290", { recursive: true });
  fs.writeFileSync(
    `evidence/task290/final-fixes-${ENV_TAG}.json`,
    JSON.stringify(journal, null, 2),
  );

  const failures = actions.filter(
    (action) =>
      (action.httpStatus && action.httpStatus >= 400) ||
      action.action === "skip-canonical-owner-mismatch",
  );
  console.log(`Done. ${actions.length} actions, ${failures.length} failures.`);
  if (failures.length > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
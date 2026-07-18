/**
 * Run19 BUG-013 — eliminate exact-duplicate resource titles.
 *
 * The audit found titles appearing verbatim on 2+ distinct resources (e.g.
 * "Plyr" as both the official site and the GitHub repo). Deleting is unsafe
 * (cascades journey steps / bookmarks), so we RETITLE: within each duplicate
 * group the "most official" entry keeps the bare title and every other entry
 * gets a host-derived disambiguator, e.g. "Plyr (GitHub)".
 *
 * Dynamic — recomputes the duplicate set from the live catalog on every run,
 * so the same script fixes dev (12 pairs) and prod (19 per the audit).
 * Idempotent: a second run finds no duplicates and no-ops.
 *
 * Runs through the live admin API (prod DB is not agent-writable):
 *   ADMIN_PASSWORD=$ADMIN_PASSWORD PROD_BASE=http://localhost:5000 npx tsx scripts/run19-retitle-dup-titles.ts
 *   ADMIN_PASSWORD=$PROD_ADMIN_PASSWORD PROD_BASE=https://awesome.video npx tsx scripts/run19-retitle-dup-titles.ts
 */

const BASE = process.env.PROD_BASE || "http://localhost:5000";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@example.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const DRY_RUN = process.env.DRY_RUN === "1";

if (!ADMIN_PASSWORD) {
  console.error("ADMIN_PASSWORD env var is required");
  process.exit(1);
}

interface Res {
  id: number;
  title: string;
  url: string;
  status: string;
}

/** Friendly labels for well-known hosts; fall back to the bare host. */
const HOST_LABELS: Record<string, string> = {
  "github.com": "GitHub",
  "gitlab.com": "GitLab",
  "medium.com": "Medium",
  "developer.mozilla.org": "MDN",
  "www.w3.org": "W3C",
  "w3.org": "W3C",
  "en.wikipedia.org": "Wikipedia",
  "www.youtube.com": "YouTube",
  "youtube.com": "YouTube",
};

function hostLabel(url: string): string {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (HOST_LABELS[host]) return HOST_LABELS[host];
    return host.replace(/^www\./, "");
  } catch {
    return "alt";
  }
}

/** Officialness: non-repo/mirror hosts win the bare title. Lower = keeps title. */
function officialRank(url: string): number {
  const label = hostLabel(url);
  if (["GitHub", "GitLab", "Medium", "Wikipedia", "YouTube"].includes(label)) return 1;
  return 0;
}

async function main() {
  const loginRes = await fetch(`${BASE}/api/auth/local/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  if (!loginRes.ok) {
    console.error(`Login failed: ${loginRes.status}`);
    process.exit(1);
  }
  const sid = (loginRes.headers.get("set-cookie") || "").split(";")[0];
  if (!sid.startsWith("connect.sid=")) {
    console.error("No connect.sid cookie");
    process.exit(1);
  }
  const headers = { Cookie: sid, "Content-Type": "application/json" };

  // Page through the full catalog (all statuses that surface publicly = approved).
  const all: Res[] = [];
  let page = 1;
  for (;;) {
    const res = await fetch(
      `${BASE}/api/admin/resources?status=approved&page=${page}&limit=100`,
      { headers },
    );
    if (!res.ok) {
      console.error(`GET resources page ${page} failed: ${res.status}`);
      process.exit(1);
    }
    const body = (await res.json()) as { resources: Res[]; total: number };
    all.push(...body.resources);
    if (all.length >= body.total || body.resources.length === 0) break;
    page += 1;
  }
  console.log(`Fetched ${all.length} approved resources from ${BASE}`);

  // Group case-insensitively — matches the submit pipeline's duplicate-title
  // guard (which rejects case-variant collisions), so "Iina" vs "IINA" pairs
  // get disambiguated too, not just byte-exact duplicates.
  const byTitle = new Map<string, Res[]>();
  for (const r of all) {
    const key = r.title.toLowerCase();
    if (!byTitle.has(key)) byTitle.set(key, []);
    byTitle.get(key)!.push(r);
  }
  const dupGroups = [...byTitle.entries()].filter(([, v]) => v.length > 1);
  console.log(`Exact-duplicate title groups: ${dupGroups.length}`);

  const takenTitles = new Set(all.map((r) => r.title));
  const journal: Array<{ id: number; from: string; to: string; url: string }> = [];

  for (const [title, group] of dupGroups) {
    // Keeper: most official host, tie-break lowest id.
    const sorted = [...group].sort(
      (a, b) => officialRank(a.url) - officialRank(b.url) || a.id - b.id,
    );
    const [, ...rest] = sorted;
    for (const r of rest) {
      // Base the new title on the row's OWN casing (the group key is
      // lowercased, so `title` here may not match the stored value).
      let suffix = hostLabel(r.url);
      let newTitle = `${r.title} (${suffix})`;
      let n = 2;
      while (takenTitles.has(newTitle)) {
        newTitle = `${r.title} (${suffix} ${n})`;
        n += 1;
      }
      takenTitles.add(newTitle);
      journal.push({ id: r.id, from: r.title, to: newTitle, url: r.url });
    }
  }

  console.log(`Retitles planned: ${journal.length}`);
  for (const j of journal) console.log(`  ${j.id}: "${j.from}" -> "${j.to}"  [${j.url}]`);

  if (DRY_RUN) {
    console.log("DRY_RUN=1 — no writes performed");
    console.log(JSON.stringify({ base: BASE, groups: dupGroups.length, planned: journal.length, dryRun: true }));
    return;
  }

  let ok = 0;
  let failed = 0;
  for (const j of journal) {
    const res = await fetch(`${BASE}/api/admin/resources/${j.id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ title: j.to }),
    });
    if (res.ok) ok += 1;
    else {
      failed += 1;
      console.error(`  ✗ ${j.id}: ${res.status} ${(await res.text()).slice(0, 150)}`);
    }
  }

  console.log(JSON.stringify({ base: BASE, groups: dupGroups.length, retitled: ok, failed }));
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

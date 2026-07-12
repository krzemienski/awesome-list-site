/**
 * Run3 live-prod gate recompute (task #136) — canonical importHygiene logic
 * over the PUBLIC prod API (no admin creds needed; approved rows only).
 * Mirrors the gate computation in scripts/run3-cleanup-prod.ts phase G.
 *
 * Run: npx tsx scripts/run3-prod-gates.ts
 */
import {
  isJunkResource,
  isSlugTitle,
  containsEmail,
  normalizeUrlForDedup,
  normalizeTitleForDedup,
  domainOf,
  MIN_DESCRIPTION_LENGTH,
} from "../server/github/importHygiene";

const BASE = process.env.PROD_BASE || "https://awesome.video";
const ENTITY_RE = /&(#\d+|#x[0-9a-fA-F]+|[a-zA-Z]+);/;

type Row = { id: number; title: string; url: string; description: string | null };

async function fetchAllApproved(): Promise<Row[]> {
  const out: Row[] = [];
  let offset = 0;
  for (let page = 0; page < 25; page++) {
    const r = await fetch(`${BASE}/api/resources?limit=200&offset=${offset}`);
    if (!r.ok) throw new Error(`fetch failed ${r.status}`);
    const j: any = await r.json();
    const items: Row[] = j.resources || j.items || [];
    out.push(...items);
    if (j.nextOffset == null || items.length === 0) break;
    offset = j.nextOffset;
  }
  return out;
}

const rows = await fetchAllApproved();
console.log(`fetched ${rows.length} approved rows from ${BASE}`);

const junk = rows.filter((r) => isJunkResource(r.title, r.url));
const slugs = rows.filter((r) => isSlugTitle(r.title));
const entities = rows.filter((r) => ENTITY_RE.test(r.description || ""));
const emails = rows.filter((r) => containsEmail(r.description || ""));
const shorts = rows.filter(
  (r) => (r.description || "").trim().length < MIN_DESCRIPTION_LENGTH,
);
const longTitles = rows.filter((r) => r.title.length > 120);

const byUrl = new Map<string, Row[]>();
const byTitleDomain = new Map<string, Row[]>();
for (const r of rows) {
  const u = normalizeUrlForDedup(r.url);
  byUrl.set(u, [...(byUrl.get(u) || []), r]);
  const td = `${normalizeTitleForDedup(r.title)}|${domainOf(r.url)}`;
  byTitleDomain.set(td, [...(byTitleDomain.get(td) || []), r]);
}
const urlClusters = [...byUrl.entries()].filter(([, v]) => v.length > 1);
const tdClusters = [...byTitleDomain.entries()].filter(([, v]) => v.length > 1);

// cross-domain same-title (informational; the spec's user-visible dup face)
const byTitle = new Map<string, Row[]>();
for (const r of rows) {
  const t = normalizeTitleForDedup(r.title);
  byTitle.set(t, [...(byTitle.get(t) || []), r]);
}
const titleClusters = [...byTitle.entries()].filter(([, v]) => v.length > 1);

const shorteners = rows.filter((r) =>
  /(^|\/\/)(link\.medium\.com|bit\.ly|t\.co|goo\.gl|tinyurl\.com|buff\.ly)\//i.test(r.url),
);

const gates = {
  approvedTotal: rows.length,
  junkUrls: junk.length,
  slugTitles: slugs.length,
  longTitles: longTitles.length,
  entities: entities.length,
  emails: emails.length,
  shortDescriptions: shorts.length,
  dupUrlClusters: urlClusters.length,
  dupTitleDomainClusters: tdClusters.length,
  crossDomainSameTitleClusters: titleClusters.length,
  shortenerUrls: shorteners.length,
};
console.log(JSON.stringify(gates, null, 2));

const dump = (label: string, list: Row[]) => {
  if (list.length) {
    console.log(`\n${label}:`);
    list.slice(0, 20).forEach((r) => console.log(`  ${r.id}  ${r.title}  ${r.url.slice(0, 80)}`));
  }
};
dump("junk", junk);
dump("slugTitles", slugs);
dump("longTitles", longTitles);
dump("entities", entities);
dump("emails", emails);
dump("shortDescriptions", shorts);
dump("shorteners", shorteners);
if (urlClusters.length) {
  console.log("\ndupUrlClusters:");
  urlClusters.slice(0, 10).forEach(([k, v]) => console.log(`  ${k}: ${v.map((r) => r.id).join(",")}`));
}
if (tdClusters.length) {
  console.log("\ndupTitleDomainClusters:");
  tdClusters.slice(0, 10).forEach(([k, v]) => console.log(`  ${k}: ${v.map((r) => r.id).join(",")}`));
}
if (titleClusters.length) {
  console.log("\ncrossDomainSameTitleClusters (informational):");
  titleClusters.slice(0, 30).forEach(([k, v]) =>
    console.log(`  ${k}: ${v.map((r) => `${r.id}@${domainOf(r.url)}`).join(" , ")}`),
  );
}

const hardFail =
  junk.length || slugs.length || entities.length || emails.length ||
  shorts.length || urlClusters.length || tdClusters.length;
process.exit(hardFail ? 1 : 0);

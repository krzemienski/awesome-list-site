import { gt, ilike } from "drizzle-orm";
import { db } from "../db";
import { researchDiscoveries, resources } from "@shared/schema";

/**
 * Query params that are pure tracking/share noise — they never distinguish
 * two different resources, so they are stripped before dedup comparison.
 * Everything else (e.g. youtube ?v=, ?id=, ?page=) is SIGNIFICANT and kept:
 * dropping the whole query string (the pre-July-2026 behavior) over-merged
 * distinct resources like youtube.com/watch?v=A vs ?v=B.
 */
const TRACKING_PARAMS = new Set([
  'ref', 'ref_src', 'ref_url', 'referrer', 'source', 'fbclid', 'gclid',
  'msclkid', 'dclid', 'twclid', 'igshid', 'mc_cid', 'mc_eid', '_hsenc',
  '_hsmi', 's_kwcid', 'si', 'feature',
]);
function isTrackingParam(key: string): boolean {
  const k = key.toLowerCase();
  return k.startsWith('utm_') || TRACKING_PARAMS.has(k);
}

/**
 * Canonical dedup key for a URL (July 30, 2026 hardening):
 *  - protocol-insensitive (http/https variants of the same page merge);
 *  - hostname lowercased, leading www. stripped;
 *  - path lowercased, trailing slashes stripped;
 *  - github.com: strip trailing ".git" and a trailing "/tree/main|master"
 *    (default-branch root = the repo itself). /blob/* deep links are KEPT
 *    distinct — a file deep-link is a legitimately different resource;
 *  - tracking params stripped, remaining params sorted (keys lowercased,
 *    values case-preserved — youtube IDs are case-sensitive);
 *  - fragments dropped (#readme anchors etc. never distinguish resources).
 * Compute-only: nothing stored is normalized, so changing this function
 * re-keys every comparison on the next run/approval with no data migration.
 */
export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    let path = parsed.pathname.replace(/\/+$/, '').toLowerCase();
    if (host === 'github.com') {
      path = path.replace(/\.git$/, '').replace(/\/tree\/(main|master)$/, '');
    }
    const params: [string, string][] = [];
    parsed.searchParams.forEach((value, key) => {
      if (!isTrackingParam(key)) params.push([key.toLowerCase(), value]);
    });
    params.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0));
    const query = params.length > 0 ? '?' + params.map(([k, v]) => `${k}=${v}`).join('&') : '';
    return host + path + query;
  } catch {
    return url
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/+$/, '');
  }
}

/**
 * Project identity for code-hosted resources, so a project's repo, its deep
 * links and its GitHub Pages docs site are recognised as the same project:
 * github.com/o/r/... and o.github.io/r/... → "github:o/r"; gitlab.com/o/r/... → "gitlab:o/r".
 * Null for everything else.
 */
export function projectKey(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase().replace(/^www\./, '');
    const parts = u.pathname.split('/').filter(Boolean).map((p) => p.toLowerCase());
    if ((host === 'github.com' || host === 'gitlab.com') && parts.length >= 2) {
      return `${host.split('.')[0]}:${parts[0]}/${parts[1].replace(/\.git$/, '')}`;
    }
    const pages = /^([a-z0-9-]+)\.github\.io$/.exec(host);
    if (pages && parts.length >= 1) return `github:${pages[1]}/${parts[0]}`;
    return null;
  } catch {
    return null;
  }
}

/** Minimum gap between KnownUrls reads; check_duplicate asks for one per candidate. */
const REFRESH_INTERVAL_MS = 5_000;

/**
 * Every URL the catalog or the review queue already knows (all resource
 * statuses, every discovery of every run), keyed by normalizeUrl, plus a
 * project index for near-duplicates. refresh() picks up rows written after the
 * run-start load (id above the load's watermark) — another run's saves or a
 * new submission. It is a fast, possibly lagging view: a row that commits after
 * a higher id was already read is never picked up, so the save path re-checks
 * the tables with knownInDb().
 */
export class KnownUrls {
  private readonly urls = new Set<string>();
  private readonly projects = new Map<string, string[]>();
  private lastResourceId: number;
  private lastDiscoveryId: number;
  private refreshedAt = 0;

  /** Seed from the run-start load; the watermarks are the highest ids that load saw. */
  constructor(rows: Iterable<{ id: number; url: string; kind: "resource" | "discovery" }>) {
    this.lastResourceId = 0;
    this.lastDiscoveryId = 0;
    for (const r of rows) this.seed(r);
  }

  private seed(r: { id: number; url: string; kind: "resource" | "discovery" }): void {
    this.add(r.url);
    if (r.kind === "resource") this.lastResourceId = Math.max(this.lastResourceId, r.id);
    else this.lastDiscoveryId = Math.max(this.lastDiscoveryId, r.id);
  }

  get size(): number {
    return this.urls.size;
  }

  has(url: string): boolean {
    return this.urls.has(normalizeUrl(url));
  }

  add(url: string): void {
    this.urls.add(normalizeUrl(url));
    const key = projectKey(url);
    if (!key) return;
    const list = this.projects.get(key) ?? [];
    if (list.length < 5 && !list.includes(url)) list.push(url);
    this.projects.set(key, list);
  }

  /** Known URLs of the same project, excluding the URL itself. */
  sameProject(url: string): string[] {
    const key = projectKey(url);
    if (!key) return [];
    const self = normalizeUrl(url);
    return (this.projects.get(key) ?? []).filter((u) => normalizeUrl(u) !== self);
  }

  /** Reads rows above the watermarks, at most once per REFRESH_INTERVAL_MS; 0 when skipped. */
  async refresh(): Promise<number> {
    if (Date.now() - this.refreshedAt < REFRESH_INTERVAL_MS) return 0;
    this.refreshedAt = Date.now();
    const [res, disc] = await Promise.all([
      db.select({ id: resources.id, url: resources.url }).from(resources).where(gt(resources.id, this.lastResourceId)),
      db.select({ id: researchDiscoveries.id, url: researchDiscoveries.url }).from(researchDiscoveries).where(gt(researchDiscoveries.id, this.lastDiscoveryId)),
    ]);
    const before = this.urls.size;
    for (const r of res) this.seed({ ...r, kind: "resource" });
    for (const d of disc) this.seed({ ...d, kind: "discovery" });
    return this.urls.size - before;
  }
}

/**
 * Whether any resource (any status) or discovery (any run, any status) already
 * has this URL under normalizeUrl, read straight from the tables. SQL narrows
 * by host + path (LIKE wildcards in it only widen the match); the exact
 * comparison happens here.
 */
export async function knownInDb(url: string): Promise<boolean> {
  const normalized = normalizeUrl(url);
  const pattern = `%${normalized.split('?')[0]}%`;
  const [res, disc] = await Promise.all([
    db.select({ url: resources.url }).from(resources).where(ilike(resources.url, pattern)),
    db.select({ url: researchDiscoveries.url }).from(researchDiscoveries).where(ilike(researchDiscoveries.url, pattern)),
  ]);
  return [...res, ...disc].some((r) => normalizeUrl(r.url) === normalized);
}

const GITHUB_REPO_ROOT_RE = /^github\.com\/[^/?]+\/[^/?]+$/;

/**
 * Whether a normalized URL appeared in a scout report. Only an exact match
 * counts, plus one trim: the root of a GitHub repo (github.com/<owner>/<repo>)
 * when a scout reported a deeper link or a query view of that repo. Anything
 * looser (a bare domain, another page of a reported site) would let the
 * orchestrator save URLs no search ever returned.
 */
export function surfacedByScout(surfaced: Set<string>, normalized: string): boolean {
  if (surfaced.has(normalized)) return true;
  if (!GITHUB_REPO_ROOT_RE.test(normalized)) return false;
  for (const s of surfaced) {
    if (s.startsWith(`${normalized}/`) || s.startsWith(`${normalized}?`)) return true;
  }
  return false;
}

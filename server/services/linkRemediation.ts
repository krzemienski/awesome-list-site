import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { linkHealthChecks, linkHealthJobs, resources, type Resource } from "@shared/schema";
import { db } from "../db";
import { LinkChecker, browserVerifyLink, registrableDomain, hasEnglishPrefix, stripEnglishPrefix } from "../validation/linkChecker";
import { transitionResourceInTransaction, withResourcePublication } from "../repositories/resourcePublication";
import { createLogger } from "../lib/logger";

const logger = createLogger("link-remediation");

/** Scans whose per-link rows are kept; the planner reads streaks across them. */
export const RETAINED_SCANS = 3;
/** Consecutive scans that must agree before a link is hidden, restored or rewritten. */
export const SCANS_TO_ACT = 2;
/** The first and last scan of a dead streak must be this far apart, so a short outage never hides a link. */
export const MIN_DEAD_SPAN_HOURS = 20;
/** Refuse to hide more than this share of the scanned catalog in one apply: a mass failure means the checker is wrong. */
export const MAX_ARCHIVE_SHARE = 0.02;
const MAX_ARCHIVE_FLOOR = 10;

export type LinkObservation = "ok" | "dead" | "moved" | "suspect" | "unknown";
export type RemediationKind = "archive" | "restore" | "rewrite-url" | "review" | "watch";

export interface RemediationAction {
  resourceId: number;
  title: string;
  url: string;
  kind: RemediationKind;
  reason: string;
  jobId: number;
  to?: string;
}

export interface CheckSnapshot {
  jobId: number;
  status: string;
  httpStatus: number | null;
  url: string;
  finalUrl: string | null;
  errorMessage: string | null;
}

export interface ScanRef {
  id: number;
  completedAt: Date;
}

/** Remediation bookkeeping kept in resources.metadata.linkHealth. */
export interface LinkHealthMeta {
  archivedByJob?: number | null;
  archivedAt?: string | null;
  previousApprovedAt?: string | null;
  previousApprovedBy?: string | null;
  restoredByJob?: number;
  ignored?: boolean;
}

export interface PlanResource extends Pick<Resource, "id" | "title" | "url" | "status"> {
  statusChangedAt: Date | null;
  linkHealth?: LinkHealthMeta;
}

export type RemediationMode = "plan" | "apply";

export function remediationMode(): RemediationMode {
  return process.env.LINK_HEALTH_REMEDIATION === "apply" ? "apply" : "plan";
}

const messageOf = (err: unknown) => (err instanceof Error ? err.message : String(err));
const linkHealthOf = (metadata: unknown): LinkHealthMeta | undefined =>
  (metadata as { linkHealth?: LinkHealthMeta } | null)?.linkHealth;

const AUTH_PATH = /\/(log-?in|sign-?in|sso|auth)(\/|$)/i;
const ERROR_PATH = /\/(404|410|not[-_]?found|error|errors|missing|gone|unavailable|consent)(\.[a-z]+)?(\/|$)/i;

function normalizePath(path: string): string {
  return path.toLowerCase().replace(/\/index\.(html?|php)$/, "").replace(/\/+$/, "") || "/";
}

function sameUrl(a: string, b: string): boolean {
  const norm = (u: string) => u.replace(/#.*$/, "").replace(/\/+$/, "");
  return norm(a) === norm(b);
}

// First path segments on github.com that are site sections, not repo owners.
const GITHUB_RESERVED = new Set([
  "about", "apps", "collections", "contact", "customer-stories", "enterprise", "events", "explore",
  "features", "issues", "login", "marketplace", "new", "notifications", "orgs", "organizations",
  "pricing", "pulls", "search", "security", "settings", "sponsors", "topics", "trending", "users",
]);

/**
 * GitHub redirects a repository URL only when the repository was renamed or
 * transferred, so the same page under a new owner/name is a safe rewrite:
 * owner/repo may change, everything after it must be identical.
 */
function isGitHubRepoMove(from: URL, to: URL): boolean {
  const host = (h: string) => h.toLowerCase().replace(/^www\./, "");
  if (host(from.hostname) !== "github.com" || host(to.hostname) !== "github.com") return false;
  const parts = (u: URL) => u.pathname.replace(/\/+$/, "").split("/").slice(1);
  const a = parts(from);
  const b = parts(to);
  if (a.length < 2 || b.length < 2 || a.length !== b.length) return false;
  if (GITHUB_RESERVED.has(a[0].toLowerCase()) || GITHUB_RESERVED.has(b[0].toLowerCase())) return false;
  if (a.slice(0, 2).join("/").toLowerCase() === b.slice(0, 2).join("/").toLowerCase()) return false;
  return a.slice(2).join("/") === b.slice(2).join("/");
}

/**
 * One scan's verdict for one link. Statuses come after the checker's
 * browser-UA verification pass, so `broken`/`dns_failure` are confirmed dead
 * (DNS, refused, browser 404/410, SSL). Bot-block shapes, timeouts and 5xx were
 * reclassified `healthy` with the browser verdict in errorMessage.
 */
export function observe(check: CheckSnapshot): LinkObservation {
  if (check.status === "broken" || check.status === "dns_failure") return "dead";
  if (check.status === "suspect") return "suspect";
  if (check.status !== "healthy") return "unknown";
  if (!check.finalUrl || sameUrl(check.finalUrl, check.url)) return "ok";
  try {
    const from = new URL(check.url);
    const to = new URL(check.finalUrl);
    if (registrableDomain(from.hostname) !== registrableDomain(to.hostname)) return "suspect";
    if (ERROR_PATH.test(to.pathname)) return "suspect";
    if (AUTH_PATH.test(to.pathname)) return "ok";
    // Only a redirect that keeps the page is a safe rewrite: the same host
    // (www aside; shared hosts like *.github.io are different owners), the same
    // query (an empty "?" counts as none), and the same path or its
    // trailing-slash, index or English-prefix form. Anything else needs a human.
    const host = (h: string) => h.toLowerCase().replace(/^www\./, "");
    if (host(from.hostname) !== host(to.hostname) || from.search !== to.search) return "suspect";
    const fromPath = normalizePath(from.pathname);
    const toPath = normalizePath(to.pathname);
    if (fromPath === toPath) return "moved";
    if (isGitHubRepoMove(from, to)) return "moved";
    // An English prefix added or dropped on exactly one side is the same page.
    if (hasEnglishPrefix(fromPath) === hasEnglishPrefix(toPath)) return "suspect";
    return stripEnglishPrefix(fromPath) === stripEnglishPrefix(toPath) ? "moved" : "suspect";
  } catch {
    return "unknown";
  }
}

/** Answered with a 2xx/3xx and no browser re-check was needed. "Not confirmed dead" is not enough to restore. */
function confirmedAlive(check: CheckSnapshot, seen: LinkObservation): boolean {
  if (check.finalUrl && !sameUrl(check.finalUrl, check.url)) {
    try { if (AUTH_PATH.test(new URL(check.finalUrl).pathname)) return false; } catch { return false; }
  }
  return (seen === "ok" || seen === "moved")
    && check.httpStatus !== null && check.httpStatus >= 200 && check.httpStatus < 400
    && !check.errorMessage;
}

function deadReason(check: CheckSnapshot): string {
  if (check.status === "dns_failure") return "DNS lookup fails";
  if (check.httpStatus) return `HTTP ${check.httpStatus}`;
  return check.errorMessage?.split(" | ")[0] ?? "unreachable";
}

const hoursBetween = (a: Date, b: Date) => Math.abs(a.getTime() - b.getTime()) / 3_600_000;

/**
 * Decide one resource's action. `scans` is the retained completed scans, newest
 * first; `history` holds this resource's rows from them. Pure: the same inputs
 * always give the same plan, so a dry run and a live run agree.
 */
export function planResource(resource: PlanResource, scans: ScanRef[], history: CheckSnapshot[]): RemediationAction | null {
  if (resource.linkHealth?.ignored || scans.length === 0) return null;
  const byJob = new Map(history.map((c) => [c.jobId, c]));
  // A streak only counts across consecutive scans, starting from the newest.
  const run: CheckSnapshot[] = [];
  for (const scan of scans) {
    const c = byJob.get(scan.id);
    if (!c) break;
    run.push(c);
  }
  const latest = run[0];
  if (!latest) return null;
  const seen = run.map(observe);
  const base = { resourceId: resource.id, title: resource.title, url: resource.url, jobId: latest.jobId };

  if (resource.status === "archived") {
    const meta = resource.linkHealth;
    if (!meta?.archivedByJob || !meta.archivedAt) return null;
    // Restore only what this system hid, and only if nobody changed the status since.
    if (resource.statusChangedAt && resource.statusChangedAt.getTime() > Date.parse(meta.archivedAt) + 60_000) return null;
    let alive = 0;
    while (alive < run.length && confirmedAlive(run[alive], seen[alive])) alive++;
    if (alive >= SCANS_TO_ACT) return { ...base, kind: "restore", reason: `Answers again in ${alive} consecutive scans` };
    return alive === 1 ? { ...base, kind: "watch", reason: "Answered in the latest scan; restored if the next scan agrees" } : null;
  }
  if (resource.status !== "approved") return null;

  let deadCount = 0;
  while (deadCount < seen.length && seen[deadCount] === "dead") deadCount++;
  if (deadCount >= 1) {
    const span = hoursBetween(scans[0].completedAt, scans[deadCount - 1].completedAt);
    if (deadCount >= SCANS_TO_ACT && span >= MIN_DEAD_SPAN_HOURS) {
      return { ...base, kind: "archive", reason: `Dead in ${deadCount} consecutive scans over ${Math.round(span)} h (${deadReason(latest)})` };
    }
    return { ...base, kind: "watch", reason: `Dead in ${deadCount} scan${deadCount === 1 ? "" : "s"} (${deadReason(latest)}); hidden once it stays dead across ${MIN_DEAD_SPAN_HOURS} h` };
  }

  if (seen[0] === "moved") {
    const target = latest.finalUrl!;
    const stable = run.length >= SCANS_TO_ACT
      && run.slice(0, SCANS_TO_ACT).every((c, i) => seen[i] === "moved" && c.finalUrl !== null && sameUrl(c.finalUrl, target));
    return stable
      ? { ...base, kind: "rewrite-url", to: target, reason: `Redirects to the same page in ${SCANS_TO_ACT} consecutive scans` }
      : { ...base, kind: "watch", to: target, reason: "Redirects within the page's path; rewritten once the next scan agrees" };
  }
  if (seen[0] === "suspect") {
    return { ...base, kind: "review", to: latest.finalUrl ?? undefined, reason: latest.errorMessage ?? "Redirects to another site or page, or looks parked" };
  }
  return null;
}

async function retainedScans(): Promise<ScanRef[]> {
  const rows = await db
    .select({ id: linkHealthJobs.id, completedAt: linkHealthJobs.completedAt, createdAt: linkHealthJobs.createdAt })
    .from(linkHealthJobs)
    .where(eq(linkHealthJobs.status, "completed"))
    .orderBy(desc(linkHealthJobs.id))
    .limit(RETAINED_SCANS);
  return rows.map((r) => ({ id: r.id, completedAt: r.completedAt ?? r.createdAt }));
}

export interface RemediationPlan {
  jobId: number | null;
  checked: number;
  actions: RemediationAction[];
}

export async function buildRemediationPlan(): Promise<RemediationPlan> {
  const scans = await retainedScans();
  if (scans.length === 0) return { jobId: null, checked: 0, actions: [] };

  const checks = await db
    .select({
      jobId: linkHealthChecks.jobId,
      resourceId: linkHealthChecks.resourceId,
      status: linkHealthChecks.status,
      httpStatus: linkHealthChecks.httpStatus,
      url: linkHealthChecks.url,
      finalUrl: linkHealthChecks.finalUrl,
      errorMessage: linkHealthChecks.errorMessage,
    })
    .from(linkHealthChecks)
    .where(inArray(linkHealthChecks.jobId, scans.map((s) => s.id)));

  const byResource = new Map<number, CheckSnapshot[]>();
  let checked = 0;
  for (const c of checks) {
    if (c.jobId === scans[0].id) checked++;
    const list = byResource.get(c.resourceId) ?? [];
    list.push(c);
    byResource.set(c.resourceId, list);
  }

  const ids = Array.from(byResource.keys());
  const rows = ids.length
    ? await db
        .select({
          id: resources.id, title: resources.title, url: resources.url, status: resources.status,
          statusChangedAt: resources.statusChangedAt, metadata: resources.metadata,
        })
        .from(resources)
        .where(inArray(resources.id, ids))
    : [];

  const actions: RemediationAction[] = [];
  for (const r of rows) {
    // A history only counts while it tracks the stored URL; an edited URL starts fresh.
    const history = (byResource.get(r.id) ?? []).filter((c) => sameUrl(c.url, r.url));
    const action = planResource(
      { id: r.id, title: r.title, url: r.url, status: r.status ?? "approved", statusChangedAt: r.statusChangedAt, linkHealth: linkHealthOf(r.metadata) },
      scans,
      history,
    );
    if (action) actions.push(action);
  }
  const order: Record<RemediationKind, number> = { archive: 0, restore: 1, "rewrite-url": 2, review: 3, watch: 4 };
  actions.sort((a, b) => order[a.kind] - order[b.kind] || a.resourceId - b.resourceId);
  return { jobId: scans[0].id, checked, actions };
}

export interface AppliedAction extends RemediationAction {
  outcome: "applied" | "skipped";
  detail?: string;
}

type Tx = Parameters<Parameters<typeof withResourcePublication>[0]>[0];

/** Lock the row, confirm it still holds the URL the plan was built for, and return its link-health bookkeeping. */
async function lockPlanned(tx: Tx, a: RemediationAction) {
  const [row] = await tx
    .select({ url: resources.url, metadata: resources.metadata, approvedAt: resources.approvedAt, approvedBy: resources.approvedBy })
    .from(resources)
    .where(eq(resources.id, a.resourceId))
    .for("update");
  if (!row) throw new Error("Resource not found");
  if (row.url !== a.url) throw new Error("URL changed since the plan was built");
  return { ...row, linkHealth: linkHealthOf(row.metadata) ?? {} };
}

async function applyOne(a: RemediationAction, actor?: string): Promise<AppliedAction> {
  const notes = `link-health job ${a.jobId}: ${a.kind}. ${a.reason}`;
  if (a.kind === "archive") {
    await withResourcePublication(async (tx) => {
      const row = await lockPlanned(tx, a);
      if (row.linkHealth.ignored) throw new Error("An admin marked this link fine");
      const linkHealth: LinkHealthMeta = {
        ...row.linkHealth,
        archivedByJob: a.jobId,
        archivedAt: new Date().toISOString(),
        previousApprovedAt: row.approvedAt?.toISOString() ?? null,
        previousApprovedBy: row.approvedBy ?? null,
      };
      await transitionResourceInTransaction(tx, a.resourceId, { status: "archived" }, actor, {
        expectedStatus: "approved", notes, mergeMetadata: { linkHealth },
      });
    });
    return { ...a, outcome: "applied" };
  }
  if (a.kind === "restore") {
    await withResourcePublication(async (tx) => {
      const row = await lockPlanned(tx, a);
      const prev = row.linkHealth;
      if (!prev.archivedByJob) throw new Error("Not hidden by link health");
      const linkHealth: LinkHealthMeta = {
        ...prev, archivedByJob: null, archivedAt: null, previousApprovedAt: null, previousApprovedBy: null, restoredByJob: a.jobId,
      };
      await transitionResourceInTransaction(tx, a.resourceId, { status: "approved" }, actor, {
        expectedStatus: "archived", notes, mergeMetadata: { linkHealth },
      });
      // A restore is not a new publication: keep its original place and approver.
      await tx.update(resources).set({
        ...(prev.previousApprovedAt ? { approvedAt: new Date(prev.previousApprovedAt) } : {}),
        approvedBy: prev.previousApprovedBy ?? null,
      }).where(eq(resources.id, a.resourceId));
    });
    return { ...a, outcome: "applied" };
  }
  if (a.kind === "rewrite-url" && a.to) {
    const to = a.to;
    const clash = await withResourcePublication(async (tx) => {
      await lockPlanned(tx, a);
      const [other] = await tx.select({ id: resources.id }).from(resources).where(eq(resources.url, to)).limit(1);
      if (other) return other.id;
      await transitionResourceInTransaction(tx, a.resourceId, { url: to }, actor, {
        expectedStatus: "approved", notes: `${notes}. URL ${a.url} -> ${to}`,
      });
      return null;
    });
    return clash === null
      ? { ...a, outcome: "applied" }
      : { ...a, outcome: "skipped", detail: `Resource ${clash} already uses ${to}` };
  }
  return { ...a, outcome: "skipped", detail: "Report-only action" };
}

/** Apply the current plan. Each change is its own audited transaction; one failure never blocks the rest. */
export async function applyRemediationPlan(actor?: string): Promise<{ jobId: number | null; results: AppliedAction[]; breaker?: string }> {
  const plan = await buildRemediationPlan();
  const archives = plan.actions.filter((a) => a.kind === "archive").length;
  const limit = Math.max(MAX_ARCHIVE_FLOOR, Math.floor(plan.checked * MAX_ARCHIVE_SHARE));
  const breaker = archives > limit
    ? `${archives} links would be hidden (limit ${limit}). Too many at once points at the checker or the network, so no link was hidden.`
    : undefined;

  const results: AppliedAction[] = [];
  for (const a of plan.actions) {
    if (a.kind === "review" || a.kind === "watch") continue;
    if (a.kind === "archive" && breaker) {
      results.push({ ...a, outcome: "skipped", detail: "Mass-failure breaker" });
      continue;
    }
    try {
      results.push(await applyOne(a, actor));
    } catch (err) {
      results.push({ ...a, outcome: "skipped", detail: messageOf(err) });
    }
  }
  const applied = results.filter((r) => r.outcome === "applied").length;
  if (breaker) logger.warn(`Remediation breaker for job ${plan.jobId}: ${breaker}`);
  logger.info(`Remediation for job ${plan.jobId}: ${applied} applied, ${results.length - applied} skipped`);
  return { jobId: plan.jobId, results, breaker };
}

/** Mark a published resource so the planner leaves it alone (an admin judged the link fine), or clear the mark. */
export async function setLinkHealthIgnored(resourceId: number, ignored: boolean, actor?: string): Promise<void> {
  await withResourcePublication(async (tx) => {
    const [row] = await tx
      .select({ status: resources.status, metadata: resources.metadata })
      .from(resources)
      .where(eq(resources.id, resourceId))
      .for("update");
    if (!row) throw new Error("Resource not found");
    if (ignored && row.status !== "approved") throw new Error("Only a published resource can be marked");
    await transitionResourceInTransaction(tx, resourceId, {}, actor, {
      notes: ignored ? "link-health: admin marked the link as fine; remediation skips it" : "link-health: remediation resumed",
      mergeMetadata: { linkHealth: { ...(linkHealthOf(row.metadata) ?? {}), ignored } },
    });
  });
}

export async function listIgnoredLinks(): Promise<{ id: number; title: string; url: string }[]> {
  return db
    .select({ id: resources.id, title: resources.title, url: resources.url })
    .from(resources)
    .where(sql`(${resources.metadata} -> 'linkHealth' ->> 'ignored') = 'true'`)
    .orderBy(resources.title);
}

/** Link-health-archived resources stay in every scan so a recovered link is noticed and restored. */
export const linkHealthArchivedFilter = and(
  eq(resources.status, "archived"),
  sql`(${resources.metadata} -> 'linkHealth' ->> 'archivedByJob') is not null`,
);

export interface SingleLinkCheck {
  state: "ok" | "broken" | "moved" | "suspect" | "unknown";
  httpStatus: number | null;
  finalUrl: string | null;
  verdict: string | null;
  checkedAt: string;
}

/**
 * Check one URL the way a scan does (fast pass, then a browser-UA re-check of
 * any failure), for callers that save a URL outside a scan, such as enrichment.
 */
export async function checkSingleLink(url: string): Promise<SingleLinkCheck> {
  const report = await new LinkChecker({ timeout: 15000, retryCount: 1, concurrent: 1 }).checkLinks([{ url }]);
  const r = report.results[0];
  let status = r.valid ? (r.suspicion ? "suspect" : "healthy") : "broken";
  let verdict: string | null = r.suspicionDetail ?? r.error ?? null;
  if (!r.valid) {
    const v = await browserVerifyLink(url, 15000);
    verdict = v.verdict;
    status = v.confirmedDead ? (String(v.status).includes("ENOTFOUND") ? "dns_failure" : "broken") : "healthy";
  }
  const seen = observe({ jobId: 0, status, httpStatus: r.status || null, url, finalUrl: r.finalUrl ?? null, errorMessage: verdict });
  return {
    state: seen === "dead" ? "broken" : seen,
    httpStatus: r.status || null,
    finalUrl: r.finalUrl ?? null,
    verdict,
    checkedAt: new Date().toISOString(),
  };
}

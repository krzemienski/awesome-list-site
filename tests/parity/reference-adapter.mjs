/**
 * Reference data adapters.
 *
 * The design source under awesome-list-site-ds/ renders from `AV_*` globals in
 * data.js plus a handful of hard-coded placeholder literals. To compare it
 * against the live app the harness binds those globals to the app's real data
 * at run time — in memory, on the served bytes only. Nothing under
 * awesome-list-site-ds/ is ever written.
 *
 * Two adapters exist:
 *   - catalog adapter: public, credential-less `/api/awesome-list(+/nav)`,
 *     `/api/config`, `/api/home`, and `/api/resources/kinds/counts`
 *   - admin adapter:   `/api/admin/*` through the disposable admin session
 *
 * Placeholder literals ("+12 this week", "WEEK 37", "CONTRIBUTORS 3", "oldest
 * 14m ago", "across 9 categories", "2 admins · 1 contributor") are replaced
 * with values derived from the same data and the run's frozen clock. Every
 * substitution is recorded in results.json so the residual diff stays
 * attributable; a literal that cannot be derived is left untouched and listed
 * as `unadapted`, never guessed.
 */
import crypto from "node:crypto";
import { indexCatalogPaths } from "./catalog-paths.mjs";
import { buildReferenceReconciliation, projectOfficialBrandMark } from "./reference-reconciliation.mjs";

export const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

export const fetchJson = async (url, init = {}) => {
  const response = await fetch(url, { ...init, headers: { accept: "application/json", ...(init.headers || {}) }, redirect: "error" });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  if (response.url !== url) throw new Error(`${url} resolved away from its approved address`);
  const type = response.headers.get("content-type") || "";
  if (!type.includes("json")) throw new Error(`${url} did not return JSON (${type || "missing content-type"})`);
  return response.json();
};

const recursiveCount = (node) =>
  Number(node?.resourceCount || 0) +
  (node?.subcategories || []).reduce((sum, child) => sum + recursiveCount(child), 0) +
  (node?.subSubcategories || []).reduce((sum, child) => sum + recursiveCount(child), 0);

/** Bind the public catalog snapshot to the reference's AV_* catalog globals. */
export async function buildCatalogAdapter(appBase, { frozenAt } = {}) {
  const [catalog, nav, home, config, kindCounts] = await Promise.all([
    fetchJson(`${appBase}/api/awesome-list`),
    fetchJson(`${appBase}/api/awesome-list/nav`),
    fetchJson(`${appBase}/api/home`),
    fetchJson(`${appBase}/api/config`),
    fetchJson(`${appBase}/api/resources/kinds/counts`),
  ]);
  const categories = Array.isArray(nav?.categories) ? nav.categories : [];
  const corpusResources = Array.isArray(catalog?.resources)
    ? catalog.resources
    : Array.isArray(catalog?.categories)
      ? catalog.categories.flatMap((category) =>
          (category.resources || []).concat(
            (category.subcategories || []).flatMap((sub) =>
              (sub.resources || []).concat((sub.subSubcategories || []).flatMap((leaf) => leaf.resources || [])),
            ),
          ),
        )
      : [];
  if (!categories.length || !corpusResources.length) {
    throw new Error("Approved public catalog snapshot is empty; refusing a blank or placeholder baseline");
  }
  const { byResourceId, reconciledPaths } = indexCatalogPaths(catalog, categories);
  const recentIds = new Set((home?.recent || []).map((item) => String(item.id)));
  const recentById = new Map((home?.recent || []).map((item) => [String(item.id), item]));
  const orderedResources = [
    ...(home?.recent || []).map((item) =>
      corpusResources.find((candidate) => String(candidate.id) === String(item.id)) || item
    ),
    ...corpusResources.filter((item) => !recentIds.has(String(item.id))),
  ];
  if (recentById.size !== (home?.recent || []).length) {
    throw new Error("Home recent feed contains duplicate resource identities; refusing false alignment");
  }
  const featuredIds = new Set((home?.featured || []).map((item) => String(item.id)));
  const adapter = {
    AV_CONFIG: { title: nav.title || catalog.title || null, source: "approved public application catalog snapshot" },
    AV_CATEGORIES: categories.map((item) => ({
      id: item.slug,
      name: item.name,
      short: item.name,
      icon: null,
      count: recursiveCount(item),
      desc: item.teaser?.description || "",
    })),
    AV_SUBCATEGORIES: Object.fromEntries(
      categories.map((item) => [
        item.slug,
        (item.subcategories || []).map((sub) => ({ id: sub.slug, name: sub.name, count: recursiveCount(sub) })),
      ]),
    ),
    AV_SUBSUBCATEGORIES: Object.fromEntries(
      categories.flatMap((category) =>
        (category.subcategories || []).map((subcategory) => [
          subcategory.slug,
          (subcategory.subSubcategories || []).map((leaf) => ({ id: leaf.slug, name: leaf.name, count: recursiveCount(leaf) })),
        ]),
      ),
    ),
    AV_RESOURCES: orderedResources.map((item) => {
      const { category, subcategory, leaf } = byResourceId.get(String(item.id)) || {};
      return {
        id: item.id,
        title: item.title || item.name,
        cat: category?.slug || null,
        sub: subcategory?.slug || null,
        subsub: leaf?.slug || null,
        desc: item.description || "",
        tags: Array.isArray(item.metadata?.tags) ? item.metadata.tags.map((tag) => tag.name || tag).filter(Boolean) : [],
        // /api/home.featured is the authoritative public curated feed. Do not
        // resurrect stale metadata flags when that live feed is empty.
        featured: featuredIds.has(String(item.id)),
        url: item.url,
      };
    }),
    AV_TOTAL: Number(nav.totalResources || corpusResources.length),
    AV_TOTAL_SUBCATS: categories.reduce((sum, item) => sum + (item.subcategories?.length || 0), 0),
  };
  const mappingFailures = adapter.AV_RESOURCES.filter((mapped) => !mapped.cat);
  if (mappingFailures.length) {
    throw new Error(`Catalog-to-nav identity mapping is incomplete for ${mappingFailures.length} resources; refusing false alignment`);
  }
  // The frozen catalogue pages were authored for a loaded subset and render
  // every AV_RESOURCES row of their scope with no pagination.  The application
  // keeps its 24-per-page listing (client, SSR, sitemap and JSON-LD share that
  // page size).  Bind the same first page, in the same tree order, for the
  // taxonomy screens the inventory measures — the same data-binding rule the
  // admin Resources table uses (AV_ADMIN_RESOURCES).  Only the token scopes
  // are bound; every other category keeps the complete corpus.
  const taxonomyTokens = resolveCatalogTokens(adapter);
  const pageScopes = [];
  for (const [level, node] of [["category", taxonomyTokens.category], ["subcategory", taxonomyTokens.subcategory]]) {
    if (!node?.id) continue;
    const listing = await fetchJson(`${appBase}/api/awesome-list/listing?level=${level}&slug=${encodeURIComponent(node.id)}&page=1`);
    if (!Array.isArray(listing?.resources) || typeof listing?.pageSize !== "number") {
      throw new Error(`Listing page for ${level} ${JSON.stringify(node.id)} is malformed; refusing an invented taxonomy scope`);
    }
    const ids = listing.resources.map((item) => String(item.id));
    const categorySlug = level === "category" ? node.id : taxonomyTokens.subcategoryCategory?.id;
    const subcategorySlug = level === "subcategory" ? node.id : null;
    // The bound page must be a well-formed subset of the scope: unique rows
    // that all belong to the measured category/subcategory.  Anything else
    // would let the reference render rows the application never lists.
    if (new Set(ids).size !== ids.length) {
      throw new Error(`Listing page for ${level} ${JSON.stringify(node.id)} repeats a resource id; refusing a duplicated taxonomy scope`);
    }
    const byId = new Map(adapter.AV_RESOURCES.map((item) => [String(item.id), item]));
    const outOfScope = ids.filter((id) => {
      const row = byId.get(id);
      return !row || row.cat !== categorySlug || (subcategorySlug && row.sub !== subcategorySlug);
    });
    if (outOfScope.length) {
      throw new Error(`Listing page for ${level} ${JSON.stringify(node.id)} contains ${outOfScope.length} row(s) outside the scope (${outOfScope.slice(0, 3).join(", ")}); refusing a mis-scoped taxonomy binding`);
    }
    pageScopes.push({ level, slug: node.id, categorySlug, subcategorySlug, pageSize: listing.pageSize, total: listing.total, ids });
  }
  adapter.AV_TAXONOMY_PAGE_SCOPES = pageScopes;
  const snapshotBytes = Buffer.from(JSON.stringify({ catalog, nav, home, pageScopes }));
  const createdAts = corpusResources.map((item) => Date.parse(item.createdAt)).filter(Number.isFinite);
  const byId = new Map(adapter.AV_RESOURCES.map((item) => [String(item.id), item]));
  const featuredResources = (home.featured || []).map((item) => {
    const mapped = byId.get(String(item.id));
    if (!mapped) {
      throw new Error(`Home featured resource ${JSON.stringify(item.id)} is absent from the approved catalog snapshot`);
    }
    return mapped;
  });
  const officialBrandMark = await projectOfficialBrandMark();
  const reconciliation = buildReferenceReconciliation({
    config,
    nav,
    home,
    kindCounts,
    featuredResources,
    frozenAt,
    officialBrandMark,
  });
  const reconciliationSnapshot = Buffer.from(JSON.stringify({ config, kindCounts, reconciliation }));
  return {
    adapter,
    catalog,
    nav,
    home,
    config,
    kindCounts,
    reconciliation,
    reconciledPaths,
    snapshotBytes: Buffer.concat([snapshotBytes, reconciliationSnapshot]),
    corpusResources,
    createdAts,
  };
}

/** Deterministic entity choices shared by both sides (first of each level). */
export function resolveCatalogTokens(adapter) {
  const firstCategory = adapter.AV_CATEGORIES[0];
  const subcategoryCategory = adapter.AV_CATEGORIES.find((item) => adapter.AV_SUBCATEGORIES[item.id]?.length);
  const firstSubcategory = adapter.AV_SUBCATEGORIES[subcategoryCategory?.id]?.[0];
  let leafCategory = null;
  let leafSubcategory = null;
  let firstLeaf = null;
  for (const category of adapter.AV_CATEGORIES) {
    for (const subcategory of adapter.AV_SUBCATEGORIES[category.id] || []) {
      const leaves = adapter.AV_SUBSUBCATEGORIES[subcategory.id] || [];
      if (leaves.length) {
        leafCategory = category;
        leafSubcategory = subcategory;
        firstLeaf = leaves[0];
        break;
      }
    }
    if (firstLeaf) break;
  }
  const firstResource = adapter.AV_RESOURCES[0];
  return {
    category: firstCategory,
    subcategoryCategory,
    subcategory: firstSubcategory,
    leafCategory,
    leafSubcategory,
    leaf: firstLeaf,
    resource: firstResource,
    values: {
      categorySlug: firstCategory?.id,
      subcategorySlug: firstSubcategory?.id,
      subSubcategorySlug: firstLeaf?.id,
      resourceId: firstResource?.id,
    },
  };
}

export function resolvePathTemplate(template, tokens) {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    if (tokens[key] === undefined || tokens[key] === null) throw new Error(`Snapshot cannot resolve {${key}}`);
    return encodeURIComponent(String(tokens[key]));
  });
}

const maskAuditEmail = (email) => {
  const at = email.indexOf("@");
  if (at <= 0) return email;
  return `${email[0]}\u2022\u2022\u2022${email.slice(at)}`;
};
const auditActorLabel = (log) => {
  if (log.performedByEmail) return maskAuditEmail(log.performedByEmail);
  if (log.performedBy) return String(log.performedBy).slice(0, 12);
  return "system";
};
// Same translation as AuditTab.tsx ACTION_STATUS; unknown actions are not
// silently reported as successful.
const AUDIT_ACTION_STATUS = Object.freeze({
  create: "completed", created: "completed", update: "completed", updated: "completed",
  approved: "approved", rejected: "rejected", deleted: "completed", synced: "completed",
  imported: "completed", exported: "completed", import: "completed", export: "completed",
  skip: "completed", ai_enriched: "completed", ai_enrichment_failed: "failed",
  edit_suggested: "pending", edit_approved: "approved", edit_rejected: "rejected",
  edit_superseded: "completed", edit_withdrawn: "completed", bulk_import: "completed",
  status_changed: "completed", withdrawn: "completed",
  category_created: "completed", category_updated: "completed", category_deleted: "completed",
  subcategory_created: "completed", subcategory_updated: "completed", subcategory_deleted: "completed",
  sub_subcategory_created: "completed", sub_subcategory_updated: "completed", sub_subcategory_deleted: "completed",
  "users.exported": "completed", "catalog.exported": "completed", "catalog.exported_github": "pending",
  "database.exported": "completed", maintenance_backfill_approved_at: "completed",
  maintenance_canonicalize_tags: "completed",
});
const auditActionStatus = (action) => AUDIT_ACTION_STATUS[action] ?? "recorded";

const relativeTime = (fromMs, toMs) => {
  const seconds = Math.max(0, Math.round((toMs - fromMs) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
};

/** True only when /api/admin/stats.database carries every field the substitutions read. */
const isDatabaseOverview = (value) =>
  Boolean(value)
  && [value.tables, value.totalRows, value.diskBytes, value.migrations?.applied].every(Number.isFinite)
  && (value.migrations.journaled === null || Number.isFinite(value.migrations.journaled))
  && Array.isArray(value.tableStats)
  && value.tableStats.every((table) => typeof table.name === "string" && Number.isFinite(table.rows) && Number.isFinite(table.bytes));

/** "24 KB" / "12.4 MB" / "34 MB" — mirrors formatStorageSize in DatabaseTab.tsx. */
const formatStorageSize = (bytes) => {
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.max(1, Math.round(kb))} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
  return `${(mb / 1024).toFixed(1)} GB`;
};

const FROZEN_ADMIN_DATABASE_STATS = `        <Stat label="Tables" value="12" />
        <Stat label="Rows" value="3,847" />
        <Stat label="Disk" value="34 MB" />
        <Stat label="Migrations" value="47" sub="0 pending" accent />`;

const FROZEN_ADMIN_DATABASE_TABLES = `            {[
              ['resources', '1,953', '12.4 MB', '2m ago'],
              ['categories', '9', '24 KB', '4d ago'],
              ['subcategories', '102', '88 KB', '4d ago'],
              ['users', '3', '8 KB', '1d ago'],
              ['audit_log', '14,329', '8.7 MB', '12s ago'],
              ['enrichment_jobs', '21', '156 KB', '3h ago'],
            ].map((row, i) => (`;

const FROZEN_ADMIN_EDITS_DECLARATION = `  const edits = [
    { id: 1, target: 'ffmpeg-python', field: 'description', user: 'krzemienski', time: '2h ago' },
    { id: 2, target: 'shaka-player', field: 'tags', user: 'mhanssen', time: '5h ago' },
    { id: 3, target: 'WebRTC.org', field: 'url', user: 'admin', time: '1d ago' },
  ];`;

const FROZEN_ADMIN_ENRICHMENT_STATS = `        <Stat label="Last enriched" value="3h ago" sub="batch #21 · 47 entries" />
        <Stat label="Queue" value="0" sub="idle" />
        <Stat label="Avg cost" value="$0.34" sub="per batch" />`;

const FROZEN_ADMIN_LINK_HEALTH_STATS = `  const stats = [
    { k: '200 OK', v: '1,847', color: '#34d08c' },
    { k: '301/302', v: '78', color: '#ffb84d' },
    { k: '404', v: '21', color: '#ff5c7a' },
    { k: 'Timeout', v: '7', color: '#ff5c7a' },
  ];`;

const FROZEN_ADMIN_LINK_HEALTH_ROWS = `            {[
              { t: 'AviSynth', u: 'http://avisynth.org/', s: '404', when: '2h ago' },
              { t: 'OpenVisualCloud/Smart-City', u: 'github.com/OpenVisualCloud/...', s: 'timeout', when: '2h ago' },
              { t: 'M3U8Kit/M3U8Parser', u: 'github.com/M3U8Kit/...', s: '301', when: '2h ago' },
            ].map((r, i) => (`;

const FROZEN_ADMIN_HEALTH_ROWS = `            {[
              { k: 'Database', v: 'healthy', ok: true },
              { k: 'GitHub sync', v: 'last: 1h ago', ok: true },
              { k: 'Link checker', v: 'running · 47%', ok: true, warn: true },
              { k: 'Enrichment queue', v: '0 pending', ok: true },
              { k: 'Researcher API', v: 'healthy', ok: true },
            ].map((row, i) => (`;
const FROZEN_ADMIN_RESEARCH_NOTES = `          {[
            { k: 'AV1 hardware encoders 2026', n: 12, d: 'Active' },
            { k: 'Emerging WebRTC SFUs', n: 7, d: '2 days ago' },
            { k: 'Subtitle ML pipelines', n: 4, d: '1 week ago' },
            { k: 'Low-latency CMAF survey', n: 9, d: 'Active' },
          ].map((p, i) => (`;
const FROZEN_ADMIN_HEALTH_DOT = "'dot ' + (row.warn ? 'warn' : row.ok ? 'ok' : 'bad')";
const FROZEN_ADMIN_HEALTH_SUBTITLE = "<p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 16 }}>All systems nominal</p>";

/** Mirror of AdminOverview's title(): humanised status words. */
const titleWord = (value) => String(value).replace(/[_-]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

const parseDateMs = (value) => {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
};

const newestByCreatedAt = (items) =>
  [...items].sort((left, right) => (parseDateMs(right.createdAt) ?? 0) - (parseDateMs(left.createdAt) ?? 0))[0];

/** Mirror of AdminOverview's formatRelativeAgo use: "—" for a missing date. */
const ageOrDash = (value, frozenAtMs) => {
  const ms = parseDateMs(value);
  return ms === null ? "—" : relativeTime(ms, frozenAtMs);
};

/**
 * Mirror of AdminOverview.renderHealthRows for settled reads: a failed read
 * is the application's isError branch ("unavailable"). StatusChip renders the
 * "unknown" state as `dot muted`, which neither stylesheet colours.
 */
/**
 * Mirror of ResearchWorkspace.toResearchNote: the latest researcher jobs
 * become the workspace note cards (prompt, discovery count, "Active" while
 * pending/processing, otherwise completed/started/created age).
 */
const buildResearchNotes = (jobs, frozenAtMs) =>
  jobs.map((job) => ({
    k: job.prompt,
    n: job.totalDiscoveries ?? 0,
    d: job.status === "pending" || job.status === "processing"
      ? "Active"
      : ageOrDash(job.completedAt ?? job.startedAt ?? job.createdAt, frozenAtMs),
  }));

const buildOverviewHealth = ({ operations, ai, githubQueue, githubHistory, linkStatus, linkHistory, enrichment }, frozenAtMs) => {
  const rows = [];
  if (!operations.ok) rows.push({ k: "Database", v: "unavailable", state: "bad" });
  else {
    const probe = operations.body?.readiness?.lastProbe;
    const ready = operations.body?.status === "ready" && probe?.ready !== false;
    rows.push({
      k: "Database",
      v: ready ? `ready${probe?.durationMs === undefined ? "" : ` · ${probe.durationMs}ms`}` : `degraded${probe?.reason ? ` · ${probe.reason}` : ""}`,
      state: ready ? "ok" : "bad",
    });
  }
  if (!githubQueue.ok || !githubHistory.ok) rows.push({ k: "GitHub sync", v: "unavailable", state: "bad" });
  else {
    const activeGithub = newestByCreatedAt((githubQueue.body?.items || []).filter((item) => item.status === "pending" || item.status === "processing"));
    const latestGithub = newestByCreatedAt(Array.isArray(githubHistory.body) ? githubHistory.body : []);
    if (activeGithub) rows.push({ k: "GitHub sync", v: `${titleWord(activeGithub.status)} · ${ageOrDash(activeGithub.createdAt, frozenAtMs)}`, state: "warn" });
    else if (latestGithub?.status === "failed") rows.push({ k: "GitHub sync", v: `failed · ${ageOrDash(latestGithub.createdAt, frozenAtMs)}`, state: "bad" });
    else if (latestGithub) rows.push({ k: "GitHub sync", v: `${titleWord(latestGithub.status ?? "completed")} · ${ageOrDash(latestGithub.createdAt, frozenAtMs)}`, state: "ok" });
    else rows.push({ k: "GitHub sync", v: "no runs", state: "unknown" });
  }
  if (!linkStatus.ok || !linkHistory.ok || linkStatus.body?.success === false) rows.push({ k: "Link checker", v: "unavailable", state: "bad" });
  else {
    const currentLink = linkStatus.body?.job;
    const lastCompletedLink = [...(linkHistory.body?.jobs || [])]
      .filter((job) => job.status === "completed")
      .sort((left, right) => (parseDateMs(right.completedAt ?? right.createdAt) ?? 0) - (parseDateMs(left.completedAt ?? left.createdAt) ?? 0))[0];
    if (currentLink?.status === "pending" || currentLink?.status === "processing") rows.push({ k: "Link checker", v: `${titleWord(currentLink.status)} · ${ageOrDash(currentLink.createdAt, frozenAtMs)}`, state: "warn" });
    else if (currentLink?.status === "failed" || currentLink?.status === "cancelled") rows.push({ k: "Link checker", v: `${titleWord(currentLink.status)} · ${ageOrDash(currentLink.createdAt, frozenAtMs)}`, state: "bad" });
    else if (lastCompletedLink) {
      const broken = lastCompletedLink.brokenLinks;
      rows.push({ k: "Link checker", v: `last ${ageOrDash(lastCompletedLink.completedAt ?? lastCompletedLink.createdAt, frozenAtMs)}${broken ? ` · ${broken} broken` : ""}`, state: broken ? "warn" : "ok" });
    } else rows.push({ k: "Link checker", v: "no completed runs", state: "unknown" });
  }
  const jobs = enrichment.ok ? enrichment.body?.jobs || [] : [];
  const activeJobs = jobs.filter((job) => job.status === "pending" || job.status === "processing").length;
  const failedJobs = jobs.filter((job) => job.status === "failed").length;
  if (!enrichment.ok || enrichment.body?.success === false) rows.push({ k: "Enrichment queue", v: "unavailable", state: "bad" });
  else if (failedJobs) rows.push({ k: "Enrichment queue", v: `${failedJobs} failed`, state: "bad" });
  else if (activeJobs) rows.push({ k: "Enrichment queue", v: `${activeJobs} active`, state: "warn" });
  else rows.push({ k: "Enrichment queue", v: "idle", state: "ok" });
  if (!ai.ok || ai.body?.status !== "healthy") rows.push({ k: "Researcher API", v: ai.ok && ai.body?.status ? titleWord(ai.body.status) : "unavailable", state: "bad" });
  else rows.push({ k: "Researcher API", v: "healthy", state: "ok" });
  const subtitle = rows.some((row) => row.state === "bad")
    ? "One or more systems need attention"
    : rows.some((row) => row.state === "unknown")
      ? "Checking current readiness"
      : rows.some((row) => row.state === "warn")
        ? "Some systems are still working"
        : "All systems nominal";
  return { rows: rows.map((row) => ({ k: row.k, v: row.v, cls: row.state === "unknown" ? "muted" : row.state })), subtitle };
};

/** Same locale-pinned admin timestamp as client formatAdminDateTime, rendered in the UTC capture context. */
const formatAdminDateTime = (iso) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
};

/** Mirror of BatchEnrichmentPanel's averageBatchCost: mean of recorded metadata.agent.estimatedCostUsd, "—" when none. */
const averageBatchCost = (jobs) => {
  const costs = jobs.map((job) => Number(job?.metadata?.agent?.estimatedCostUsd)).filter((cost) => Number.isFinite(cost) && cost >= 0);
  if (costs.length === 0) return "—";
  return `$${(costs.reduce((sum, cost) => sum + cost, 0) / costs.length).toFixed(2)}`;
};

/** Mirror of BatchEnrichmentPanel's effectiveStatus (a completed job with no successes and real failures reads as failed). */
const effectiveEnrichmentStatus = (job) => {
  if (job.status === "completed") {
    const processed = job.processedResources || 0;
    const total = job.totalResources || 0;
    const successful = job.successfulResources || 0;
    const failed = job.failedResources || 0;
    if (successful === 0 && (failed > 0 || (processed === 0 && total > 0))) return "failed";
  }
  return job.status;
};

const isoWeek = (date) => {
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  return Math.ceil(((utc - yearStart) / 86_400_000 + 1) / 7);
};

const formatJoined = (iso) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
};

const ADMIN_USERS_ROUTE = "/api/admin/users?page=1&limit=20&sortBy=createdAt&sortDir=desc";
const ADMIN_RESOURCES_ROUTE = "/api/admin/resources?page=1&limit=25&status=approved";
const ADMIN_AUDIT_ROUTE = "/api/admin/audit-logs?limit=50&offset=0";
const ADMIN_CONTACT_ROUTE = "/api/admin/contact-submissions?limit=20&offset=0";

/**
 * The frozen approval renderer declares its rows locally rather than reading a
 * window global. Keep this source declaration explicit so a design change
 * fails closed, then replace it with the live pending queue in served bytes.
 */
const FROZEN_ADMIN_PENDING_DECLARATION = `  const pending = [
    { id: 1, title: 'WebCodecs API Reference', cat: 'Standards', user: 'guest', time: '14m ago' },
    { id: 2, title: 'av1-encoder-bench', cat: 'Encoding', user: 'guest', time: '1h ago' },
    { id: 3, title: 'OBS Lua Plugin Helper', cat: 'Media Tools', user: 'mhanssen', time: '3h ago' },
    { id: 4, title: 'low-latency-cmaf-spec.pdf', cat: 'Standards', user: 'guest', time: '5h ago' },
    { id: 5, title: 'react-native-track-player', cat: 'Players', user: 'guest', time: '1d ago' },
  ];`;

const toReferencePendingRow = (resource, frozenAtMs) => {
  const createdAtMs = Date.parse(resource?.createdAt || "");
  return {
    id: resource?.id,
    title: resource?.title || "",
    cat: resource?.category || "",
    user: resource?.submittedByEmail || resource?.submittedBy || "",
    time: Number.isFinite(createdAtMs) ? relativeTime(createdAtMs, frozenAtMs) : "",
  };
};

/**
 * Read admin data through the disposable admin's own signed-in session.
 * `fetchJson(route)` is provided by the identity handle and performs a
 * same-origin, credentialed fetch from the signed-in page (the same path the
 * app's own admin screens use). Read-only endpoints only.
 */
export async function buildAdminAdapter(fetchJson, frozenAtMs) {
  const reads = new Map();
  const fetchOnce = (route) => {
    if (!reads.has(route)) reads.set(route, fetchJson(route));
    return reads.get(route);
  };
  const get = async (route) => {
    const result = await fetchOnce(route);
    if (!result.ok) throw new Error(`${route} returned ${result.status} for the disposable admin`);
    return result.body;
  };
  const [stats, usersPage, resourcesPage, pending, audit, contactResponse, operations, catalog, nav, syncHistory, resourceEdits, enrichmentJobsBody, linkHealthStatus, linkHealthBroken, researcherJobsBody, overviewReads] = await Promise.all([
    get("/api/admin/stats"),
    get(ADMIN_USERS_ROUTE),
    get(ADMIN_RESOURCES_ROUTE),
    get("/api/admin/pending-resources"),
    get(ADMIN_AUDIT_ROUTE),
    fetchOnce(ADMIN_CONTACT_ROUTE),
    // Admin expected-side projections are retired: the frozen admin.jsx panels
    // are the reference for every admin tab (see reference-extensions.mjs).
    null,
    null,
    get("/api/awesome-list/nav"),
    get("/api/github/sync-history"),
    get("/api/admin/resource-edits"),
    get("/api/enrichment/jobs"),
    get("/api/admin/link-health/status"),
    get("/api/admin/link-health/broken-links"),
    // Research workspace notes (ResearchWorkspace.tsx): the latest four jobs.
    get("/api/researcher/jobs?limit=4"),
    // Overview "System health" reads (AdminOverview.tsx); a non-2xx response
    // is that panel's isError branch, so these are not fail-closed.
    (async () => ({
      operations: await fetchOnce("/api/admin/operations/health"),
      ai: await fetchOnce("/api/health/ai"),
      githubQueue: await fetchOnce("/api/github/sync-status"),
      githubHistory: await fetchOnce("/api/github/sync-history"),
      linkStatus: await fetchOnce("/api/admin/link-health/status"),
      linkHistory: await fetchOnce("/api/admin/link-health/history"),
      enrichment: await fetchOnce("/api/enrichment/jobs?limit=100"),
    }))(),
  ]);
  const overviewHealth = buildOverviewHealth(overviewReads, frozenAtMs);
  if (!Array.isArray(researcherJobsBody?.jobs)) {
    throw new Error("GET /api/researcher/jobs did not return { jobs: [] }; refusing invented research notes");
  }
  const researchNotes = buildResearchNotes(researcherJobsBody.jobs, frozenAtMs);
  // Edits / Enrichment / Link Health: the frozen panels declare fixture rows
  // locally. Bind the same live reads their application counterparts consume
  // (PendingEdits.tsx, BatchEnrichmentPanel.tsx, LinkHealthDashboard.tsx); an
  // empty live list is authoritative on both sides.
  if (!Array.isArray(resourceEdits)) {
    throw new Error("GET /api/admin/resource-edits did not return an array; refusing an invented edit history");
  }
  if (!Array.isArray(enrichmentJobsBody?.jobs)) {
    throw new Error("GET /api/enrichment/jobs did not return { jobs: [] }; refusing an invented enrichment job list");
  }
  if (!Array.isArray(linkHealthBroken?.checks) || typeof linkHealthStatus !== "object" || linkHealthStatus === null || !("job" in linkHealthStatus)) {
    throw new Error("Link-health reads did not return { job } and { checks: [] }; refusing invented link statistics");
  }
  const edits = resourceEdits.map((edit) => ({
    id: edit.id,
    target: edit.resource?.title || edit.resourceTitle || (edit.resourceId ? `#${edit.resourceId}` : "—"),
    field: Array.isArray(edit.changedFields) ? edit.changedFields.join(", ") : edit.field || "edit",
    user: edit.userEmail || edit.submittedByEmail || edit.userId || "—",
    time: edit.createdAt ? relativeTime(Date.parse(edit.createdAt), frozenAtMs) : "",
  }));
  const enrichmentJobs = enrichmentJobsBody.jobs;
  const lastCompletedEnrichment = enrichmentJobs.find((job) => job.status === "completed") || null;
  const enrichment = {
    lastEnriched: lastCompletedEnrichment?.completedAt ? relativeTime(Date.parse(lastCompletedEnrichment.completedAt), frozenAtMs) : "—",
    lastEnrichedSub: lastCompletedEnrichment ? `batch #${lastCompletedEnrichment.id} · ${lastCompletedEnrichment.successfulResources || 0} entries` : "No completed batches",
    queue: enrichmentJobs.filter((job) => job.status === "pending" || job.status === "processing").length,
    queueSub: enrichmentJobs.some((job) => job.status === "pending" || job.status === "processing") ? "active" : "idle",
    avgCost: averageBatchCost(enrichmentJobs),
    jobs: enrichmentJobs.slice(0, 6).map((job) => ({
      id: `#${job.id}`,
      status: effectiveEnrichmentStatus(job),
      started: job.startedAt ? new Date(job.startedAt).toLocaleString("en-US", { timeZone: "UTC" }) : "—",
      completed: job.completedAt ? new Date(job.completedAt).toLocaleString("en-US", { timeZone: "UTC" }) : "—",
    })),
  };
  const latestLinkJob = linkHealthStatus.job;
  const linkChecks = linkHealthBroken.checks;
  const countLinkStatus = (statuses) => linkChecks.filter((check) => statuses.includes(check.status)).length;
  const linkHealth = {
    healthy: Math.max(0, (latestLinkJob?.totalLinks || 0) - linkChecks.length),
    redirect: countLinkStatus(["redirect"]),
    broken: countLinkStatus(["broken", "dns_failure"]),
    timeout: countLinkStatus(["timeout"]),
    failures: linkChecks
      .filter((check) => check.flaggedForReview || ["broken", "dns_failure", "timeout"].includes(check.status))
      .map((check) => ({
        t: check.resource?.title ?? `Resource #${check.resourceId}`,
        u: check.url || "",
        s: check.status || "",
        when: check.lastCheckedAt ? formatAdminDateTime(check.lastCheckedAt) : "",
      })),
  };
  // The frozen GitHub panel lists AV_SYNC_JOBS (id / type / status). Bind the
  // same five newest sync-history rows the application's panel renders
  // (GitHubSyncPanel.tsx: newest first, slice(0, 5)) instead of the data.js
  // fixture, so both sides describe the same real jobs.
  if (!Array.isArray(syncHistory)) {
    throw new Error("GET /api/github/sync-history did not return an array; refusing an invented GitHub job list");
  }
  const syncJobs = syncHistory
    .slice()
    .sort((a, b) => Date.parse(b.createdAt || "") - Date.parse(a.createdAt || ""))
    .slice(0, 5)
    .map((sync) => ({
      id: sync.id,
      type: sync.direction === "export" || sync.direction === "push" ? "Export" : "Import",
      // The app renders no status chip when the row has none; mirror that
      // instead of inventing a "completed" state.
      status: sync.status ?? "",
    }));
  const navCategories = Array.isArray(nav?.categories) ? nav.categories : [];
  const users = Array.isArray(usersPage?.users) ? usersPage.users : [];
  const adminResources = Array.isArray(resourcesPage?.resources) ? resourcesPage.resources : [];
  const logs = Array.isArray(audit?.logs) ? audit.logs : Array.isArray(audit) ? audit : [];
  const pendingResources = Array.isArray(pending?.resources) ? pending.resources : [];
  const pendingApprovals = pendingResources.map((resource) => toReferencePendingRow(resource, frozenAtMs));
  const auditLogs = logs.map((log) => ({
    id: log.id,
    resourceId: log.resourceId ?? null,
    originalResourceId: log.originalResourceId ?? null,
    action: log.action || "updated",
    performedBy: log.performedBy || null,
    performedByEmail: log.performedByEmail || null,
    notes: log.notes || null,
    changes: log.changes || null,
    createdAt: log.createdAt || null,
  }));
  const contactBody = contactResponse?.ok && contactResponse.body && typeof contactResponse.body === "object"
    ? contactResponse.body
    : null;
  const admins = users.filter((user) => user.role === "admin").length;
  const contributors = users.length - admins;
  const oldestPending = pendingResources
    .map((item) => Date.parse(item.createdAt))
    .filter(Number.isFinite)
    .sort((a, b) => a - b)[0];
  const globals = {
    AV_RETAINED_OPERATIONS: operations,
    AV_RETAINED_CATALOG: catalog,
    AV_TOTAL_USERS: Number(stats.users ?? users.length),
    AV_USERS: users.map((user) => ({
      id: user.id,
      name: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || user.id,
      email: user.email || "",
      role: user.role || "user",
      joined: formatJoined(user.createdAt),
    })),
    // The frozen Resources table was authored for a loaded subset even though
    // the public catalog global normally contains the complete corpus. Bind
    // the same default 25-row admin page the application renders, while
    // leaving AV_TOTAL as the true catalog total.
    AV_SYNC_JOBS: syncJobs,
    AV_ENRICHMENT_JOBS: enrichment.jobs,
    AV_ADMIN_RESOURCES: adminResources.map((resource) => ({
      id: resource.id,
      title: resource.title || resource.name || "",
      cat: navCategories.find((category) =>
        category.name === resource.category || category.slug === resource.category
      )?.slug || null,
      tags: Array.isArray(resource.metadata?.tags)
        ? resource.metadata.tags.map((tag) => tag?.name || tag).filter(Boolean)
        : [],
      featured: resource.metadata?.featured === true,
      url: resource.url || "",
    })),
    // Data identities mirror the application's audit table (AuditTab.tsx):
    // the actor is the same PII-masked email, and the status chip follows the
    // same action → status translation instead of a blanket "completed".
    AV_RECENT_ACTIVITY: logs.map((log, index) => ({
      id: `TX#${log.id ?? index + 1}`,
      user: auditActorLabel(log),
      // AdminOverview.tsx: action words are humanised and the target is the
      // recorded title, else the original/current resource number, else notes.
      action: String(log.action || "updated").replace(/[_-]/g, " "),
      target: (() => {
        const title = String(log.changes?.resource?.title || log.changes?.title || "").trim();
        if (title) return title;
        const id = log.originalResourceId ?? log.resourceId;
        return id ? `#${id}` : log.notes ?? "System";
      })(),
      time: log.createdAt ? relativeTime(Date.parse(log.createdAt), frozenAtMs) : "",
      status: auditActionStatus(log.action),
    })),
    // Admin.jsx's frozen approval renderer does not consume globals for its
    // local row declaration; buildPlaceholderSubstitutions projects this
    // same live list into that declaration below.
    AV_PENDING_APPROVALS: pendingApprovals,
    AV_PENDING_RESOURCES: pendingResources.map((resource) => ({
      id: resource.id,
      title: resource.title || "",
      category: resource.category || "",
      subcategory: resource.subcategory || "",
      description: resource.description || "",
      createdAt: resource.createdAt || null,
      submittedBy: resource.submittedBy || null,
      submittedByEmail: resource.submittedByEmail || null,
    })),
    AV_AUDIT_LOGS: auditLogs,
    AV_AUDIT_TOTAL: Number(audit?.total ?? auditLogs.length),
    AV_CONTACT_SUBMISSIONS: contactBody
      ? {
        available: true,
        total: Number(contactBody.total ?? contactBody.submissions?.length ?? 0),
        submissions: Array.isArray(contactBody.submissions)
          ? contactBody.submissions.map((submission) => ({
            id: submission.id,
            name: submission.name || "",
            replyTo: submission.replyTo || "",
            subject: submission.subject || "",
            createdAt: submission.createdAt || null,
          }))
          : [],
      }
      : { available: false, status: Number(contactResponse?.status || 0), total: 0, submissions: [] },
  };
  return {
    globals,
    stats,
    pendingApprovals,
    counts: { users: users.length, admins, contributors, pending: Number(stats.pendingApprovals ?? pendingResources.length), oldestPendingMs: oldestPending ?? null },
    database: isDatabaseOverview(stats.database) ? stats.database : null,
    edits,
    enrichment,
    linkHealth,
    overviewHealth,
    researchNotes,
    endpoints: [...reads.keys()],
    snapshotBytes: Buffer.from(JSON.stringify({ stats, usersPage, resourcesPage, pending, audit, contactResponse, operations, catalog, nav, syncHistory, resourceEdits, enrichmentJobsBody, linkHealthStatus, linkHealthBroken, researcherJobsBody, overviewReads })),
  };
}

/**
 * Placeholder literal table. Each entry names the served file, the exact
 * source literal and the replacement; `available` is false when the value
 * cannot be derived from real data (the literal is then left untouched).
 */
export function buildPlaceholderSubstitutions({ adapter, home, frozenAt, admin, reconciliation }) {
  const frozenAtMs = frozenAt.getTime();
  const addedThisWeek = Number(home?.approvedThisWeek);
  if (!Number.isInteger(addedThisWeek) || addedThisWeek < 0) {
    throw new Error("Home feed approvedThisWeek is invalid; refusing a guessed reference substitution");
  }
  const categoriesCount = adapter.AV_CATEGORIES.length;
  const recentBinding = JSON.stringify(adapter.AV_RESOURCES.slice(0, 5));
  const entries = [
    { file: "home-layouts.jsx", from: "const recent = AV_RESOURCES.slice(0, 5);", to: `const recent = ${recentBinding};`, source: "/api/home recent resources in approved/indexed order", available: true },
    { file: "home-layouts.jsx", from: "const recent = AV_RESOURCES.slice(6, 12);", to: `const recent = ${recentBinding};`, source: "/api/home recent resources in approved/indexed order", available: true },
    { file: "home-layouts.jsx", from: "'+12 this week'", to: `'+${addedThisWeek} this week'`, source: "/api/home approvedThisWeek (approvedAt with createdAt fallback)", available: true },
    { file: "home-layouts.jsx", from: "CURATED · WEEK 37 ·", to: `CURATED · WEEK ${isoWeek(frozenAt)} ·`, source: "ISO week of the frozen clock", available: true },
    { file: "home-layouts.jsx", from: "['CONTRIBUTORS', 3, 'reviewing']", to: `['APPROVED THIS WEEK', ${addedThisWeek}, 'newly indexed']`, source: "/api/home approvedThisWeek (approvedAt with createdAt fallback)", available: true },
    { file: "design-systems.jsx", from: "'--text-3': 'rgba(244,243,238,0.4)'", to: "'--text-3': 'rgba(244,243,238,0.52)'", source: "approved expected-side Editorial AA contrast reconciliation (3.4:1 reference to 5.2:1 application)", available: true },
    { file: "admin.jsx", from: 'sub="across 9 categories"', to: `sub="across ${categoriesCount} categories"`, source: "nav category count", available: true },
    { file: "admin.jsx", from: "const filtered = AV_RESOURCES.filter(r => r.title.toLowerCase().includes(search.toLowerCase()));", to: "const filtered = (window.AV_ADMIN_RESOURCES || AV_RESOURCES).filter(r => r.title.toLowerCase().includes(search.toLowerCase()));", source: "/api/admin/resources default 25-row page (admin session only)", available: Boolean(admin) },
    { file: "admin.jsx", from: "title={`Resources (${AV_RESOURCES.length} of ${AV_TOTAL.toLocaleString()})`}", to: "title={`Resources (${(window.AV_ADMIN_RESOURCES || AV_RESOURCES).length} of ${AV_TOTAL.toLocaleString()})`}", source: "/api/admin/resources default page size (admin session only)", available: Boolean(admin) },
    { file: "admin.jsx", from: 'sub="2 admins · 1 contributor"', to: admin ? `sub="${admin.counts.admins} admin${admin.counts.admins === 1 ? "" : "s"} · ${admin.counts.contributors} contributor${admin.counts.contributors === 1 ? "" : "s"}"` : null, source: "/api/admin/users roles (admin session only)", available: Boolean(admin) },
    { file: "admin.jsx", from: 'value="7" sub="oldest 14m ago"', to: admin ? `value="${admin.counts.pending}" sub="${admin.counts.oldestPendingMs ? `oldest ${relativeTime(admin.counts.oldestPendingMs, frozenAtMs)}` : "nothing waiting"}"` : null, source: "/api/admin/stats pendingApprovals + oldest /api/admin/pending-resources createdAt vs frozen clock (admin session only)", available: Boolean(admin) },
    { file: "admin.jsx", from: FROZEN_ADMIN_PENDING_DECLARATION, to: admin ? `  const pending = ${JSON.stringify(admin.pendingApprovals)};` : null, source: "/api/admin/pending-resources (same unfiltered queue consumed by the Approvals tab; an empty live queue is authoritative)", available: Boolean(admin) },
    // Database panel: the frozen fixture numbers are replaced by the same
    // pg_catalog metrics the application renders from /api/admin/stats.database.
    {
      file: "admin.jsx",
      from: FROZEN_ADMIN_DATABASE_STATS,
      to: admin?.database ? `        <Stat label="Tables" value="${admin.database.tables.toLocaleString("en-US")}" />
        <Stat label="Rows" value="${admin.database.totalRows.toLocaleString("en-US")}" />
        <Stat label="Disk" value="${formatStorageSize(admin.database.diskBytes)}" />
        <Stat label="Migrations" value="${admin.database.migrations.applied.toLocaleString("en-US")}" sub="${admin.database.migrations.journaled === null ? "journal not shipped" : `${Math.max(0, admin.database.migrations.journaled - admin.database.migrations.applied)} pending`}" accent />` : null,
      source: "/api/admin/stats database (pg_catalog table count, exact row total, pg_database_size, drizzle journal; admin session only)",
      available: Boolean(admin?.database),
    },
    {
      file: "admin.jsx",
      from: FROZEN_ADMIN_DATABASE_TABLES,
      to: admin?.database ? `            {${JSON.stringify(admin.database.tableStats.map((table) => [
        table.name,
        table.rows.toLocaleString("en-US"),
        formatStorageSize(table.bytes),
        table.lastWriteAt ? relativeTime(Date.parse(table.lastWriteAt), frozenAtMs) : "—",
      ]))}.map((row, i) => (` : null,
      source: "/api/admin/stats database.tableStats (count(*), pg_total_relation_size, newest updated_at/created_at vs frozen clock; admin session only)",
      available: Boolean(admin?.database),
    },
    { file: "admin.jsx", from: FROZEN_ADMIN_EDITS_DECLARATION, to: admin ? `  const edits = ${JSON.stringify(admin.edits)};` : null, source: "/api/admin/resource-edits (same list the Edits tab renders; an empty live list is authoritative)", available: Boolean(admin) },
    // Overview "System health": the frozen fixture rows become the same
    // readiness the application derives from its seven health reads.
    { file: "admin.jsx", from: FROZEN_ADMIN_HEALTH_ROWS, to: admin ? `            {${JSON.stringify(admin.overviewHealth.rows)}.map((row, i) => (` : null, source: "/api/admin/operations/health, /api/health/ai, /api/github/sync-status|sync-history, /api/admin/link-health/status|history, /api/enrichment/jobs?limit=100 (AdminOverview.renderHealthRows mirror; admin session only)", available: Boolean(admin) },
    { file: "admin.jsx", from: FROZEN_ADMIN_HEALTH_DOT, to: "'dot ' + row.cls", source: "AdminOverview StatusChip dot tone (ok/warn/bad/muted)", available: Boolean(admin) },
    // Research workspace: the frozen note fixtures become the latest live
    // researcher jobs (ResearchWorkspace.tsx mirror); an empty list is authoritative.
    { file: "admin.jsx", from: FROZEN_ADMIN_RESEARCH_NOTES, to: admin ? `          {${JSON.stringify(admin.researchNotes)}.map((p, i) => (` : null, source: "/api/researcher/jobs?limit=4 (ResearchWorkspace.toResearchNote mirror; admin session only)", available: Boolean(admin) },
    { file: "admin.jsx", from: FROZEN_ADMIN_HEALTH_SUBTITLE, to: admin ? `<p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 16 }}>${admin.overviewHealth.subtitle}</p>` : null, source: "AdminOverview healthSubtitle derived from the bound health rows", available: Boolean(admin) },
    {
      file: "admin.jsx",
      from: FROZEN_ADMIN_ENRICHMENT_STATS,
      to: admin ? `        <Stat label="Last enriched" value=${JSON.stringify(admin.enrichment.lastEnriched)} sub=${JSON.stringify(admin.enrichment.lastEnrichedSub)} />
        <Stat label="Queue" value="${admin.enrichment.queue}" sub="${admin.enrichment.queueSub}" />
        <Stat label="Avg cost" value=${JSON.stringify(admin.enrichment.avgCost)} sub="per batch" />` : null,
      source: "/api/enrichment/jobs (last completed job vs frozen clock, pending+processing count, mean recorded metadata.agent.estimatedCostUsd)",
      available: Boolean(admin),
    },
    {
      file: "admin.jsx",
      from: FROZEN_ADMIN_LINK_HEALTH_STATS,
      to: admin ? `  const stats = ${JSON.stringify([
        { k: "200 OK", v: admin.linkHealth.healthy.toLocaleString("en-US"), color: "#34d08c" },
        { k: "301/302", v: admin.linkHealth.redirect.toLocaleString("en-US"), color: "#ffb84d" },
        { k: "404", v: admin.linkHealth.broken.toLocaleString("en-US"), color: "#ff5c7a" },
        { k: "Timeout", v: admin.linkHealth.timeout.toLocaleString("en-US"), color: "#ff5c7a" },
      ])};` : null,
      source: "/api/admin/link-health/status latest job totalLinks + /api/admin/link-health/broken-links status counts (LinkHealthDashboard summary arithmetic)",
      available: Boolean(admin),
    },
    { file: "admin.jsx", from: FROZEN_ADMIN_LINK_HEALTH_ROWS, to: admin ? `            {${JSON.stringify(admin.linkHealth.failures)}.map((r, i) => (` : null, source: "/api/admin/link-health/broken-links flagged/broken/dns_failure/timeout checks (an empty live list is authoritative)", available: Boolean(admin) },
    ...(reconciliation?.sourceSubstitutions || []),
  ];
  return entries;
}

/**
 * Apply the adapter script and the placeholder table to an in-memory snapshot
 * of the reference directory. Returns the served map plus provenance.
 */
export function adaptReferenceSnapshot(referenceSnapshot, { adapterScript, substitutions }) {
  const served = new Map(referenceSnapshot);
  served.set("data.js", Buffer.concat([referenceSnapshot.get("data.js"), Buffer.from(adapterScript)]));
  const applied = [];
  const unadapted = [];
  for (const entry of substitutions) {
    if (!entry.available) {
      unadapted.push({ file: entry.file, literal: entry.from, why: `${entry.source} not available in this run` });
      continue;
    }
    const original = served.get(entry.file);
    if (!original) throw new Error(`placeholder substitution target ${entry.file} is missing from the reference snapshot`);
    const text = original.toString("utf8");
    const occurrences = text.split(entry.from).length - 1;
    if (occurrences === 0) {
      unadapted.push({ file: entry.file, literal: entry.from, why: "literal not found in the reference source (design changed?)" });
      continue;
    }
    const approvedLegacyMultiMatch = entry.file === "home-layouts.jsx" && entry.from === "'+12 this week'";
    if (occurrences !== 1 && !approvedLegacyMultiMatch) {
      throw new Error(`Expected source substitution must match exactly once: ${entry.file} ${JSON.stringify(entry.from)} matched ${occurrences} times`);
    }
    served.set(entry.file, Buffer.from(text.split(entry.from).join(entry.to)));
    applied.push({ file: entry.file, from: entry.from, to: entry.to, occurrences, source: entry.source });
  }
  return {
    served,
    provenance: {
      applied,
      unadapted,
      rawHashes: Object.fromEntries([...referenceSnapshot].map(([relative, bytes]) => [relative, sha256(bytes)])),
      servedHashes: Object.fromEntries([...served].map(([relative, bytes]) => [relative, sha256(bytes)])),
      rule: "Substitutions are applied to the served in-memory bytes only; files under awesome-list-site-ds/ are never modified. Unavailable literals are left as designed and listed under unadapted.",
    },
  };
}

export function buildAdapterScript({ adapter, adminGlobals, appBase, snapshotBytes, frozenAt, reconciliation }) {
  const bound = {
    ...adapter,
    ...(adminGlobals || {}),
    AV_KIND_COUNTS: reconciliation?.kindCounts || {},
    AV_HOME_FEATURED: reconciliation?.featuredResources || [],
    AV_HOME_FEATURED_COUNT: reconciliation?.home?.featuredCount ?? 0,
    AV_OFFICIAL_BRAND_MARK: reconciliation?.officialBrandMark?.svg || "",
  };
  return `\n;(()=>{const priorIcons=new Map((window.AV_CATEGORIES||[]).flatMap(x=>[[x.id,x.icon],[x.name,x.icon]]));const bound=${JSON.stringify(bound)};bound.AV_CATEGORIES=bound.AV_CATEGORIES.map(x=>({...x,icon:priorIcons.get(x.id)||priorIcons.get(x.name)||''}));Object.assign(window,bound);window.__PARITY_REFERENCE_ADAPTER__=${JSON.stringify({
    source: `${appBase}/api/awesome-list + /api/awesome-list/nav + /api/config + /api/home + /api/resources/kinds/counts${adminGlobals ? " + /api/admin/* (disposable admin session)" : ""}`,
    sha256: sha256(snapshotBytes),
    frozenAt: frozenAt.toISOString(),
    adminGlobals: adminGlobals ? Object.keys(adminGlobals) : [],
    reconciliation: reconciliation ? {
      version: reconciliation.version,
      source: reconciliation.source,
      kindCounts: reconciliation.kindCounts,
      home: reconciliation.home,
      officialBrandMark: reconciliation.officialBrandMark ? {
        source: reconciliation.officialBrandMark.source,
        sha256: reconciliation.officialBrandMark.sha256,
        sourceSha256: reconciliation.officialBrandMark.sourceSha256,
      } : null,
      palette: reconciliation.palette,
      drawer: reconciliation.drawer,
      approved44px: reconciliation.approved44px,
      approved44pxControls: reconciliation.approved44pxControls,
    } : null,
    iconProvenance: "canonical reference data.js icon matched by category slug/name; unmatched categories intentionally have no invented icon",
  })};})();\n`;
}

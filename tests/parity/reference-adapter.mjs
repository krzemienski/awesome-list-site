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
import { collectOperationsBindings } from "./reference-admin-operations.mjs";
import { collectCatalogBindings } from "./reference-admin-catalog.mjs";

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
  const snapshotBytes = Buffer.from(JSON.stringify({ catalog, nav, home }));
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

const relativeTime = (fromMs, toMs) => {
  const seconds = Math.max(0, Math.round((toMs - fromMs) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
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
  const [stats, usersPage, pending, audit, contactResponse, operations, catalog] = await Promise.all([
    get("/api/admin/stats"),
    get(ADMIN_USERS_ROUTE),
    get("/api/admin/pending-resources"),
    get(ADMIN_AUDIT_ROUTE),
    fetchOnce(ADMIN_CONTACT_ROUTE),
    collectOperationsBindings(fetchOnce),
    collectCatalogBindings(fetchOnce),
  ]);
  const users = Array.isArray(usersPage?.users) ? usersPage.users : [];
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
    AV_RECENT_ACTIVITY: logs.map((log, index) => ({
      id: `TX#${log.id ?? index + 1}`,
      user: (log.performedByEmail || log.performedBy || "system").split("@")[0],
      action: log.action || "updated",
      target: log.changes?.resource?.title || log.changes?.title || (log.resourceId ? `#${log.resourceId}` : "—"),
      time: log.createdAt ? relativeTime(Date.parse(log.createdAt), frozenAtMs) : "",
      status: "completed",
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
    endpoints: [...reads.keys()],
    snapshotBytes: Buffer.from(JSON.stringify({ stats, usersPage, pending, audit, contactResponse, operations, catalog })),
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
    { file: "admin.jsx", from: 'sub="2 admins · 1 contributor"', to: admin ? `sub="${admin.counts.admins} admin${admin.counts.admins === 1 ? "" : "s"} · ${admin.counts.contributors} contributor${admin.counts.contributors === 1 ? "" : "s"}"` : null, source: "/api/admin/users roles (admin session only)", available: Boolean(admin) },
    { file: "admin.jsx", from: 'value="7" sub="oldest 14m ago"', to: admin ? `value="${admin.counts.pending}" sub="${admin.counts.oldestPendingMs ? `oldest ${relativeTime(admin.counts.oldestPendingMs, frozenAtMs)}` : "nothing waiting"}"` : null, source: "/api/admin/stats pendingApprovals + oldest /api/admin/pending-resources createdAt vs frozen clock (admin session only)", available: Boolean(admin) },
    { file: "admin.jsx", from: FROZEN_ADMIN_PENDING_DECLARATION, to: admin ? `  const pending = ${JSON.stringify(admin.pendingApprovals)};` : null, source: "/api/admin/pending-resources (same unfiltered queue consumed by the Approvals tab; an empty live queue is authoritative)", available: Boolean(admin) },
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

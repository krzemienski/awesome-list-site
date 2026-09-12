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
 *   - catalog adapter: public, credential-less `/api/awesome-list(+/nav)`
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
export async function buildCatalogAdapter(appBase) {
  const [catalog, nav] = await Promise.all([
    fetchJson(`${appBase}/api/awesome-list`),
    fetchJson(`${appBase}/api/awesome-list/nav`),
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
    AV_RESOURCES: corpusResources.map((item) => {
      const { category, subcategory, leaf } = byResourceId.get(String(item.id)) || {};
      return {
        id: item.id,
        title: item.title || item.name,
        cat: category?.slug || null,
        sub: subcategory?.slug || null,
        subsub: leaf?.slug || null,
        desc: item.description || "",
        tags: Array.isArray(item.metadata?.tags) ? item.metadata.tags.map((tag) => tag.name || tag).filter(Boolean) : [],
        featured: Boolean(item.featured),
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
  const snapshotBytes = Buffer.from(JSON.stringify({ catalog, nav }));
  const createdAts = corpusResources.map((item) => Date.parse(item.createdAt)).filter(Number.isFinite);
  return { adapter, catalog, nav, reconciledPaths, snapshotBytes, corpusResources, createdAts };
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

/**
 * Read admin data through the disposable admin's own signed-in session.
 * `fetchJson(route)` is provided by the identity handle and performs a
 * same-origin, credentialed fetch from the signed-in page (the same path the
 * app's own admin screens use). Read-only endpoints only.
 */
export async function buildAdminAdapter(fetchJson, frozenAtMs) {
  const get = async (route) => {
    const result = await fetchJson(route);
    if (!result.ok) throw new Error(`${route} returned ${result.status} for the disposable admin`);
    return result.body;
  };
  const [stats, usersPage, pending, audit] = await Promise.all([
    get("/api/admin/stats"),
    get("/api/admin/users?limit=100"),
    get("/api/admin/pending-resources"),
    get("/api/admin/audit-logs?limit=12"),
  ]);
  const users = Array.isArray(usersPage?.users) ? usersPage.users : [];
  const logs = Array.isArray(audit?.logs) ? audit.logs : Array.isArray(audit) ? audit : [];
  const pendingResources = Array.isArray(pending?.resources) ? pending.resources : [];
  const admins = users.filter((user) => user.role === "admin").length;
  const contributors = users.length - admins;
  const oldestPending = pendingResources
    .map((item) => Date.parse(item.createdAt))
    .filter(Number.isFinite)
    .sort((a, b) => a - b)[0];
  const globals = {
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
  };
  return {
    globals,
    stats,
    counts: { users: users.length, admins, contributors, pending: Number(stats.pendingApprovals ?? pendingResources.length), oldestPendingMs: oldestPending ?? null },
    endpoints: ["/api/admin/stats", "/api/admin/users?limit=100", "/api/admin/pending-resources", "/api/admin/audit-logs?limit=12"],
  };
}

/**
 * Placeholder literal table. Each entry names the served file, the exact
 * source literal and the replacement; `available` is false when the value
 * cannot be derived from real data (the literal is then left untouched).
 */
export function buildPlaceholderSubstitutions({ adapter, createdAts, frozenAt, admin }) {
  const frozenAtMs = frozenAt.getTime();
  const weekAgo = frozenAtMs - 7 * 86_400_000;
  const addedThisWeek = createdAts.filter((ms) => ms >= weekAgo && ms <= frozenAtMs).length;
  const categoriesCount = adapter.AV_CATEGORIES.length;
  const entries = [
    { file: "home-layouts.jsx", from: "'+12 this week'", to: `'+${addedThisWeek} this week'`, source: "count of catalog resources with createdAt inside the 7 days before the frozen clock", available: true },
    { file: "home-layouts.jsx", from: "CURATED · WEEK 37 ·", to: `CURATED · WEEK ${isoWeek(frozenAt)} ·`, source: "ISO week of the frozen clock", available: true },
    { file: "home-layouts.jsx", from: "['CONTRIBUTORS', 3, 'reviewing']", to: admin ? `['CONTRIBUTORS', ${admin.counts.users}, 'reviewing']` : null, source: "/api/admin/stats users (admin session only)", available: Boolean(admin) },
    { file: "admin.jsx", from: 'sub="across 9 categories"', to: `sub="across ${categoriesCount} categories"`, source: "nav category count", available: true },
    { file: "admin.jsx", from: 'sub="2 admins · 1 contributor"', to: admin ? `sub="${admin.counts.admins} admin${admin.counts.admins === 1 ? "" : "s"} · ${admin.counts.contributors} contributor${admin.counts.contributors === 1 ? "" : "s"}"` : null, source: "/api/admin/users roles (admin session only)", available: Boolean(admin) },
    { file: "admin.jsx", from: 'value="7" sub="oldest 14m ago"', to: admin ? `value="${admin.counts.pending}" sub="${admin.counts.oldestPendingMs ? `oldest ${relativeTime(admin.counts.oldestPendingMs, frozenAtMs)}` : "nothing waiting"}"` : null, source: "/api/admin/stats pendingApprovals + oldest /api/admin/pending-resources createdAt vs frozen clock (admin session only)", available: Boolean(admin) },
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

export function buildAdapterScript({ adapter, adminGlobals, appBase, snapshotBytes, frozenAt }) {
  const bound = { ...adapter, ...(adminGlobals || {}) };
  return `\n;(()=>{const priorIcons=new Map((window.AV_CATEGORIES||[]).flatMap(x=>[[x.id,x.icon],[x.name,x.icon]]));const bound=${JSON.stringify(bound)};bound.AV_CATEGORIES=bound.AV_CATEGORIES.map(x=>({...x,icon:priorIcons.get(x.id)||priorIcons.get(x.name)||''}));Object.assign(window,bound);window.__PARITY_REFERENCE_ADAPTER__=${JSON.stringify({
    source: `${appBase}/api/awesome-list + /api/awesome-list/nav${adminGlobals ? " + /api/admin/* (disposable admin session)" : ""}`,
    sha256: sha256(snapshotBytes),
    frozenAt: frozenAt.toISOString(),
    adminGlobals: adminGlobals ? Object.keys(adminGlobals) : [],
    iconProvenance: "canonical reference data.js icon matched by category slug/name; unmatched categories intentionally have no invented icon",
  })};})();\n`;
}

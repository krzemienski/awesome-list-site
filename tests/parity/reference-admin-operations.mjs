import crypto from "node:crypto";
import fsSync from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");

/**
 * This is an expected-side projection for the operations tabs which the
 * original frozen demonstrator does not contain in full.  It intentionally
 * does not import React, application components, or application CSS.  The
 * semantic contract is read from the application source below, while the
 * browser projection uses only the frozen card/button/table/chip primitives
 * and the frozen design tokens.
 */

const operationsSourcePaths = Object.freeze({
  adminDashboard: path.join(repoRoot, "client", "src", "pages", "AdminDashboard.tsx"),
  adminStats: path.join(repoRoot, "client", "src", "hooks", "useAdmin.ts"),
  database: path.join(repoRoot, "client", "src", "components", "admin", "DatabaseTab.tsx"),
  export: path.join(repoRoot, "client", "src", "components", "admin", "ExportTab.tsx"),
  github: path.join(repoRoot, "client", "src", "components", "admin", "GitHubSyncPanel.tsx"),
  frozenAdmin: path.join(repoRoot, "awesome-list-site-ds", "admin.jsx"),
  frozenStyles: path.join(repoRoot, "awesome-list-site-ds", "styles.css"),
});

/**
 * These are the only application reads used by this extension.  In
 * particular, no mutation endpoint is collected: the rendered controls are
 * the product's existing controls, not a claim that an expected-side button
 * can mutate the disposable reference page.
 */
const READ_ONLY_OPERATION_ROUTES = Object.freeze({
  stats: "/api/admin/stats",
  validationStatus: "/api/admin/validation-status",
  auditLogs: "/api/admin/audit-logs?limit=50&offset=0",
  syncHistory: "/api/github/sync-history",
  syncStatus: "/api/github/sync-status",
});

/**
 * CSS origins are deliberately explicit.  `operationsStyle` below is an
 * expected-only stylesheet; it uses these frozen primitives/tokens but does
 * not copy application selectors or CSS declarations.
 */
const operationsStyleOrigins = Object.freeze([
  Object.freeze({
    file: "awesome-list-site-ds/admin.jsx",
    primitives: [".card", ".btn", ".table", ".chip", ".tabs", ".tab.active"],
  }),
  Object.freeze({
    file: "awesome-list-site-ds/styles.css",
    tokens: [
      "--text",
      "--text-2",
      "--text-3",
      "--accent",
      "--surface",
      "--surface-2",
      "--border",
      "--border-strong",
      "--border-w",
      "--hairline-w",
      "--font-body",
      "--radius-sm",
      "--font-mono",
    ],
  }),
]);

/**
 * The expected extension's CSS is independent and page-scoped.  The bare
 * `card`, `btn`, `table`, and `chip` classes are the frozen design primitives;
 * every layout/semantic selector introduced here is prefixed.
 */
export const operationsStyle = `
.parity-operations{display:grid;gap:24px;width:100%;min-width:0;color:var(--text);font-family:var(--font-body)}
.parity-operations__stat-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
.parity-operations__stat{display:grid;gap:9px;min-width:0;padding:18px}
.parity-operations__stat-label{color:var(--text-3);font-family:var(--font-mono);font-size:10px;letter-spacing:.12em;text-transform:uppercase}
.parity-operations__stat-value{color:var(--text);font-size:28px;font-weight:700;line-height:1;font-variant-numeric:tabular-nums}
.parity-operations__stat-value--accent{color:var(--accent)}
.parity-operations__stat-detail{color:var(--text-2);font-size:12px;line-height:1.45}
.parity-operations__shell{overflow:hidden;padding:0}
.parity-operations__shell-header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:20px;border-bottom:var(--hairline-w) solid var(--border)}
.parity-operations__shell-header-copy{min-width:0}
.parity-operations__shell-header h2,.parity-operations__validation-header h2{margin:0;color:var(--text);font-size:14px;font-weight:600;line-height:1.3}
.parity-operations__shell-header p,.parity-operations__validation-header p{margin:5px 0 0;color:var(--text-3);font-size:12px;line-height:1.45}
.parity-operations__shell-actions{display:flex;align-items:center;justify-content:flex-end;flex-wrap:wrap;gap:8px}
.parity-operations__shell-body{padding:20px}
.parity-operations__format-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px}
.parity-operations__format-card{display:flex;flex-direction:column;min-height:176px;padding:20px}
.parity-operations__format-card:hover{border-color:var(--border-strong)}
.parity-operations__format-card--unavailable{opacity:.82}
.parity-operations__format-icon{display:grid;place-items:center;width:34px;height:34px;margin-bottom:14px;border:var(--border-w) solid var(--border);border-radius:var(--radius-sm);background:var(--surface-2);color:var(--accent);font-family:var(--font-mono);font-size:11px;font-weight:700}
.parity-operations__format-card--unavailable .parity-operations__format-icon{color:var(--text-3)}
.parity-operations__format-title{margin:0 0 6px;color:var(--text);font-size:14px;font-weight:600}
.parity-operations__format-copy{margin:0 0 16px;color:var(--text-2);font-size:12px;line-height:1.5}
.parity-operations__format-card .btn{width:100%;margin-top:auto}
.parity-operations__availability{display:flex;align-items:center;gap:7px;margin-top:auto;color:var(--text-3);font-family:var(--font-mono);font-size:10px;letter-spacing:.05em;text-transform:uppercase}
.parity-operations__availability small{font:inherit}
.parity-operations__management{overflow:hidden;padding:0}
.parity-operations__management-header{display:flex;align-items:flex-start;gap:12px;padding:20px;border-bottom:var(--hairline-w) solid var(--border)}
.parity-operations__management-mark{display:grid;place-items:center;flex:0 0 34px;width:34px;height:34px;border:var(--border-w) solid var(--border);border-radius:var(--radius-sm);background:var(--surface-2);color:var(--accent);font-family:var(--font-mono);font-size:11px;font-weight:700}
.parity-operations__management-header h2{margin:0;color:var(--text);font-size:14px;font-weight:600}
.parity-operations__management-header p{margin:5px 0 0;color:var(--text-3);font-size:12px;line-height:1.45}
.parity-operations__management-body{display:grid;gap:16px;padding:20px}
.parity-operations__notice{display:grid;grid-template-columns:16px 1fr;gap:8px;padding:14px;border-left:2px solid var(--accent);background:var(--surface-2);color:var(--text-2);font-size:12px;line-height:1.55}
.parity-operations__notice-mark{color:var(--accent);font-family:var(--font-mono);font-size:13px}
.parity-operations__notice strong{display:block;margin-bottom:5px;color:var(--text);font-size:13px}
.parity-operations__management-actions{display:grid;gap:10px}
.parity-operations__management-action{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
.parity-operations__management-action p{margin:0;color:var(--text-2);font-size:12px;line-height:1.45}
.parity-operations__repo-body{display:grid;gap:8px;padding:20px}
.parity-operations__repo-label{color:var(--text);font-size:12px;font-weight:600}
.parity-operations__repo-row{display:flex;align-items:center;gap:8px}
.parity-operations__repo-input{box-sizing:border-box;min-width:0;min-height:44px;flex:1;border:var(--border-w) solid var(--border);border-radius:var(--radius-sm);background:var(--surface-2);color:var(--text);font:12px var(--font-mono);padding:0 12px}
.parity-operations__repo-help{margin:0;color:var(--text-3);font-size:11px;line-height:1.45}
.parity-operations__table-wrap{overflow:auto}
.parity-operations__table{width:100%;min-width:40rem}
.parity-operations__table th,.parity-operations__table td{padding:11px 14px;text-align:left;vertical-align:middle}
.parity-operations__table th{white-space:nowrap}
.parity-operations__table td{color:var(--text-2)}
.parity-operations__table .parity-operations__mono{color:var(--text-3);font-family:var(--font-mono);font-size:11px;font-variant-numeric:tabular-nums}
.parity-operations__table .parity-operations__name{color:var(--accent);font-family:var(--font-mono);font-size:12px}
.parity-operations__table .parity-operations__right{text-align:right}
.parity-operations__link{color:var(--accent);font-size:12px;font-weight:600;text-decoration:none}
.parity-operations__link:hover{text-decoration:underline}
.parity-operations__empty,.parity-operations__error{padding:20px;color:var(--text-2);font-size:12px;line-height:1.55}
.parity-operations__unsupported{display:grid;grid-template-columns:24px 1fr;gap:12px;padding:20px}
.parity-operations__unsupported-mark{color:var(--accent);font-family:var(--font-mono);font-size:18px}
.parity-operations__unsupported h2{margin:0;color:var(--text);font-size:14px;font-weight:600}
.parity-operations__unsupported p{margin:5px 0 0;color:var(--text-2);font-size:12px;line-height:1.55}
.parity-operations__empty-state{display:grid;justify-items:center;gap:8px;padding:32px 20px;text-align:center;color:var(--text-2)}
.parity-operations__empty-mark{display:grid;place-items:center;width:44px;height:44px;border:var(--border-w) solid var(--text-2);border-radius:var(--radius-pill);font-family:var(--font-mono);font-size:18px}
.parity-operations__empty-state p{margin:0;line-height:1.45}
.parity-operations__empty-state p:first-of-type{font-weight:600}
.parity-operations__empty-state p:last-of-type{font-size:12px}
.parity-operations__github-empty{display:flex;align-items:flex-start;gap:12px;padding:14px;border:var(--border-w) solid var(--border);border-radius:var(--radius-sm);color:var(--text-2)}
.parity-operations__github-empty-mark{flex:0 0 auto;color:var(--accent);font-family:var(--font-mono);font-size:18px}
.parity-operations__github-empty p{margin:0;line-height:1.45}
.parity-operations__github-empty p+p{margin-top:3px;font-size:12px}
.parity-operations__validation{display:grid;gap:16px}
.parity-operations__validation-header{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding:20px;border-bottom:var(--hairline-w) solid var(--border)}
.parity-operations__validation-body{padding:20px}
.parity-operations__validation-summary{display:flex;align-items:center;gap:10px;flex-wrap:wrap;color:var(--text-2);font-size:12px}
.parity-operations__validation-counts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:16px}
.parity-operations__validation-count{padding:10px;border:var(--border-w) solid var(--border);border-radius:var(--radius-sm);background:var(--surface)}
.parity-operations__validation-count strong{display:block;color:var(--text);font-family:var(--font-mono);font-size:20px;line-height:1.1;font-variant-numeric:tabular-nums}
.parity-operations__validation-count span{display:block;margin-top:5px;color:var(--text-2);font-size:11px}
.parity-operations__validation-count--ok strong{color:var(--text)}
.parity-operations__validation-count--warn strong,.parity-operations__validation-count--bad strong{color:var(--accent)}
.parity-operations__expander{display:flex;align-items:center;gap:8px;min-height:44px;padding:0;border:0;background:transparent;color:var(--text-2);font:inherit;font-size:12px;font-weight:600;cursor:pointer}
.parity-operations__expander:hover{color:var(--text)}
.parity-operations__detail-list{display:grid;gap:6px;margin:4px 0 14px;padding:10px 12px;border:var(--border-w) solid var(--border);border-radius:var(--radius-sm);color:var(--text-2);font-size:12px;line-height:1.55}
.parity-operations__detail-list[hidden]{display:none}
.parity-operations__detail-heading{display:flex;align-items:center;gap:8px;color:var(--text)}
.parity-operations__detail-heading span{color:var(--text-3);font-family:var(--font-mono);font-size:10px}
.parity-operations__detail-item{padding-left:12px}
.parity-operations__failure{padding:14px;border-left:2px solid var(--accent);background:var(--surface-2);color:var(--text-2);font-size:12px;line-height:1.55}
.parity-operations__failure strong{display:block;margin-bottom:4px;color:var(--accent)}
.parity-operations__github-status{display:grid;gap:14px;padding:20px}
.parity-operations__github-badges{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.parity-operations__github-last{display:grid;gap:10px;padding:14px;border:var(--border-w) solid var(--border);border-radius:var(--radius-sm);background:var(--surface-2)}
.parity-operations__github-last-title{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;color:var(--text);font-size:13px;font-weight:600}
.parity-operations__github-last-copy{margin:0;color:var(--text-2);font-family:var(--font-mono);font-size:11px;line-height:1.5;overflow-wrap:anywhere}
.parity-operations__github-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;color:var(--text-2);font-size:11px;text-align:center}
.parity-operations__github-metrics strong{display:block;color:var(--text);font-family:var(--font-mono);font-size:14px}
.parity-operations__job-list{display:grid;gap:8px;max-height:220px;overflow:auto}
.parity-operations__job{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:10px 12px;border:var(--border-w) solid var(--border);border-radius:var(--radius-sm);background:var(--surface-2);font-size:12px}
.parity-operations__job-copy{min-width:0;color:var(--text-2)}
.parity-operations__job-copy strong{color:var(--text);font-weight:600}
.parity-operations__job-error{margin:4px 0 0;color:var(--accent);font-family:var(--font-mono);font-size:11px;overflow-wrap:anywhere}
.parity-operations__muted{color:var(--text-3)}
.parity-operations button,.parity-operations input{min-height:44px}
.parity-operations .btn{min-width:44px}
.parity-operations__status-chip{display:inline-flex;align-items:center;min-height:24px}
@media(max-width:64rem){.parity-operations__stat-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:48rem){.parity-operations__stat-grid,.parity-operations__validation-counts{grid-template-columns:1fr}.parity-operations__format-grid{grid-template-columns:1fr}.parity-operations__management-action{align-items:flex-start;flex-direction:column;gap:8px}.parity-operations__github-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.parity-operations__shell-header,.parity-operations__validation-header{padding:16px}.parity-operations__shell-body,.parity-operations__validation-body,.parity-operations__github-status,.parity-operations__repo-body{padding:16px}}
`;

const requiredSourceContracts = Object.freeze({
  adminDashboard: [
    "CANONICAL_TABS",
    '["export", "Export"',
    '["database", "Database"',
    '["github", "GitHub"',
  ],
  adminStats: [
    "/api/admin/stats",
  ],
  database: [
    "Database Management",
    "Seed Database",
    "Clear &amp; Re-seed",
    "/api/admin/seed-database",
    "Tables",
    "SQL Console",
  ],
  export: [
    "Export Awesome List",
    "JSON Snapshot",
    "CSV (resources)",
    "README.md",
    "OPML (categories)",
    "SQL dump",
    "API token",
    "Export history",
    "Validation Results",
    "Link Check Results",
    "/api/admin/validation-status",
    "/api/admin/audit-logs?",
    "/api/admin/export",
    "/api/admin/export-json",
    "/api/admin/validate",
    "/api/admin/check-links",
  ],
  github: [
    "ops-github-panel__repository-card",
    "Sync Status",
    "Recent Sync Jobs",
    "Sync jobs",
    "failed",
    "/api/github/sync-history",
    "/api/github/sync-status",
    "/api/github/import",
    "/api/github/export",
  ],
  frozenAdmin: [
    "function AdminExport",
    "function AdminDatabase",
    "function AdminGitHub",
    "SQL Console",
  ],
  frozenStyles: [".card", ".btn", ".table", ".chip", ".tabs", ".tab.active"],
});

const read = (file) => fsSync.readFileSync(file, "utf8");

const collectSourceProof = () => {
  const sources = Object.fromEntries(
    Object.entries(operationsSourcePaths).map(([key, file]) => [key, read(file)]),
  );
  const missing = Object.entries(requiredSourceContracts).flatMap(([key, literals]) =>
    literals.filter((literal) => !sources[key].includes(literal)).map((literal) => `${key}: ${literal}`),
  );
  if (missing.length) {
    throw new Error(
      `Admin operations source contract drifted; refusing expected projection (${missing.join(", ")})`,
    );
  }
  const files = Object.fromEntries(Object.entries(sources).map(([key, source]) => [
    key,
    {
      file: path.relative(repoRoot, operationsSourcePaths[key]).split(path.sep).join("/"),
      sha256: sha256(source),
    },
  ]));
  return {
    files,
    ...files,
    endpoints: Object.values(READ_ONLY_OPERATION_ROUTES),
    cssOrigins: operationsStyleOrigins,
  };
};

const unavailableResponse = (error) => ({
  ok: false,
  status: 0,
  body: null,
  error: error instanceof Error ? error.message : String(error),
});

const isRecord = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const isFiniteNumber = (value) => typeof value === "number" && Number.isFinite(value);
const isNonNegativeNumber = (value) => isFiniteNumber(value) && value >= 0;
const isNonNegativeInteger = (value) => isNonNegativeNumber(value) && Number.isInteger(value);
const isTimestamp = (value) => typeof value === "string" && !Number.isNaN(new Date(value).getTime());
const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

/**
 * Successful responses are projected into small allowlisted records before
 * they cross the parity boundary.  The server responses intentionally contain
 * more data than these panels render (for example audit `changes`, link-check
 * diagnostics, and sync metadata); none of that data is retained here.
 */
const normalizeStats = (body) => {
  const fields = ["users", "resources", "journeys", "totalPublic"];
  if (!isRecord(body) || fields.some((field) => !isNonNegativeInteger(body[field]))) return null;
  return Object.fromEntries(fields.map((field) => [field, body[field]]));
};

const normalizeDiagnostics = (items) => {
  if (!Array.isArray(items)) return null;
  const normalized = [];
  for (const item of items) {
    if (!isRecord(item) || !isNonNegativeInteger(item.line)
      || typeof item.rule !== "string" || typeof item.message !== "string"
      || typeof item.severity !== "string") return null;
    normalized.push({ line: item.line, rule: item.rule, message: item.message });
  }
  return normalized;
};

const normalizeLint = (value) => {
  if (value === null) return null;
  if (!isRecord(value) || typeof value.valid !== "boolean" || !isRecord(value.stats)
    || !isNonNegativeInteger(value.stats.totalLines)
    || !isNonNegativeInteger(value.stats.totalResources)
    || !isNonNegativeInteger(value.stats.totalCategories)) return null;
  const errors = normalizeDiagnostics(value.errors);
  const warnings = normalizeDiagnostics(value.warnings);
  if (!errors || !warnings) return null;
  return {
    valid: value.valid,
    stats: {
      totalResources: value.stats.totalResources,
      totalCategories: value.stats.totalCategories,
    },
    errors,
    warnings,
  };
};

const normalizeLinkCheck = (value) => {
  if (value === null) return null;
  const countFields = ["totalLinks", "validLinks", "brokenLinks", "redirects", "errors"];
  if (!isRecord(value) || countFields.some((field) => !isNonNegativeInteger(value[field]))
    || !isRecord(value.summary) || !isNonNegativeNumber(value.summary.averageResponseTime)
    || !isRecord(value.summary.byStatus) || !Array.isArray(value.results)) return null;
  const brokenResources = [];
  for (const item of value.results) {
    if (!isRecord(item) || typeof item.url !== "string" || typeof item.valid !== "boolean"
      || !isNonNegativeInteger(item.status)
      || (item.resourceTitle !== undefined && typeof item.resourceTitle !== "string")
      || (item.statusText !== undefined && typeof item.statusText !== "string")
      || (item.error !== undefined && typeof item.error !== "string")) return null;
    if (!item.valid && item.status >= 400) {
      brokenResources.push({
        ...(item.resourceTitle === undefined ? {} : { resourceTitle: item.resourceTitle }),
        url: item.url,
        status: item.status,
        ...(item.statusText === undefined ? {} : { statusText: item.statusText }),
        ...(item.error === undefined ? {} : { error: item.error }),
      });
    }
  }
  return {
    validLinks: value.validLinks,
    brokenLinks: value.brokenLinks,
    redirects: value.redirects,
    errors: value.errors,
    summary: { averageResponseTime: value.summary.averageResponseTime },
    brokenResources,
  };
};

const normalizeValidationStatus = (body) => {
  if (!isRecord(body) || !hasOwn(body, "awesomeLint") || !hasOwn(body, "linkCheck")
    || !hasOwn(body, "lastUpdated")
    || (body.lastUpdated !== null && !isTimestamp(body.lastUpdated))) return null;
  const awesomeLint = normalizeLint(body.awesomeLint);
  const linkCheck = normalizeLinkCheck(body.linkCheck);
  if (body.awesomeLint !== null && !awesomeLint) return null;
  if (body.linkCheck !== null && !linkCheck) return null;
  return { awesomeLint, linkCheck, lastUpdated: body.lastUpdated };
};

const normalizeAuditLogs = (body) => {
  if (!isRecord(body) || !Array.isArray(body.logs)
    || !isNonNegativeInteger(body.total) || !isNonNegativeInteger(body.limit)
    || !isNonNegativeInteger(body.offset)) return null;
  const logs = [];
  for (const item of body.logs) {
    if (!isRecord(item) || !isNonNegativeInteger(item.id) || typeof item.action !== "string"
      || !isTimestamp(item.createdAt)
      || (item.changes !== null && item.changes !== undefined && !isRecord(item.changes))) return null;
    const changes = isRecord(item.changes) ? item.changes : {};
    const databaseExport = item.action === "database.exported";
    const catalogExport = item.action === "catalog.exported";
    const format = typeof changes.format === "string"
      ? changes.format
      : databaseExport ? "json" : catalogExport ? "markdown" : "—";
    const rowCount = changes.rowCount ?? changes.resources ?? null;
    if (rowCount !== null && !isNonNegativeInteger(rowCount)) return null;
    logs.push({
      id: item.id,
      action: item.action,
      format,
      rowCount,
      createdAt: item.createdAt,
    });
  }
  return { logs, total: body.total, limit: body.limit, offset: body.offset };
};

const normalizeSyncHistory = (body) => {
  if (!Array.isArray(body)) return null;
  const normalized = [];
  for (const item of body) {
    if (!isRecord(item) || !isNonNegativeInteger(item.id)
      || typeof item.direction !== "string"
      || (item.status !== undefined && typeof item.status !== "string")
      || !isTimestamp(item.createdAt)
      || !isNonNegativeInteger(item.resourcesAdded)
      || !isNonNegativeInteger(item.resourcesUpdated)
      || !isNonNegativeInteger(item.resourcesRemoved)
      || !isNonNegativeInteger(item.totalResources)
      || (item.commitUrl !== null && item.commitUrl !== undefined && typeof item.commitUrl !== "string")
      || (item.commitMessage !== null && item.commitMessage !== undefined && typeof item.commitMessage !== "string")
      || (item.errorMessage !== null && item.errorMessage !== undefined && typeof item.errorMessage !== "string")) return null;
    normalized.push({
      id: item.id,
      direction: item.direction,
      ...(item.status === undefined ? {} : { status: item.status }),
      ...(item.errorMessage ? { errorMessage: item.errorMessage } : {}),
      ...(item.commitMessage ? { commitMessage: item.commitMessage } : {}),
      ...(item.commitUrl ? { commitUrl: item.commitUrl } : {}),
      resourcesAdded: item.resourcesAdded,
      resourcesUpdated: item.resourcesUpdated,
      resourcesRemoved: item.resourcesRemoved,
      totalResources: item.totalResources,
      createdAt: item.createdAt,
    });
  }
  return normalized;
};

const normalizeSyncStatus = (body) => {
  if (!isRecord(body) || !isNonNegativeInteger(body.total) || !Array.isArray(body.items)) return null;
  const deduped = new Map();
  let failedCount = 0;
  let pendingCount = 0;
  for (const item of body.items) {
    if (!isRecord(item) || !isNonNegativeInteger(item.id)
      || typeof item.repositoryUrl !== "string" || typeof item.action !== "string"
      || typeof item.status !== "string"
      || !isTimestamp(item.createdAt)
      || (item.processedAt !== null && item.processedAt !== undefined && !isTimestamp(item.processedAt))
      || (item.errorMessage !== null && item.errorMessage !== undefined && typeof item.errorMessage !== "string")) return null;
    if (item.status === "failed") failedCount += 1;
    if (item.status === "pending" || item.status === "processing") pendingCount += 1;
    const key = [item.action, item.status, item.repositoryUrl, item.errorMessage || ""].join("|");
    const prior = deduped.get(key);
    const candidate = {
      action: item.action,
      status: item.status,
      ...(item.errorMessage ? { errorMessage: item.errorMessage } : {}),
      createdAt: item.createdAt,
      ...(item.processedAt ? { processedAt: item.processedAt } : {}),
    };
    if (!prior) {
      deduped.set(key, { item: candidate, count: 1 });
    } else {
      prior.count += 1;
      if (new Date(item.createdAt).getTime() > new Date(prior.item.createdAt).getTime()) {
        prior.item = candidate;
      }
    }
  }
  const items = Array.from(deduped.values())
    .sort((a, b) => new Date(b.item.processedAt || b.item.createdAt).getTime()
      - new Date(a.item.processedAt || a.item.createdAt).getTime())
    .map(({ item, count }) => ({ ...item, ...(count > 1 ? { repeatCount: count } : {}) }));
  return { total: body.total, failedCount, pendingCount, items };
};

const normalizeSuccessfulBody = (key, body) => ({
  stats: normalizeStats,
  validationStatus: normalizeValidationStatus,
  auditLogs: normalizeAuditLogs,
  syncHistory: normalizeSyncHistory,
  syncStatus: normalizeSyncStatus,
}[key]?.(body) ?? null);

/**
 * Read only the endpoints used by the actual retained admin components.
 * Failed reads remain explicit response objects so an unavailable admin scope
 * cannot turn into invented rows, counts, statuses, or history.
 */
export async function collectOperationsBindings(fetchJson) {
  if (typeof fetchJson !== "function") {
    throw new TypeError("collectOperationsBindings requires fetchJson(route) returning {ok,status,body}");
  }
  const sourceProof = collectSourceProof();
  const readRoute = async (route) => {
    try {
      const response = await fetchJson(route);
      if (!response || typeof response !== "object" || typeof response.ok !== "boolean") {
        return unavailableResponse(`${route} returned an invalid fetchJson response`);
      }
      const status = Number.isFinite(Number(response.status)) ? Number(response.status) : 0;
      if (!response.ok) {
        return {
          ok: false,
          status,
          body: null,
          ...(response.error ? { error: String(response.error) } : {}),
        };
      }
      const normalizedBody = normalizeSuccessfulBody(
        Object.entries(READ_ONLY_OPERATION_ROUTES).find(([, candidate]) => candidate === route)?.[0],
        response.body,
      );
      if (normalizedBody === null) {
        return {
          ok: false,
          status,
          body: null,
          error: `${route} returned a successful response with an invalid body schema`,
        };
      }
      return {
        ok: true,
        status,
        body: normalizedBody,
        ...(response.error ? { error: String(response.error) } : {}),
      };
    } catch (error) {
      return unavailableResponse(`${route}: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  const entries = await Promise.all(
    Object.entries(READ_ONLY_OPERATION_ROUTES).map(async ([key, route]) => [key, await readRoute(route)]),
  );
  const payloads = Object.fromEntries(entries);
  return { payloads, sourceProof };
}

/**
 * Playwright serializes this function's source into the reference browser.
 * Keep every helper inside the function: it must not close over this module,
 * application code, or Node globals.  `extension` carries the collected
 * payloads and source proof and may also carry `operationsStyle`/`style`.
 */
export function projectOperations(document, root, extension) {
  const notApplicable = () => ({ status: "not-applicable", modified: [] });
  if (!root || !document || typeof root.querySelector !== "function") return notApplicable();
  const tabs = root.querySelector(".tabs");
  if (!tabs) return notApplicable();
  const active = tabs.querySelector(".tab.active");
  const activeLabel = active?.textContent?.trim() || "";
  const tab = activeLabel === "Database"
    ? "database"
    : activeLabel === "Export"
      ? "export"
      : activeLabel === "GitHub"
        ? "github"
        : null;
  if (!tab) return notApplicable();
  if (!extension?.payloads || !extension?.sourceProof) return notApplicable();

  const payloads = extension?.payloads || {};
  const responseFor = (key) => payloads[key] || {};
  const validBody = (key) => {
    const response = responseFor(key);
    return response.ok === true && response.body && typeof response.body === "object" && !Array.isArray(response.body)
      ? response.body
      : null;
  };
  const text = (value) => document.createTextNode(String(value ?? ""));
  const make = (tag, className, value) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (value !== undefined && value !== null) element.append(text(value));
    return element;
  };
  const append = (parent, ...children) => {
    children.filter(Boolean).forEach((child) => parent.append(child));
    return parent;
  };
  const formatNumber = (value) => Number.isFinite(Number(value))
    ? Number(value).toLocaleString("en-US")
    : "—";
  const formatDate = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? "—"
      : date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
  };
  const responseMessage = (key, fallback) => {
    const response = responseFor(key);
    if (response.error) return `${fallback} (${response.error})`;
    return `${fallback} (${response.status ? `HTTP ${response.status}` : "no response"})`;
  };
  const button = (label, variant = "ghost") => {
    const control = make("button", `btn ${variant}`, label);
    control.type = "button";
    return control;
  };
  const chip = (label, kind = "") => {
    const result = make("span", `chip ${kind} parity-operations__status-chip`, label);
    return result;
  };
  const stat = (label, value, detail, accent = false) => {
    const card = make("div", "card parity-operations__stat");
    append(
      card,
      make("div", "parity-operations__stat-label", label),
      make("div", `parity-operations__stat-value${accent ? " parity-operations__stat-value--accent" : ""}`, value),
      make("div", "parity-operations__stat-detail", detail),
    );
    return card;
  };
  const table = (headers, rows, emptyText = null) => {
    const wrap = make("div", "parity-operations__table-wrap");
    const element = make("table", "table parity-operations__table");
    const head = make("thead");
    const headRow = make("tr");
    headers.forEach((header) => headRow.append(make("th", "", header)));
    head.append(headRow);
    const body = make("tbody");
    if (!rows.length && emptyText) {
      const row = make("tr");
      const cell = make("td", "parity-operations__empty", emptyText);
      cell.colSpan = headers.length;
      row.append(cell);
      body.append(row);
    } else {
      rows.forEach((cells) => {
        const row = make("tr");
        cells.forEach((cell) => row.append(cell));
        body.append(row);
      });
    }
    append(element, head, body);
    wrap.append(element);
    return wrap;
  };
  const shell = (title, subtitle, content, actions = null) => {
    const section = make("section", "card parity-operations__shell");
    const header = make("header", "parity-operations__shell-header");
    const copy = make("div", "parity-operations__shell-header-copy");
    append(copy, make("h2", "", title), make("p", "", subtitle));
    header.append(copy);
    if (actions) {
      const actionSlot = make("div", "parity-operations__shell-actions");
      actions.forEach((action) => actionSlot.append(action));
      header.append(actionSlot);
    }
    section.append(header);
    if (content) {
      const body = make("div", "parity-operations__shell-body");
      body.append(content);
      section.append(body);
    }
    return section;
  };
  const unavailable = (title, message) => {
    const content = make("div", "parity-operations__unsupported");
    append(
      content,
      make("div", "parity-operations__unsupported-mark", "—"),
      (() => {
        const copy = make("div");
        append(copy, make("h2", "", title), make("p", "", message));
        return copy;
      })(),
    );
    return content;
  };
  const statusKind = (status) => ({
    completed: "ok",
    approved: "ok",
    healthy: "ok",
    pending: "warn",
    processing: "warn",
    warning: "warn",
    failed: "bad",
    rejected: "bad",
    cancelled: "muted",
  }[String(status || "").toLowerCase()] || "");
  const addStatus = (parent, value) => parent.append(chip(String(value || "—"), statusKind(value)));
  const replaceAfterTabs = (panel) => {
    let sibling = tabs.nextElementSibling;
    while (sibling) {
      const next = sibling.nextElementSibling;
      sibling.remove();
      sibling = next;
    }
    root.append(panel);
  };
  const formatCell = (value, className = "") => make("td", className, value);
  const numberCell = (value) => formatCell(formatNumber(value), "parity-operations__mono");
  const linkOrText = (value) => {
    if (!value) return make("span", "parity-operations__muted", "—");
    return make("span", "parity-operations__mono", value);
  };

  const projectDatabase = () => {
    const stats = validBody("stats");
    const database = make("div", "parity-operations");
    database.dataset.parityReferenceExtension = "admin-database";
    const statsAvailable = Boolean(stats) && ["users", "resources", "journeys", "totalPublic"]
      .some((key) => stats[key] !== undefined && Number.isFinite(Number(stats[key])));
    const rowsValue = statsAvailable
      ? stats.totalPublic ?? stats.resources
      : null;
    append(
      database,
      (() => {
        const grid = make("div", "parity-operations__stat-grid");
        append(
          grid,
          stat("Tables", "—", "Schema count is not exposed by the admin API"),
          stat("Rows", rowsValue === null || rowsValue === undefined ? "—" : formatNumber(rowsValue), statsAvailable ? "Public resources reported by admin stats" : responseMessage("stats", "Admin stats unavailable")),
          stat("Disk", "—", "Storage size is not exposed by the admin API"),
          stat("Migrations", "—", "Migration status is not exposed by the admin API", true),
        );
        return grid;
      })(),
      (() => {
        const management = make("section", "card parity-operations__management");
        const header = make("header", "parity-operations__management-header");
        const copy = make("div");
        append(
          copy,
          make("h2", "", "Database Management"),
          make("p", "", "Seed the database with video resources from the awesome-video JSON source"),
        );
        append(header, make("div", "parity-operations__management-mark", "DB"), copy);
        const body = make("div", "parity-operations__management-body");
        const notice = make("div", "parity-operations__notice");
        const noticeCopy = make("div");
        append(
          noticeCopy,
          make("strong", "", "Database Seeding"),
          text("This operation will populate the PostgreSQL database with all categories, subcategories, sub-subcategories, and resources from the awesome-video JSON source. Resources already in the database will be skipped."),
        );
        append(notice, make("span", "parity-operations__notice-mark", "i"), noticeCopy);
        const actions = make("div", "parity-operations__management-actions");
        const addAction = (label, description, variant) => {
          const row = make("div", "parity-operations__management-action");
          append(row, button(label, variant), make("p", "", description));
          actions.append(row);
        };
        addAction("Seed Database", "Add new resources without removing existing data", "primary");
        addAction("Clear & Re-seed", "Remove all data and re-populate (use with caution)", "ghost");
        append(body, notice, actions);
        append(management, header, body);
        return management;
      })(),
      shell("Tables", "PostgreSQL — primary database", (() => {
        const rows = ["resources", "users", "learning_journeys"].map((name) => [
          formatCell(name, "parity-operations__name"),
          numberCell(stats?.[name === "resources" ? "resources" : name === "users" ? "users" : "journeys"]),
          formatCell("—", "parity-operations__mono"),
          formatCell("—", "parity-operations__mono"),
          (() => {
            const cell = formatCell("", "parity-operations__right");
            const inspect = button("Inspect", "ghost");
            inspect.disabled = true;
            inspect.title = "Table inspection is not available from the admin API.";
            cell.append(inspect);
            return cell;
          })(),
        ]);
        return table(["Name", "Rows", "Size", "Last write", ""], rows);
      })()),
      shell("SQL Console", "Database query surface", (() => {
        const content = make("div", "parity-operations__unsupported");
        append(
          content,
          make("div", "parity-operations__unsupported-mark", "—"),
          make("p", "", "No SQL-console endpoint is exposed by this admin API. Queries are not accepted or executed here, so this surface does not provide a pretend editor or run action."),
        );
        return content;
      })()),
    );
    return database;
  };

  const appendFormatCard = (grid, title, description, icon, action, supported) => {
    const card = make("article", `card parity-operations__format-card${supported ? "" : " parity-operations__format-card--unavailable"}`);
    append(
      card,
      make("div", "parity-operations__format-icon", icon),
      make("h3", "parity-operations__format-title", title),
      make("p", "parity-operations__format-copy", description),
    );
    if (supported) {
      card.append(button(action, "primary"));
    } else {
      const availability = make("div", "parity-operations__availability");
      const unavailableChip = chip("Unavailable", "muted");
      unavailableChip.title = "No supported admin endpoint is available.";
      append(availability, unavailableChip);
      card.append(availability);
    }
    grid.append(card);
  };
  const appendExportHistory = (parent) => {
    const response = responseFor("auditLogs");
    if (response.ok !== true) {
      parent.append(shell("Export history", responseMessage("auditLogs", "Export history window unavailable."), unavailable(
        "Export history unavailable",
        "The audit log endpoint returned an error. No export history data is available.",
      )));
      return;
    }
    const body = validBody("auditLogs");
    if (!body) {
      parent.append(shell("Export history", "Export history payload unavailable.", unavailable(
        "Export history unavailable",
        "The audit log endpoint returned an invalid payload. No export history data is available.",
      )));
      return;
    }
    const logs = body.logs;
    const total = Number.isFinite(Number(body.total)) ? Number(body.total) : logs.length;
    const exports = logs.filter((entry) => entry && (entry.action === "catalog.exported" || entry.action === "database.exported"));
    const end = Math.min(logs.length, total);
    const nextPage = total > logs.length && logs.length > 0;
    const subtitle = total === 0
      ? "Exports among audit entries 0–0 of 0; no audit entries are available."
      : `Exports among audit entries 1–${end} of ${total} (50-entry bounded window); ${
        exports.length ? "exports found on this audit page." : nextPage ? "no exports on this audit page; use Next to inspect the next window." : "no exports on this audit page; this is the final audit page."
      }`;
    const previous = button("Previous", "ghost");
    previous.disabled = true;
    const next = button("Next", "ghost");
    next.disabled = !nextPage;
    const content = exports.length
      ? table(
        ["Type", "Format", "Status", "Rows", "Created"],
        exports.map((entry) => {
          const databaseExport = entry.action === "database.exported";
          return [
            formatCell(databaseExport ? "Database snapshot" : "Catalog"),
            formatCell(entry.format, "parity-operations__mono"),
            (() => { const cell = formatCell(""); addStatus(cell, "Completed"); return cell; })(),
            numberCell(entry.rowCount),
            formatCell(formatDate(entry.createdAt), "parity-operations__mono"),
          ];
        }),
      )
      : make("p", "parity-operations__empty", total === 0
        ? "No audit entries are available."
        : nextPage
          ? "No catalog exports on this audit page. Use Next to inspect the next bounded audit window."
          : "No catalog exports on this final audit page. Use Previous to inspect earlier windows.");
    parent.append(shell("Export history", subtitle, content, [previous, next]));
  };
  const appendDisclosure = (parent, label, items) => {
    if (!Array.isArray(items) || !items.length) return;
    const wrapper = make("div");
    const toggle = button(`${label} (${items.length})`, "ghost");
    toggle.className = "parity-operations__expander";
    const details = make("div", "parity-operations__detail-list");
    details.hidden = true;
    const groups = new Map();
    items.forEach((item) => {
      const rule = item?.rule || "unknown-rule";
      const group = groups.get(rule);
      if (group) group.push(item);
      else groups.set(rule, [item]);
    });
    groups.forEach((group, rule) => {
      const heading = make("div", "parity-operations__detail-heading");
      append(heading, make("strong", "", rule), make("span", "", `×${group.length}`));
      details.append(heading);
      group.forEach((item) => {
        const row = make("div", "parity-operations__detail-item");
        append(row, text(`Line ${item.line}: `), text(item.message));
        details.append(row);
      });
    });
    toggle.addEventListener("click", () => {
      details.hidden = !details.hidden;
      toggle.setAttribute("aria-expanded", String(!details.hidden));
    });
    toggle.setAttribute("aria-expanded", "false");
    append(wrapper, toggle, details);
    parent.append(wrapper);
  };
  const appendValidation = (parent) => {
    const response = responseFor("validationStatus");
    if (response.ok !== true) {
      parent.append(shell("Validation Results", responseMessage("validationStatus", "Validation status unavailable."), unavailable(
        "Validation status unavailable",
        "The validation-status endpoint returned an error. No validation result is available.",
      )));
      return;
    }
    const body = validBody("validationStatus");
    if (!body) {
      parent.append(shell("Validation Results", "Validation status payload unavailable.", unavailable(
        "Validation status unavailable",
        "The validation-status endpoint returned an invalid payload. No validation result is available.",
      )));
      return;
    }
    const lint = body.awesomeLint;
    const links = body.linkCheck;
    if (!lint && !links) {
      const empty = make("div", "parity-operations__empty-state");
      append(
        empty,
        make("div", "parity-operations__empty-mark", "!"),
        make("p", "", "No validation results yet"),
        make("p", "", "Run validation above to check the exported Markdown against awesome-lint rules."),
      );
      parent.append(shell("Validation Results", "Awesome-lint and link-check status", empty));
      return;
    }
    if (lint) {
      const valid = lint.valid === true;
      const result = make("section", "card parity-operations__shell");
      const header = make("header", "parity-operations__validation-header");
      const copy = make("div");
      append(copy, make("h2", "", "Validation Results"), make("p", "", "Awesome-lint compliance check on exported markdown"));
      append(header, copy, chip(valid ? "Passed" : "Failed", valid ? "ok" : "bad"));
      const bodyNode = make("div", "parity-operations__validation-body");
      const summary = make("div", "parity-operations__validation-summary");
      append(
        summary,
        text(`${formatNumber(lint.stats?.totalResources)} resources, ${formatNumber(lint.stats?.totalCategories)} categories`),
      );
      const errors = Array.isArray(lint.errors) ? lint.errors : [];
      const warnings = Array.isArray(lint.warnings) ? lint.warnings : [];
      const details = make("div");
      appendDisclosure(details, "Errors", errors);
      appendDisclosure(details, "Warnings", warnings);
      append(bodyNode, summary, details);
      append(result, header, bodyNode);
      parent.append(result);
    }
    if (links) {
      const result = make("section", "card parity-operations__shell");
      const header = make("header", "parity-operations__validation-header");
      const copy = make("div");
      append(copy, make("h2", "", "Link Check Results"), make("p", "", "Live resource link health from the last check"));
      append(header, copy, chip(Number(links.brokenLinks) > 0 ? "Warning" : "Healthy", Number(links.brokenLinks) > 0 ? "warn" : "ok"));
      const bodyNode = make("div", "parity-operations__validation-body");
      const counts = make("div", "parity-operations__validation-counts");
      [["Valid links", links.validLinks, "ok"], ["Broken links", links.brokenLinks, "bad"], ["Redirects", links.redirects, "warn"], ["Errors", links.errors, ""]]
        .forEach(([label, value, kind]) => {
          const item = make("div", `parity-operations__validation-count${kind ? ` parity-operations__validation-count--${kind}` : ""}`);
          append(item, make("strong", "", formatNumber(value)), make("span", "", label));
          counts.append(item);
        });
      const broken = Array.isArray(links.brokenResources) ? links.brokenResources : [];
      const brokenNode = make("div");
      if (broken.length) {
        const failure = make("div", "parity-operations__failure");
        append(failure, make("strong", "", `Broken links (${broken.length})`), table(
          ["Resource", "URL", "Status"],
          broken.map((item) => [
            formatCell(item.resourceTitle || "Unknown Resource"),
            linkOrText(item.url),
            (() => {
              const cell = formatCell("");
              addStatus(cell, item.status >= 500 ? "Failed" : "Warning");
              append(cell, text(` ${item.status}`), text(item.statusText ? ` ${item.statusText}` : ""), text(item.error ? ` — ${item.error}` : ""));
              return cell;
            })(),
          ]),
        ));
        brokenNode.append(failure);
      }
      if (links.summary && Number.isFinite(Number(links.summary.averageResponseTime))) {
        brokenNode.append(make("p", "parity-operations__empty", `Average response time: ${Number(links.summary.averageResponseTime).toFixed(0)}ms`));
      }
      append(bodyNode, counts, brokenNode);
      append(result, header, bodyNode);
      parent.append(result);
    }
  };
  const projectExport = () => {
    const exportPanel = make("div", "parity-operations");
    exportPanel.dataset.parityReferenceExtension = "admin-export";
    const intro = make("div");
    append(intro, make("h2", "", "Export Awesome List"));
    const introActions = make("div", "parity-operations__shell-actions");
    append(introActions, button("Run Validation", "primary"), button("Run Link Check", "ghost"));
    const validationBody = validBody("validationStatus");
    if (validationBody?.lastUpdated) {
      introActions.append(make("span", "parity-operations__muted", `Last validated: ${formatDate(validationBody.lastUpdated)}`));
    }
    intro.append(introActions);
    const formats = make("div", "parity-operations__format-grid");
    appendFormatCard(formats, "JSON Snapshot", "Complete database backup as a single JSON file, including sanitized admin data.", "{}", "Download", true);
    appendFormatCard(formats, "CSV (resources)", "Flat resource table for spreadsheet workflows.", "CSV", "Download", false);
    appendFormatCard(formats, "README.md", "Awesome-list flavored Markdown generated from the live public catalog.", "MD", "Export Markdown", true);
    appendFormatCard(formats, "OPML (categories)", "Hierarchical export for feed readers.", "OP", "Download", false);
    appendFormatCard(formats, "SQL dump", "PostgreSQL-compatible schema and data.", "SQL", "Download", false);
    appendFormatCard(formats, "API token", "Generate a personal access token.", "API", "Generate", false);
    const validation = make("div", "parity-operations__validation");
    appendExportHistory(validation);
    appendValidation(validation);
    append(exportPanel, intro, formats, validation);
    return exportPanel;
  };
  const projectGithub = () => {
    const githubPanel = make("div", "parity-operations");
    githubPanel.dataset.parityReferenceExtension = "admin-github";
    const historyResponse = responseFor("syncHistory");
    const statusResponse = responseFor("syncStatus");
    const historyAvailable = historyResponse.ok === true && Array.isArray(historyResponse.body);
    const history = historyAvailable ? historyResponse.body : [];
    const queueBody = validBody("syncStatus");
    const queue = Array.isArray(queueBody?.items) ? queueBody.items : [];
    const queueAvailable = statusResponse.ok === true && Boolean(queueBody);
    const queueTotal = Number.isFinite(Number(queueBody?.total)) ? Number(queueBody.total) : queue.length;
    const failedCount = Number.isFinite(Number(queueBody?.failedCount))
      ? Number(queueBody.failedCount)
      : queue.filter((item) => item.status === "failed").length;
    const pendingCount = Number.isFinite(Number(queueBody?.pendingCount))
      ? Number(queueBody.pendingCount)
      : queue.filter((item) => item.status === "pending" || item.status === "processing").length;
    const sortedHistory = history.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const last = sortedHistory[0];
    const failed = queue.filter((item) => item.status === "failed");
    const repoCard = make("section", "card parity-operations__shell");
    const repoHeader = make("header", "parity-operations__management-header");
    const repoCopy = make("div");
    append(repoCopy, make("h2", "", "GitHub repository"));
    append(repoHeader, make("div", "parity-operations__management-mark", "GH"), repoCopy);
    const repoBody = make("div", "parity-operations__repo-body");
    const repoLabel = make("label", "parity-operations__repo-label", "Target Repository");
    const repoRow = make("div", "parity-operations__repo-row");
    const repoInput = make("input", "parity-operations__repo-input");
    repoInput.type = "text";
    repoInput.value = "krzemienski/awesome-video";
    repoInput.placeholder = "owner/repository";
    repoInput.readOnly = true;
    repoInput.setAttribute("aria-label", "Target Repository");
    const repoReset = button("↻", "ghost");
    repoReset.setAttribute("aria-label", "Reset to default");
    repoReset.title = "Reset to default";
    append(repoRow, repoInput, repoReset);
    append(repoBody, repoLabel, repoRow, make("p", "parity-operations__repo-help", "Format: owner/repository (e.g., krzemienski/awesome-video)"));
    const repoActions = make("div", "parity-operations__shell-actions");
    append(repoActions, button("Pull", "ghost"), button("Sync now", "primary"));
    append(repoBody, repoActions);
    repoCard.append(repoHeader, repoBody);
    const status = make("section", "card parity-operations__shell");
    const statusHeader = make("header", "parity-operations__validation-header");
    const statusTitle = make("div");
    append(statusTitle, make("h2", "", "Sync Status"), make("p", "", queueAvailable
      ? `${failedCount} failed · ${pendingCount} in progress`
      : statusResponse.ok === true
        ? "Sync status payload unavailable."
        : responseMessage("syncStatus", "Sync status unavailable.")));
    const badges = make("div", "parity-operations__github-badges");
    if (failedCount) badges.append(chip(`${failedCount} failed`, "bad"));
    if (pendingCount) badges.append(chip(`${pendingCount} in progress`, "warn"));
    if (!queueAvailable) badges.append(chip("Unavailable", "muted"));
    append(statusHeader, statusTitle, badges);
    const statusBody = make("div", "parity-operations__github-status");
    if (!queueAvailable) {
      statusBody.append(unavailable(
        "Sync status unavailable",
        statusResponse.ok === true
          ? "The sync-status endpoint returned an invalid payload. No queue data is available."
          : "The sync-status endpoint returned an error. No queue data is available.",
      ));
    } else {
      if (failed.length) {
        const latestFailure = failed.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
        const failure = make("div", "parity-operations__failure");
        append(failure, make("strong", "", `${failedCount} of ${queueTotal} recent sync job${queueTotal === 1 ? "" : "s"} failed`));
        if (latestFailure?.errorMessage) failure.append(make("div", "parity-operations__job-error", `Latest error: ${latestFailure.errorMessage}`));
        failure.append(make("div", "", "Review the latest error before retrying the sync."));
        statusBody.append(failure);
      }
      if (last) {
        const lastBox = make("div", "parity-operations__github-last");
        const title = make("div", "parity-operations__github-last-title");
        append(title, make("span", "", `Last ${last.direction === "export" ? "Export" : "Import"}`));
        if (last.status === "failed") title.append(chip("failed", "bad"));
        title.append(chip(formatDate(last.createdAt), "muted"));
        append(lastBox, title);
        if (last.commitMessage) lastBox.append(make("p", "parity-operations__github-last-copy", last.commitMessage));
        if (last.errorMessage) lastBox.append(make("p", "parity-operations__job-error", `Error: ${last.errorMessage}`));
        const metrics = make("div", "parity-operations__github-metrics");
        [["Added", last.resourcesAdded, "+"], ["Updated", last.resourcesUpdated, "~"], ["Removed", last.resourcesRemoved, "-"], ["Total", last.totalResources, ""]]
          .forEach(([label, value, prefix]) => {
            const item = make("div");
            append(item, make("strong", "", `${prefix}${formatNumber(value)}`), text(label));
            metrics.append(item);
          });
        lastBox.append(metrics);
        statusBody.append(lastBox);
      } else if (!queue.length) {
        const empty = make("div", "parity-operations__github-empty");
        const copy = make("div");
        append(
          copy,
          make("p", "", "No sync activity yet"),
          make("p", "", "Start a pull or sync to see its progress here."),
        );
        append(empty, make("div", "parity-operations__github-empty-mark", "◷"), copy);
        statusBody.append(empty);
      }
      if (queue.length) {
        const jobs = make("div");
        jobs.append(make("h3", "", "Recent Sync Jobs"));
        const list = make("div", "parity-operations__job-list");
        queue.forEach((item) => {
          const row = make("div", "parity-operations__job");
          const copy = make("div", "parity-operations__job-copy");
          append(copy, make("strong", "", `${item.action || "sync"} · ${formatDate(item.processedAt || item.createdAt)}`));
          if (item.errorMessage) copy.append(make("p", "parity-operations__job-error", item.errorMessage));
          const badge = chip(item.status || "—", statusKind(item.status));
          if (item.repeatCount > 1) badge.append(text(` ×${item.repeatCount}`));
          append(row, copy, badge);
          list.append(row);
        });
        append(jobs, list);
        statusBody.append(jobs);
      }
    }
    append(status, statusHeader, statusBody);
    githubPanel.append(repoCard, status);
    if (!historyAvailable) {
      githubPanel.append(shell("Sync jobs", responseMessage("syncHistory", "Sync history unavailable."), unavailable(
        "Sync history unavailable",
        historyResponse.ok === true
          ? "The sync-history endpoint returned an invalid payload. No historical operations are available."
          : "The sync-history endpoint returned an error. No historical operations are available.",
      )));
    } else if (history.length) {
      githubPanel.append(shell("Sync jobs", `All ${sortedHistory.length} import/export operation${sortedHistory.length === 1 ? "" : "s"}`, table(
        ["ID", "Type", "Status", ""],
        sortedHistory.map((sync) => [
          formatCell(`#${sync.id}`, "parity-operations__mono"),
          formatCell(sync.direction || "—"),
          (() => {
            const cell = formatCell("");
            if (sync.status) addStatus(cell, sync.status);
            if (sync.errorMessage) cell.append(make("div", "parity-operations__job-error", sync.errorMessage));
            return cell;
          })(),
          (() => {
            if (sync.commitUrl) {
              const cell = formatCell("");
              const link = make("a", "parity-operations__link", "View");
              link.href = sync.commitUrl;
              link.target = "_blank";
              link.rel = "noopener noreferrer";
              cell.append(link);
              return cell;
            }
            return formatCell(sync.commitMessage || "—", "parity-operations__mono");
          })(),
        ]),
      )));
    }
    return githubPanel;
  };

  const panel = tab === "database" ? projectDatabase() : tab === "export" ? projectExport() : projectGithub();
  replaceAfterTabs(panel);
  return {
    status: "applied",
    modified: tab === "database"
      ? ["database statistics", "database management controls", "database tables", "honest unavailable SQL console"]
      : tab === "export"
        ? ["export formats and controls", "export history", "validation results", "link-check results"]
        : ["GitHub repository controls", "sync status", "failure summary", "recent sync jobs", "sync history"],
  };
}

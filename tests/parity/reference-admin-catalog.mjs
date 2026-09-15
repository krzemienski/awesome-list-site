import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/*
 * This is an expected-side projection for the three retained admin product
 * surfaces which are not represented completely by the frozen prototype.
 * It intentionally has no imports from the application.  The collector reads
 * the same GET endpoints as the product and the browser projection only
 * renders the resulting snapshot.
 */

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const sourcePaths = Object.freeze({
  dashboard: path.join(repoRoot, "client", "src", "pages", "AdminDashboard.tsx"),
  categoryManager: path.join(repoRoot, "client", "src", "components", "admin", "CategoryManager.tsx"),
  categoryConfig: path.join(repoRoot, "client", "src", "components", "admin", "configs", "category-config.ts"),
  genericCrud: path.join(repoRoot, "client", "src", "components", "admin", "GenericCrudManager.tsx"),
  pendingEdits: path.join(repoRoot, "client", "src", "components", "admin", "PendingEdits.tsx"),
  enrichment: path.join(repoRoot, "client", "src", "components", "admin", "BatchEnrichmentPanel.tsx"),
  enrichmentRoute: path.join(repoRoot, "server", "routes", "domains", "ai-jobs.ts"),
  enrichmentRepository: path.join(repoRoot, "server", "repositories", "EnrichmentRepository.ts"),
  schema: path.join(repoRoot, "shared", "schema.ts"),
  validation: path.join(repoRoot, "shared", "validation.ts"),
  frozenAdmin: path.join(repoRoot, "awesome-list-site-ds", "admin.jsx"),
  frozenStyles: path.join(repoRoot, "awesome-list-site-ds", "styles.css"),
});

const readSourceContract = () => {
  const sources = Object.fromEntries(
    Object.entries(sourcePaths).map(([key, file]) => [key, fs.readFileSync(file, "utf8")]),
  );
  const editableFieldMatch = sources.schema.match(/export const EDITABLE_RESOURCE_FIELDS = \[([\s\S]*?)\]\s+as const/);
  const sourceEditableFields = editableFieldMatch
    ? [...editableFieldMatch[1].matchAll(/'([^']+)'/g)].map((match) => match[1])
    : null;
  const required = [
    ["admin dashboard canonical tabs", ["CANONICAL_TABS", "Edits", "Enrichment", "Categories", "TabsList", "TabsTrigger"].every((needle) => sources.dashboard.includes(needle))],
    ["category list endpoint", sources.categoryConfig.includes('fetchUrl: "/api/admin/categories"')],
    ["category mutation endpoints", [
      'createUrl: "/api/admin/categories"',
      "updateUrl: (id: number) => `/api/admin/categories/${id}`",
      "deleteUrl: (id: number) => `/api/admin/categories/${id}`",
    ].every((needle) => sources.categoryConfig.includes(needle))],
    ["category table headings", ["Icon", "Name", "Slug", "Resources", "Subcategories", "Actions"].every((needle) => sources.categoryConfig.includes(`label: "${needle}"`))],
    ["generic taxonomy search control", [
      "searchEnabled",
      "Search ${entityNamePlural.toLowerCase()}...",
      "input-search-${testIdEntityPlural}",
    ].every((needle) => sources.genericCrud.includes(needle))],
    ["generic taxonomy delete control", ["button-delete-${item.id}", "Delete"].every((needle) => sources.genericCrud.includes(needle))],
    ["generic taxonomy initial page contract", [
      "paginationEnabled = true",
      "itemsPerPage: defaultItemsPerPage = 10",
    ].every((needle) => sources.genericCrud.includes(needle))],
    ["pending edits endpoint", sources.pendingEdits.includes("'/api/admin/resource-edits'")],
    ["pending edits headings", ["Pending Edits", "Changes", "AI Analysis", "Submitted", "Status", "Actions"].every((needle) => sources.pendingEdits.includes(needle))],
    ["pending edit controls", [
      "button-view-edit-${edit.id}",
      "button-approve-edit-${edit.id}",
      "button-reject-edit-${edit.id}",
      "Edit Suggestion Details",
      "Proposed Changes",
    ].every((needle) => sources.pendingEdits.includes(needle))],
    ["enrichment jobs endpoint", sources.enrichment.includes("['/api/enrichment/jobs']")],
    ["enrichment coverage endpoint", sources.enrichment.includes("['/api/admin/enrichment/coverage']")],
    ["enrichment control headings", ["Job Control", "Filter", "Batch Size", "Custom Model", "Start Enrichment", "Job History"].every((needle) => sources.enrichment.includes(needle))],
    ["enrichment table headings", ["ID", "Status", "Started", "Ended", "Processed", "Success Rate", "Actions"].every((needle) => sources.enrichment.includes(needle))],
    ["editable resource field contract", [
      "EDITABLE_RESOURCE_FIELDS",
      "'title'",
      "'description'",
      "'url'",
      "'tags'",
      "'category'",
      "'subcategory'",
      "'subSubcategory'",
      "'resourceFormat'",
      "'provider'",
      "'skillLevel'",
    ].every((needle) => sources.schema.includes(needle))],
    ["bounded tag contract", ["TAG_MAX_LENGTH = 50"].every((needle) => sources.validation.includes(needle))],
    ["bounded enrichment history contract", [
      "rawLimit = String(req.query.limit ?? '')",
      "limit = rawLimit === ''",
      "50",
    ].every((needle) => sources.enrichmentRoute.includes(needle))
      && sources.enrichmentRepository.includes(".limit(limit)")
      && sources.enrichment.includes("max-h-[400px]")],
    ["frozen admin categories baseline", ["function AdminCategories", "Add category", "Subcategories"].every((needle) => sources.frozenAdmin.includes(needle))],
    ["frozen card/button/table primitives", [".card", ".btn", ".table"].every((needle) => sources.frozenStyles.includes(needle))],
    ["editable resource field list is exact", JSON.stringify(sourceEditableFields) === JSON.stringify(EDITABLE_RESOURCE_FIELDS)],
  ];
  const missing = required.filter(([, present]) => !present).map(([label]) => label);
  if (missing.length) {
    throw new Error(`Admin catalog source contract drifted; refusing expected projection (${missing.join(", ")})`);
  }
  return { sources, sourceProof: Object.fromEntries(
    Object.entries(sources).map(([key, source]) => [
      key,
      {
        file: path.relative(repoRoot, sourcePaths[key]).split(path.sep).join("/"),
        sha256: crypto.createHash("sha256").update(source).digest("hex"),
      },
    ]),
  ) };
};

const readOnlyRoutes = Object.freeze({
  categories: "/api/admin/categories",
  nav: "/api/awesome-list/nav",
  edits: "/api/admin/resource-edits",
  enrichmentJobs: "/api/enrichment/jobs",
  enrichmentCoverage: "/api/admin/enrichment/coverage",
});

const requireResponse = async (fetchJson, route) => {
  const response = await fetchJson(route);
  if (!response || response.ok !== true) {
    const status = response?.status ?? "unknown";
    throw new Error(`Admin catalog read-only route ${route} returned ${status}; refusing invented expected data`);
  }
  return response.body;
};

const requireArray = (body, label) => {
  if (!Array.isArray(body)) throw new Error(`Admin catalog ${label} payload is not an array; refusing expected projection`);
  return body;
};

const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const nullableString = (value, label) => {
  if (value !== null && value !== undefined && typeof value !== "string") {
    throw new Error(`Admin catalog ${label} must be a string or null; refusing expected projection`);
  }
  return value ?? null;
};
const requiredString = (value, label) => {
  if (typeof value !== "string") throw new Error(`Admin catalog ${label} must be a string; refusing expected projection`);
  return value;
};
const nullableNumber = (value, label) => {
  if (value !== null && value !== undefined && (typeof value !== "number" || !Number.isFinite(value))) {
    throw new Error(`Admin catalog ${label} must be a number or null; refusing expected projection`);
  }
  return value ?? null;
};
const requiredNumber = (value, label) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Admin catalog ${label} must be a finite number; refusing expected projection`);
  }
  return value;
};
const scalar = (value, label) => {
  if (value !== null
    && typeof value !== "string"
    && typeof value !== "boolean"
    && (typeof value !== "number" || !Number.isFinite(value))) {
    throw new Error(`Admin catalog ${label} must be a string, number, boolean, or null; refusing expected projection`);
  }
  return value;
};
const EDITABLE_RESOURCE_FIELDS = Object.freeze([
  "title",
  "description",
  "url",
  "tags",
  "category",
  "subcategory",
  "subSubcategory",
  "resourceFormat",
  "provider",
  "skillLevel",
]);
const boundedStringArray = (value, label) => {
  if (!Array.isArray(value) || value.length > 20 || value.some((item) => typeof item !== "string" || item.length > 50)) {
    throw new Error(`Admin catalog ${label} must be an array of at most 20 strings of at most 50 characters; refusing expected projection`);
  }
  return value.slice();
};

/*
 * These are the server-field semantics for the expected projection.  They are
 * intentionally narrower than the client types:
 *   - category rows expose only the values rendered in the taxonomy table;
 *   - edit rows expose only the values rendered in the queue and details view;
 *   - jobs expose persisted counters and timestamps verbatim.
 * No client-derived status, clamp, percentage, or duration is part of this
 * contract.
 */
const allowCategoryRows = (rows) => rows.map((row, index) => {
  if (!isRecord(row)) throw new Error(`Admin catalog category ${index} is malformed; refusing expected projection`);
  return {
    name: requiredString(row.name, `category ${index}.name`),
    slug: requiredString(row.slug, `category ${index}.slug`),
    resourceCount: requiredNumber(row.resourceCount, `category ${index}.resourceCount`),
  };
});

const allowNavRows = (rows) => rows.map((row, index) => {
  if (!isRecord(row)) throw new Error(`Admin catalog navigation category ${index} is malformed; refusing expected projection`);
  const children = row.subcategories;
  if (!Array.isArray(children)) throw new Error(`Admin catalog navigation category ${index}.subcategories is malformed; refusing expected projection`);
  return {
    name: requiredString(row.name, `navigation category ${index}.name`),
    slug: requiredString(row.slug, `navigation category ${index}.slug`),
    // This is a server-owned cardinality, not a placeholder child list.
    subcategoryCount: children.length,
  };
});

const allowChanges = (changes, label) => {
  if (!isRecord(changes)) throw new Error(`Admin catalog ${label}.proposedChanges is malformed; refusing expected projection`);
  return Object.fromEntries(Object.entries(changes).filter(([field]) => EDITABLE_RESOURCE_FIELDS.includes(field)).map(([field, change]) => {
    if (!isRecord(change)
      || !Object.prototype.hasOwnProperty.call(change, "old")
      || !Object.prototype.hasOwnProperty.call(change, "new")) {
      throw new Error(`Admin catalog ${label}.proposedChanges.${field} is malformed; refusing expected projection`);
    }
    const validate = field === "tags" ? boundedStringArray : scalar;
    return [field, {
      old: validate(change.old, `${label}.proposedChanges.${field}.old`),
      new: validate(change.new, `${label}.proposedChanges.${field}.new`),
    }];
  }));
};

const allowEditRows = (rows) => rows.map((row, index) => {
  if (!isRecord(row)) throw new Error(`Admin catalog edit ${index} is malformed; refusing expected projection`);
  let resource = null;
  if (row.resource !== null && row.resource !== undefined) {
    if (!isRecord(row.resource)) throw new Error(`Admin catalog edit ${index}.resource is malformed; refusing expected projection`);
    resource = {
      title: nullableString(row.resource.title, `edit ${index}.resource.title`),
      url: nullableString(row.resource.url, `edit ${index}.resource.url`),
      category: nullableString(row.resource.category, `edit ${index}.resource.category`),
    };
  }
  let claudeMetadata = null;
  if (row.claudeMetadata !== null && row.claudeMetadata !== undefined) {
    if (!isRecord(row.claudeMetadata)) throw new Error(`Admin catalog edit ${index}.claudeMetadata is malformed; refusing expected projection`);
    const confidence = nullableNumber(row.claudeMetadata.confidence, `edit ${index}.claudeMetadata.confidence`);
    const keyTopics = row.claudeMetadata.keyTopics;
    if (keyTopics !== undefined && (!Array.isArray(keyTopics) || keyTopics.some((topic) => typeof topic !== "string"))) {
      throw new Error(`Admin catalog edit ${index}.claudeMetadata.keyTopics is malformed; refusing expected projection`);
    }
    claudeMetadata = { confidence, keyTopics: keyTopics ?? null };
  }
  return {
    resource,
    proposedChanges: allowChanges(row.proposedChanges, `edit ${index}`),
    claudeMetadata,
    createdAt: requiredString(row.createdAt, `edit ${index}.createdAt`),
    status: requiredString(row.status, `edit ${index}.status`),
  };
});

const allowJobRows = (rows) => rows.map((row, index) => {
  if (!isRecord(row)) throw new Error(`Admin catalog enrichment job ${index} is malformed; refusing expected projection`);
  if (typeof row.id !== "number" || !Number.isFinite(row.id)) throw new Error(`Admin catalog enrichment job ${index}.id is malformed; refusing expected projection`);
  return {
    id: row.id,
    status: requiredString(row.status, `enrichment job ${index}.status`),
    totalResources: nullableNumber(row.totalResources, `enrichment job ${index}.totalResources`),
    processedResources: nullableNumber(row.processedResources, `enrichment job ${index}.processedResources`),
    successfulResources: nullableNumber(row.successfulResources, `enrichment job ${index}.successfulResources`),
    failedResources: nullableNumber(row.failedResources, `enrichment job ${index}.failedResources`),
    skippedResources: nullableNumber(row.skippedResources, `enrichment job ${index}.skippedResources`),
    startedAt: nullableString(row.startedAt, `enrichment job ${index}.startedAt`),
    completedAt: nullableString(row.completedAt, `enrichment job ${index}.completedAt`),
  };
});

/**
 * Collects only server-owned data used by the three extensions.  `fetchJson`
 * is deliberately injected so the harness can attach its disposable admin
 * session; it returns `{ok, status, body}` rather than throwing on HTTP
 * failures.
 */
export async function collectCatalogBindings(fetchJson) {
  if (typeof fetchJson !== "function") throw new TypeError("collectCatalogBindings requires a fetchJson function");
  const { sources, sourceProof } = readSourceContract();
  const [categories, nav, edits, enrichmentJobs, enrichmentCoverage] = await Promise.all([
    requireResponse(fetchJson, readOnlyRoutes.categories),
    requireResponse(fetchJson, readOnlyRoutes.nav),
    requireResponse(fetchJson, readOnlyRoutes.edits),
    requireResponse(fetchJson, readOnlyRoutes.enrichmentJobs),
    requireResponse(fetchJson, readOnlyRoutes.enrichmentCoverage),
  ]);

  const categoryRows = allowCategoryRows(requireArray(categories, "categories"));
  const navCategories = allowNavRows(requireArray(nav?.categories, "navigation categories"));
  const editRows = allowEditRows(requireArray(edits, "pending edits"));
  if (!enrichmentJobs || !Array.isArray(enrichmentJobs.jobs)) {
    throw new Error("Admin catalog enrichment jobs payload is missing jobs; refusing expected projection");
  }
  if (!enrichmentCoverage || typeof enrichmentCoverage !== "object" || Array.isArray(enrichmentCoverage)) {
    throw new Error("Admin catalog enrichment coverage payload is malformed; refusing expected projection");
  }
  const coverage = Object.fromEntries(["approvedTotal", "tagged", "untagged", "coveragePct"].map((field) => [
    field,
    requiredNumber(enrichmentCoverage[field], `enrichment coverage.${field}`),
  ]));
  // Keep `sources` referenced above so source reads and hashes cannot be
  // accidentally optimized away when this module is audited.
  if (Object.keys(sources).length !== Object.keys(sourceProof).length) {
    throw new Error("Admin catalog source proof is incomplete; refusing expected projection");
  }
  return {
    payloads: {
      categories: categoryRows,
      nav: { categories: navCategories },
      edits: editRows,
      enrichmentJobs: { jobs: allowJobRows(enrichmentJobs.jobs) },
      enrichmentCoverage: coverage,
    },
    sourceProof,
  };
}

/*
 * The frozen page supplies the design tokens and the card/button/table
 * primitives.  These rules only describe this projection's layout and use a
 * prefix so the expected surface cannot alter the application or frozen
 * prototype CSS.  Controls remain at least 44px high for keyboard and touch.
 */
export const catalogStyle = `
.parity-admin-catalog{display:flex;flex-direction:column;gap:18px;width:100%;min-width:0}
.parity-admin-catalog .parity-catalog-card{padding:0;overflow:hidden}
.parity-admin-catalog .parity-catalog-header{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;padding:18px 22px;border-bottom:1px solid var(--border)}
.parity-admin-catalog .parity-catalog-header h2{margin:0;color:var(--text);font-size:14px;font-weight:600}
.parity-admin-catalog .parity-catalog-header p{margin:4px 0 0;color:var(--text-3);font-size:12px}
.parity-admin-catalog .parity-catalog-actions{display:flex;align-items:center;justify-content:flex-end;flex-wrap:nowrap;gap:8px}
.parity-admin-catalog .parity-catalog-actions .input{width:280px;min-width:210px;min-height:44px}
.parity-admin-catalog .parity-catalog-toolbar{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;padding:14px 22px;border-bottom:1px solid var(--border)}
.parity-admin-catalog .parity-catalog-toolbar input,.parity-admin-catalog .parity-catalog-control{box-sizing:border-box;min-height:44px;border:var(--border-w) solid var(--border);border-radius:var(--radius-sm);background:var(--surface);color:var(--text);font:inherit;font-size:13px;padding:9px 12px}
.parity-admin-catalog .parity-catalog-toolbar input{width:min(100%,280px)}
.parity-admin-catalog .parity-catalog-table-wrap{overflow:auto}
.parity-admin-catalog .parity-catalog-table-wrap--bounded{max-height:400px}
.parity-admin-catalog .parity-catalog-table{width:100%;min-width:720px;border-collapse:collapse}
.parity-admin-catalog .parity-catalog-table--edits{min-width:860px}
.parity-admin-catalog .parity-catalog-table--enrichment{min-width:980px}
.parity-admin-catalog .parity-catalog-table th,.parity-admin-catalog .parity-catalog-table td{border-bottom:1px solid var(--border);padding:12px 16px;text-align:left;font-size:12px;vertical-align:middle}
.parity-admin-catalog .parity-catalog-table th{color:var(--text-3);font-family:var(--font-mono);font-size:10px;letter-spacing:.12em;text-transform:uppercase}
.parity-admin-catalog .parity-catalog-table td{color:var(--text-2)}
.parity-admin-catalog .parity-catalog-table td strong{color:var(--text);font-weight:500}
.parity-admin-catalog .parity-catalog-table td.parity-catalog-mono{font-family:var(--font-mono);font-size:11px}
.parity-admin-catalog .parity-catalog-table td.parity-catalog-actions{text-align:right;white-space:nowrap}
.parity-admin-catalog .parity-catalog-table td.parity-catalog-actions .btn{margin-left:6px}
.parity-admin-catalog .parity-catalog-table .parity-catalog-icon{display:inline-grid;place-items:center;width:28px;height:28px;border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--accent);font-size:15px}
.parity-admin-catalog .parity-catalog-empty{padding:40px 22px;text-align:center;color:var(--text-2);font-size:13px}
.parity-admin-catalog .parity-catalog-empty h3{margin:0 0 6px;color:var(--text);font-size:16px}
.parity-admin-catalog .parity-catalog-empty p{margin:0 0 14px}
.parity-admin-catalog .parity-catalog-muted{color:var(--text-3)}
.parity-admin-catalog .parity-catalog-status{display:inline-flex;align-items:center;min-height:28px;padding:4px 10px;border:1px solid var(--border);border-radius:var(--radius-pill);font-family:var(--font-mono);font-size:10px;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap}
.parity-admin-catalog .parity-catalog-status--ok{color:#34d08c;border-color:rgba(52,208,140,.3);background:rgba(52,208,140,.08)}
.parity-admin-catalog .parity-catalog-status--warn{color:#ffb84d;border-color:rgba(255,184,77,.3);background:rgba(255,184,77,.08)}
.parity-admin-catalog .parity-catalog-status--bad{color:#ff5c7a;border-color:rgba(255,92,122,.3);background:rgba(255,92,122,.08)}
.parity-admin-catalog .parity-catalog-status--muted{color:var(--text-3)}
.parity-admin-catalog .parity-catalog-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
.parity-admin-catalog .parity-catalog-stat{padding:20px}
.parity-admin-catalog .parity-catalog-stat__label{margin-bottom:10px;color:var(--text-3);font-family:var(--font-mono);font-size:10px;letter-spacing:.12em;text-transform:uppercase}
.parity-admin-catalog .parity-catalog-stat__value{color:var(--text);font-size:28px;font-weight:700;line-height:1}
.parity-admin-catalog .parity-catalog-stat__sub{margin-top:8px;color:var(--text-2);font-size:12px}
.parity-admin-catalog .parity-catalog-control-card{padding:22px}
.parity-admin-catalog .parity-catalog-control-card h3{margin:0 0 4px;color:var(--text);font-size:14px;font-weight:600}
.parity-admin-catalog .parity-catalog-control-card>p{margin:0 0 16px;color:var(--text-3);font-size:12px}
.parity-admin-catalog .parity-catalog-form{display:flex;flex-direction:column;gap:14px}
.parity-admin-catalog .parity-catalog-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
.parity-admin-catalog .parity-catalog-field{display:flex;flex-direction:column;gap:6px}
.parity-admin-catalog .parity-catalog-field label{color:var(--text-2);font-size:12px}
.parity-admin-catalog .parity-catalog-field input,.parity-admin-catalog .parity-catalog-field select{width:100%;min-height:44px;border:var(--border-w) solid var(--border);border-radius:var(--radius-sm);background:var(--surface);color:var(--text);font:inherit;font-size:13px;padding:9px 12px}
.parity-admin-catalog .parity-catalog-help{color:var(--text-3);font-size:11px;line-height:1.45}
.parity-admin-catalog .parity-catalog-advanced{border:1px solid var(--border);border-radius:var(--radius-sm);overflow:hidden}
.parity-admin-catalog .parity-catalog-advanced>button{display:flex;align-items:center;justify-content:space-between;width:100%;min-height:44px;padding:9px 12px;border:0;background:transparent;color:var(--text);font:inherit;text-align:left}
.parity-admin-catalog .parity-catalog-advanced-body{display:grid;gap:12px;padding:14px;border-top:1px solid var(--border)}
.parity-admin-catalog .parity-catalog-start{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.parity-admin-catalog .parity-catalog-active{padding:20px;border-color:color-mix(in srgb,var(--accent) 20%,var(--border))}
.parity-admin-catalog .parity-catalog-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;text-align:center}
.parity-admin-catalog .parity-catalog-metric__value{color:var(--text);font-family:var(--font-mono);font-size:20px;font-weight:700}
.parity-admin-catalog .parity-catalog-metric__label{color:var(--text-3);font-size:11px}
.parity-admin-catalog .parity-catalog-legend{margin:10px 0 0;color:var(--text-3);font-size:11px;line-height:1.45}
.parity-admin-catalog .parity-catalog-dialog{width:min(720px,calc(100vw - 32px));max-height:90vh;overflow:auto;padding:22px;border:1px solid var(--border);border-radius:var(--radius);background:var(--bg-2,var(--bg));color:var(--text)}
.parity-admin-catalog .parity-catalog-dialog::backdrop{background:rgba(0,0,0,.7)}
.parity-admin-catalog .parity-catalog-dialog h3{margin:0 0 12px;font-size:16px}
.parity-admin-catalog .parity-catalog-dialog h4{margin:18px 0 6px;color:var(--text);font-size:13px}
.parity-admin-catalog .parity-catalog-dialog p{margin:4px 0;color:var(--text-2);font-size:13px}
.parity-admin-catalog .parity-catalog-diff{display:grid;gap:8px}
.parity-admin-catalog .parity-catalog-diff-row{padding:9px 12px;border-left:2px solid var(--accent);background:var(--surface);font-size:12px}
.parity-admin-catalog .parity-catalog-diff-row strong{display:block;margin-bottom:4px;color:var(--text)}
.parity-admin-catalog .parity-catalog-diff-old{color:#ff5c7a}.parity-admin-catalog .parity-catalog-diff-new{color:#34d08c}
.parity-admin-catalog button,.parity-admin-catalog input,.parity-admin-catalog select{min-height:44px}
.parity-admin-catalog .parity-catalog-table .btn{min-height:44px}
 @media(max-width:48rem){.parity-admin-catalog .parity-catalog-grid,.parity-admin-catalog .parity-catalog-form-grid{grid-template-columns:1fr}.parity-admin-catalog .parity-catalog-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.parity-admin-catalog .parity-catalog-actions{flex-wrap:wrap}.parity-admin-catalog .parity-catalog-header,.parity-admin-catalog .parity-catalog-toolbar,.parity-admin-catalog .parity-catalog-control-card{padding-inline:16px}}
`;

/**
 * This function is serialized into the browser by the parity harness.  Keep
 * every helper local: no module function, style, DOM constructor, or payload
 * may leak through a closure.
 */
export function projectCatalog(document, root, extension) {
  const result = { status: "not-applicable", modified: [] };
  const tabs = root?.querySelector?.(".tabs");
  const active = tabs?.querySelector?.(".tab.active");
  const activeText = active?.textContent?.trim() || "";
  if (!tabs || !["Categories", "Edits", "Enrichment"].includes(activeText)) return result;
  const payloads = extension?.payloads;
  if (!payloads || !extension?.sourceProof) return result;

  const make = (tag, className, value) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (value && typeof value === "object" && value.nodeType) element.append(value);
    else if (value !== undefined && value !== null) element.append(document.createTextNode(String(value)));
    return element;
  };
  const append = (parent, ...children) => {
    children.filter(Boolean).forEach((child) => parent.append(child));
    return parent;
  };
  const button = (label, variant = "ghost", handler) => {
    const item = make("button", `btn ${variant}`, label);
    item.type = "button";
    if (handler) item.addEventListener("click", handler);
    return item;
  };
  const formatDate = (value) => {
    if (!value) return "—";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "—";
    return parsed.toLocaleString("en-US", {
      month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  };
  const sourceBadge = (element) => {
    element.dataset.parityCatalogSource = "read-only-api";
    return element;
  };
  const table = (headers, rows, minWidth = "720px", bounded = false) => {
    const wrap = make("div", `parity-catalog-table-wrap${bounded ? " parity-catalog-table-wrap--bounded" : ""}`);
    const widthClass = minWidth === "860px" ? " parity-catalog-table--edits"
      : minWidth === "980px" ? " parity-catalog-table--enrichment" : "";
    const tableElement = make("table", `table parity-catalog-table${widthClass}`);
    const head = make("thead");
    const headRow = make("tr");
    headers.forEach((header) => headRow.append(make("th", "", header)));
    head.append(headRow);
    const body = make("tbody");
    rows.forEach((cells) => {
      const row = make("tr");
      cells.forEach((cell) => row.append(cell && cell.nodeType ? cell : make("td", "", cell)));
      body.append(row);
    });
    tableElement.append(head, body);
    wrap.append(tableElement);
    return { wrap, body };
  };
  const panel = (title, description, actions = []) => {
    const card = make("section", "card parity-catalog-card");
    sourceBadge(card);
    const header = make("header", "parity-catalog-header");
    const copy = make("div");
    append(copy, make("h2", "", title), make("p", "", description));
    header.append(copy);
    if (actions.length) {
      const controls = make("div", "parity-catalog-actions");
      actions.forEach((action) => controls.append(action));
      header.append(controls);
    } else {
      // Keep a stable, scoped action slot. Categories fills it with the
      // search/add controls after construction; the other panels leave it
      // empty without changing their header geometry.
      header.append(make("div", "parity-catalog-actions"));
    }
    card.append(header);
    return card;
  };
  const status = (value) => {
    const raw = value === null || value === undefined ? "—" : String(value);
    const normalized = raw.toLowerCase();
    const kind = ["completed", "approved"].includes(normalized) ? "ok"
      : ["pending", "processing"].includes(normalized) ? "warn"
        : ["failed", "rejected"].includes(normalized) ? "bad" : "muted";
    return make("span", `parity-catalog-status parity-catalog-status--${kind}`, raw);
  };
  const replaceAfterTabs = (replacement) => {
    let sibling = tabs.nextElementSibling;
    while (sibling) {
      const next = sibling.nextElementSibling;
      sibling.remove();
      sibling = next;
    }
    root.append(replacement);
  };
  const navCategories = Array.isArray(payloads.nav?.categories) ? payloads.nav.categories : [];
  const categoryRows = Array.isArray(payloads.categories) ? payloads.categories : [];
  const categoryInitialPageSize = 10;

  const renderCategories = () => {
    const categoryPanel = panel("Categories", `${categoryRows.length} top-level domains`);
    const search = make("input", "input");
    search.type = "search";
    search.placeholder = "Search categories...";
    search.setAttribute("aria-label", "Search categories");
    const add = button("＋ Add category", "primary");
    const actions = categoryPanel.querySelector(".parity-catalog-actions");
    actions.append(search, add);
    const renderRows = () => {
      const query = search.value.trim().toLowerCase();
      const filtered = categoryRows.filter((item) => !query
        || String(item.name || "").toLowerCase().includes(query)
        || String(item.slug || "").toLowerCase().includes(query));
      const visible = filtered.slice(0, categoryInitialPageSize);
      const rows = visible.map((item) => {
        const navCategory = navCategories.find((candidate) =>
          String(candidate.slug || "").toLowerCase() === String(item.slug || "").toLowerCase()
          || String(candidate.name || "").toLowerCase() === String(item.name || "").toLowerCase());
        const childCount = navCategory ? navCategory.subcategoryCount : "—";
        const actionsCell = make("td", "parity-catalog-actions");
        actionsCell.append(button("Edit"), button("Delete", "danger"));
        const icon = make("span", "parity-catalog-icon", "•");
        icon.setAttribute("aria-hidden", "true");
        return [
          make("td", "", icon),
          make("td", "", make("strong", "", item.name || "—")),
          make("td", "parity-catalog-mono", item.slug || "—"),
          make("td", "parity-catalog-mono", item.resourceCount ?? "—"),
          make("td", "parity-catalog-mono", childCount),
          actionsCell,
        ];
      });
      if (!filtered.length) {
        const empty = make("div", "parity-catalog-empty");
        append(empty, make("h3", "", "No categories found"), make("p", "", query ? "No categories match your search." : "No categories are available."));
        tableWrap.replaceChildren(empty);
        return;
      }
      const next = table(["Icon", "Name", "Slug", "Resources", "Subcategories", "Actions"], rows);
      tableWrap.replaceChildren(next.wrap);
    };
    search.addEventListener("input", renderRows);
    const tableWrap = make("div");
    categoryPanel.append(tableWrap);
    renderRows();
    const stack = make("div", "parity-admin-catalog");
    stack.append(categoryPanel);
    return stack;
  };

  const renderEdits = () => {
    const edits = Array.isArray(payloads.edits) ? payloads.edits : [];
    const editPanel = panel("Pending Edits", `${edits.length} edit suggestions awaiting review`);
    if (!edits.length) {
      const empty = make("div", "parity-catalog-empty");
      const check = make("div", "parity-catalog-icon", "✓");
      append(empty, check, make("h3", "", "All Caught Up!"), make("p", "", "There are no pending edits to review at this time."), button("Check again"));
      editPanel.append(empty);
      const stack = make("div", "parity-admin-catalog");
      stack.append(editPanel);
      return stack;
    }
    const rows = edits.map((edit) => {
      const changes = edit.proposedChanges && typeof edit.proposedChanges === "object" ? edit.proposedChanges : {};
      const confidence = edit.claudeMetadata && typeof edit.claudeMetadata.confidence === "number"
        ? `${Math.round(edit.claudeMetadata.confidence * 100)}%` : "No AI";
      const resource = edit.resource || {};
      const resourceCell = make("td");
      const resourceName = make("strong", "", resource.title || "Unknown Resource");
      resourceCell.append(resourceName);
      if (resource.url) {
        const anchor = make("a", "parity-catalog-muted", "View Resource");
        anchor.href = resource.url;
        anchor.target = "_blank";
        anchor.rel = "noopener noreferrer";
        resourceCell.append(make("br"), anchor);
      }
      const actionsCell = make("td", "parity-catalog-actions");
      const details = button("View Details");
      const approve = button("Approve", "primary");
      const reject = button("Reject", "danger");
      actionsCell.append(details, approve, reject);
      details.addEventListener("click", () => {
        const dialog = make("dialog", "parity-catalog-dialog");
        const close = button("Close");
        const title = resource.title || "resource";
        append(dialog, make("h3", "", "Edit Suggestion Details"), make("p", "", "Review the proposed changes before approving or rejecting."));
        const info = make("div");
        append(info, make("h4", "", "Resource Information"), make("p", "", `Title: ${title}`), make("p", "", `URL: ${resource.url || "—"}`), make("p", "", `Category: ${resource.category || "—"}`));
        dialog.append(info);
        const diff = make("div", "parity-catalog-diff");
        append(dialog, make("h4", "", "Proposed Changes"), diff);
        Object.entries(changes).forEach(([field, change]) => {
          const row = make("div", "parity-catalog-diff-row");
          append(row, make("strong", "", field), make("div", "parity-catalog-diff-old", `− ${change && change.old !== undefined ? change.old : "(empty)"}`), make("div", "parity-catalog-diff-new", `＋ ${change && change.new !== undefined ? change.new : "(empty)"}`));
          diff.append(row);
        });
        if (edit.claudeMetadata) {
          const ai = make("div");
          append(ai, make("h4", "", "AI Analysis"), make("p", "", `Confidence: ${confidence}`));
          if (Array.isArray(edit.claudeMetadata.keyTopics) && edit.claudeMetadata.keyTopics.length) {
            ai.append(make("p", "", `Key Topics: ${edit.claudeMetadata.keyTopics.join(", ")}`));
          }
          dialog.append(ai);
        }
        append(dialog, make("h4", "", "Metadata"), make("p", "", `Submitted: ${formatDate(edit.createdAt)}`), make("p", "", `Status: ${edit.status ?? "—"}`), close);
        close.addEventListener("click", () => dialog.close());
        editPanel.append(dialog);
        dialog.addEventListener("close", () => dialog.remove(), { once: true });
        dialog.showModal();
      });
      return [
        resourceCell,
        make("td", "parity-catalog-mono", `${Object.keys(changes).length} field(s)`),
        make("td", "parity-catalog-mono", confidence),
        make("td", "parity-catalog-muted", formatDate(edit.createdAt)),
        make("td", "", status(edit.status)),
        actionsCell,
      ];
    });
    editPanel.append(table(["Resource", "Changes", "AI Analysis", "Submitted", "Status", "Actions"], rows, "860px").wrap);
    const stack = make("div", "parity-admin-catalog");
    stack.append(editPanel);
    return stack;
  };

  const renderEnrichment = () => {
    const jobsPayload = payloads.enrichmentJobs || {};
    const jobs = Array.isArray(jobsPayload.jobs) ? jobsPayload.jobs : [];
    const coverage = payloads.enrichmentCoverage || {};
    const enrichment = make("div", "parity-admin-catalog");
    const controls = make("section", "card parity-catalog-card parity-catalog-control-card");
    sourceBadge(controls);
    append(controls, make("h3", "", "Job Control"), make("p", "", "Configure and start a new batch enrichment job"));
    if (coverage) {
      const coverageLine = make("p", "parity-catalog-help", `Tag coverage: ${Number(coverage.tagged).toLocaleString()} of ${Number(coverage.approvedTotal).toLocaleString()} approved resources have tags (${coverage.coveragePct}%).`);
      if (Number(coverage.untagged) > 0) coverageLine.append(document.createTextNode(` Run an enrichment job with the "Unenriched Only" filter to close the ${Number(coverage.untagged).toLocaleString()}-resource gap.`));
      controls.append(coverageLine);
    }
    const form = make("div", "parity-catalog-form");
    const formGrid = make("div", "parity-catalog-form-grid");
    const filterField = make("div", "parity-catalog-field");
    const filterLabel = make("label", "", "Filter");
    const filter = make("select", "parity-catalog-control");
    filter.id = "parity-catalog-filter";
    filterLabel.htmlFor = filter.id;
    append(filter, make("option", "", "All Resources"), make("option", "", "Unenriched Only"));
    filter.value = "Unenriched Only";
    append(filterField, filterLabel, filter, make("span", "parity-catalog-help", "Choose which resources to enrich"));
    const batchField = make("div", "parity-catalog-field");
    const batchLabel = make("label", "", "Batch Size");
    const batch = make("input", "parity-catalog-control");
    batch.id = "parity-catalog-batch-size";
    batchLabel.htmlFor = batch.id;
    batch.type = "number";
    batch.min = "1";
    batch.max = "50";
    batch.value = "10";
    append(batchField, batchLabel, batch, make("span", "parity-catalog-help", "Resources per batch (1-50)"));
    append(formGrid, filterField, batchField);
    form.append(formGrid);
    const advanced = make("div", "parity-catalog-advanced");
    const advancedToggle = make("button", "", "Custom Model & Endpoint (optional)  ›");
    const advancedBody = make("div", "parity-catalog-advanced-body");
    advancedBody.hidden = true;
    [["Model", "text", "claude-haiku-4-5 (default)"], ["Base URL", "url", "https://api.anthropic.com (default)"], ["Auth Token", "password", "Required if a base URL is set (blank = platform key)"]].forEach(([label, type, placeholder]) => {
      const field = make("div", "parity-catalog-field");
      const input = make("input", "parity-catalog-control");
      input.type = type;
      input.placeholder = placeholder;
      append(field, make("label", "", label), input);
      advancedBody.append(field);
    });
    advancedToggle.addEventListener("click", () => {
      advancedBody.hidden = !advancedBody.hidden;
      advancedToggle.textContent = advancedBody.hidden ? "Custom Model & Endpoint (optional)  ›" : "Custom Model & Endpoint (optional) ⌄";
    });
    advanced.append(advancedToggle, advancedBody);
    form.append(advanced);
    const startRow = make("div", "parity-catalog-start");
    startRow.append(button("▶  Start Enrichment", "primary"));
    form.append(startRow);
    controls.append(form);
    enrichment.append(controls);

    const activeJob = jobs.find((job) => job.status === "pending" || job.status === "processing");
    if (activeJob) {
      const activePanel = make("section", "card parity-catalog-card parity-catalog-control-card parity-catalog-active");
      append(activePanel, make("h3", "", "Active Job Monitor"), make("p", "", `Job #${activeJob.id} - Real-time progress tracking`));
      activePanel.append(make("p", "parity-catalog-help", `Progress counters: ${activeJob.processedResources ?? "—"} processed of ${activeJob.totalResources ?? "—"} targeted`));
      const metrics = make("div", "parity-catalog-metrics");
      [["Processed", `${activeJob.processedResources ?? "—"} / ${activeJob.totalResources ?? "—"}`], ["Successful", activeJob.successfulResources ?? "—"], ["Failed", activeJob.failedResources ?? "—"], ["Skipped", activeJob.skippedResources ?? "—"]].forEach(([label, value]) => {
        const metric = make("div");
        append(metric, make("div", "parity-catalog-metric__value", value), make("div", "parity-catalog-metric__label", label));
        metrics.append(metric);
      });
      const activeActions = make("div", "parity-catalog-start");
      activeActions.append(button("Cancel Job", "danger"));
      append(activePanel, metrics, activeActions);
      enrichment.append(activePanel);
    }

    const history = panel("Job History", "Complete history of all enrichment jobs", jobs.length ? [make("span", "parity-catalog-status parity-catalog-status--muted", `${jobs.length} total jobs`)] : []);
    if (!jobs.length) {
      const empty = make("div", "parity-catalog-empty");
      append(empty, make("p", "", "No enrichment jobs found. Start your first job above."));
      history.append(empty);
    } else {
      const rows = jobs.map((job) => {
        const ended = job.completedAt ? formatDate(job.completedAt) : "—";
        const processed = `${job.processedResources ?? "—"} / ${job.totalResources ?? "—"}`;
        const successCounters = `${job.successfulResources ?? "—"} / ${job.processedResources ?? "—"}`;
        const actions = make("td", "parity-catalog-actions");
        actions.append(button("View Details"));
        return [
          make("td", "parity-catalog-mono", `#${job.id}`),
          make("td", "", status(job.status)),
          make("td", "parity-catalog-muted", formatDate(job.startedAt)),
          make("td", "parity-catalog-muted", ended),
          make("td", "parity-catalog-mono", processed),
          make("td", "parity-catalog-mono", successCounters),
          actions,
        ];
      });
      const rendered = table(["ID", "Status", "Started", "Ended", "Processed", "Success Rate", "Actions"], rows, "980px", true);
      history.append(rendered.wrap, make("p", "parity-catalog-legend", "Processed and success-rate cells show the server's persisted processedResources, totalResources, and successfulResources counters verbatim."));
    }
    enrichment.append(history);
    return enrichment;
  };

  const replacement = activeText === "Categories" ? renderCategories()
    : activeText === "Edits" ? renderEdits() : renderEnrichment();
  // Categories and Edits return a card; enrichment returns its own stack.
  replaceAfterTabs(replacement);
  result.status = "applied";
  result.modified = activeText === "Categories"
    ? ["category search", "category create control", "category table", "category edit controls", "category delete controls"]
    : activeText === "Edits"
      ? ["pending edits table", "edit details control", "edit approve control", "edit reject control", "edit empty state"]
      : ["enrichment job control", "tag coverage", "advanced model and endpoint controls", "active job monitor", "enrichment job history", "job details controls"];
  return result;
}
import fs from "node:fs";
import crypto from "node:crypto";
import esbuild from "esbuild";
import postcss from "postcss";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as icons from "lucide-react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { compile as compileUtilities } from "tailwindcss";

const read = (file) => fs.readFileSync(new URL(`../../${file}`, import.meta.url), "utf8");
const admin = (name) => `client/src/components/admin/${name}`;
const requireShape = (source, text, label) => {
  if (!source.includes(text)) throw new Error(`0929 admin operations source drift (${label}): ${text}`);
};
const between = (source, start, end, label) => {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  if (from < 0 || to < 0) throw new Error(`0929 admin operations declaration drift: ${label}`);
  return source.slice(from, to);
};
const compile = (source, bindings, expression) => new Function(...Object.keys(bindings),
  esbuild.transformSync(source.replace(/\bexport /g, ""), { loader: "tsx", jsx: "transform", format: "cjs" }).code +
    `\nreturn ${expression};`)(...Object.values(bindings));
const render = (jsx, bindings) => renderToStaticMarkup(compile(`const Atom = () => (${jsx});`, bindings, "React.createElement(Atom)"));

/** Compile only utilities present on retained atoms from the app's actual theme. */
export async function prepareAdminOpsUtilities0929(projection) {
  const index = read("client/src/index.css");
  const theme = read("node_modules/tailwindcss/theme.css");
  requireShape(index, "@import './styles/scrolling-fix.css';", "live shell scrolling import");
  const inline = index.match(/@theme inline \{[\s\S]*?\n}/)?.[0];
  if (!inline || !inline.includes("--color-muted-foreground: var(--text-2);")) {
    throw new Error("0929 admin neutral utility theme contract drift");
  }
  const candidates = new Set(["text-muted-foreground"]);
  projection.tabClassName.split(/\s+/).filter((name) => /^[a-z][a-z0-9.-]*$/.test(name)).forEach((name) => candidates.add(name));
  const actorClasses = read(admin("AuditTab.tsx")).match(/<TableCell className="(text-xs text-muted-foreground max-w-\[160px\] truncate)">/)?.[1];
  if (!actorClasses) throw new Error("0929 audit actor utility declaration drift");
  actorClasses.split(/\s+/).forEach((name) => candidates.add(name));
  for (const html of [...Object.values(projection.markup), ...(projection.auditDetails || []).map((detail) => detail.html)]) {
    for (const [, classes] of html.matchAll(/class="([^"]+)"/g)) {
      classes.split(/\s+/).filter((name) => /^[a-z][a-z0-9.-]*$/.test(name) || /^[a-z-]+-\[\d+px\]$/.test(name))
        .forEach((name) => candidates.add(name));
    }
  }
  const compiler = await compileUtilities(`${theme}\n${inline}\n@tailwind utilities;`);
  const rules = [];
  const tokens = [];
  postcss.parse(compiler.build([...candidates])).walkRules((rule) => {
    const declarations = rule.nodes.filter((node) => node.type === "decl")
      .map(({ prop, value, important }) => ({ prop, value, important }));
    if (rule.selector.includes(":root")) {
      tokens.push(...declarations.filter(({ prop, value }) => prop.startsWith("--") && value !== `var(${prop})`));
    } else if (rule.parent.type === "root" && !rule.selector.includes("&")) {
      rules.push({ selector: rule.selector, declarations, media: [] });
    }
  });
  const tabRules = rules.filter((rule) => [".min-h-11", ".shrink-0", ".justify-center"].includes(rule.selector));
  const spacing = tokens.filter(({ prop }) => prop === "--spacing");
  if (tabRules.length !== 3 || spacing.length !== 1) throw new Error("0929 initial tab utility sizing drift");
  // The harness clicks a reference tab before post-navigation reconciliation.
  // Establish its source geometry at first paint so that native click/focus
  // scrolling acts on the same intrinsic targets as the app, not narrower
  // frozen targets that expand only after they have been scrolled into view.
  projection.tabSizingCss = ".tabs{" + spacing.map(({ prop, value }) => prop + ":" + value + ";").join("") + "}" +
    tabRules.map(({ selector, declarations }) => ".tabs .tab" + selector + "{" + declarations.map(({ prop, value }) => prop + ":" + value + ";").join("") + "}").join("");
  const hostRules = projection.rules.filter((rule) => rule.selector === ".admin-dashboard .admin-tab-scroller");
  if (hostRules.length !== 1) throw new Error("0929 initial tab host declaration drift");
  projection.tabSizingCss += ".admin-tab-scroller{" + hostRules[0].declarations.map(({ prop, value, important }) => prop + ":" + value + (important ? "!important" : "") + ";").join("") + "}";
  projection.utilityRules = rules;
  projection.utilityTokens = tokens;
  projection.sourceProof.push(...[
    ["client/src/index.css", index], ["node_modules/tailwindcss/theme.css", theme],
  ].map(([file, source]) => ({ file, sha256: crypto.createHash("sha256").update(source).digest("hex") })));
  return projection;
}

/** The exact sequential pagination used by AdminStats, not the first user page. */
export async function fetchAdminOps0929Users(apiRequest) {
  const source = read(admin("AdminStats.tsx"));
  requireShape(source, "const PAGE_SIZE = 100;", "overview user pagination");
  const declaration = between(source, "async function getAllUsers()", "\nfunction oldestPendingAge", "overview user pagination");
  // The function following getAllUsers can change independently; only compile
  // the first complete function, with its source-defined page size.
  const fn = declaration.match(/^async function getAllUsers\(\)[\s\S]*?\n}/)?.[0];
  if (!fn) throw new Error("0929 overview getAllUsers shape drift");
  const users = await compile(`const PAGE_SIZE = 100;\n${fn}`, { apiRequest }, "getAllUsers")();
  if (!Array.isArray(users)) throw new Error("0929 overview paginated user response is not an array");
  return users;
}

/**
 * Narrow retained atoms, compiled from TSX. The frozen 09-29 tables/cards
 * remain in place except for the approved database/security deviation and
 * export capability states. CSS declarations are applied only to these atoms
 * or explicitly source-named equivalents; no application stylesheet is loaded.
 */
export function buildAdminOps0929(data = null, frozenAt = null) {
  const files = [
    admin("ExportTab.tsx"), admin("DatabaseTab.tsx"), admin("LinkHealthDashboard.tsx"),
    admin("BatchEnrichmentPanel.tsx"), admin("AuditTab.tsx"),
    admin("PendingResources.tsx"), admin("PendingEdits.tsx"), admin("GitHubSyncPanel.tsx"),
    admin("AdminStats.tsx"), admin("AdminOverview.tsx"), admin("AdminOpsPrimitives.tsx"),
    "client/src/pages/AdminDashboard.tsx", "client/src/components/ui/button.tsx",
    "client/src/components/ui/tabs.tsx", "client/src/styles/app-bridge.css", "client/src/styles/scrolling-fix.css",
    "client/src/lib/utils.ts", admin("admin-canonical.css"), "client/src/styles/pages/admin-shell.css",
    "client/src/styles/pages/admin-overview.css", "client/src/styles/pages/admin-ops-github-links.css",
    "client/src/styles/pages/admin-ops-audit.css", admin("admin-ops-export-database.css"),
    admin("admin-ops-primitives.css"), admin("queues-agent.css"), admin("queues-review.css"),
    "client/src/styles/pages/admin-ops-users-audit.css", "client/src/styles/pages/admin-ops-table.css",
    "awesome-list-site-ds-20260929/admin.jsx", "shared/styles/product-profiles.css",
  ];
  const sources = Object.fromEntries(files.map((file) => [file, read(file)]));
  const get = (name) => sources[admin(name)];
  for (const [state, setter] of [
    ["isExporting", "setIsExporting"], ["isJsonExporting", "setIsJsonExporting"],
    ["isCsvExporting", "setIsCsvExporting"], ["isOpmlExporting", "setIsOpmlExporting"],
  ]) requireShape(get("ExportTab.tsx"), `const [${state}, ${setter}] = useState(false);`, "initial export capability state");
  for (const file of ["GitHubSyncPanel.tsx", "LinkHealthDashboard.tsx"]) {
    requireShape(get(file), "const [showDetails, setShowDetails] = useState(false);", "closed More state");
  }
  const dashboard = sources["client/src/pages/AdminDashboard.tsx"];
  const frozen = sources["awesome-list-site-ds-20260929/admin.jsx"];
  requireShape(frozen, '<div className="tabs" style={{ marginBottom: 28 }}>', "initial tab scroller");
  requireShape(frozen, "className={'tab' + (tab === tb.id ? ' active' : '')}", "initial tab trigger");
  requireShape(frozen, "      </div>\n\n      {tab === 'overview' && <AdminOverview />}", "initial tab host closing boundary");
  requireShape(dashboard, '<div className="admin-tab-scroller">', "source initial tab host");
  requireShape(get("GitHubSyncPanel.tsx"), '<div className="ops-github-panel__repository-actions">', "GitHub repository action hook");
  const rootClipRules = postcss.parse(sources["client/src/styles/scrolling-fix.css"]).nodes.filter((rule) => rule.type === "rule" && rule.selector === "html, body, #root");
  const rootClipDeclarations = rootClipRules.flatMap((rule) => rule.nodes.filter((node) => node.type === "decl" && node.prop === "overflow-x"));
  if (rootClipRules.length !== 1 || rootClipDeclarations.length !== 1 || !rootClipDeclarations[0].important) throw new Error("0929 live shell clipping declaration drift");
  const { prop, value, important } = rootClipDeclarations[0];
  const rootClip = { selector: rootClipRules[0].selector, prop, value, important };
  requireShape(frozen, '<h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{x.k}</h4>', "frozen export card heading");
  const tabClassName = sources["client/src/components/ui/tabs.tsx"].match(/"(tab min-h-11 shrink-0 justify-center \[line-height:normal\] disabled:pointer-events-none disabled:opacity-50)"/)?.[1];
  if (!tabClassName) throw new Error("0929 admin tab trigger sizing recipe drift");
  const tabLineHeight = tabClassName.match(/\[line-height:([^\]]+)\]/)?.[1];
  const bridge = postcss.parse(sources["client/src/styles/app-bridge.css"]);
  const semanticTokens = ["--status-ok", "--status-warn", "--status-bad"].map((prop) => {
    const matches = [];
    bridge.walkRules(":root", (rule) => rule.walkDecls(prop, (declaration) => matches.push(declaration.value)));
    if (matches.length !== 1) throw new Error(`0929 semantic token declaration drift: ${prop}`);
    return { prop, value: matches[0] };
  });
  requireShape(frozen, "gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))'", "frozen overview grid");
  requireShape(sources["client/src/styles/pages/admin-overview.css"],
    "grid-template-columns: repeat(auto-fill, minmax(min(360px, 100%), 1fr));", "overview containment");
  const activitySubtitle = get("AdminOverview.tsx").match(/title="Recent activity"\s+subtitle="([^"]+)"/)?.[1];
  if (!activitySubtitle) throw new Error("0929 overview recent activity subtitle drift");
  requireShape(get("DatabaseTab.tsx"), '<th>Size</th>', "database columns");
  requireShape(get("DatabaseTab.tsx"), '<th title="Latest created or updated timestamp', "database newest-row column");
  // The unused TerminalSquare import is not an SQL console; require the
  // absence of the UI and arbitrary SQL execution, not of an icon import.
  if (/SQL Console|<textarea|executeSql|sql-console|Run query/.test(get("DatabaseTab.tsx"))) {
    throw new Error("0929 approved database deviation drift: SQL console must remain absent");
  }
  const reveal = dashboard.match(/function revealTabTrigger\([\s\S]*?\n}/)?.[0];
  if (!reveal) throw new Error("0929 admin tab reveal declaration missing");
  for (const shape of ['scroller.scrollLeft > 1', 'scroller.scrollLeft < max - 1',
    'className="admin-tab-scroller__edge admin-tab-scroller__edge--start"',
    'className="admin-tab-scroller__edge admin-tab-scroller__edge--end"']) {
    requireShape(dashboard, shape, "tab edge controls");
  }
  const rules = [];
  for (const file of files.filter((file) => file.endsWith(".css") && file.startsWith("client/") && !["client/src/styles/app-bridge.css", "client/src/styles/scrolling-fix.css"].includes(file))) {
    postcss.parse(sources[file]).walkRules((rule) => {
      const media = [];
      for (let parent = rule.parent; parent?.type !== "root"; parent = parent.parent) {
        if (parent.type !== "atrule" || parent.name !== "media") return;
        media.push(parent.params);
      }
      rules.push({ selector: rule.selector, media, declarations: rule.nodes.filter((node) => node.type === "decl")
        .map(({ prop, value, important }) => ({ prop, value, important })) });
    });
  }
  const heights = new Set([...sources["shared/styles/product-profiles.css"]
    .matchAll(/--profile-control-height:\s*([^;]+);/g)].map((m) => m[1].trim()));
  if (heights.size !== 1) throw new Error("0929 admin control-height contract drift");
  const controlHeight = [...heights][0];
  const result = {
    rules, controlHeight, activitySubtitle, semanticTokens, tabClassName, tabLineHeight, rootClip,
    reveal: esbuild.transformSync(`${reveal}`, { loader: "ts" }).code,
    sourceProof: files.map((file) => ({ file, sha256: crypto.createHash("sha256").update(sources[file]).digest("hex") })),
  };
  const declaration = (selector, prop) => {
    const matches = rules.filter((rule) => rule.selector === selector).flatMap((rule) => rule.declarations.filter((node) => node.prop === prop));
    if (matches.length !== 1) throw new Error(`0929 admin source declaration drift: ${selector} ${prop}`);
    return matches[0].value;
  };
  result.tabScrollPadding = declaration(".admin-dashboard .admin-dashboard__tabs", "scroll-padding-inline");
  result.neutralPendingInk = declaration(".admin-overview-stats-canonical .admin-canonical-stat__value--accent", "color");
  result.neutralCategoryInk = declaration(".admin-overview-canonical .admin-canonical-category-bar", "background");
  requireShape(get("AuditTab.tsx"), '<TableCell className="text-xs text-muted-foreground max-w-[160px] truncate">', "audit actor neutral ink");
  if (!data) return result;
  const cn = (...values) => values.filter(Boolean).join(" ");
  const button = sources["client/src/components/ui/button.tsx"].replace(/^import .*$/gm, "").replace(/^export \{.*$/gm, "");
  const Button = compile(button, { React, Slot, cva, cn }, "Button");
  const primitives = get("AdminOpsPrimitives.tsx");
  const { Stat, TableShell } = compile(primitives.slice(primitives.indexOf("export interface TableShellProps")),
    { React, cn }, "{ Stat, TableShell }");
  const utils = sources["client/src/lib/utils.ts"];
  const dateFunctions = ["formatAdminDateTime", "formatRelativeAgo"].map((name) => {
    const declaration = utils.match(new RegExp(`export function ${name}\\([\\s\\S]*?\\n}`))?.[0];
    if (!declaration) throw new Error(`0929 admin formatter drift: ${name}`);
    return declaration;
  }).join("\n");
  const time = frozenAt ? new Date(frozenAt).getTime() : Date.now();
  if (!Number.isFinite(time)) throw new Error("0929 admin frozen clock is invalid");
  class CaptureDate extends Date { constructor(...args) { super(...(args.length ? args : [time])); } static now() { return time; } }
  const dates = compile(dateFunctions, { Date: CaptureDate }, "{ formatAdminDateTime, formatRelativeAgo }");
  const iconNames = new Set(files.filter((file) => file.endsWith(".tsx")).flatMap((file) =>
    [...sources[file].matchAll(/<([A-Z]\w*)\b/g)].map((match) => match[1])).filter((name) => name in icons));
  const bindings = { React, ...Object.fromEntries([...iconNames].map((name) => [name, icons[name]])), Button, Stat, TableShell, ...dates };
  const noop = () => {};
  const markup = {};
  const disclosure = (source, label) => {
    const match = source.match(new RegExp(`<details className="([^"]+)">\\s*<summary className="([^"]+)">${label}</summary>`));
    if (!match) throw new Error(`0929 admin disclosure drift: ${label}`);
    return render(`${match[0]}</details>`, bindings);
  };
  const cards = between(get("ExportTab.tsx"), '<div className="admin-ops-export__cards">', '\n      <details className="admin-ops-more">', "export cards");
  const jsxDisclosure = (source, label) => disclosure(source, label).replace(/\bclass=/g, "className=");
  markup.export = render(`<div className="admin-ops-export">${jsxDisclosure(get("ExportTab.tsx"), "Validation controls")}${cards}${jsxDisclosure(get("ExportTab.tsx"), "Export history &amp; validation results")}</div>`, {
    ...bindings, isJsonExporting: false, isCsvExporting: false, isExporting: false, isOpmlExporting: false,
    handleJsonExport: noop, handleCsvExport: noop, handleExport: noop, handleOpmlExport: noop, unavailableExport: noop,
  });
  const database = data.stats.database;
  if (!database || !Array.isArray(database.tableStats)) throw new Error("0929 database requires real pg_catalog statistics");
  const databaseTop = between(get("DatabaseTab.tsx"), '<div className="admin-ops-stat-strip">', '\n      <details', "database stats");
  requireShape(get("DatabaseTab.tsx"), "Math.max(0, database.migrations.journaled - database.migrations.applied)", "pending migration predicate");
  const databaseTable = between(get("DatabaseTab.tsx"), '<TableShell title="Tables"', '\n      <AlertDialog', "database table");
  const storage = between(get("DatabaseTab.tsx"), "const formatStorageSize =", "\n\n", "database size formatter");
  const formatStorageSize = compile(storage, {}, "formatStorageSize");
  markup.database = render(`<div className="admin-ops-database">${databaseTop}${jsxDisclosure(get("DatabaseTab.tsx"), "Database seeding")}${databaseTable}</div>`, {
    ...bindings, database, tableRows: database.tableStats,
    pendingMigrations: database.migrations.journaled === null ? null : Math.max(0, database.migrations.journaled - database.migrations.applied),
    formatStorageSize, Table: ({ children, ...props }) => React.createElement("table", props, children),
  });
  const jobs = data.enrichmentJobsBody.jobs;
  if (!Array.isArray(jobs)) throw new Error("0929 enrichment requires live jobs array");
  const limit = get("BatchEnrichmentPanel.tsx").match(/const CANONICAL_JOB_ROWS = (\d+);/)?.[1];
  if (!limit) throw new Error("0929 enrichment canonical row limit drift");
  markup.enrichmentFooter = render(`<React.Fragment>${between(get("BatchEnrichmentPanel.tsx"), "{jobs.length > CANONICAL_JOB_ROWS ? (", "\n        </TableShell>", "enrichment footer")}</React.Fragment>`, {
    ...bindings, jobs, CANONICAL_JOB_ROWS: Number(limit), showAllJobs: false, setShowAllJobs: noop,
  });
  markup.enrichmentMore = disclosure(get("BatchEnrichmentPanel.tsx"), "Job controls &amp; monitoring");
  const audit = get("AuditTab.tsx");
  const detailSource = between(audit, '<Button\n                        type="button"', "\n                    </TableCell>", "audit retained detail target");
  const logs = data.audit.logs;
  if (!Array.isArray(logs)) throw new Error("0929 audit requires live logs array");
  result.auditDetails = logs.map((log) => ({ id: log.id,
    html: render(detailSource, { ...bindings, log, setSelectedLog: noop }) }));
  const auditAction = between(audit, 'actions={\n        <Button', '\n      description=', "audit tools");
  requireShape(audit, 'description={`Append-only · ${appliedLimit} events per page`}', "audit initial subtitle");
  requireShape(audit, 'const [appliedLimit, setAppliedLimit] = useState("50");', "audit initial page size");
  markup.auditHeader = render(`<TableShell title="Audit log" ${auditAction} description={\`Append-only · \${appliedLimit} events per page\`} className="admin-ops-audit-shell"><span /></TableShell>`,
    { ...bindings, showTools: false, setShowTools: noop, appliedLimit: "50" });
  const pagination = between(audit, "{data && data.total > 0 && (", "\n\n        {/* Run16 BUG-083", "audit pagination");
  markup.auditPagination = render(`<React.Fragment>${pagination}</React.Fragment>`, {
    ...bindings, data: data.audit, offset: 0, appliedLimit: "50", isPlaceholderData: false,
    prevButtonRef: { current: null }, nextButtonRef: { current: null }, setOffset: noop,
  });
  for (const [key, file, condition] of [
    ["approvals", "PendingResources.tsx", "if (totalPending === 0)"],
    ["edits", "PendingEdits.tsx", "if (edits.length === 0)"],
  ]) {
    const source = get(file);
    // These are real empty-list branches, not an override of nonempty queues.
    const start = source.indexOf(condition);
    if (start < 0) throw new Error(`0929 ${key} empty branch drift`);
    const empty = between(source.slice(start), '<section className="admin-panel queue-review-shell"', '\n    );', `${key} empty JSX`);
    markup[key] = render(empty, { ...bindings, recheckState: "idle", bulkOutcome: null });
  }
  const link = get("LinkHealthDashboard.tsx");
  const toneSource = between(link, "const LINK_STATUS_TONE", "\nconst TONE_TEXT_CLASS", "link status tones") +
    "\n" + between(link, "const statusTone =", "\n\n", "link tone predicate");
  const { statusTone } = compile(toneSource, {}, "{ statusTone }");
  const countsSource = between(link, "const countByStatus =", "\n  useEffect(", "link count predicates");
  const latestJob = data.linkHealthStatus.job;
  const isJobInProgress = latestJob?.status === "processing" || latestJob?.status === "pending";
  const isTerminalWithoutResults = latestJob?.status === "failed" || latestJob?.status === "cancelled";
  const history = data.overviewReads.linkHistory;
  if (!history.ok || !Array.isArray(history.body.jobs)) throw new Error("0929 link health requires live history");
  const linkState = compile(countsSource, {
    latestJob, isJobInProgress, isTerminalWithoutResults, jobs: history.body.jobs,
    brokenLinksData: data.linkHealthBroken, allProblemLinks: data.linkHealthBroken.checks,
  }, "{ summaryCounts }");
  markup.linkStats = render(between(link, '<div className="ops-link-health__stat-grid"', "\n\n      {/* Summary Card", "link stat cards"),
    { ...bindings, statusTone, ...linkState });
  const emptyFailure = between(link, '<div className="ops-link-health__flagged-table-wrap">', "\n          ) : (", "link empty failure");
  markup.linkEmpty = render(emptyFailure, { ...bindings, isJobInProgress, latestJob });
  markup.linkHeader = render(`<TableShell ${between(link, 'title="Recent failures"', '\n      >', "link failures header")}><span /></TableShell>`,
    { ...bindings, isJobInProgress, setConfirmRun: noop });
  const more = (source, key) => {
    const start = source.match(/<div className="admin-ops-more[^"]*">/)?.[0];
    if (!start) throw new Error(`0929 ${key} More wrapper missing`);
    return render(between(source, start, "\n      </div>", `${key} more`) + "\n      </div>",
      { ...bindings, showDetails: false, setShowDetails: noop });
  };
  markup.githubMore = more(get("GitHubSyncPanel.tsx"), "github");
  markup.linkMore = more(link, "linkhealth");
  requireShape(get("GitHubSyncPanel.tsx"),
    "(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),", "GitHub newest sync ordering");
  const sync = data.syncHistory.slice().sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0];
  const branch = get("GitHubSyncPanel.tsx").match(/const configuredBranch = [^\n]+/)?.[0];
  if (!branch) throw new Error("0929 GitHub configured branch declaration drift");
  const configuredBranch = compile(branch, { publicConfig: data.config }, "configuredBranch");
  const meta = between(get("GitHubSyncPanel.tsx"), '<p className="ops-github-panel__repository-meta">', "\n            </div>", "github metadata");
  if (!data.overviewReads.githubQueue.ok) throw new Error("0929 GitHub requires real queue total");
  markup.githubMeta = render(meta, {
    ...bindings, configuredBranch, lastSync: sync, formatSyncDate: dates.formatAdminDateTime,
    syncQueueData: data.overviewReads.githubQueue.body,
  });
  const statsSource = get("AdminStats.tsx");
  requireShape(statsSource, "(user) => (getDate(user.updatedAt) ?? 0) > activeSince,", "active users predicate");
  const activeDeclaration = between(statsSource, "const activeSince =", "\n  const categoryCount", "active users");
  const getDate = between(statsSource, "const getDate =", "\n\nasync function", "active date");
  const window = statsSource.match(/const ACTIVE_WINDOW_MS = [^\n]+/)?.[0];
  if (!window) throw new Error("0929 active user window drift");
  const roleCopy = statsSource.match(/`(\$\{activeAdmins\} admins · \$\{activeContributors\} contributors)`/)?.[0];
  if (!roleCopy) throw new Error("0929 active user role subtitle drift");
  result.activeUsers = compile(`${window}\n${getDate}\n${activeDeclaration}`, {
    Date: CaptureDate, users: { data: data.overviewUsers },
  }, `{ activeUsers, activeAdmins, activeContributors, subtitle: ${roleCopy} }`);
  result.markup = markup;
  result.edgeIcons = Object.fromEntries(["ChevronLeft", "ChevronRight"].map((name) =>
    [name, renderToStaticMarkup(React.createElement(icons[name], { size: 16, "aria-hidden": true }))]));
  const totalPending = get("PendingResources.tsx").match(/const totalPending = [^\n]+/)?.[0];
  if (!totalPending) throw new Error("0929 approvals total declaration drift");
  result.emptyApprovals = compile(totalPending, { data: data.pending }, "totalPending === 0");
  result.emptyEdits = data.resourceEdits.length === 0;
  const recentFailures = between(link, "const recentFailures =", "\n  const brokenLinks =", "recent failures predicate");
  result.emptyFailures = compile(recentFailures, { allProblemLinks: data.linkHealthBroken.checks }, "recentFailures.length === 0");
  return result;
}

export async function applyAdminOps0929(page, reconciliation) {
  if (!reconciliation.adminOps0929) throw new Error("0929 admin operations source contract missing");
  return page.evaluate(({ contract }) => {
    const main = document.querySelector("main");
    const tabs = main?.querySelector(".tabs");
    const active = tabs?.querySelector(".tab.active");
    if (!tabs || !active) return { status: "not-applicable", modified: [] };
    const tab = active.textContent.trim().toLowerCase().replace(/\s+/g, "");
    const owned = ["overview", "export", "linkhealth", "enrichment", "audit", "approvals", "edits", "github", "database"];
    if (!owned.includes(tab)) return { status: "not-applicable", modified: [] };
    const data = window.AV_ADMIN_OPS_0929;
    if (!data?.markup) throw new Error(`0929 ${tab}: live source-rendered admin atoms missing`);
    const { markup } = data;
    const modified = [];
    // The real app imports scrolling-fix.css at the shell boundary. Without
    // that boundary, an absolutely positioned sr-only empty-table heading
    // can enlarge the reference capture despite the table's own scroller.
    for (const node of document.querySelectorAll(contract.rootClip.selector)) {
      node.style.setProperty(contract.rootClip.prop, contract.rootClip.value, contract.rootClip.important ? "important" : "");
    }
    modified.push("admin root: imported source shell horizontal overflow boundary");
    const atom = (html) => {
      const template = document.createElement("template");
      template.innerHTML = html;
      return template.content;
    };
    const one = (html) => atom(html).firstElementChild;
    const title = (text) => [...main.querySelectorAll("h2,h3,h4")].find((node) => node.textContent.trim() === text);
    const shell = (text) => {
      const heading = title(text);
      const card = heading?.closest(".card");
      if (!heading || !card) throw new Error(`0929 ${tab}: frozen ${text} card structure drift`);
      return card;
    };
    let panel;
    if (tab === "overview") panel = title("Recent activity")?.closest(".card")?.parentElement?.parentElement;
    else if (tab === "export") panel = title("JSON Snapshot")?.closest(".card")?.parentElement;
    else if (tab === "database") panel = shell("Tables").parentElement;
    else if (tab === "github") panel = shell("Sync jobs").parentElement;
    else if (tab === "linkhealth") panel = shell("Recent failures").parentElement;
    else if (tab === "enrichment") panel = shell("Enrichment jobs").parentElement;
    else if (tab === "audit") panel = shell("Audit log");
    else panel = shell(tab === "approvals" ? "Pending approvals" : "Edit history");
    if (!panel || panel === main || panel.contains(tabs)) throw new Error(`0929 ${tab}: panel boundary drift`);
    if (tab === "export" || tab === "database") {
      const replacement = one(markup[tab]);
      panel.replaceWith(replacement);
      panel = replacement;
      modified.push(`${tab}: source-rendered retained disclosure, capability states and table semantics`);
    }
    if (tab === "approvals" && data.emptyApprovals || tab === "edits" && data.emptyEdits) {
      const replacement = one(markup[tab]);
      panel.replaceWith(replacement);
      panel = replacement;
      modified.push(`${tab}: source empty-list actions and state`);
    }
    const projectHeader = (card, html) => {
      const header = one(html).querySelector("header");
      const old = card.firstElementChild;
      if (!header || !old?.querySelector("h2,h3")) throw new Error(`0929 ${tab}: table header drift`);
      old.replaceWith(header);
    };
    if (tab === "enrichment") {
      panel.classList.add("queues-agent");
      const card = shell("Enrichment jobs");
      const canonical = document.createElement("div");
      canonical.className = "queues-agent__canonical";
      canonical.append(...panel.childNodes);
      panel.append(canonical);
      card.append(atom(markup.enrichmentFooter));
      panel.append(atom(markup.enrichmentMore));
      modified.push("enrichment: conditional Show all jobs footer and closed Job controls");
    }
    if (tab === "audit") {
      panel.classList.add("admin-ops-audit-shell");
      projectHeader(panel, markup.auditHeader);
      panel.append(atom(markup.auditPagination));
      const table = panel.querySelector("table");
      if (!table) throw new Error("0929 audit table missing");
      table.classList.add("admin-ops-table", "admin-ops-audit-table");
      // Source action cell ink remains neutral under the approved accent budget.
      const rows = panel.querySelectorAll("tbody tr");
      if (rows.length !== data.auditDetails.length) throw new Error("0929 audit live row count drift");
      rows.forEach((row, i) => {
        const detail = data.auditDetails[i];
        if (row.children[0].textContent.trim() !== `TX#${detail.id}`) throw new Error("0929 audit live row identity drift");
        row.children[0].append(atom(detail.html));
        row.children[1].classList.add("text-muted-foreground", "max-w-[160px]", "truncate");
      });
      modified.push("audit: source Tools, truthful page size, live pagination, retained detail target and neutral actor ink");
    }
    if (tab === "linkhealth") {
      panel.classList.add("ops-link-health");
      const card = shell("Recent failures");
      const grid = panel.firstElementChild;
      if (grid?.style.display !== "grid" || grid.children.length !== 4) throw new Error("0929 link health frozen four-card grid drift");
      grid.replaceWith(one(markup.linkStats));
      projectHeader(card, markup.linkHeader);
      const projectedShell = one(markup.linkHeader);
      const content = card.lastElementChild;
      const projectedContent = projectedShell.querySelector(".admin-ops-table-shell__content");
      if (card.children.length !== 2 || content.tagName !== "DIV" || !projectedContent) throw new Error("0929 link failures shell/content boundary drift");
      card.classList.add(...projectedShell.classList);
      content.classList.add(...projectedContent.classList);
      if (data.emptyFailures) {
        const table = card.querySelector("table");
        if (!table) throw new Error("0929 link failures table missing");
        table.replaceWith(one(markup.linkEmpty));
      }
      panel.append(atom(markup.linkMore));
      modified.push("linkhealth: source five-card counters, full-check header, truthful empty state and More");
    }
    if (tab === "github") {
      panel.classList.add("ops-github-panel");
      const repositoryButtons = [...panel.firstElementChild.querySelectorAll("button")];
      if (repositoryButtons.length !== 2 || repositoryButtons[0].textContent.trim() !== "Pull" || repositoryButtons[1].textContent.trim() !== "Sync now" || repositoryButtons[0].parentElement !== repositoryButtons[1].parentElement) {
        throw new Error("0929 GitHub repository action structure drift");
      }
      repositoryButtons[0].parentElement.classList.add("ops-github-panel__repository-actions");
      const repo = [...panel.querySelectorAll("p")].find((node) => node.textContent.includes("47 commits ahead"));
      if (!repo) throw new Error("0929 GitHub frozen placeholder metadata drift");
      repo.replaceWith(one(markup.githubMeta));
      const mark = panel.firstElementChild.querySelector("svg")?.parentElement;
      if (!mark) throw new Error("0929 GitHub repository glyph missing");
      mark.classList.add("ops-github-panel__repository-mark");
      const table = shell("Sync jobs").querySelector("table");
      if (!table) throw new Error("0929 GitHub sync jobs table missing");
      table.parentElement.classList.add("ops-github-panel__history-table-wrap");
      panel.append(atom(markup.githubMore));
      modified.push("github: source branch, sync timestamp, queue total, neutral glyph and More");
    }
    if (tab === "overview") {
      panel.classList.add("admin-overview-canonical");
      const activity = shell("Recent activity");
      const grid = activity.parentElement;
      if (grid.style.gridTemplateColumns !== "repeat(auto-fill, minmax(360px, 1fr))") throw new Error("0929 overview frozen grid declaration drift");
      grid.classList.add("admin-canonical-overview-grid");
      activity.querySelector("p").textContent = contract.activitySubtitle;
      const rows = activity.querySelector("p").nextElementSibling.children;
      for (const row of rows) {
        if (row.children.length !== 5) throw new Error("0929 overview activity five-column drift");
        row.classList.add("admin-canonical-activity-row");
        ["id", "actor", "action", "target", "time"].forEach((name, i) => row.children[i].classList.add(`admin-canonical-activity-${name}`));
        row.children[0].style.removeProperty("width");
      }
      const health = shell("System health");
      const healthList = health.querySelector("p")?.nextElementSibling;
      if (!healthList || healthList.children.length !== 5) throw new Error("0929 overview five-row health structure drift");
      healthList.classList.add("admin-canonical-health-list", "admin-health-grid");
      for (const row of healthList.children) {
        if (row.children.length !== 3 || !row.firstElementChild.classList.contains("dot")) {
          throw new Error("0929 overview health dot/label/detail shape drift");
        }
        row.classList.add("admin-canonical-health-row", "admin-health-card");
        row.firstElementChild.classList.add("admin-canonical-health-dot");
      }
      const labels = [...panel.querySelectorAll(".mono")];
      const activeLabel = labels.find((node) => node.textContent.trim().toLowerCase() === "active users");
      if (!activeLabel?.nextElementSibling?.nextElementSibling) throw new Error("0929 overview active user stat drift");
      activeLabel.nextElementSibling.textContent = data.activeUsers.activeUsers.toLocaleString();
      activeLabel.nextElementSibling.nextElementSibling.textContent = data.activeUsers.subtitle;
      const pendingLabel = labels.find((node) => node.textContent.trim().toLowerCase() === "pending approvals");
      if (!pendingLabel) throw new Error("0929 overview pending stat drift");
      pendingLabel.nextElementSibling.style.color = contract.neutralPendingInk;
      // Match source-owned category bars without changing track geometry.
      const categories = title("Top categories")?.closest(".card");
      if (!categories) throw new Error("0929 overview category card missing");
      categories.querySelectorAll("div").forEach((node) => {
        if (node.style.background === "var(--accent)") node.style.background = contract.neutralCategoryInk;
      });
      modified.push("overview: source containment, active-window counts, subtitle and neutral retained ink");
    }
    // The strip's nearest-edge reveal is source compiled, not measured offsets.
    tabs.classList.add("admin-dashboard__tabs");
    for (const trigger of tabs.querySelectorAll(".tab")) {
      trigger.classList.add(...contract.tabClassName.split(/\s+/));
      trigger.style.lineHeight = contract.tabLineHeight;
    }
    // The source mounts its strip inside this host BEFORE activation.
    // Reparenting a clicked/focused scroller afterwards rebuilds its layout
    // box and discards native scroll/focus state. Keep the source host intact.
    const host = tabs.parentElement;
    if (!host?.classList.contains("admin-tab-scroller") || host.dataset.ops0929Initial !== "true") throw new Error("0929 initially served tab host missing");
    const tabScrollAtEntry = tabs.scrollLeft;
    // Avoid restructuring the admin page: class is only a selector ancestor.
    main.classList.add("admin-dashboard");
    const reveal = new Function(`${contract.reveal};return revealTabTrigger;`)();
    const updateEdges = () => {
      host.querySelectorAll(".admin-tab-scroller__edge").forEach((node) => node.remove());
      const max = tabs.scrollWidth - tabs.clientWidth;
      for (const [side, visible, glyph] of [
        ["start", tabs.scrollLeft > 1, "ChevronLeft"], ["end", tabs.scrollLeft < max - 1, "ChevronRight"],
      ]) {
        if (!visible) continue;
        const button = document.createElement("button");
        button.type = "button";
        button.tabIndex = -1;
        button.className = `admin-tab-scroller__edge admin-tab-scroller__edge--${side}`;
        button.setAttribute("aria-label", `Scroll tabs ${side === "start" ? "left" : "right"}`);
        button.innerHTML = data.edgeIcons[glyph];
        host.append(button);
      }
      applyRules(host);
    };
    function applyRules(root) {
      for (const { prop, value } of [...(data.utilityTokens || []), ...contract.semanticTokens]) root.style.setProperty(prop, value);
      const candidates = new Map();
      let order = 0;
      for (const rule of [...(data.utilityRules || []), ...contract.rules]) {
        order++;
        if (rule.media.some((query) => !matchMedia(query).matches)) continue;
        // Stateful/pseudo-element declarations remain owned by the design.
        const selectors = rule.selector.split(",").map((selector) => selector.trim()).filter((selector) =>
          !/:(?:hover|focus|active|:)/.test(selector));
        for (const selector of selectors) {
          const nodes = [...root.querySelectorAll(selector)];
          if (root.matches(selector)) nodes.unshift(root);
          const specificity = (selector.match(/#[\w-]+/g)?.length || 0) * 10000 +
            (selector.match(/\.[\w-]+|\[[^\]]+\]|:(?!:)[\w-]+(?:\([^)]*\))?/g)?.length || 0) * 100 +
            (selector.match(/(?:^|[\s>+~])(?:[a-z][\w-]*)/gi)?.length || 0);
          for (const node of nodes) for (const declaration of rule.declarations) {
            if (!candidates.has(node)) candidates.set(node, new Map());
            const declarations = candidates.get(node);
            const score = specificity + (declaration.important ? 1000000 : 0);
            const prior = declarations.get(declaration.prop);
            if (!prior || score > prior.score || score === prior.score && order >= prior.order) {
              declarations.set(declaration.prop, { ...declaration, score, order });
            }
          }
        }
      }
      for (const [node, declarations] of candidates) {
        for (const { prop, value, important } of declarations.values()) node.style.setProperty(prop, value, important ? "important" : "");
      }
      root.querySelectorAll("button:not(.tab),summary.btn").forEach((node) => {
        if (node.classList.contains("admin-tab-scroller__edge")) return;
        node.style.minHeight = `max(44px, ${contract.controlHeight})`;
        node.style.minWidth = "44px";
        node.querySelectorAll("svg").forEach((svg) => { svg.style.width = "16px"; svg.style.height = "16px"; });
      });
    }
    applyRules(panel);
    applyRules(host);
    reveal(tabs, active);
    updateEdges();
    tabs.addEventListener("scroll", updateEdges, { passive: true });
    let released = false;
    const settle = () => { if (!released) reveal(tabs, active); updateEdges(); };
    const observer = new ResizeObserver(settle);
    observer.observe(tabs);
    document.fonts?.ready.then(settle);
    ["pointerdown", "wheel", "touchstart"].forEach((type) => host.addEventListener(type, () => { released = true; }, { passive: true }));
    modified.push("admin tabs: source edge fades/chevrons and nearest-edge active trigger reveal");
    return { status: "applied", modified, sourceProof: contract.sourceProof, tabStrip: { sourceHostRetained: true, scrollAtEntry: tabScrollAtEntry, scrollAfterReveal: tabs.scrollLeft } };
  }, { contract: reconciliation.adminOps0929 });
}

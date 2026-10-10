import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import esbuild from "esbuild";
import postcss from "postcss";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as icons from "lucide-react";
import { compile as compileTailwind } from "tailwindcss";
import { referenceFilePath } from "./reference-root.mjs";

const root = path.resolve(new URL("../../", import.meta.url).pathname);
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const crudPath = "client/src/components/admin/GenericCrudManager.tsx";
const resourcePath = "client/src/components/admin/ResourceManager.tsx";
const usersPath = "client/src/components/admin/UsersTab.tsx";
const cssPaths = [
  "client/src/styles/pages/admin-catalog-taxonomy.css",
  "client/src/styles/pages/admin-catalog-resources.css",
  "client/src/styles/pages/admin-ops-table.css",
  "client/src/styles/pages/admin-ops-users.css",
  "client/src/components/admin/admin-ops-primitives.css",
  "client/src/styles/pages/admin-ops-users-audit.css",
  "client/src/styles/pages/admin-shell.css",
  "client/src/styles/app-bridge.css",
];
const fail = (label) => { throw new Error(`0929 admin catalog source/structure drift: ${label}`); };
const requireText = (source, text) => { if (!source.includes(text)) fail(text); };
const between = (source, start, end) => {
  const a = source.indexOf(start);
  const b = source.indexOf(end, a + start.length);
  if (a < 0 || b < 0) fail(`missing fragment ${start} / ${end}`);
  return source.slice(a, b);
};
const evaluate = (source, bindings, result) => new Function(...Object.keys(bindings),
  esbuild.transformSync(source, { loader: "tsx", jsx: "transform", format: "cjs" }).code + `\nreturn ${result};`,
)(...Object.values(bindings));
const utils = read("client/src/lib/utils.ts");
const maskDeclaration = utils.match(/export function maskEmail\(email: string\): string \{[\s\S]*?\n\}/)?.[0];
if (!maskDeclaration) fail("maskEmail declaration");
requireText(maskDeclaration, 'const at = email.indexOf("@");');
requireText(maskDeclaration, "if (at <= 0) return email;");
requireText(maskDeclaration, "return `${email[0]}•••${email.slice(at)}`;");
const maskEmail = evaluate(maskDeclaration.replace("export ", ""), {}, "maskEmail");

// Execute source atoms in Node, never by inspecting or copying the actual DOM.
// External React stays shared with renderToStaticMarkup so paginator hooks SSR.
const bundled = esbuild.buildSync({
  stdin: { contents: [
    'export * from "@/components/ui/button";',
    'export * from "@/components/ui/input";',
    'export * from "@/components/ui/select";',
    'export * from "@/components/ui/paginator";',
    'export * from "@/components/ui/badge";',
    'export * from "@/components/ui/table";',
  ].join("\n"), resolveDir: root },
  alias: { "@": path.join(root, "client/src") },
  bundle: true, packages: "external", platform: "node", format: "cjs", jsx: "automatic", write: false,
});
const atomsModule = { exports: {} };
new Function("require", "module", "exports", bundled.outputFiles[0].text)(
  createRequire(import.meta.url), atomsModule, atomsModule.exports,
);
const atoms = atomsModule.exports;
const iconBindings = Object.fromEntries(Object.entries(icons).filter(([key]) => key !== "default"));
const noop = () => {};
const baseBindings = {
  React, ...iconBindings, ...atoms, cn: (...parts) => parts.filter(Boolean).join(" "),
  setToolsOpen: noop, openCreateDialog: noop, setCatalogToolsOpen: noop,
  setSearch: noop, setPage: noop, setLimit: noop, setUserToolsOpen: noop,
  setSearchInput: noop, setEditingRoleId: noop, setUserToDelete: noop,
  toggleReveal: noop, closeRoleEditor: noop, setPendingRoleChange: noop,
  openEditDialog: noop, openDeleteDialog: noop, goToPage: noop,
  handlePageSizeChange: noop, searchInputRef: { current: null },
  createButtonRef: { current: null }, editButtonRefs: { current: new Map() },
  window: { location: { href: "https://reference.invalid/admin" } },
  maskEmail,
};
const renderFragment = (fragment, bindings = {}) => {
  // Radix fills a SelectValue from its portal's registered SelectItem after
  // hydration. For static markup supply that same source-selected item label.
  const selectValue = bindings.selectedLabel === undefined ? {} : {
    SelectValue: ({ children, ...props }) => React.createElement(atoms.SelectValue, props, children ?? bindings.selectedLabel),
  };
  const element = evaluate(`const element = (${fragment});`, { ...baseBindings, ...bindings, ...selectValue }, "element");
  return renderToStaticMarkup(element);
};

export function buildAdminCatalog0929() {
  const crud = read(crudPath), resources = read(resourcePath), users = read(usersPath);
  for (const text of [
    'ref={createButtonRef}\n              variant="default"',
    'itemsPerPage: defaultItemsPerPage = 10', 'pageSizeOptions = [10, 25, 50, 100]',
    'navigationOrder !== "subcategories"', 'const rank = new Map(',
    'data-testid={`button-delete-${item.id}`}', 'paginationEnabled && totalItems > 0',
    'className="admin-taxonomy-header-row flex flex-wrap items-start justify-between gap-3"',
    'className="admin-taxonomy-table-scroll"',
  ]) requireText(crud, text);
  requireText(users, 'user.id === currentUser?.id ? null');
  requireText(users, 'maskEmail(user.email)');
  requireText(resources, 'const [limit, setLimit] = useState(25)');
  requireText(resources, 'className="admin-catalog-resources__content space-y-4"');
  requireText(resources, 'className="admin-catalog-resources__table-scroll overflow-auto"');
  requireText(read("client/src/components/admin/AdminOpsPrimitives.tsx"), 'className="relative w-full overflow-auto"');
  const usersShellClass = read("client/src/components/admin/AdminOpsPrimitives.tsx")
    .match(/className=\{cn\("card", "([^"]+)", className\)\}/)?.[1];
  if (!usersShellClass || !/^[\w-]+$/.test(usersShellClass)) fail("Users TableShell root class");
  const profiles = read("shared/styles/product-profiles.css");
  const heights = new Set([...profiles.matchAll(/--profile-control-height:\s*([^;]+);/g)].map((m) => m[1].trim()));
  if (heights.size !== 1) fail("uniform profile control height");
  const frozenAdmin = fs.readFileSync(referenceFilePath("admin.jsx"), "utf8");
  for (const text of [
    "function TableShell({ title, sub, actions, children })",
    "<h3 style={{ fontSize: 14, fontWeight: 600 }}>{title}</h3>",
    "function AdminCategories()", "function AdminSubcategories()", "function AdminUsers()",
    "function AdminResources({ go })", "all.slice(0, 24).map",
  ]) requireText(frozenAdmin, text);
  const rules = [];
  for (const file of cssPaths) postcss.parse(read(file)).walkRules((rule) => {
    // This stylesheet also contains old measured audit/table sizing. Only the
    // retained swipe hint's inset belongs to this catalog projection.
    if (file.endsWith("admin-ops-users-audit.css") && rule.selector !== ".admin-ops-scroll-hint") return;
    if (file.endsWith("admin-shell.css") && !/admin-tab-scroller|admin-dashboard__tabs/.test(rule.selector)) return;
    if (file.endsWith("app-bridge.css") && !rule.selector.includes(".lucide") &&
      !rule.selector.includes("[disabled]")) return;
    const media = [];
    for (let parent = rule.parent; parent?.type !== "root"; parent = parent.parent) {
      if (parent.type !== "atrule" || parent.name !== "media") return;
      media.push(parent.params);
    }
    rules.push({ selector: rule.selector, media, declarations: rule.nodes
      .filter((node) => node.type === "decl").map(({ prop, value, important }) => ({ prop, value, important })) });
  });
  for (const selector of [
    ".admin-taxonomy-table tbody td.admin-taxonomy-column-actions",
    ".admin-catalog-resources__table td.admin-catalog-resources__actions-cell",
  ]) {
    if (!rules.some((rule) => rule.selector === selector &&
      rule.declarations.some(({ prop, value }) => prop === "padding-block" && value === "14px"))) fail(`${selector} canonical padding`);
  }
  for (const selector of [".admin-taxonomy-row-action", ".admin-ops-users-shell .admin-ops-cell-actions button"]) {
    if (!rules.some((rule) => rule.selector === selector &&
      rule.declarations.some(({ prop, value }) => prop === "min-height" && value === "44px"))) fail(`${selector} retained target`);
  }
  if (!rules.some((rule) => rule.selector.includes(".admin-catalog-resources__row-actions > button") &&
    rule.declarations.some(({ prop, value }) => prop === "min-height" && value === "44px"))) fail("resources retained action target");
  // The app's Tailwind preflight opts links out of UA underlines. Project only
  // its anchor declarations onto the retained View link, not all preflight.
  const preflight = read("node_modules/tailwindcss/preflight.css");
  const usersRevealClasses = users.match(/className="(inline-flex h-8 w-8[^"]+)"/)?.[1];
  const usersRevealMinWidthClass = usersRevealClasses?.split(/\s+/).filter((token) => token.startsWith("min-w-["));
  if (usersRevealMinWidthClass?.length !== 1) fail("Users reveal caller minimum width");
  const usersControlResetRules = [];
  postcss.parse(preflight).walkRules((rule) => {
    if (rule.selector.replace(/\s/g, "") !== "button,input,select,optgroup,textarea,::file-selector-button") return;
    const properties = ["font", "font-feature-settings", "font-variation-settings", "letter-spacing"];
    const declarations = rule.nodes.filter((node) => node.type === "decl" && properties.includes(node.prop))
      .map(({ prop, value, important }) => ({ prop, value, important }));
    if (declarations.length !== properties.length || declarations.some(({ value }) => value !== "inherit")) fail("source form-control typography inheritance");
    usersControlResetRules.push({ selector: rule.selector, declarations });
  });
  if (usersControlResetRules.length !== 1) fail("source form-control reset rule");
  const anchorRules = [];
  postcss.parse(preflight).walkRules((rule) => {
    if (rule.selector !== "a") return;
    const declarations = rule.nodes.filter((node) => node.type === "decl")
      .map(({ prop, value, important }) => ({ prop, value, important }));
    for (const prop of ["color", "-webkit-text-decoration", "text-decoration"]) {
      if (!declarations.some((decl) => decl.prop === prop && decl.value === "inherit")) fail("preflight anchor reset " + prop);
    }
    anchorRules.push({ selector: ".admin-catalog-resources__row-actions a, .admin-ops-users-shell [data-testid=button-export-users]", media: [], declarations });
  });
  if (anchorRules.length !== 1) fail("one source preflight anchor reset");
  rules.push(...anchorRules);
  const bridge = read("client/src/styles/app-bridge.css");
  for (const text of ['[disabled],', 'opacity: 0.5;', 'svg.lucide,', 'stroke-width: 1.5;']) requireText(bridge, text);
  const statusTokens = [];
  postcss.parse(bridge).walkRules((rule) => {
    if (rule.selector !== ":root") return;
    rule.walkDecls((decl) => {
      if (/^--status-(ok|warn|bad)$/.test(decl.prop)) statusTokens.push({ prop: decl.prop, value: decl.value, important: decl.important });
    });
  });
  if (statusTokens.length !== 3) fail("source status tokens");
  rules.push({ selector: ".admin-ops-users-shell", media: [], declarations: statusTokens });
  const dashboard = read("client/src/pages/AdminDashboard.tsx");
  const revealDeclaration = dashboard.match(/function revealTabTrigger\([\s\S]*?\n}/)?.[0];
  if (!revealDeclaration) fail("catalog tab reveal declaration");
  for (const text of ["const start = scroller.scrollLeft > 1;", "const end = scroller.scrollLeft < max - 1;"]) requireText(dashboard, text);
  const tabReveal = esbuild.transformSync(revealDeclaration, { loader: "ts" }).code;
  const tabEdges = {};
  for (const side of ["start", "end"]) {
    const edge = dashboard.match(new RegExp('<button\\s+type="button"\\s+className="admin-tab-scroller__edge admin-tab-scroller__edge--' + side + '"[\\s\\S]*?<\\/button>'))?.[0];
    if (!edge) fail("catalog tab edge " + side);
    tabEdges[side] = renderFragment(edge);
  }
  const tabAtom = read("client/src/components/ui/tabs.tsx");
  requireText(tabAtom, "tab min-h-11 shrink-0 justify-center [line-height:normal]");
  // Radix selects on primary mousedown, before native focus scrolling; the
  // frozen click-only callback otherwise runs after that scrolling.
  const tabsPointerPath = "node_modules/@radix-ui/react-tabs/dist/index.mjs";
  const tabsPointerSource = read(tabsPointerPath);
  const tabPointerSelect = tabsPointerSource.match(/onMouseDown: composeEventHandlers\(props\.onMouseDown, \(event\) => \{([\s\S]*?)\n            \}\),/)?.[1];
  if (!tabPointerSelect) fail("source Radix tab pointer selection");
  for (const text of ["!disabled && event.button === 0 && event.ctrlKey === false", "context.onValueChange(value);", "event.preventDefault();"]) requireText(tabPointerSelect, text);
  const tabKeyboardSelect = tabsPointerSource.match(/onKeyDown: composeEventHandlers\(props\.onKeyDown, \(event\) => \{([\s\S]*?)\n            \}\),/)?.[1];
  if (!tabKeyboardSelect) fail("source Radix tab keyboard selection");
  requireText(tabKeyboardSelect, 'disabled || event.target !== event.currentTarget');
  requireText(tabKeyboardSelect, '[" ", "Enter"].includes(event.key)');
  const files = [tabsPointerPath, crudPath, resourcePath, usersPath, ...cssPaths, "client/src/lib/utils.ts",
    "client/src/config/navigation-icons.ts", "client/src/index.css", "shared/styles/product-profiles.css",
    ...["category", "subcategory", "subsubcategory"].map((kind) => `client/src/components/admin/configs/${kind}-config.ts`)];
  files.push("client/src/components/admin/AdminOpsPrimitives.tsx",
    "client/src/hooks/useAuth.ts", "client/src/lib/page-param.ts",
    "client/src/pages/AdminDashboard.tsx", "client/src/components/ui/tabs.tsx",
    "node_modules/tailwindcss/preflight.css", "node_modules/tailwindcss/theme.css",
    path.relative(root, referenceFilePath("admin.jsx")),
    ...["button", "input", "select", "paginator", "badge", "table"].map((atom) => `client/src/components/ui/${atom}.tsx`));
  const theme = read("client/src/index.css").match(/@theme inline \{[\s\S]*?\n\}/)?.[0];
  if (!theme) fail("Tailwind source token bridge");
  requireText(theme, "--color-muted-foreground: var(--text-2);");
  const wrapperClasses = [
    crud.match(/className="(admin-taxonomy-header-row[^"]+)"/)?.[1],
    resources.match(/className="(admin-catalog-resources__content[^"]+)"/)?.[1],
    resources.match(/className="(admin-catalog-resources__table-scroll[^"]+)"/)?.[1],
    read("client/src/components/admin/AdminOpsPrimitives.tsx").match(/className="(relative w-full overflow-auto)"/)?.[1],
  ];
  if (wrapperClasses.some((value) => !value)) fail("retained wrapper class declarations");
  return { rules, theme, tailwindTheme: fs.readFileSync(createRequire(import.meta.url).resolve("tailwindcss/theme.css"), "utf8"),
    utilityCandidates: wrapperClasses.flatMap((value) => value.split(/\s+/)),
    controlHeight: [...heights][0], tabReveal, tabEdges, usersShellClass, tabPointerSelect, tabKeyboardSelect,
    usersRevealMinWidthClass: usersRevealMinWidthClass[0], usersControlResetRules,
    sourceProof: files.map((file) => ({ file, sha256: crypto.createHash("sha256").update(read(file)).digest("hex") })) };
}

/** Read the taxonomy endpoints declared by the configs, preserving their order. */
export async function buildAdminCatalogData0929(get, nav, usersPage, resourcesPage) {
  const contract = buildAdminCatalog0929();
  const crud = read(crudPath), resources = read(resourcePath), users = read(usersPath);
  const categoriesConfig = read("client/src/components/admin/configs/category-config.ts");
  requireText(categoriesConfig, 'const CategoryIcon = getCategoryIcon(item.name)');
  const categoryIconSource = read("client/src/config/navigation-icons.ts")
    .replace(/^import \{[\s\S]*?\} from "lucide-react";/, "")
    .replace(/\bexport /g, "");
  const getCategoryIcon = evaluate(categoryIconSource, iconBindings, "getCategoryIcon");
  const iconRenderer = categoriesConfig.match(/render: (\(item: CategoryWithCount\) => \{[\s\S]*?\n      \})/)?.[1];
  if (!iconRenderer) fail("category icon renderer");
  const renderCategoryIcon = evaluate(`const render = ${iconRenderer};`, {
    getCategoryIcon, createElement: React.createElement,
  }, "render");
  const payload = {};
  for (const [kind, title, entity, entityPlural] of [
    ["category", "Categories", "category", "categories"],
    ["subcategory", "Subcategories", "subcategory", "subcategories"],
    ["subsubcategory", "Sub-Subcategories", "subsubcategory", "subsubcategories"],
  ]) {
    const config = read(`client/src/components/admin/configs/${kind}-config.ts`);
    const endpoint = config.match(/fetchUrl: "([^"]+)"/)?.[1];
    if (!endpoint) fail(`${kind} fetchUrl`);
    const rows = await get(endpoint);
    if (!Array.isArray(rows) || new Set(rows.map((row) => row.slug)).size !== rows.length ||
      new Set(rows.map((row) => row.id)).size !== rows.length ||
      rows.some((row) => !Number.isFinite(row.id) || typeof row.name !== "string" ||
        typeof row.slug !== "string" || !Number.isFinite(row.resourceCount))) fail(`${endpoint} row schema or duplicate slug`);
    const bySlug = new Map(rows.map((row) => [row.slug, row]));
    let ordered = rows;
    if (kind === "subcategory") {
      const navigation = nav.categories.flatMap((category) => category.subcategories || []);
      if (navigation.length !== rows.length || new Set(navigation.map((row) => row.slug)).size !== navigation.length ||
        navigation.some((row) => !bySlug.has(row.slug))) fail("subcategory nav/admin join");
      ordered = navigation.map((row) => bySlug.get(row.slug));
    }
    if (kind === "category") {
      if (nav.categories.length !== rows.length || new Set(nav.categories.map((row) => row.slug)).size !== nav.categories.length ||
        nav.categories.some((row) => !bySlug.has(row.slug))) fail("category nav/admin join");
    }
    const pageSize = Number(config.match(/itemsPerPage: (\d+)/)?.[1] || crud.match(/defaultItemsPerPage = (\d+)/)?.[1]);
    const options = config.match(/pageSizeOptions: (\[[^\]]+\])/)?.[1] || crud.match(/pageSizeOptions = (\[[^\]]+\])/)?.[1];
    if (!Number.isFinite(pageSize) || !options) fail(`${kind} page size`);
    const common = { entityName: kind === "subsubcategory" ? "Sub-Subcategory" : kind === "subcategory" ? "Subcategory" : "Category",
      testIdEntity: entity, testIdEntityPlural: entityPlural, toolsOpen: false, createButtonRef: { current: null } };
    const search = between(crud, '              <Button\n                type="button"\n                variant="ghost"', "\n            )}");
    const create = between(crud, '            <Button\n              ref={createButtonRef}', "\n          </div>");
    const toolbarClasses = crud.match(/className="(admin-taxonomy-header-actions[^"]+)"/)?.[1];
    if (!toolbarClasses) fail("taxonomy toolbar classes");
    const toolbar = renderFragment(`<div className=${JSON.stringify(toolbarClasses)}>${search}${create}</div>`, common);
    const pagerFragment = between(crud, '            <div className="admin-taxonomy-pagination', "\n          )}");
    const totalPages = Math.ceil(rows.length / pageSize);
    const pager = rows.length ? renderFragment(pagerFragment, { ...common, pageSize, pageSizeOptions: JSON.parse(options),
      totalPages, currentPage: 1, selectedLabel: String(pageSize) }) : "";
    const childDeclaration = config.match(/childCount: (\{[^\n]+\})/)?.[1];
    const childCount = childDeclaration ? evaluate(`const child = ${childDeclaration};`, {}, "child") : undefined;
    const blockerDeclaration = between(crud, "  const getDeleteBlocker =", "\n  const openDeleteDialog");
    const getDeleteBlocker = evaluate(blockerDeclaration, { childCount }, "getDeleteBlocker");
    payload[title] = { kind, toolbar, pager, rows: ordered.slice(0, pageSize).map((item) => {
      const actions = between(crud, '                            <div className="admin-taxonomy-row-actions', "\n                          ) : (");
      const countFragment = between(crud, '                            <Badge className="admin-taxonomy-cell-count"', '\n                          ) : col.key === "actions"');
      const countClass = config.match(/key: "resourceCount",[\s\S]*?className: "([^"]+)"/)?.[1];
      if (!countClass) fail(kind + " count cell classes");
      const row = { ...item, actions: renderFragment(actions, { item, getDeleteBlocker }),
        countMarkup: renderFragment(countFragment, { item }), countClass };
      if (kind === "category") row.icon = renderToStaticMarkup(renderCategoryIcon(item));
      return row;
    }) };
  }
  const identitySource = read("client/src/hooks/useAuth.ts");
  requireText(identitySource, "fetch('/api/auth/user', { credentials: 'include' })");
  const identity = await get("/api/auth/user");
  if (!identity?.user?.id || identity.isAuthenticated !== true) fail("authenticated user identity");
  const userActions = between(users, "        <>", "\n      }\n    >");
  const userRows = usersPage.users;
  if (!Array.isArray(userRows) || userRows.some((user) => typeof user.id !== "string") ||
    new Set(userRows.map((user) => user.id)).size !== userRows.length) fail("users page identity schema");
  const toolbar = renderFragment(userActions, { userToolsOpen: false, searchInput: "" });
  const userActionFragment = between(users, '                    <div className="flex items-center gap-2">', "\n                  </TableCell>");
  const userNameFragment = between(users, '                    <div className="flex items-center gap-2 min-w-0">', "\n                  </TableCell>");
  const emailFragment = between(users, "                    {user.email ? (", "\n                  </TableCell>");
  const ops = read("client/src/components/admin/AdminOpsPrimitives.tsx");
  const statusSource = between(ops, "const STATUS_VARIANTS:", "\nexport interface StatProps");
  const StatusChip = evaluate(statusSource.replace(/\bexport /g, ""), baseBindings, "StatusChip");
  const userHeaderFragment = between(users, "              {([", '\n              <TableHead aria-label="Actions"');
  const userPagerFragment = between(users, '          <div className="admin-ops-users-pagination">', "\n        )}");
  const userLimit = users.match(/const limit = (\d+);/)?.[1];
  if (!userLimit || !Number.isFinite(usersPage.total)) fail("users source limit/live total");
  const userTotalPages = Math.ceil(usersPage.total / Number(userLimit));
  const cellClasses = {};
  for (const cell of ["name", "email", "role", "joined"]) {
    const classes = users.match(new RegExp(`<TableCell className="(admin-ops-cell-${cell}[^"]*)">`))?.[1];
    if (!classes) fail(`user ${cell} class contract`);
    cellClasses[cell] = classes;
  }
  const userTitle = users.match(/title=\{(`Users[^`]+`)\}/)?.[1];
  if (!userTitle) fail("user title expression");
  const formatDate = evaluate(between(users, "  const formatDate =", "\n  if (isLoading)"), {}, "formatDate");
  const userHead = between(users, '            <TableHeader>', '\n            </TableHeader>') + '\n            </TableHeader>';
  const userBody = between(users, '            <TableBody>', '\n            </TableBody>') + '\n            </TableBody>';
  const tableClasses = ops.match(/<table[^>]+className=\{cn\("([^"]+)", className\)\}/)?.[1];
  const tableCallerClasses = users.match(/<Table className="([^"]+)">/)?.[1];
  const viewport = ops.match(/<div className="([^"]+)" tabIndex=\{(\d+)\}>/);
  if (!tableClasses || !tableCallerClasses || !viewport) fail("source Users table primitive shape");
  payload.Users = { kind: "users", toolbar,
    tableClasses: tableClasses + " " + tableCallerClasses,
    viewportTabIndex: Number(viewport[2]),
    headMarkup: renderFragment(userHead, { sortBy: "createdAt", sortDir: "desc", toggleSort: noop }),
    bodyMarkup: renderFragment(userBody, { data: usersPage, currentUser: identity.user, editingRoleId: null,
      revealedIds: new Set(), StatusChip, formatDate, searchQuery: "" }),
    title: evaluate(`const title = ${userTitle};`, { data: usersPage }, "title"),
    cellClasses,
    wrapClasses: users.match(/className="(admin-ops-table-wrap relative)"/)?.[1] ?? fail("users outer scroll wrapper"),
    viewportClasses: viewport[1],
    fade: renderFragment(between(users, '          <div\n            className="pointer-events-none absolute', '\n          <Table className="admin-ops-table admin-ops-users-table">')),
    hint: renderFragment(between(users, '        <p className="admin-ops-scroll-hint', "\n\n        {totalPages > 1")),
    headers: renderFragment(`<>${userHeaderFragment}</>`, { sortBy: "createdAt", sortDir: "desc", toggleSort: noop }),
    pager: userTotalPages > 1 ? renderFragment(userPagerFragment, { page: 1, totalPages: userTotalPages,
      prevPageRef: { current: null }, nextPageRef: { current: null } }) : "",
    rows: userRows.map((user) => {
      const bindings = { user, currentUser: identity.user, editingRoleId: null, revealedIds: new Set() };
      return { id: user.id, actions: renderFragment(userActionFragment, bindings),
        nameMarkup: renderFragment(userNameFragment, bindings),
        emailMarkup: renderFragment(`<>${emailFragment}</>`, bindings),
        roleMarkup: renderFragment('<StatusChip status={user.role ?? "user"} />', { user, StatusChip }),
        joined: formatDate(user.createdAt),
        name: [user.firstName, user.lastName].filter(Boolean).join(" ") || (user.email ? maskEmail(user.email) : user.id),
        email: user.email ? maskEmail(user.email) : "" };
    }) };
  const resourceToolbar = between(resources, '          <div className="admin-catalog-resources__header-actions">', "\n        </CardHeader>");
  const resourceFooter = between(resources, '          <div className="admin-catalog-resources__pagination-summary', "\n        </CardContent>");
  const resourceActionFragment = between(resources, '                      <div className="admin-catalog-resources__row-actions', "\n                    </td>");
  const titleFragment = between(resources, '                        <div className="admin-catalog-resources__resource-title"', "\n                    </td>");
  const tagsFragment = between(resources, '                      <div className="admin-catalog-resources__tags">', "\n                    </td>");
  const tagsDeclaration = between(resources, "const safeResourceMetadataTags =", "\nconst normalizeAdminResource");
  const safeResourceMetadataTags = evaluate(tagsDeclaration, {}, "safeResourceMetadataTags");
  if (!Array.isArray(resourcesPage.resources) || !Number.isFinite(resourcesPage.total) ||
    resourcesPage.resources.some((resource) => !Number.isFinite(resource.id)) ||
    new Set(resourcesPage.resources.map((resource) => resource.id)).size !== resourcesPage.resources.length) fail("resources page schema");
  const totalPages = Math.ceil(resourcesPage.total / 25);
  payload.Resources = { kind: "resources",
    title: renderFragment(`<>${between(resources, "              Resources (", "\n            </CardTitle>")}</>`, { data: resourcesPage }).trim(),
    toolbar: renderFragment(resourceToolbar, { search: "", catalogToolsOpen: false }),
    pager: renderFragment(`<>${resourceFooter}</>`, { data: resourcesPage, shownPage: 1, shownLimit: 25, limit: 25, totalPages,
      selectedLabel: resources.match(/<SelectItem value="25">([^<]+)<\/SelectItem>/)?.[1] ?? fail("resource page-size label") }),
    rows: resourcesPage.resources.map((resource) => ({ id: resource.id,
      titleMarkup: renderFragment(titleFragment, { resource }),
      tagsMarkup: renderFragment(tagsFragment, { resource, safeResourceMetadataTags }),
      actions: renderFragment(resourceActionFragment, { resource }) })) };
  return { panels: payload, tabPointerSelect: contract.tabPointerSelect, tabKeyboardSelect: contract.tabKeyboardSelect, sourceProof: contract.sourceProof };
}

export async function applyAdminCatalog0929(page, reconciliation) {
  const projection = reconciliation.adminCatalog0929;
  if (!projection) fail("missing reconciliation payload");
  const classes = await page.evaluate(() => {
    const payload = window.AV_ADMIN_CATALOG_0929;
    const classes = new Set();
    const visit = (value, field = "") => {
      if (typeof value === "string" && /(?:Markup$|^(?:toolbar|actions|headers|pager|hint|fade|icon)$)/.test(field)) {
        // SSR escapes '&' in arbitrary-variant class names. Compile the
        // source DOM tokens, not the encoded HTML spellings (&amp;_svg).
        const template = document.createElement("template");
        template.innerHTML = value;
        template.content.querySelectorAll("[class]").forEach((node) => {
          node.classList.forEach((token) => classes.add(token));
        });
      } else if (value && typeof value === "object") Object.entries(value).forEach(([key, child]) => visit(child, key));
    };
    visit(payload);
    for (const name of [...Object.values(payload?.panels?.Users?.cellClasses || {}),
      ...["tableClasses", "viewportClasses", "wrapClasses"].map((key) => payload?.panels?.Users?.[key]).filter(Boolean)]) {
      name.split(/\s+/).forEach((token) => classes.add(token));
    }
    return [...classes];
  });
  // Compile only utilities carried by source-rendered retained atoms. No
  // preflight, full app stylesheet, measured geometry or pixel masks.
  const utilities = await compileTailwind(`${projection.tailwindTheme}\n${projection.theme}\n@tailwind utilities;`);
  const utilityRoot = postcss.parse(utilities.build([...new Set([...classes, ...projection.utilityCandidates])]));
  utilityRoot.walkDecls((decl) => {
    // Inline shadcn token aliases can emit self references (e.g. --font-mono).
    // Do not invalidate the inherited reference DS tokens with those aliases.
    if (decl.prop.startsWith("--") && decl.value === `var(${decl.prop})`) decl.remove();
  });
  // The comparison-only blanket .btn.icon min-width floor outranks the
  // caller's explicit utility. Restore this retained source override, not a
  // measured width: the canonical .btn.icon width still determines the box.
  let revealWidthRules = 0;
  utilityRoot.walkRules((rule) => {
    if (rule.selector.replace(/\\/g, "") !== "." + projection.usersRevealMinWidthClass) return;
    if (rule.nodes.filter((node) => node.type === "decl" && node.prop === "min-width").length !== 1) fail("compiled reveal minimum width");
    rule.selector = ':scope:where([data-parity-catalog="users"]) ' + rule.selector;
    revealWidthRules++;
  });
  if (revealWidthRules !== 1) fail("compiled Users reveal caller utility");
  const utilityCss = utilityRoot.toString();
  const result = await page.evaluate(({ projection, utilityCss }) => {
    const main = document.querySelector("main");
    const table = main?.querySelector("table.table");
    const heading = table?.closest(".card")?.querySelector("h3");
    const title = heading?.textContent.trim().replace(/\s*\(.*$/, "");
    const supported = ["Categories", "Subcategories", "Sub-Subcategories", "Resources", "Users"];
    const activeTab = main?.querySelector(".tabs .tab.active")?.textContent.trim();
    if (supported.includes(activeTab) && !supported.includes(title)) {
      throw new Error(`0929 admin catalog table/title structure drift: ${activeTab}`);
    }
    if (!supported.includes(title)) {
      return { status: "not-applicable", modified: [] };
    }
    const payload = window.AV_ADMIN_CATALOG_0929;
    const panel = payload?.panels?.[title];
    if (!panel || !table || !heading) throw new Error(`0929 admin catalog missing live panel: ${title}`);
    const shell = table.closest(".card"), header = heading.parentElement.parentElement;
    if (shell.dataset.parityCatalog || header.children.length !== 2 || !table.tBodies[0] ||
      !heading.nextElementSibling || table.parentElement.parentElement !== shell) throw new Error(`0929 admin catalog shell drift: ${title}`);
    const taxonomy = !["resources", "users"].includes(panel.kind);
    const body = table.parentElement;
    const inserted = new Set();
    const retain = (node) => { inserted.add(node); node.querySelectorAll("*").forEach((child) => inserted.add(child)); return node; };
    const fragment = (html) => { const template = document.createElement("template"); template.innerHTML = html; return template.content; };
    const replaceContents = (node, html) => {
      node.replaceChildren(fragment(html));
      retain(node);
    };
    if (taxonomy) {
      shell.classList.add("admin-taxonomy-shell", `admin-taxonomy-shell--${title.toLowerCase()}`);
      header.className = "admin-taxonomy-header admin-taxonomy-header-row flex flex-wrap items-start justify-between gap-3";
      const toolbar = fragment(panel.toolbar).firstElementChild;
      header.children[1].replaceWith(retain(toolbar));
      table.classList.add("admin-taxonomy-table");
    } else if (panel.kind === "resources") {
      shell.classList.add("admin-catalog-resources", "admin-catalog-resources__shell");
      header.className = "admin-catalog-resources__header";
      heading.textContent = panel.title;
      header.children[1].replaceWith(retain(fragment(panel.toolbar).firstElementChild));
      table.classList.add("admin-catalog-resources__table");
    } else {
      shell.classList.add(projection.usersShellClass, "admin-ops-users-shell");
      header.className = "admin-ops-table-shell__header";
      const toolbar = document.createElement("div");
      toolbar.className = "admin-ops-table-shell__actions";
      replaceContents(toolbar, panel.toolbar);
      header.children[1].replaceWith(toolbar);
      table.className = panel.tableClasses;
      heading.className = "admin-ops-table-shell__title";
      heading.textContent = panel.title;
      heading.nextElementSibling.className = "admin-ops-table-shell__description";
      const headerRow = table.tHead?.rows[0];
      if (!headerRow || headerRow.cells.length !== 5) throw new Error("0929 users header shape drift");
      const sourceHead = fragment(panel.headMarkup).firstElementChild;
      if (sourceHead?.tagName !== "THEAD" || sourceHead.rows.length !== 1 || sourceHead.rows[0].cells.length !== 5) throw new Error("0929 source Users header drift");
      table.tHead.replaceWith(retain(sourceHead));
    }
    retain(header);
    const tabs = main.querySelector(".tabs");
    const activeTrigger = tabs?.querySelector(".tab.active");
    if (!tabs || !activeTrigger) throw new Error("0929 catalog tab shell drift");
    main.classList.add("admin-dashboard");
    tabs.classList.add("admin-dashboard__tabs");
    let tabHost = tabs.parentElement;
    if (!tabHost.classList.contains("admin-tab-scroller")) {
      tabHost = document.createElement("div");
      tabHost.className = "admin-tab-scroller";
      tabs.before(tabHost);
      tabHost.append(tabs);
      tabs.style.marginBottom = "0";
    }
    inserted.add(tabHost);
    inserted.add(tabs);
    // TabTrigger declares normal leading even though the page has body leading.
    [...tabs.children].forEach((trigger) => { trigger.style.lineHeight = "normal"; });
    // Preserve the actual scroll region/pager relationship: the pager is not
    // horizontally scrolled along with a table wider than the card.
    body.style.overflowX = "visible";
    const scroll = document.createElement("div");
    if (taxonomy) {
      body.className = "admin-taxonomy-content";
      scroll.className = "admin-taxonomy-table-scroll";
    } else if (panel.kind === "resources") {
      body.className = "admin-catalog-resources__content space-y-4";
      scroll.className = "admin-catalog-resources__table-scroll overflow-auto";
    } else {
      body.className = "admin-ops-table-shell__content";
      scroll.className = panel.wrapClasses;
    }
    table.before(scroll);
    if (panel.kind === "users") {
      const viewport = document.createElement("div");
      viewport.className = panel.viewportClasses;
      viewport.tabIndex = panel.viewportTabIndex;
      scroll.append(fragment(panel.fade), viewport);
      viewport.append(table);
      retain(scroll);
    } else scroll.append(table);
    inserted.add(body);
    inserted.add(scroll);
    retain(table);
    const rows = [...table.tBodies[0].rows];
    if (rows.length !== panel.rows.length) throw new Error(`0929 admin ${title} row count drift (${rows.length}/${panel.rows.length})`);
    if (panel.kind === "category") {
      const bySlug = new Map(rows.map((row) => [row.cells[2]?.textContent.trim(), row]));
      if (bySlug.size !== rows.length || panel.rows.some((row) => !bySlug.has(row.slug))) throw new Error("0929 category endpoint/frozen row join drift");
      table.tBodies[0].replaceChildren(...panel.rows.map((row) => bySlug.get(row.slug)));
    }
    [...table.tBodies[0].rows].forEach((row, index) => {
      const data = panel.rows[index], action = row.cells[row.cells.length - 1];
      const expectedColumns = panel.kind === "category" || panel.kind === "resources" ? 6 : 5;
      if (row.cells.length !== expectedColumns) throw new Error(`0929 ${title} cell count drift`);
      const nameCell = row.cells[panel.kind === "category" ? 1 : 0];
      if (taxonomy && nameCell.textContent.trim() !== data.name) throw new Error(`0929 ${title} name/order drift: ${data.name}`);
      if (taxonomy) {
        replaceContents(row.cells[3], data.countMarkup);
        row.cells[3].className = data.countClass;
        action.className = "admin-taxonomy-column-actions";
        if (data.icon) {
          row.cells[0].className = "admin-taxonomy-column-icon";
          row.cells[0].style.color = "var(--text-2)";
          replaceContents(row.cells[0], data.icon);
        }
      } else if (panel.kind === "resources") {
        if (String(data.id) !== row.cells[0].textContent.trim()) throw new Error("0929 resources row identity drift");
        action.className = "admin-catalog-resources__actions-cell";
        replaceContents(row.cells[1], data.titleMarkup);
        replaceContents(row.cells[3], data.tagsMarkup);
      }
      else {
        if (window.AV_USERS[index]?.id !== data.id) throw new Error("0929 users adapter row identity drift");
        replaceContents(nameCell, data.nameMarkup);
        nameCell.className = panel.cellClasses.name;
        replaceContents(row.cells[1], data.emailMarkup);
        row.cells[1].className = panel.cellClasses.email;
        replaceContents(row.cells[2], data.roleMarkup);
        row.cells[2].className = panel.cellClasses.role;
        row.cells[3].className = panel.cellClasses.joined;
        row.cells[3].textContent = data.joined;
        action.className = "admin-ops-cell-actions";
      }
      replaceContents(action, data.actions);
    });
    if (panel.kind === "users") {
      // Render the complete source TableBody/TableCell tree. Extracting a
      // conditional into <> added literal leading spaces absent from the
      // source cell, and retained frozen inline styles/primitive classes.
      const sourceBody = fragment(panel.bodyMarkup).firstElementChild;
      if (sourceBody?.tagName !== "TBODY" ||
        (panel.rows.length ? (sourceBody.rows.length !== panel.rows.length ||
          [...sourceBody.rows].some((row) => row.cells.length !== 5)) :
          (sourceBody.rows.length !== 1 || sourceBody.rows[0].cells.length !== 1 ||
            sourceBody.rows[0].cells[0].colSpan !== 5))) throw new Error("0929 source Users body drift");
      table.tBodies[0].replaceWith(retain(sourceBody));
    }
    if (panel.hint) {
      const hint = fragment(panel.hint).firstElementChild;
      body.append(retain(hint));
    }
    if (panel.pager) {
      const footer = fragment(panel.pager);
      [...footer.children].forEach(retain);
      body.append(footer);
    }
    const utilityStyle = document.createElement("style");
    // Scope the generated utility selectors to this retained panel.
    utilityStyle.textContent = `@scope ([data-parity-catalog]) { ${utilityCss.replace(/:root,\s*:host/g, ":scope")} }`;
    shell.dataset.parityCatalog = panel.kind;
    document.head.append(utilityStyle);
    if (panel.kind === "users") {
      // Let the native cascade resolve the retained user's source styles.
      // Flattening declarations onto style attributes in file order incorrectly
      // lets the low-specificity primitive title/description override Users.
      // Ancestor class selectors must explicitly bind to the @scope root.
      // Leaving .admin-ops-users-shell as an ordinary ancestor inside this
      // scope fails to select the title/actions on that very root. Descendant
      // table rules still worked, concealing the incomplete binding.
      const scopeSelector = (selector) => {
        for (const className of [projection.usersShellClass, "admin-ops-users-shell"]) {
          selector = selector.replace(new RegExp("\\." + className + "(?![\\w-])", "g"), ":scope");
        }
        return selector.replace(/\.admin-ops-users-shell--tools-open(?![\w-])/g,
          ":scope:where(.admin-ops-users-shell--tools-open)");
      };
      // Match the app's source preflight layer for control typography. These
      // low-layer inheritance resets must not supersede canonical .btn paint.
      const controlResetStyle = document.createElement("style");
      controlResetStyle.textContent = "@layer base {@scope ([data-parity-catalog=users]) {" + projection.usersControlResetRules.map((rule) =>
        rule.selector + "{" + rule.declarations.map(({ prop, value }) => prop + ":" + value + ";").join("") + "}"
      ).join("") + "}}";
      document.head.append(controlResetStyle);
      const sourceStyle = document.createElement("style");
      sourceStyle.textContent = "@scope ([data-parity-catalog=users]) {" + projection.rules.map((rule) => {
        const declarations = rule.declarations.map(({ prop, value, important }) =>
          prop + ":" + value.replaceAll("var(--profile-control-height)", projection.controlHeight) + (important ? " !important" : "") + ";").join("");
        let css = scopeSelector(rule.selector) + "{" + declarations + "}";
        for (const query of [...rule.media].reverse()) css = "@media " + query + "{" + css + "}";
        return css;
      }).join("\n") + "}";
      document.head.append(sourceStyle);
    } else {
      // Inline declarations would also beat the frozen per-system skins
      // (`[data-system="brutalist"] .btn`, `… .card`, …) that outrank these
      // source rules in the app's own cascade; leave such properties to it.
      const specificityOf = (selector) => (selector.match(/#[\w-]+/g)?.length || 0) * 10000 +
        (selector.match(/\.[\w-]+|\[[^\]]+\]|:(?!:)[\w-]+(?:\([^)]*\))?/g)?.length || 0) * 100 +
        (selector.match(/(?:^|[\s>+~])(?:[a-z][\w-]*)/gi)?.length || 0);
      const skinPrefix = `[data-system="${document.documentElement.dataset.system}"]`;
      const skinRules = [];
      const walkSkins = (list) => {
        for (const rule of list) {
          if (rule.cssRules && !rule.selectorText) {
            if (!rule.media || window.matchMedia(rule.media.mediaText).matches) walkSkins(rule.cssRules);
            continue;
          }
          for (const selector of rule.selectorText?.split(",").map((part) => part.trim()) || []) {
            if (!selector.startsWith(skinPrefix) || /:(?:hover|focus|active|:)/.test(selector)) continue;
            skinRules.push({ selector, specificity: specificityOf(selector), props: new Set([...rule.style]) });
          }
        }
      };
      if (document.documentElement.dataset.system) {
        for (const sheet of document.styleSheets) {
          try { walkSkins(sheet.cssRules); } catch { /* cross-origin sheet */ }
        }
      }
      const longhands = (prop) => {
        const probe = document.createElement("div").style;
        probe.setProperty(prop, "inherit");
        return probe.length ? [...probe] : [prop];
      };
      for (const rule of projection.rules) {
        if (!rule.media.every((query) => matchMedia(query).matches)) continue;
        for (const node of inserted) {
          if (!node.matches(rule.selector)) continue;
          const score = Math.max(...rule.selector.split(",").map((part) => part.trim())
            .filter((part) => { try { return node.matches(part); } catch { return false; } }).map(specificityOf), 0);
          for (const { prop, value, important } of rule.declarations) {
            if (!important && skinRules.some((skin) => skin.specificity > score && node.matches(skin.selector) &&
              longhands(prop).some((longhand) => skin.props.has(longhand)))) continue;
            node.style.setProperty(prop,
              value.replaceAll("var(--profile-control-height)", projection.controlHeight), important ? "important" : "");
          }
        }
      }
    }
    for (const node of inserted) {
      if (node.className?.includes?.("var(--profile-control-height)")) {
        node.style.minHeight = `max(44px,${projection.controlHeight})`;
        node.style.minWidth = "44px";
      }
    }
    // Retain the source strip's overlay-safe nearest-edge reveal. The existing
    // global admin-ops projection only owns other panels, not these catalogs.
    const revealTabTrigger = new Function(projection.tabReveal + "\nreturn revealTabTrigger;")();
    const applyTabRules = (root) => {
      for (const rule of projection.rules) {
        if ((!/admin-tab-scroller|admin-dashboard__tabs/.test(rule.selector) && !rule.selector.includes(".lucide")) ||
          !rule.media.every((query) => matchMedia(query).matches)) continue;
        const nodes = [root, ...root.querySelectorAll("*")];
        for (const node of nodes) {
          if (!node.matches(rule.selector)) continue;
          for (const { prop, value, important } of rule.declarations) node.style.setProperty(prop, value, important ? "important" : "");
        }
      }
    };
    const updateTabEdges = () => {
      tabHost.querySelectorAll(".admin-tab-scroller__edge").forEach((node) => node.remove());
      const max = tabs.scrollWidth - tabs.clientWidth;
      for (const [side, visible] of [["start", tabs.scrollLeft > 1], ["end", tabs.scrollLeft < max - 1]]) {
        if (visible) tabHost.append(fragment(projection.tabEdges[side]));
      }
      applyTabRules(tabHost);
    };
    applyTabRules(tabHost);
    revealTabTrigger(tabs, activeTrigger);
    updateTabEdges();
    tabs.addEventListener("scroll", updateTabEdges, { passive: true });
    let released = false;
    const settleTabs = () => { if (!released) revealTabTrigger(tabs, activeTrigger); updateTabEdges(); };
    const tabObserver = new ResizeObserver(settleTabs);
    tabObserver.observe(tabs);
    document.fonts?.ready.then(settleTabs);
    ["pointerdown", "wheel", "touchstart"].forEach((type) => tabHost.addEventListener(type, () => {
      released = true;
      tabObserver.disconnect();
    }, { passive: true }));
    return { status: "applied", panel: title, modified: [
      `${title}: source-rendered retained toolbar, row controls and pagination`,
      "catalog tab shell: source edge controls and overlay-safe active-trigger reveal",
      ...(taxonomy ? ["admin endpoint category order/counts and source category SVGs"] : []),
      ...(panel.kind === "users" ? ["source maskEmail privacy and authenticated self-edit guard",
        "native Users source cascade, intrinsic sort labels and retained scroll feedback"] : []),
    ] };
  }, { projection, utilityCss });
  return { ...result, sourceProof: projection.sourceProof };
}

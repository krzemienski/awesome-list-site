#!/usr/bin/env node
// Dead-EXPORT gate (task #374) — the symbol-level sibling of
// scripts/validation/dead-components.mjs.
//
// The file-level gate catches whole modules nothing reaches, but it is blind
// INSIDE a file: one live import keeps every other export in that module alive
// in its eyes. client/src/lib/analytics.ts is the canonical example — it is
// reachable (queryClient imports trackError), yet a dozen of its exported
// helpers had zero callers anywhere, and nothing flagged them when their last
// caller disappeared (trackPerformance lost its only caller when the
// unreachable use-session-analytics hook was deleted in task #370). Every
// typecheck, bundle, and styling sweep kept paying for code no caller can run.
//
// This gate answers "which exported symbol under client/src/ or shared/ does
// no OTHER module import?" — the same question one level down.
//
// ---------------------------------------------------------------------------
// Why a real parser, not regexes
// ---------------------------------------------------------------------------
// The file gate can afford content-wide regexes: it only needs the specifier
// string, and its false-positive direction (a string literal that looks like an
// import) can only make a file look more alive. Symbol level has no such
// safety: `export { a as b }`, `import { type T, x }`, `export * from`,
// multi-line specifier lists, and destructured `export const { a, b } = …` all
// change WHICH name is exported or used, and getting one wrong invents a dead
// symbol that isn't dead. So every module is parsed with the TypeScript parser
// the repo already type-checks with (ts.createSourceFile — parse only, no type
// resolution, no tsconfig program, so the whole repo parses in ~1s).
//
// ---------------------------------------------------------------------------
// Usage universe vs checked scope
// ---------------------------------------------------------------------------
// CHECKED (whose exports may be reported dead): client/src/ + shared/, minus
//   *.d.ts — the same scope predicate as the file gate, shared via
//   module-graph.mjs.
// USAGE (who counts as an importer): client/, server/, shared/, scripts/,
//   tests/, plus the root config files. Tests and scripts genuinely import
//   client and shared symbols (tests/unit/parse-tags-param.test.ts →
//   client/src/lib/tags, scripts/*.ts → shared/schema), so leaving them out
//   would fabricate dead symbols. artifacts/ is deliberately excluded: the
//   mockup sandbox is a self-contained second app with its OWN `@/` alias
//   pointing at its own src/, so resolving its imports against client/src
//   would invent uses that don't exist.
//
// ---------------------------------------------------------------------------
// What counts as a use (and the traps each one hides)
// ---------------------------------------------------------------------------
//   · import { x } / import { x as y }      → uses x (the SOURCE name)
//   · import x from                          → uses `default`
//   · import type { T } / import { type T }  → uses T (types are consumed the
//                                              same way; a type-only import is
//                                              still an import)
//   · import * as ns from                    → uses the WHOLE module. A
//     namespace object can be indexed dynamically (`analytics[name]()`), so
//     per-symbol tracking through it would be a lie; the module is marked
//     wholly used and none of its exports can be reported.
//   · export { x } from                      → NOT a use — a forward. The use
//     resolves THROUGH the re-export to the origin, so an unread barrel entry
//     leaves both the entry and the origin dead (following re-exports is the
//     whole point; counting them as uses would keep every barrelled symbol
//     alive forever).
//   · export * from                          → the re-exporting module's export
//     set includes the origin's, so `import { y } from "barrel"` marks y used
//     in the origin file.
//   · import("spec") / require("spec") / ssrLoadModule("spec") / an html
//     <script src="/src/…">                  → whole module (React.lazy route
//     splits consume `.default`, vite's SSR entry is read by property access —
//     neither is statically attributable to one name).
//
// A symbol used only INSIDE its own module is still reported: nothing imports
// it, so the `export` keyword is what's dead. The report says how many in-file
// references it has so the fix is obvious (drop `export` vs. delete it).
//
// Type-only exports (export type/interface, and `export type { … }`) are
// tracked — a type-only import marks its target used — but are NOT reported.
// They are erased at build (zero bundle cost), and shared/ deliberately
// publishes inferred row/DTO types as contract surface; reporting them would
// bury the runtime findings this gate exists for. `--types` lists them.
//
// ---------------------------------------------------------------------------
// Exception contract — identical to the file gate, one level down
// ---------------------------------------------------------------------------
// Pins live in dead-exports-allowlist.json ({ file, symbol, reason }), and the
// exception UNIVERSE is mechanically shrink-only: FROZEN_EXCEPTIONS below is
// the trusted manifest of the pre-existing dead exports found when this gate
// was introduced. The JSON allowlist may only ever name a SUBSET of it, so a
// newly dead export can never be laundered into the allowlist in the same
// change that killed it — growing the universe means editing THIS script,
// which is a visible, out-of-band act.
//   · a dead export NOT in the allowlist            → FAIL (delete it, drop the
//     `export` keyword, or wire it up — it cannot be pinned)
//   · an allowlist entry outside the frozen manifest → FAIL (new pin/substitution)
//   · a pinned symbol that is imported again        → FAIL (stale pin)
//   · a pinned symbol that no longer exists         → FAIL (stale pin)
//
// Canaries run on every invocation against synthetic modules, covering exactly
// the traps above (re-export chains, `export * from`, type-only exports,
// namespace imports, aliases, default exports, destructured export consts,
// dynamic/require/ssrLoadModule/html whole-module uses) plus the allowlist
// contract — so a detector regression can never pass vacuously.
//
// Usage:
//   node scripts/validation/dead-exports.mjs            # gate mode
//   node scripts/validation/dead-exports.mjs --list     # dump every dead export
//   node scripts/validation/dead-exports.mjs --types    # …incl. type-only ones
import fs from 'fs';
import path from 'path';
import ts from 'typescript';
import {
  ROOT,
  CODE_EXTS,
  SCAN_EXTS,
  SCOPE_RELS,
  inScope,
  relOf,
  resolveSpecifier,
  unresolvedTargetsScope,
  walk,
} from './module-graph.mjs';

const ALLOWLIST_PATH = path.join(ROOT, 'scripts/validation/dead-exports-allowlist.json');
const LIST = process.argv.includes('--list');
const WITH_TYPES = process.argv.includes('--types');

// Who may count as an importer (see header).
const USAGE_DIRS = ['client', 'server', 'shared', 'scripts', 'tests'];
const USAGE_FILES = [
  'vite.config.ts',
  'vitest.config.ts',
  'drizzle.config.ts',
  'tailwind.config.ts',
  'playwright.config.ts',
  'eslint.config.js',
  'postcss.config.js',
];

// ---------------------------------------------------------------------------
// Trusted frozen exception manifest — the pre-existing dead exports found when
// this gate was introduced (task #374), as "<repo-relative file>#<symbol>".
// The JSON allowlist may only ever name a SUBSET of these; anything else is a
// new pin / substitution and FAILS. This list must only ever SHRINK (remove a
// line when the export is deleted, un-exported, or wired up).
//
// Task #392 swept the resolvable ones (110 → 53): every helper, constant and
// schema that was only used inside its own module lost the `export` keyword,
// and everything with no reference anywhere was deleted. What is left is two
// categories, both deliberate:
//   · vendored shadcn/ui primitive families — generated files where the whole
//     upstream primitive set ships together. These are pinned PERMANENTLY, not
//     pending: trimming them fights the next `shadcn add`, and Rollup
//     tree-shakes them out of the bundle anyway. That decision is written down
//     once in docs/COMPONENT-LIBRARY.md ("Vendored surface: keep it whole") —
//     a sweep should leave them alone rather than re-deciding. The exemption
//     covers CLI-generated files only, NOT the app composites that share the
//     ui/ folder;
//   · the three GA4 conversion senders in client/src/lib/analytics.ts, whose
//     callers disappeared in the Clerk auth migration. Re-wiring them is
//     instrumentation work (task #393), not dead-code cleanup.
// The analytics helpers this GATE was filed over are NOT here: they were
// deleted (see docs/ANALYTICS.md), which is what every new finding must do.
// ---------------------------------------------------------------------------
const FROZEN_EXCEPTIONS = new Set([
  'client/src/components/ui/alert-dialog.tsx#AlertDialogOverlay',
  'client/src/components/ui/alert-dialog.tsx#AlertDialogPortal',
  'client/src/components/ui/badge.tsx#badgeVariants',
  'client/src/components/ui/breadcrumb.tsx#BreadcrumbEllipsis',
  'client/src/components/ui/command.tsx#CommandDialog',
  'client/src/components/ui/command.tsx#CommandEmpty',
  'client/src/components/ui/command.tsx#CommandSeparator',
  'client/src/components/ui/command.tsx#CommandShortcut',
  'client/src/components/ui/dialog.tsx#DialogClose',
  'client/src/components/ui/dialog.tsx#DialogOverlay',
  'client/src/components/ui/dialog.tsx#DialogPortal',
  'client/src/components/ui/dialog.tsx#DialogTrigger',
  'client/src/components/ui/dropdown-menu.tsx#DropdownMenuCheckboxItem',
  'client/src/components/ui/dropdown-menu.tsx#DropdownMenuGroup',
  'client/src/components/ui/dropdown-menu.tsx#DropdownMenuPortal',
  'client/src/components/ui/dropdown-menu.tsx#DropdownMenuRadioGroup',
  'client/src/components/ui/dropdown-menu.tsx#DropdownMenuRadioItem',
  'client/src/components/ui/dropdown-menu.tsx#DropdownMenuShortcut',
  'client/src/components/ui/dropdown-menu.tsx#DropdownMenuSub',
  'client/src/components/ui/dropdown-menu.tsx#DropdownMenuSubContent',
  'client/src/components/ui/dropdown-menu.tsx#DropdownMenuSubTrigger',
  'client/src/components/ui/form.tsx#useFormField',
  'client/src/components/ui/scroll-area.tsx#ScrollBar',
  'client/src/components/ui/select.tsx#SelectGroup',
  'client/src/components/ui/select.tsx#SelectLabel',
  'client/src/components/ui/select.tsx#SelectScrollDownButton',
  'client/src/components/ui/select.tsx#SelectScrollUpButton',
  'client/src/components/ui/select.tsx#SelectSeparator',
  'client/src/components/ui/sheet.tsx#SheetClose',
  'client/src/components/ui/sheet.tsx#SheetFooter',
  'client/src/components/ui/sheet.tsx#SheetOverlay',
  'client/src/components/ui/sheet.tsx#SheetPortal',
  'client/src/components/ui/sidebar.tsx#SidebarGroup',
  'client/src/components/ui/sidebar.tsx#SidebarGroupAction',
  'client/src/components/ui/sidebar.tsx#SidebarGroupContent',
  'client/src/components/ui/sidebar.tsx#SidebarGroupLabel',
  'client/src/components/ui/sidebar.tsx#SidebarInput',
  'client/src/components/ui/sidebar.tsx#SidebarMenuAction',
  'client/src/components/ui/sidebar.tsx#SidebarMenuBadge',
  'client/src/components/ui/sidebar.tsx#SidebarMenuSkeleton',
  'client/src/components/ui/sidebar.tsx#SidebarMenuSub',
  'client/src/components/ui/sidebar.tsx#SidebarMenuSubButton',
  'client/src/components/ui/sidebar.tsx#SidebarMenuSubItem',
  'client/src/components/ui/sidebar.tsx#SidebarRail',
  'client/src/components/ui/sidebar.tsx#SidebarSeparator',
  'client/src/components/ui/table.tsx#TableCaption',
  'client/src/components/ui/table.tsx#TableFooter',
  'client/src/components/ui/toggle.tsx#Toggle',
  'client/src/hooks/use-toast.ts#reducer',
  'client/src/hooks/use-toast.ts#toast',
  'client/src/lib/analytics.ts#trackCategoryView',
  'client/src/lib/analytics.ts#trackLogin',
  'client/src/lib/analytics.ts#trackSignUp',
]);

// Entries in the JSON allowlist that are NOT part of the frozen manifest —
// attempted new pins or substitutions. Shared by gate mode and the canaries so
// the contract can never drift from what is tested.
function allowlistViolations(entryKeys, frozen) {
  return entryKeys.filter((k) => !frozen.has(k)).sort();
}

// ---------------------------------------------------------------------------
// Parsing — exports, imports, and whole-module consumers of one module.
// ---------------------------------------------------------------------------
function scriptKindOf(abs) {
  const ext = path.extname(abs);
  if (ext === '.tsx') return ts.ScriptKind.TSX;
  if (ext === '.jsx') return ts.ScriptKind.JSX;
  if (ext === '.js' || ext === '.mjs' || ext === '.cjs') return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

function bindingNames(name, out) {
  if (ts.isIdentifier(name)) out.push(name.text);
  else if (ts.isObjectBindingPattern(name) || ts.isArrayBindingPattern(name)) {
    for (const el of name.elements) if (ts.isBindingElement(el)) bindingNames(el.name, out);
  }
}

const hasModifier = (node, kind) => (node.modifiers ?? []).some((m) => m.kind === kind);

function parseHtml(content) {
  const wholeUses = [...content.matchAll(/\bsrc=["'](\/src\/[^"'\n]+)["']/g)].map((m) => m[1]);
  return { exports: new Map(), stars: [], symbolUses: [], wholeUses, exportEquals: false };
}

export function parseModule(abs, content) {
  const sf = ts.createSourceFile(abs, content, ts.ScriptTarget.Latest, true, scriptKindOf(abs));
  const exportsMap = new Map();
  const stars = [];
  const symbolUses = [];
  const wholeUses = [];
  let exportEquals = false;

  const lineOf = (node) => sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
  const addExport = (name, info) => exportsMap.set(name, { localName: name, ...info });

  for (const stmt of sf.statements) {
    // import … from "spec"
    if (ts.isImportDeclaration(stmt) && ts.isStringLiteral(stmt.moduleSpecifier)) {
      const spec = stmt.moduleSpecifier.text;
      const clause = stmt.importClause;
      if (!clause) continue; // side-effect import: keeps the FILE alive, uses no symbol
      if (clause.name) symbolUses.push({ spec, name: 'default' });
      const bindings = clause.namedBindings;
      if (bindings) {
        if (ts.isNamespaceImport(bindings)) wholeUses.push(spec);
        else for (const el of bindings.elements) symbolUses.push({ spec, name: (el.propertyName ?? el.name).text });
      }
      continue;
    }
    // import x = require("spec")
    if (ts.isImportEqualsDeclaration(stmt)) {
      const ref = stmt.moduleReference;
      if (ts.isExternalModuleReference(ref) && ts.isStringLiteral(ref.expression)) wholeUses.push(ref.expression.text);
      continue;
    }
    if (ts.isExportDeclaration(stmt)) {
      const spec = stmt.moduleSpecifier && ts.isStringLiteral(stmt.moduleSpecifier) ? stmt.moduleSpecifier.text : null;
      const clause = stmt.exportClause;
      if (spec && !clause) { stars.push(spec); continue; } // export * from "spec"
      if (clause && ts.isNamespaceExport(clause)) {
        // export * as ns from "spec" — the namespace object can be indexed, so
        // the origin is consumed wholesale.
        addExport(clause.name.text, { typeOnly: !!stmt.isTypeOnly, local: false, line: lineOf(stmt) });
        if (spec) wholeUses.push(spec);
        continue;
      }
      if (clause && ts.isNamedExports(clause)) {
        for (const el of clause.elements) {
          const exported = el.name.text;
          const source = (el.propertyName ?? el.name).text;
          addExport(exported, {
            typeOnly: !!stmt.isTypeOnly || !!el.isTypeOnly,
            local: !spec,
            localName: source,
            fromSpec: spec ?? undefined,
            fromName: spec ? source : undefined,
            line: lineOf(stmt),
          });
        }
      }
      continue;
    }
    if (ts.isExportAssignment(stmt)) {
      // `export = x` has no named surface at all; `export default expr` does.
      if (stmt.isExportEquals) exportEquals = true;
      else addExport('default', { typeOnly: false, local: true, line: lineOf(stmt) });
      continue;
    }
    if (!hasModifier(stmt, ts.SyntaxKind.ExportKeyword)) continue;
    const isDefault = hasModifier(stmt, ts.SyntaxKind.DefaultKeyword);
    if (ts.isFunctionDeclaration(stmt) || ts.isClassDeclaration(stmt)) {
      const name = isDefault ? 'default' : stmt.name?.text;
      if (name) addExport(name, { typeOnly: false, local: true, localName: stmt.name?.text ?? name, line: lineOf(stmt) });
    } else if (ts.isVariableStatement(stmt)) {
      const names = [];
      for (const decl of stmt.declarationList.declarations) bindingNames(decl.name, names);
      for (const name of names) addExport(name, { typeOnly: false, local: true, line: lineOf(stmt) });
    } else if (ts.isInterfaceDeclaration(stmt) || ts.isTypeAliasDeclaration(stmt)) {
      addExport(stmt.name.text, { typeOnly: true, local: true, line: lineOf(stmt) });
    } else if (ts.isEnumDeclaration(stmt)) {
      addExport(stmt.name.text, { typeOnly: false, local: true, line: lineOf(stmt) });
    } else if (ts.isModuleDeclaration(stmt) && stmt.name && ts.isIdentifier(stmt.name)) {
      addExport(stmt.name.text, { typeOnly: false, local: true, line: lineOf(stmt) });
    }
  }

  // Whole-module consumers + in-file identifier census (the census tells a
  // "nothing references this at all" export apart from one that is merely
  // over-exported: used inside its own module, so only `export` is dead).
  const identifierCounts = new Map();
  const visit = (node) => {
    if (ts.isIdentifier(node)) identifierCounts.set(node.text, (identifierCounts.get(node.text) ?? 0) + 1);
    if (ts.isCallExpression(node)) {
      const arg = node.arguments[0];
      const literal = arg && ts.isStringLiteral(arg) ? arg.text : null;
      if (literal !== null) {
        const callee = node.expression;
        if (callee.kind === ts.SyntaxKind.ImportKeyword) wholeUses.push(literal);
        else if (ts.isIdentifier(callee) && callee.text === 'require') wholeUses.push(literal);
        else if (ts.isPropertyAccessExpression(callee) && callee.name.text === 'ssrLoadModule') wholeUses.push(literal);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);

  for (const info of exportsMap.values()) {
    // Subtract the declaration's own name occurrence.
    info.internalRefs = Math.max(0, (identifierCounts.get(info.localName) ?? 0) - 1);
  }

  return { exports: exportsMap, stars, symbolUses, wholeUses, exportEquals };
}

// ---------------------------------------------------------------------------
// Symbol graph. Pure over a Map<absPath, content> so canaries can drive it with
// synthetic modules through exactly the same code path as the real run.
// ---------------------------------------------------------------------------
export function analyze(sources, exists = fs.existsSync) {
  const files = new Set(sources.keys());
  const mods = new Map();
  for (const [abs, content] of sources) {
    mods.set(abs, path.extname(abs) === '.html' ? parseHtml(content) : parseModule(abs, content));
  }

  const usedSymbols = new Map(); // abs -> Set<exported name>
  const wholeUsed = new Set();
  const unresolved = []; // { importer, spec }
  const resolve = (spec, importer) => resolveSpecifier(spec, importer, files, exists);

  const markSymbol = (abs, name, seen) => {
    const key = `${abs}\u0000${name}`;
    if (seen.has(key)) return;
    seen.add(key);
    let set = usedSymbols.get(abs);
    if (!set) { set = new Set(); usedSymbols.set(abs, set); }
    set.add(name);
    const mod = mods.get(abs);
    if (!mod) return;
    const entry = mod.exports.get(name);
    if (entry?.fromSpec) {
      // Re-export: follow through to wherever the symbol is really defined.
      const target = resolve(entry.fromSpec, abs);
      if (target.kind === 'file') markSymbol(target.abs, entry.fromName, seen);
      return;
    }
    if (!entry) {
      // Not declared here — it may arrive through `export * from`.
      for (const spec of mod.stars) {
        const target = resolve(spec, abs);
        if (target.kind === 'file') markSymbol(target.abs, name, seen);
      }
    }
  };

  const markWhole = (abs, seen) => {
    if (seen.has(abs)) return;
    seen.add(abs);
    wholeUsed.add(abs);
    const mod = mods.get(abs);
    if (!mod) return;
    // A namespace/dynamic consumer can reach anything the module re-exports,
    // so every origin behind those forwards counts as used too.
    for (const entry of mod.exports.values()) {
      if (!entry.fromSpec) continue;
      const target = resolve(entry.fromSpec, abs);
      if (target.kind === 'file') markSymbol(target.abs, entry.fromName, new Set());
    }
    for (const spec of mod.stars) {
      const target = resolve(spec, abs);
      if (target.kind === 'file') markWhole(target.abs, seen);
    }
  };

  for (const [abs, mod] of mods) {
    for (const use of mod.symbolUses) {
      const target = resolve(use.spec, abs);
      if (target.kind === 'file') markSymbol(target.abs, use.name, new Set());
      else if (target.kind === 'unresolved') unresolved.push({ importer: abs, spec: use.spec });
    }
    for (const spec of mod.wholeUses) {
      const target = resolve(spec, abs);
      if (target.kind === 'file') markWhole(target.abs, new Set());
      else if (target.kind === 'unresolved') unresolved.push({ importer: abs, spec });
    }
    if (mod.exportEquals) markWhole(abs, new Set());
  }

  return { files, mods, usedSymbols, wholeUsed, unresolved };
}

// Exports of CHECKED modules that no other module imports.
export function deadExports({ mods, usedSymbols, wholeUsed }, isChecked, includeTypes = false) {
  const rows = [];
  for (const [abs, mod] of mods) {
    if (!isChecked(abs)) continue;
    if (wholeUsed.has(abs)) continue; // consumed opaquely — per-symbol claims would be lies
    const used = usedSymbols.get(abs) ?? new Set();
    for (const [name, info] of mod.exports) {
      if (info.typeOnly && !includeTypes) continue;
      if (used.has(name)) continue;
      rows.push({
        abs,
        name,
        line: info.line,
        typeOnly: !!info.typeOnly,
        reexport: !info.local,
        internalRefs: info.internalRefs ?? 0,
      });
    }
  }
  rows.sort((a, b) => (a.abs === b.abs ? a.name.localeCompare(b.name) : a.abs.localeCompare(b.abs)));
  return rows;
}

// ---------------------------------------------------------------------------
// Canaries — synthetic modules through the real analyze()/deadExports() path.
// ---------------------------------------------------------------------------
function runCanaries() {
  const eq = (a, b, what) => {
    const ja = JSON.stringify(a), jb = JSON.stringify(b);
    if (ja !== jb) throw new Error(`canary: ${what} → ${ja}, expected ${jb}`);
  };
  const V = '/virtual';
  const p = (rel) => path.join(V, rel);
  const isChecked = (abs) => abs.startsWith(V + path.sep) && CODE_EXTS.includes(path.extname(abs));
  // Nothing in the synthetic set exists on disk: force the resolver to answer
  // from the synthetic file set alone.
  const run = (files, includeTypes = false) => {
    const analysis = analyze(new Map(Object.entries(files).map(([rel, src]) => [p(rel), src])), () => false);
    return {
      dead: deadExports(analysis, isChecked, includeTypes).map((r) => `${path.relative(V, r.abs)}#${r.name}`),
      analysis,
    };
  };

  // Export-form extraction: every shape the repo actually uses.
  eq(
    [...parseModule(p('forms.ts'), [
      'export const a = 1, b = 2;',
      'export const { c } = obj;',
      'export function d() {}',
      'export async function e() {}',
      'export class F {}',
      'export default function g() {}',
      'export type H = string;',
      'export interface I {}',
      'export enum J { K }',
      'const l = 1; export { l as m };',
    ].join('\n')).exports.keys()].sort(),
    ['F', 'H', 'I', 'J', 'a', 'b', 'c', 'd', 'default', 'e', 'm'].sort(),
    'export-form extraction',
  );

  // A named import marks ONLY that symbol; its siblings stay dead.
  eq(run({
    'lib.ts': 'export const alive = 1;\nexport const dead = 2;',
    'app.ts': 'import { alive } from "./lib";\nconsole.log(alive);',
  }).dead, ['lib.ts#dead'], 'named import marks one symbol');

  // Default import.
  eq(run({
    'page.tsx': 'export default function Page() { return null; }\nexport const helper = 1;',
    'app.ts': 'import Page from "./page";\nconsole.log(Page);',
  }).dead, ['page.tsx#helper'], 'default import marks `default` only');

  // Aliased import uses the SOURCE name, not the local alias.
  eq(run({
    'lib.ts': 'export const source = 1;\nexport const alias = 2;',
    'app.ts': 'import { source as alias } from "./lib";\nconsole.log(alias);',
  }).dead, ['lib.ts#alias'], 'aliased import resolves to the source name');

  // Namespace import consumes the module wholesale (dynamic indexing).
  eq(run({
    'analytics.ts': 'export const one = 1;\nexport const two = 2;',
    'app.ts': 'import * as analytics from "./analytics";\nanalytics.one();',
  }).dead, [], 'namespace import keeps every export alive');

  // Re-export chains are FOLLOWED, not counted as uses.
  eq(run({
    'origin.ts': 'export const used = 1;\nexport const unused = 2;',
    'barrel.ts': 'export { used } from "./origin";\nexport { unused } from "./origin";',
    'app.ts': 'import { used } from "./barrel";\nconsole.log(used);',
  }).dead, ['barrel.ts#unused', 'origin.ts#unused'], 're-export chain followed to the origin');

  // A barrel nobody reads does not keep its origin alive.
  eq(run({
    'origin.ts': 'export const x = 1;',
    'barrel.ts': 'export { x } from "./origin";',
    'app.ts': 'import "./barrel";',
  }).dead, ['barrel.ts#x', 'origin.ts#x'], 'unread barrel entry leaves the origin dead');

  // `export * from` — a use through the star reaches the origin…
  eq(run({
    'values.ts': 'export const starred = 1;\nexport const alsoDead = 2;',
    'barrel.ts': 'export * from "./values";\nexport const own = 3;',
    'app.ts': 'import { starred } from "./barrel";\nconsole.log(starred);',
  }).dead, ['barrel.ts#own', 'values.ts#alsoDead'], 'export * forwards a use to the origin');

  // …and a namespace import of the barrel keeps the starred origin alive.
  eq(run({
    'values.ts': 'export const a = 1;',
    'barrel.ts': 'export * from "./values";',
    'app.ts': 'import * as all from "./barrel";\nconsole.log(all);',
  }).dead, [], 'namespace import through export * keeps origins alive');

  // Type-only exports: tracked, consumed by type-only imports, never reported.
  eq(run({
    'types.ts': 'export type Used = string;\nexport type Unused = number;\nexport interface Shape {}\nexport const value = 1;',
    'app.ts': 'import type { Used } from "./types";\nimport { type Shape, value } from "./types";\nconsole.log(value);',
  }).dead, [], 'type-only exports are not reported');
  eq(run({
    'types.ts': 'export type Used = string;\nexport type Unused = number;',
    'app.ts': 'import type { Used } from "./types";',
  }, true).dead, ['types.ts#Unused'], '--types surfaces unused type exports');
  eq(run({
    'types.ts': 'export type T = string;\nexport const v = 1;',
    'app.ts': 'import type { T } from "./types";',
  }).dead, ['types.ts#v'], 'a type-only import does not keep values alive');

  // Whole-module consumers that cannot be attributed to one name.
  eq(run({
    'lazy.tsx': 'export default function P() { return null; }\nexport const side = 1;',
    'app.ts': 'const P = lazy(() => import("./lazy"));',
  }).dead, [], 'dynamic import consumes the module wholesale');
  eq(run({
    'cjs.ts': 'export const a = 1;',
    'app.ts': 'const m = require("./cjs");',
  }).dead, [], 'require consumes the module wholesale');
  eq(run({
    'entry-server.tsx': 'export function render() {}',
    'ssr.ts': 'await vite.ssrLoadModule("./entry-server");',
  }).dead, [], 'ssrLoadModule consumes the module wholesale');
  eq(parseModule(p('ssr.ts'), 'await vite.ssrLoadModule("/src/entry-server.tsx");').wholeUses,
    ['/src/entry-server.tsx'], 'root-relative ssrLoadModule specifier extracted');

  // A symbol used only inside its own module is still dead — with the hint
  // that distinguishes "drop the export keyword" from "delete it".
  {
    const analysis = analyze(new Map([[p('lib.ts'), 'export const internal = 1;\nexport const orphan = 2;\nexport function use() { return internal; }'], [p('app.ts'), 'import { use } from "./lib";\nuse();']]), () => false);
    const rows = deadExports(analysis, isChecked);
    eq(rows.map((r) => `${r.name}:${r.internalRefs}`), ['internal:1', 'orphan:0'], 'in-file reference census');
  }

  // Side-effect imports keep a FILE alive (the file gate's business) but use no
  // symbol, so they must not mask a dead export.
  eq(run({
    'lib.ts': 'export const x = 1;',
    'app.ts': 'import "./lib";',
  }).dead, ['lib.ts#x'], 'side-effect import is not a symbol use');

  // html entry (<script src="/src/main.tsx">) → whole module.
  {
    const sources = new Map([
      [path.join(V, 'client/index.html'), '<script type="module" src="/src/main.tsx"></script>'],
      [path.join(V, 'client/src/main.tsx'), 'export const boot = 1;'],
    ]);
    // Root-relative /src/… resolves against the real vite root, so this canary
    // only asserts extraction of the html edge itself.
    eq(analyze(sources, () => false).mods.get(path.join(V, 'client/index.html')).wholeUses, ['/src/main.tsx'], 'html script src extracted');
  }

  // Unresolved specifiers: only ones pointing INTO the checked scope can hide a
  // use there, and those must fail loudly.
  eq(unresolvedTargetsScope('@/lib/typo', path.join(ROOT, 'client/src/app.tsx')), true, 'alias typo targets scope');
  eq(unresolvedTargetsScope('@shared/typo', path.join(ROOT, 'server/routes.ts')), true, '@shared typo targets scope');
  eq(unresolvedTargetsScope('../../shared/typo', path.join(ROOT, 'tests/unit/a.test.ts')), true, 'relative typo into shared targets scope');
  eq(unresolvedTargetsScope('../server/gone', path.join(ROOT, 'scripts/archive/x.ts')), false, 'broken server path is out of scope');
  eq(unresolvedTargetsScope('some-package', path.join(ROOT, 'client/src/app.tsx')), false, 'bare specifier is not a scope target');

  // Shrink-only allowlist contract (same shape as the file gate).
  const frozen = new Set(['client/src/lib/a.ts#legacyOne', 'client/src/lib/a.ts#legacyTwo']);
  eq(allowlistViolations(['client/src/lib/a.ts#legacyOne', 'client/src/lib/b.ts#brandNew'], frozen),
    ['client/src/lib/b.ts#brandNew'], 'attempted NEW exception is rejected');
  eq(allowlistViolations(['client/src/lib/a.ts#swappedIn'], frozen),
    ['client/src/lib/a.ts#swappedIn'], 'REPLACED exception (swap for a removed pin) is rejected');
  eq(allowlistViolations(['client/src/lib/a.ts#legacyOne'], frozen), [], 'subset after removal is allowed');
  eq(allowlistViolations([], frozen), [], 'empty allowlist is allowed');
}

// ---------------------------------------------------------------------------
// Run.
// ---------------------------------------------------------------------------
runCanaries();
console.log('PASS canaries :: export/import extraction + re-export & star following + namespace/dynamic whole-module uses + allowlist contract verified against synthetic modules');

if (!fs.existsSync(ALLOWLIST_PATH)) {
  console.error('FAIL :: allowlist missing — create scripts/validation/dead-exports-allowlist.json ({"exceptions": []})');
  process.exit(1);
}
const allowlist = JSON.parse(fs.readFileSync(ALLOWLIST_PATH, 'utf8'));
const exceptions = new Map(
  (allowlist.exceptions ?? []).map((e) => [`${e.file}#${e.symbol}`, e.reason ?? '']),
);
const frozenViolations = allowlistViolations([...exceptions.keys()], FROZEN_EXCEPTIONS);

const sources = new Map();
for (const dir of USAGE_DIRS) {
  const abs = path.join(ROOT, dir);
  if (fs.existsSync(abs)) for (const f of walk(abs)) sources.set(f, fs.readFileSync(f, 'utf8'));
}
for (const rel of USAGE_FILES) {
  const abs = path.join(ROOT, rel);
  if (fs.existsSync(abs) && SCAN_EXTS.has(path.extname(abs))) sources.set(abs, fs.readFileSync(abs, 'utf8'));
}

const analysis = analyze(sources);
const isChecked = (abs) => CODE_EXTS.includes(path.extname(abs)) && inScope(relOf(abs));
const checkedModules = [...analysis.mods.keys()].filter(isChecked);
if (!checkedModules.length) {
  console.error(`FAIL :: no modules found under ${SCOPE_RELS.join(' + ')} — the source layout moved; update this gate.`);
  process.exit(1);
}

const dead = deadExports(analysis, isChecked, WITH_TYPES).map((row) => ({ ...row, key: `${relOf(row.abs)}#${row.name}` }));

if (LIST || WITH_TYPES) {
  const exportCount = checkedModules.reduce((n, abs) => n + analysis.mods.get(abs).exports.size, 0);
  console.log(`checked modules: ${checkedModules.length}, exported symbols: ${exportCount}, whole-module-consumed modules: ${analysis.wholeUsed.size}`);
  let current = null;
  for (const row of dead) {
    const rel = relOf(row.abs);
    if (rel !== current) { console.log(`  ${rel}`); current = rel; }
    const tags = [row.typeOnly ? 'type' : null, row.reexport ? 're-export' : null, row.internalRefs ? `${row.internalRefs} in-file ref(s)` : 'no in-file refs']
      .filter(Boolean).join(', ');
    console.log(`    ${row.name}  (line ${row.line}; ${tags})${exceptions.has(`${rel}#${row.name}`) ? ' [pinned]' : ''}`);
  }
}

let failures = 0;

for (const key of frozenViolations) {
  console.error(`FAIL allowlist-growth :: ${key} is not in the frozen exception manifest — the allowlist`);
  console.error('       only ever SHRINKS. New dead exports must be fixed or deleted, never pinned.');
  exceptions.delete(key); // it must not excuse a dead export below
  failures++;
}

// A typo'd path into client/src or shared could hide a real use of a symbol
// there, so it must never silently mark that symbol dead.
const unresolvedInScope = analysis.unresolved.filter((u) => unresolvedTargetsScope(u.spec, u.importer));
for (const u of unresolvedInScope) {
  console.error(`FAIL unresolved-import :: ${relOf(u.importer)} imports "${u.spec}" which resolves to nothing inside the checked scope`);
  failures++;
}

const newlyDead = dead.filter((row) => !exceptions.has(row.key));
for (const row of newlyDead) {
  const hint = row.internalRefs
    ? `used ${row.internalRefs}× inside its own module — drop the \`export\` keyword`
    : 'no references anywhere — delete it (git keeps history) or wire it up';
  console.error(`FAIL dead-export :: ${row.key} (line ${row.line}) is exported but no other module imports it — ${hint}`);
  failures++;
}
if (newlyDead.length) {
  console.error('       No import anywhere in client/, server/, shared/, scripts/ or tests/ names these symbols,');
  console.error('       yet every typecheck, bundle, and styling sweep still pays for them. They can NOT be');
  console.error('       pinned: the allowlist universe is frozen at gate introduction and only ever shrinks.');
}

for (const [key, reason] of exceptions) {
  const [rel, name] = key.split('#');
  const abs = path.join(ROOT, rel);
  const mod = analysis.mods.get(abs);
  if (!mod || !mod.exports.has(name)) {
    console.error(`FAIL stale-allowlist :: ${key} is pinned but is no longer exported — remove the entry`);
    failures++;
  } else if (!dead.some((row) => row.key === key)) {
    console.error(`FAIL stale-allowlist :: ${key} is pinned as dead but is imported again — remove the entry (reason was: ${reason})`);
    failures++;
  }
}

if (failures) {
  console.error(`\n${failures} dead-export failure(s).`);
  process.exit(1);
}

const exportCount = checkedModules.reduce((n, abs) => n + analysis.mods.get(abs).exports.size, 0);
console.log(
  `PASS dead-exports :: ${exportCount} export(s) across ${checkedModules.length} module(s) in ${SCOPE_RELS.join(' + ')} checked, ` +
  `${exportCount - dead.length} imported elsewhere, ${dead.length} pinned exception(s)`,
);

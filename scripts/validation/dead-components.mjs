#!/usr/bin/env node
// Dead-code gate (task #365; scope widened past components/ in task #370).
//
// Task 362 found five components under client/src/components/ui/ that nothing
// imported — yet every design-system sweep, typecheck, and styling gate kept
// scanning (and task 357 even restyled) screens no user can ever see. Nothing
// in the validation suite noticed when a component lost its last importer.
//
// This gate builds the real module-reachability graph and fails when any file
// in the checked scope becomes unreachable from the app's execution roots:
//   · client/index.html            (script src="/src/main.tsx" — the SPA)
//   · every file under server/     (og-middleware, ssr-dev's
//                                    ssrLoadModule('/src/entry-server.tsx'), …)
//
// The checked scope is the whole front-end + shared module surface — all of
// client/src/ (components, pages, hooks, lib, types, config, …) and shared/ —
// not just components/: the graph always knew about a dead page or helper, it
// simply never reported one, so unused pages/hooks/lib modules kept costing
// every typecheck and audit. Widening it (task #370) exposed five pre-existing
// dead hooks/lib files, all deleted in that same change rather than pinned.
//
// Deliberately OUT of scope:
//   · server/    — every server file is itself a root, so "unreachable" can
//                  never happen there and would be meaningless if it did.
//   · *.d.ts     — ambient declarations are pulled in by tsc through tsconfig
//                  "include", never by an import edge, so having no importer
//                  is their normal state (client/env.d.ts also sits outside
//                  client/src/ and is skipped by the prefix alone).
//   · non-code assets (.css/.svg/.json) — not walked as modules at all.
// The script file and its registered workflow keep the historical
// "dead-components" name so the validation registration stays stable.
//
// Reachability — not "who greps for the filename" — is the identity, so a
// CLUSTER of components that only import each other is correctly flagged the
// moment the last outside importer disappears (a naive "is it imported by
// anything?" scan would let mutually-referencing dead files keep each other
// alive forever).
//
// Edges recognized (extraction is content-wide, so multi-line imports work):
//   · static:       import X from "spec" / import { A,\n B } from "spec"
//   · side-effect:  import "spec"
//   · re-export:    export { A } from "spec" / export * from "spec"
//   · dynamic:      import("spec")           (React.lazy route splits)
//   · CJS/tooling:  require("spec")
//   · vite SSR:     ssrLoadModule("/src/…")  (root-relative → client/<spec>)
// Specifiers resolved: relative ./ ../, alias @/ → client/src, @shared/ →
// shared/, root-relative /src/ → client/src (index.html + ssrLoadModule).
// Bare package specifiers and variable dynamic imports are ignored. Unresolved
// non-bare specifiers are conservatively reported as a FAIL (a typo'd path
// must never silently mark its target dead).
//
// Comments are stripped before extraction (JSDoc usage examples in
// server/middleware/*, server/repositories/* literally spell out
// `import { x } from './wrong/relative/path'` and would otherwise trip the
// unresolved-import check). After stripping, the remaining false-positive
// direction is chosen deliberately: an import inside a string literal can only
// make a file look MORE alive, never dead — the gate errs toward silence, and
// a real dead file has no importers anywhere.
//
// Intentional exceptions are pinned in dead-components-allowlist.json
// ({ file, reason } entries), and the exception UNIVERSE is mechanically
// shrink-only: FROZEN_EXCEPTIONS below is the trusted manifest of pre-existing
// dead files found when the gate was introduced (task #365) — originally 22,
// all deleted in the task #369 sweep, so the universe is now empty and the
// task #370 widening deliberately left it empty (the five files it exposed
// were deleted, not pinned).
// The JSON allowlist may only ever be a SUBSET of that frozen set — an entry
// naming any other path (a new pin, or a substitution swapped in for a
// removed one) fails the gate, so a newly dead file can never be
// laundered into the allowlist in the same change that killed it. Growing
// the universe requires editing THIS script's manifest, which is a visible,
// out-of-band act (the same trust boundary as palette-drift's diff logic
// living in its gate script).
//
// The allowlist is honest in every direction:
//   · a dead file NOT in the allowlist                 → FAIL (new dead code —
//     delete the file; it cannot be pinned)
//   · an allowlist entry outside the frozen manifest   → FAIL (attempted new
//     pin or substitution)
//   · an allowlist entry that is reachable again       → FAIL (stale pin —
//     remove it so the exception can't outlive its reason)
//   · an allowlist entry whose file no longer exists   → FAIL (stale pin)
// Removing entries (after deleting the dead file) is the only allowed edit.
//
// Detector canaries run on every invocation: import extraction (static,
// multi-line, side-effect, re-export, dynamic, require, ssrLoadModule),
// specifier resolution (alias / index / extension / root-relative), the
// checked-scope predicate (pages/hooks/lib/shared in, server/ and *.d.ts out),
// and BFS reachability incl. the mutually-referencing dead-cluster case are
// asserted against synthetic samples first, so a detector regression can never
// pass vacuously.
//
// Usage:
//   node scripts/validation/dead-components.mjs           # gate mode
//   node scripts/validation/dead-components.mjs --list    # dump full graph stats
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CLIENT = path.join(ROOT, 'client');
const CLIENT_SRC = path.join(CLIENT, 'src');
const SERVER = path.join(ROOT, 'server');
const SHARED = path.join(ROOT, 'shared');
// Checked scope (task #370): every front-end and shared module, not just
// components/. server/ is excluded because each of its files is a root.
const SCOPE_RELS = ['client/src/', 'shared/'];
const ALLOWLIST_PATH = path.join(ROOT, 'scripts/validation/dead-components-allowlist.json');
const LIST = process.argv.includes('--list');

const CODE_EXTS = ['.tsx', '.ts', '.jsx', '.js', '.mjs', '.cjs'];
const SCAN_EXTS = new Set([...CODE_EXTS, '.html']);

// Is this repo-relative path (posix separators) part of the checked scope?
// *.d.ts is exempt everywhere: ambient declarations are loaded by tsc through
// tsconfig "include" and legitimately have no importer, so flagging them would
// be a permanent false positive.
function inScope(rel) {
  if (rel.endsWith('.d.ts')) return false;
  return SCOPE_RELS.some((prefix) => rel.startsWith(prefix));
}

// ---------------------------------------------------------------------------
// Trusted frozen exception manifest — the 22 pre-existing dead files found at
// gate introduction (task #365). The JSON allowlist may only ever name a
// SUBSET of these paths; anything else is a new pin / substitution and FAILS.
// This list must only ever SHRINK (remove a line when its file is deleted).
// ---------------------------------------------------------------------------
// All 22 original entries were deleted in the task #369 sweep — the universe
// is now EMPTY, so no allowlist entry can ever excuse a dead file again.
// Widening the checked scope (task #370) exposed five more pre-existing dead
// files (four hooks + one lib module); they were DELETED in that change rather
// than added here, so the manifest stayed empty.
const FROZEN_EXCEPTIONS = new Set([]);

// Entries in the JSON allowlist that are NOT part of the frozen manifest —
// attempted new pins or substitutions. Shared by gate mode and the canaries
// so the contract can never drift from what is tested.
function allowlistViolations(entryFiles, frozen) {
  return entryFiles.filter((f) => !frozen.has(f)).sort();
}

// ---------------------------------------------------------------------------
// Import extraction — content-wide regexes so multi-line imports are caught.
// ---------------------------------------------------------------------------
const EDGE_RES = [
  // import … from "spec" / export … from "spec" (incl. export * from, type imports)
  /(?:\bimport|\bexport)\s[^"'`;]*?\bfrom\s*["']([^"'\n]+)["']/g,
  // side-effect import "spec"
  /\bimport\s*["']([^"'\n]+)["']/g,
  // dynamic import("spec")
  /\bimport\s*\(\s*["']([^"'\n]+)["']\s*\)/g,
  // require("spec")
  /\brequire\s*\(\s*["']([^"'\n]+)["']\s*\)/g,
  // vite ssrLoadModule("/src/…")
  /\bssrLoadModule\s*\(\s*["']([^"'\n]+)["']\s*\)/g,
  // index.html <script src="/src/main.tsx">
  /\bsrc=["'](\/src\/[^"'\n]+)["']/g,
];

// Minimal lexer: removes // and /* */ comments while respecting ' " ` string
// literals (so a URL's "//" inside a string never truncates a line, and a
// JSDoc usage example never registers as a real import edge). Template
// literals are treated as opaque; ${} interpolation is rare in import-bearing
// positions and an over-opaque template only errs toward "alive".
function stripComments(src) {
  let out = '';
  let i = 0;
  const n = src.length;
  let mode = null; // null | "'" | '"' | '`' | '//' | '/*'
  while (i < n) {
    const c = src[i];
    const d = src[i + 1];
    if (mode === null) {
      if (c === '/' && d === '/') { mode = '//'; i += 2; continue; }
      if (c === '/' && d === '*') { mode = '/*'; i += 2; continue; }
      if (c === "'" || c === '"' || c === '`') mode = c;
      out += c; i++; continue;
    }
    if (mode === '//') {
      if (c === '\n') { mode = null; out += c; }
      i++; continue;
    }
    if (mode === '/*') {
      if (c === '*' && d === '/') { mode = null; i += 2; continue; }
      if (c === '\n') out += c; // keep line structure for readable offsets
      i++; continue;
    }
    // inside a string literal
    if (c === '\\') { out += c + (d ?? ''); i += 2; continue; }
    if (c === mode) mode = null;
    out += c; i++;
  }
  return out;
}

function extractSpecifiers(content) {
  const stripped = stripComments(content);
  const specs = new Set();
  for (const re of EDGE_RES) {
    re.lastIndex = 0;
    for (const m of stripped.matchAll(re)) specs.add(m[1]);
  }
  return [...specs];
}

// ---------------------------------------------------------------------------
// Specifier resolution.
// ---------------------------------------------------------------------------
function resolveCandidates(base) {
  const out = [base];
  // NodeNext-style specifiers point at the EMITTED .js name of a .ts source.
  const m = base.match(/^(.*)\.(js|jsx|mjs|cjs)$/);
  if (m) out.push(`${m[1]}.ts`, `${m[1]}.tsx`);
  for (const ext of CODE_EXTS) out.push(base + ext);
  for (const ext of CODE_EXTS) out.push(path.join(base, 'index' + ext));
  return out;
}

// Returns { kind: 'file', abs } | { kind: 'external' } | { kind: 'unresolved' }
function resolveSpecifier(spec, importerAbs, fileSet) {
  let base = null;
  if (spec.startsWith('./') || spec.startsWith('../')) {
    base = path.resolve(path.dirname(importerAbs), spec);
  } else if (spec.startsWith('@/')) {
    base = path.join(CLIENT_SRC, spec.slice(2));
  } else if (spec.startsWith('@shared/')) {
    base = path.join(SHARED, spec.slice(8));
  } else if (spec.startsWith('/src/')) {
    base = path.join(CLIENT, spec.slice(1)); // root-relative to the vite root
  } else {
    return { kind: 'external' }; // bare package specifier
  }
  const candidates = resolveCandidates(base);
  for (const cand of candidates) {
    if (fileSet.has(cand)) return { kind: 'file', abs: cand };
  }
  // Anything that exists on disk but outside the walked graph (non-code
  // assets like css/svg/json, or root-level files like vite.config.ts) is
  // external — real, just not part of the component reachability question.
  for (const cand of candidates) {
    if (fs.existsSync(cand)) return { kind: 'external' };
  }
  return { kind: 'unresolved' };
}

// ---------------------------------------------------------------------------
// Walk + graph build.
// ---------------------------------------------------------------------------
function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (SCAN_EXTS.has(path.extname(entry.name))) yield full;
  }
}

function buildGraph() {
  const files = new Set();
  for (const dir of [CLIENT, SERVER, SHARED]) {
    if (fs.existsSync(dir)) for (const f of walk(dir)) files.add(f);
  }
  const edges = new Map(); // abs -> Set<abs>
  const unresolved = []; // { importer, spec }
  for (const abs of files) {
    const content = fs.readFileSync(abs, 'utf8');
    const targets = new Set();
    for (const spec of extractSpecifiers(content)) {
      const res = resolveSpecifier(spec, abs, files);
      if (res.kind === 'file') targets.add(res.abs);
      else if (res.kind === 'unresolved') unresolved.push({ importer: path.relative(ROOT, abs), spec });
    }
    edges.set(abs, targets);
  }
  return { files, edges, unresolved };
}

function reachableFrom(roots, edges) {
  const seen = new Set();
  const queue = [...roots];
  while (queue.length) {
    const cur = queue.pop();
    if (seen.has(cur)) continue;
    seen.add(cur);
    for (const next of edges.get(cur) ?? []) if (!seen.has(next)) queue.push(next);
  }
  return seen;
}

// ---------------------------------------------------------------------------
// Canaries — fail loudly if extraction, resolution, or BFS regress.
// ---------------------------------------------------------------------------
function runCanaries() {
  const eq = (a, b, what) => {
    const ja = JSON.stringify(a), jb = JSON.stringify(b);
    if (ja !== jb) throw new Error(`canary: ${what} → ${ja}, expected ${jb}`);
  };
  const specs = (src) => extractSpecifiers(src).sort();

  eq(specs('import { Button } from "@/components/ui/button";'), ['@/components/ui/button'], 'static import');
  eq(specs('import {\n  A,\n  B,\n} from "./multi-line";'), ['./multi-line'], 'multi-line import');
  eq(specs("import './index.css';"), ['./index.css'], 'side-effect import');
  eq(specs('export { X } from "../re-export";\nexport * from "./star";'), ['../re-export', './star'].sort(), 're-exports');
  eq(specs('const P = lazy(() => import("@/pages/Home"));'), ['@/pages/Home'], 'dynamic import');
  eq(specs("const m = require('./cjs');"), ['./cjs'], 'require');
  eq(specs("await vite.ssrLoadModule('/src/entry-server.tsx');"), ['/src/entry-server.tsx'], 'ssrLoadModule');
  eq(specs('<script type="module" src="/src/main.tsx"></script>'), ['/src/main.tsx'], 'html script src');
  eq(specs('import type { T } from "./types";'), ['./types'], 'type-only import');
  eq(specs('import(dynamicVar)'), [], 'variable dynamic import ignored');
  eq(specs('import React from "react";').length, 1, 'bare specifier extracted');
  // Comment stripping: JSDoc usage examples must NOT register as edges…
  eq(specs("/**\n * import { asyncHandler } from './middleware/asyncHandler';\n */\nimport x from './real';"), ['./real'], 'JSDoc import example stripped');
  eq(specs("// import legacy from './old-path';\nimport y from './current';"), ['./current'], 'line-comment import stripped');
  // …while a URL's "//" inside a string must not swallow the rest of the line.
  eq(specs('const u = "https://x.dev"; import z from "./after-url";'), ['./after-url'], 'string // does not open a comment');
  eq(specs('const s = \'it\\\'s\'; import w from "./after-escape";'), ['./after-escape'], 'escaped quote inside string');

  // Resolution against a synthetic file set.
  const fset = new Set([
    path.join(CLIENT_SRC, 'components/ui/button.tsx'),
    path.join(CLIENT_SRC, 'components/ui/index.ts'),
    path.join(CLIENT_SRC, 'main.tsx'),
    path.join(SHARED, 'schema.ts'),
    path.join(CLIENT_SRC, 'a/b.ts'),
  ]);
  const imp = path.join(CLIENT_SRC, 'a/importer.tsx');
  eq(resolveSpecifier('@/components/ui/button', imp, fset).abs, path.join(CLIENT_SRC, 'components/ui/button.tsx'), 'alias + ext resolution');
  eq(resolveSpecifier('@/components/ui', imp, fset).abs, path.join(CLIENT_SRC, 'components/ui/index.ts'), 'index resolution');
  eq(resolveSpecifier('./b', imp, fset).abs, path.join(CLIENT_SRC, 'a/b.ts'), 'relative resolution');
  eq(resolveSpecifier('@shared/schema', imp, fset).abs, path.join(SHARED, 'schema.ts'), '@shared resolution');
  eq(resolveSpecifier('/src/main.tsx', path.join(CLIENT, 'index.html'), fset).abs, path.join(CLIENT_SRC, 'main.tsx'), 'root-relative resolution');
  eq(resolveSpecifier('react', imp, fset).kind, 'external', 'bare specifier is external');
  eq(resolveSpecifier('./no-such-file', imp, fset).kind, 'unresolved', 'missing target is unresolved');

  // Checked scope: the whole client/src + shared surface is in, server/ (all
  // roots) and ambient declarations are out.
  eq(inScope('client/src/components/ui/button.tsx'), true, 'component in scope');
  eq(inScope('client/src/pages/Home.tsx'), true, 'page in scope');
  eq(inScope('client/src/hooks/use-thing.tsx'), true, 'hook in scope');
  eq(inScope('client/src/lib/helper.ts'), true, 'lib helper in scope');
  eq(inScope('client/src/types/awesome-list.ts'), true, 'types module in scope');
  eq(inScope('shared/schema.ts'), true, 'shared module in scope');
  eq(inScope('server/routes.ts'), false, 'server file (a root) is out of scope');
  eq(inScope('client/env.d.ts'), false, 'client/ outside src/ is out of scope');
  eq(inScope('client/src/types/vite-env.d.ts'), false, 'ambient .d.ts inside scope is exempt');
  eq(inScope('shared/globals.d.ts'), false, 'ambient .d.ts in shared/ is exempt');
  eq(inScope('scripts/validation/dead-components.mjs'), false, 'tooling is out of scope');
  eq(inScope('client/src-legacy/x.ts'), false, 'prefix match is directory-bounded');

  // Shrink-only allowlist contract: the frozen manifest rejects any attempted
  // NEW pin and any SUBSTITUTION, while permitting removal of resolved entries.
  const frozen = new Set(['client/src/components/ui/legacy-a.tsx', 'client/src/components/ui/legacy-b.tsx']);
  eq(allowlistViolations(['client/src/components/ui/legacy-a.tsx', 'client/src/components/ui/brand-new.tsx'], frozen),
    ['client/src/components/ui/brand-new.tsx'], 'attempted NEW exception is rejected');
  eq(allowlistViolations(['client/src/components/ui/swapped-in.tsx'], frozen),
    ['client/src/components/ui/swapped-in.tsx'], 'REPLACED exception (swap for a removed pin) is rejected');
  eq(allowlistViolations(['client/src/components/ui/legacy-a.tsx'], frozen), [], 'subset after removal is allowed');
  eq(allowlistViolations([], frozen), [], 'empty allowlist (all dead files deleted) is allowed');

  // BFS reachability incl. the mutually-referencing dead cluster.
  const E = new Map([
    ['root', new Set(['live'])],
    ['live', new Set()],
    ['deadA', new Set(['deadB'])], // deadA ↔ deadB keep each other "imported"
    ['deadB', new Set(['deadA', 'live'])],
  ]);
  const seen = reachableFrom(['root'], E);
  eq([...seen].sort(), ['live', 'root'], 'dead cluster stays unreachable despite mutual imports');
}

// ---------------------------------------------------------------------------
// Run.
// ---------------------------------------------------------------------------
runCanaries();
console.log('PASS canaries :: extraction + resolution + scope + reachability verified against synthetic samples');

if (!fs.existsSync(ALLOWLIST_PATH)) {
  console.error('FAIL :: allowlist missing — create scripts/validation/dead-components-allowlist.json ({"exceptions": []})');
  process.exit(1);
}
const allowlist = JSON.parse(fs.readFileSync(ALLOWLIST_PATH, 'utf8'));
const exceptions = new Map((allowlist.exceptions ?? []).map((e) => [e.file, e.reason ?? '']));

// Enforce the shrink-only contract BEFORE the exceptions can excuse anything:
// an allowlist entry outside the frozen manifest is an attempted new pin or
// substitution and fails regardless of the file's reachability.
const frozenViolations = allowlistViolations([...exceptions.keys()], FROZEN_EXCEPTIONS);

const { files, edges, unresolved } = buildGraph();

const roots = [];
const indexHtml = path.join(CLIENT, 'index.html');
if (files.has(indexHtml)) roots.push(indexHtml);
for (const f of files) if (f.startsWith(SERVER + path.sep)) roots.push(f);
if (!roots.some((r) => r === indexHtml)) {
  console.error('FAIL :: client/index.html not found — the SPA root moved; update this gate.');
  process.exit(1);
}

const reachable = reachableFrom(roots, edges);

const scopedFiles = [...files]
  .filter((f) => CODE_EXTS.includes(path.extname(f)))
  .filter((f) => inScope(path.relative(ROOT, f).replaceAll(path.sep, '/')));

const dead = scopedFiles
  .filter((f) => !reachable.has(f))
  .map((f) => path.relative(ROOT, f).replaceAll(path.sep, '/'))
  .sort();

if (LIST) {
  console.log(`graph: ${files.size} files, roots: ${roots.length}, reachable: ${reachable.size}`);
  console.log(`in-scope files (${SCOPE_RELS.join(', ')}, excl. *.d.ts): ${scopedFiles.length}`);
  const byDir = new Map();
  for (const f of scopedFiles) {
    const rel = path.relative(ROOT, f).replaceAll(path.sep, '/');
    const key = rel.startsWith('shared/') ? 'shared/' : rel.split('/').slice(0, 3).join('/') + '/';
    byDir.set(key, (byDir.get(key) ?? 0) + 1);
  }
  for (const [dir, n] of [...byDir].sort()) console.log(`  ${dir}: ${n}`);
}

let failures = 0;

for (const rel of frozenViolations) {
  console.error(`FAIL allowlist-growth :: ${rel} is not in the frozen exception manifest — the allowlist`);
  console.error('       only ever SHRINKS. New dead files must be fixed or deleted, never pinned.');
  exceptions.delete(rel); // it must not excuse a dead file below
  failures++;
}

// A typo'd path must never silently mark its target dead.
if (unresolved.length) {
  for (const u of unresolved) {
    console.error(`FAIL unresolved-import :: ${u.importer} imports "${u.spec}" which resolves to nothing`);
  }
  failures += unresolved.length;
}

const newlyDead = dead.filter((rel) => !exceptions.has(rel));
for (const rel of newlyDead) {
  console.error(`FAIL dead-file :: ${rel} is unreachable from client/index.html and server/`);
  failures++;
}
if (newlyDead.length) {
  console.error('       No static or dynamic import chain from any execution root reaches these files,');
  console.error('       so no user can ever run them — but every sweep/typecheck/styling gate still pays');
  console.error('       for them. Re-import the module if it was meant to be used, or delete the');
  console.error('       file (git keeps history). It can NOT be pinned: the allowlist universe is');
  console.error('       frozen at gate introduction and only ever shrinks.');
}

for (const [rel, reason] of exceptions) {
  const abs = path.join(ROOT, rel);
  if (!files.has(abs)) {
    console.error(`FAIL stale-allowlist :: ${rel} is pinned but no longer exists — remove the entry`);
    failures++;
  } else if (reachable.has(abs)) {
    console.error(`FAIL stale-allowlist :: ${rel} is pinned as dead but is reachable again — remove the entry (reason was: ${reason})`);
    failures++;
  }
}

if (failures) {
  console.error(`\n${failures} dead-code failure(s).`);
  process.exit(1);
}

const pinned = dead.filter((rel) => exceptions.has(rel));
console.log(`PASS dead-components :: ${scopedFiles.length} in-scope file(s) checked (${SCOPE_RELS.join(' + ')}), ${scopedFiles.length - dead.length} reachable, ${pinned.length} pinned exception(s)`);
for (const rel of pinned) console.log(`       pinned: ${rel} — ${exceptions.get(rel)}`);

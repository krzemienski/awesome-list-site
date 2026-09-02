// Shared module-resolution primitives for the dead-code gates (task #374).
//
// scripts/validation/dead-components.mjs (file-level reachability, task #365)
// and scripts/validation/dead-exports.mjs (symbol-level, task #374) both have
// to answer the same question — "which file does this specifier point at?" —
// against the same alias table. Keeping two private copies of that answer is
// how the pair silently drifts: add an alias to vite.config.ts and one gate
// starts reporting unresolved imports (or, worse, stops seeing an edge and
// calls live code dead) while the other stays green. So resolution, the walk,
// and the checked-scope predicate live here, once.
//
// Deliberately NOT shared: each gate's failure policy, its frozen exception
// manifest, and its extraction layer (the file gate reads edges with regexes;
// the symbol gate needs a real TypeScript parse). Those are the trust
// boundaries reviewers read per gate.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const CLIENT = path.join(ROOT, 'client');
export const CLIENT_SRC = path.join(CLIENT, 'src');
export const SERVER = path.join(ROOT, 'server');
export const SHARED = path.join(ROOT, 'shared');

export const CODE_EXTS = ['.tsx', '.ts', '.jsx', '.js', '.mjs', '.cjs'];
export const SCAN_EXTS = new Set([...CODE_EXTS, '.html']);

// Checked scope shared by both gates: every front-end and shared module.
// server/ is excluded because each of its files is an execution root, and
// *.d.ts because ambient declarations are loaded by tsc through tsconfig
// "include" and legitimately have no importer.
export const SCOPE_RELS = ['client/src/', 'shared/'];

export function inScope(rel) {
  if (rel.endsWith('.d.ts')) return false;
  return SCOPE_RELS.some((prefix) => rel.startsWith(prefix));
}

export function relOf(abs) {
  return path.relative(ROOT, abs).replaceAll(path.sep, '/');
}

export function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (SCAN_EXTS.has(path.extname(entry.name))) yield full;
  }
}

export function resolveCandidates(base) {
  const out = [base];
  // NodeNext-style specifiers point at the EMITTED .js name of a .ts source.
  const m = base.match(/^(.*)\.(js|jsx|mjs|cjs)$/);
  if (m) out.push(`${m[1]}.ts`, `${m[1]}.tsx`);
  for (const ext of CODE_EXTS) out.push(base + ext);
  for (const ext of CODE_EXTS) out.push(path.join(base, 'index' + ext));
  return out;
}

// The alias table (mirrors vite.config.ts / tsconfig paths). Returns the
// absolute, extension-less base a specifier points at, or null for a bare
// package specifier.
export function specifierBase(spec, importerAbs) {
  if (spec.startsWith('./') || spec.startsWith('../')) return path.resolve(path.dirname(importerAbs), spec);
  if (spec.startsWith('@/')) return path.join(CLIENT_SRC, spec.slice(2));
  if (spec.startsWith('@shared/')) return path.join(SHARED, spec.slice(8));
  if (spec.startsWith('/src/')) return path.join(CLIENT, spec.slice(1)); // root-relative to the vite root
  return null; // bare package specifier
}

// Returns { kind: 'file', abs } | { kind: 'external' } | { kind: 'unresolved' }
// `exists` is injectable so canaries can resolve against a synthetic file set
// without touching the disk.
export function resolveSpecifier(spec, importerAbs, fileSet, exists = fs.existsSync) {
  const base = specifierBase(spec, importerAbs);
  if (base === null) return { kind: 'external' };
  const candidates = resolveCandidates(base);
  for (const cand of candidates) {
    if (fileSet.has(cand)) return { kind: 'file', abs: cand };
  }
  // Anything that exists on disk but outside the walked graph (non-code assets
  // like css/svg/json, or root-level files) is external — real, just not part
  // of the question being asked.
  for (const cand of candidates) {
    if (exists(cand)) return { kind: 'external' };
  }
  return { kind: 'unresolved' };
}

// Does an UNRESOLVED specifier point into the checked scope? A typo'd path
// into client/src or shared could hide a real use of a symbol there (and so
// must fail loudly); a broken path into server/ or an archived script cannot.
export function unresolvedTargetsScope(spec, importerAbs) {
  const base = specifierBase(spec, importerAbs);
  if (base === null) return false;
  return base.startsWith(CLIENT_SRC + path.sep) || base.startsWith(SHARED + path.sep);
}

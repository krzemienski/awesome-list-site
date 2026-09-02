---
name: Dead-code reachability gate
description: Why unused-component detection must be graph reachability from execution roots, and the false-positive traps (doc-comment imports, NodeNext .js specifiers, root-relative vite specs).
---

# Dead-code reachability gate

**Rule:** detect dead frontend files by BFS reachability from real execution roots (client/index.html script src + every server/ file), never by "does anything import it" — mutually-importing dead files keep each other "imported" forever and only reachability exposes the cluster.

**Why:** a dead component (color-palette-generator) was the sole importer of another (slider); a naive importer-count scan would have called slider alive indefinitely while styling gates kept "fixing" both.

**How to apply:** when scanning imports textually, three traps produce false "unresolved import" failures:
- JSDoc/comment usage examples spell out literal `import { x } from './relative/path'` lines — strip comments (string-aware, or URLs' `//` truncate lines) before extraction.
- NodeNext-style specifiers reference the emitted `.js` name of a `.ts` source — resolution must try the `.ts`/`.tsx` swap.
- Vite root-relative specs (`/src/main.tsx` in index.html, `ssrLoadModule('/src/entry-server.tsx')`) resolve against the vite root, not the importer dir; files outside the walked tree (root vite.config.ts) are external, not unresolved.

Direction of error matters: after comment stripping, remaining string-literal false matches only make files look MORE alive (safe); missing an edge kind falsely kills a live file (unsafe) — so treat unresolved non-bare specifiers as failures, never silently.

**Scope the gate to the whole app surface, not one directory.** Flag every module under the front-end source root and the shared root; the reachability graph already contains them, so limiting the *reported* set to `components/` is a pure blind spot — dead pages, hooks, and lib helpers survive indefinitely. Two exemptions are principled, not convenience:
- server files are themselves BFS roots, so "unreachable" is impossible there;
- `*.d.ts` ambient declarations are loaded by tsc via tsconfig `include`, never by an import edge, so importer-less is their normal state (flagging them is a permanent false positive).
Directory prefixes must keep their trailing slash or a sibling like `src-legacy/` silently joins the scope. Widening exposed a handful of long-dead hooks/lib files; deleting them beats pinning, and a doc that documents a dead file as "defined but not mounted" needs the same sweep.

**File-level reachability is blind INSIDE a file.** One live import keeps every other export in that module alive, so helpers keep costing typecheck/bundle/styling sweeps while calling nothing. The symbol-level sibling gate needs a real TS parse, not regexes: aliases (`export { a as b }`), inline `type` modifiers, and destructured export consts all change *which name* is exported or used, and guessing invents dead symbols. Rules that keep it honest:
- namespace imports, `import()`, `require()`, `ssrLoadModule()`, html `<script src>` → mark the WHOLE module used (a namespace object can be indexed dynamically, so per-symbol claims through it are lies);
- re-exports are FOLLOWED to their origin, never counted as uses — otherwise every barrelled symbol lives forever; but a namespace import OF a barrel must mark the origins behind its forwards, or the star/forward targets get falsely killed;
- the usage universe must be wider than the reachability roots (tests, scripts, and root configs genuinely import app symbols) while a self-contained second app with its own `@/` alias must be EXCLUDED or it fabricates uses;
- type-only exports: track them as uses but do not report them (erased at build, and shared/ publishes inferred types as contract surface) — reporting them buries the runtime findings;
- an export referenced only inside its own module is still dead: report it with its in-file reference count so the fix reads as "drop the `export` keyword", not "delete it".

**Mutation-testing a NEW gate:** snapshot files with `cp`, never `git checkout --`. A brand-new allowlist is untracked, so checkout fails on it — and when given several pathspecs it then restores NONE of them, silently leaving both the probe edit and a dropped pin behind. The gate goes green on a corrupted allowlist and the "verification" proves nothing.

**Allowlist contract:** a repo-mutable JSON allowlist alone fails code review — a newly dead file could be pinned in the same change that killed it. Freeze the exception universe as a manifest inside the gate script (allowlist must be a subset; new paths AND substitutions fail), so growing it requires a visible out-of-band edit to the gate itself, and canary the new-pin/substitution/removal cases.

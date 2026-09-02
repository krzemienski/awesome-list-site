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

**The repository root is a separate blind spot.** A reachability gate scoped to app source can never see a one-off script sitting beside package.json, yet those read as supported tooling in the first `ls` and in security-scan output. Root files can't be judged by reachability (nothing *imports* a config), so the question becomes "what machine-readable thing references this?" — npm scripts, workflow config, imports, CI/container/tool configs, plus auto-discovered tool configs pinned to the package that loads them (the pin must lapse the moment that package leaves the dependency list, or a config outlives its tool).

**Text mentions and import edges are different evidence — conflating them is a false-pass path.** A filename mention may only count on surfaces whose *purpose* is naming files to run or load (package.json, workflow/CI config, Dockerfile/compose, deploy JSON, shell scripts); everywhere else the only admissible evidence is a parsed, resolved import edge. Grep-style matching over source text accepts a leftover constant or log string as proof of life, and any file format whose comment syntax the gate does not strip (`.css`, `.html`, `#` in a Dockerfile) becomes a way to keep dead code alive with a comment. Exclude such formats from the surface set rather than half-parsing them. Peer files vouching for each other need the same BFS-from-real-roots discipline as module reachability — accept an edge only once its *source* is independently reachable, or a cycle of two strays certifies itself.

**A config value is evidence only once you know who reads it — and that is decided by position, not by key name.** Parse each format with a real reader and read only the locations its own schema executes or loads; a generic "any key called command/run/config, at any depth" walk gives every format a metadata-shaped bypass, because an `env:` var named `command`, a marketplace action's `with:` inputs and npm's `config` block all look identical to a real invocation from the outside. Judging a command means judging its executable too: the same word is a file to a runtime and plain text to `echo`, wrappers (`env`, `sudo`, `time`) hide the real command, a shell's `-c` argument is script text rather than a path, and a flag like `-c` means "load this file" only for tools that take one. Never fall back to line-scanning a structured file — that reads live-looking values out of a document that is not valid at all — so validate the whole document and fail closed when it will not parse.

**Why:** the probes that survived for months *were* referenced — by audit reports, changelog entries and leftover comments. So a reference gate must exclude prose surfaces outright (`*.md`, docs/reports/journals), strip comments from code/shell/YAML before matching, and anchor name matching: `scripts/probe.mjs` and `other-probe.mjs` are different files from a root `probe.mjs`, while `./probe.mjs` is the same one. Skip git-ignored paths (they never enter the repo) and fail when the scan finds zero root files, so a broken walk can't read as a clean repo.

**Allowlist contract:** a repo-mutable JSON allowlist alone fails code review — a newly dead file could be pinned in the same change that killed it. Freeze the exception universe as a manifest inside the gate script (allowlist must be a subset; new paths AND substitutions fail), so growing it requires a visible out-of-band edit to the gate itself, and canary the new-pin/substitution/removal cases.

## Sweeping the symbol-level pins (the resolution side)

Un-exporting is not free. A const whose only remaining reference sits in a TYPE position — export type T = (typeof X)[number], or z.infer<typeof schema> — trades a dead-export finding for an eslint no-unused-vars "assigned a value but only used as a type" error the moment the export keyword comes off. tsc stays green and the gate goes green, so the resolution looks clean while lint quietly regresses. The honest fix is to delete the runtime value and write the union (or derive the type from a tuple something actually reads at runtime); a disable comment is the wrong answer when nothing executes the value.

Vendored/generated families (shadcn CLI output and its use-toast hook) are a PERMANENT pin, not backlog. The whole upstream surface ships per file, trimming members fights the next add of that primitive, and the bundler tree-shakes whatever is unrendered — so the entries cost nothing and resolving them is a net loss. Decide it once, write the decision in the doc the gate header points at, and let the sweep skip them; otherwise every sweep re-triages the same ~50 entries to the same answer.

Shrink-only manifests want a mechanical unpin step, never hand edits. Run the gate, parse ITS OWN stale-allowlist findings, abort if any non-stale failure is present, then remove exactly those keys from both the JSON allowlist and the frozen manifest in the script, asserting the two counts still match afterwards. Two parallel lists of ~100 keys desync silently when edited by hand, and the desync only shows up as a confusing gate failure much later.

Leave a pin in place when another in-flight task owns the symbol (instrumentation waiting to be re-wired is not dead code) — but say so in the gate header, or the next sweep deletes the thing that task is about to call.

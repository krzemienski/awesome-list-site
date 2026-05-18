# Phase 1 · Replit Tool Inventory

> Adapted from the Mac-pathed migration brief
> (`attached_assets/Pasted--context-absolute-paths…txt`) for the actual
> Replit Agent toolset. Every "use X tool" reference in the source brief
> is mapped to a concrete tool I have available here.

## 1 · Environment baseline

| Dimension | Value |
|---|---|
| Runtime | Node.js (managed by Replit nix env) |
| Framework | Vite + Express + Wouter + React 18 (TypeScript) |
| **NOT** | Next.js. All Next-specific advice in the source brief (`app/layout.tsx`, `next/script`, RSC, App Router) is translated to Vite/Wouter equivalents. |
| Workspace root | `/home/runner/workspace` (relative paths only) |
| DB | Postgres via `DATABASE_URL` env, Drizzle ORM, `npm run db:push` for migrations |
| Workflow | `Start application` → `npm run dev` (concurrent Express + Vite on port 5000) |
| Admin login | `admin@example.com` / `admin123` (local email/password) |
| DS source | `awesome-list-site-ds/` (in-repo) — `styles.css` (678 lines) + `design-systems.jsx` (347 lines) + `docs/*.md` (19 files) + `HANDOFF.md` |

## 2 · Tool mapping (brief → Replit Agent)

| Brief verb | Source brief tool | Replit Agent tool I will use |
|---|---|---|
| Read a file | `cat`, `Read` | `read` (paginated, handles large files) |
| Write/overwrite a file | `Write` | `write` |
| Surgical edit | `Edit` | `edit` (exact string match) |
| Find files by name | `find`, `Glob` | `glob` |
| Search file contents | `grep -r` | `bash` running `rg` (ripgrep) |
| Run shell | terminal | `bash` (timeout in ms, max 120000) |
| Multi-file explore | "open all these" | `explore` subagent (read-only) |
| Run dev server | `npm run dev` in shell | `restart_workflow` on `Start application` |
| Tail dev logs | `tail -f` | `refresh_all_logs` |
| Take screenshot | macOS `screencapture` / Puppeteer | `screenshot` (`type=app_preview`, `save_to=screenshots/...jpg`) |
| Browser-driven test | manual click-through | `testing` skill (Playwright subagent via `runTest()`) |
| Install npm package | `npm i` | `package-management` skill (NEVER hand-edit `package.json`) |
| Generate AI image | external | `media-generation` skill |
| Track work | spreadsheet / notes | `_validation/phase-N/` markdown files (this dir) + project tasks #15-#21 |
| Mark task done | manual | `mark_task_complete` (after `proposeFollowUpTasks` + `.local/.commit_message`) |

## 3 · What I do NOT have / explicit non-options

- **No macOS file paths.** The brief references `/Users/nick/...` paths
  for the DS source. The DS already lives at `awesome-list-site-ds/` in
  this repo, so all reads stay in-workspace.
- **No Next.js.** All "wrap in `app/layout.tsx`" and "use `next/script`"
  guidance is translated to: inline `<script>` in `client/index.html`
  `<head>` + Vite-bundled CSS import in `client/src/main.tsx`.
- **No raw Puppeteer.** Screenshots are taken via the `screenshot` tool
  against the running Vite dev server, or via the `testing` skill's
  Playwright subagent which captures evidence per step.
- **No `cd`.** All `bash` commands run from `/home/runner/workspace`
  with relative paths.
- **No `package.json` edits by hand.** Package adds go through the
  `package-management` skill (`packager_install_tool` style).
- **No `vite.config.ts` / `server/vite.ts` / `drizzle.config.ts` edits.**
  Forbidden by stack guidelines.
- **No light theme.** App is dark-only (`--radius: 0rem`, OKLCH neon).
  Any "light mode toggle" advice in upstream DS docs is ignored.

## 4 · Per-phase tool plan

| Phase | Primary tools | Output dir |
|---|---|---|
| **1 — Spec & Site Map** *(this task)* | `read`, `bash` (`rg`/`ls`), `write` | `_validation/phase-1/` |
| 2 — Functional Baseline | `screenshot` (one per route × state), `testing` skill for flows, `refresh_all_logs` for console noise | `_validation/phase-2/screenshots/` |
| 3 — Delta Catalog | `read` (compare current CSS vs DS_SPEC), `bash` (`rg` for hex/px sweeps) | `_validation/phase-3/deltas.md` |
| 4 — Remediation Plan | `write` (issue list with file:line refs) | `_validation/phase-4/plan.md` |
| 5 — Implementation | `edit` (token swaps), `write` (new DS files: `client/src/styles/design-system.css`, `client/src/lib/design-system.ts`), `restart_workflow`, `screenshot` after each route | `client/src/...` + `_validation/phase-5/` |
| 6 — Final Evidence Sweep | `screenshot` matrix (route × state × accent if multi-system), `testing` skill end-to-end | `_validation/phase-6/` |
| 7 — Handoff | `write` (final report, before/after gallery, regression checklist) | `_validation/phase-7/HANDOFF.md` |

## 5 · Conventions

- **All artifacts under `_validation/phase-N/`.** No screenshots in
  Phase 1; that's Phase 2's job.
- **No code changes in Phases 1-4.** Implementation is gated until
  Phase 5, by which point the spec, baseline, deltas, and plan are
  locked.
- **Routes are enumerated from `client/src/App.tsx`,** not from
  filesystem scan, because `<Switch>` is the single source of truth.
- **Auth gating is read from the live wrappers** (`AdminGuard`,
  `AuthGuard`) — not inferred.
- **Env var inventory** comes from a `rg "import\.meta\.env\."` /
  `rg "process\.env\."` sweep, captured in `SITE_MAP.md`.

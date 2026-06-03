# PRD: Criterion #7 — Dockerize & Replace Replit (awesome-list-site)

## How to use

Run with the Ralphy CLI:

```bash
ralphy --prd planning/dockerize-replace-replit/claude-ralphy-prd.md
```

Or copy this file to the repo root and run bare:

```bash
cp planning/dockerize-replace-replit/claude-ralphy-prd.md ./PRD.md && ralphy
```

Each task below = implement exactly one section file, in dependency order. A task is marked done **only** when that section's blocking validation gate (VG-N) PASSes with real captured evidence under `e2e-evidence/`. Do not start a task until the previous task's gate has PASSed.

## Context

Take `awesome-list-site` off Replit, Dockerize it, and run an exhaustive browser-driven functional audit until production-ready. Auth is finished on `passport-local` (NOT better-auth), the Replit OIDC provider is ripped out, the container is hardened (non-root + healthcheck + graceful shutdown + migrations), the migration chain is **re-baselined** from `shared/schema.ts` to kill the `42710`/`42P01` defects, deploy is **config-only** (Railway + DigitalOcean, no live deploy), and a real Chrome-DevTools-MCP audit drives every screen and admin tab at every breakpoint.

Reference documents (read as needed):
- `planning/dockerize-replace-replit/claude-plan.md` — the full implementation plan.
- `planning/dockerize-replace-replit/claude-spec.md` — locked decisions D1–D10.
- `planning/dockerize-replace-replit/sections/` — the six self-contained implementation units (one per task below); an implementer should not need any other document.

**Iron Rule:** build and run the REAL system — no mocks, stubs, test doubles, or test files; every gate proven by real captured evidence. **Strict dependency order:** `00 → 01 → 02 → 03 → {04, 05}`; never advance past a FAILing gate. **Section 03 is the highest-risk section** (clean-volume migrate defects) — read its full Background before touching anything.

## Tasks

- [ ] Section 00: Branch setup (VG-0) — sections/section-00-branch-setup.md
- [ ] Section 01: Replace Replit auth (VG-1) — sections/section-01-replace-replit-auth.md
- [ ] Section 02: Containerize & harden (VG-2) — sections/section-02-containerize-harden.md
- [ ] Section 03: Re-baseline migrate + seed (VG-3) — sections/section-03-rebaseline-migrate-seed.md
- [ ] Section 04: Production deploy config (VG-4) — sections/section-04-deploy-config.md
- [ ] Section 05: Functional audit loop (VG-5) — sections/section-05-functional-audit-loop.md

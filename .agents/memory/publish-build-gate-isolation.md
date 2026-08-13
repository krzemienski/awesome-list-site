---
name: Publish build container gate isolation
description: Why deploy-build gates must never open a DB connection or boot the app — the build container carries production env before the schema diff is applied.
---

# Publish build container gate isolation

**Rule:** Anything wired into `.replit [deployment].build` runs inside the publish build container with **production** env vars (`DATABASE_URL` = prod) — *before* Replit applies the dev→prod schema diff. A build-phase gate must therefore never open a database connection, boot the app, or run anything with side effects.

**Why:** Two real incidents in one publish pipeline (Aug 2026):
1. The gate booted a "temporary dev server" when :5000 was down. In the build container that server connected to the prod DB, which lacked columns from a pending dev migration → 500s → gate timeout → publish blocked forever (chicken-and-egg: the diff that would add the columns is applied only after the build succeeds).
2. The gate ran the full migration-drift check, whose scratch-DB reproduction does `DROP/CREATE DATABASE` — it "passed" while silently creating/dropping a scratch database on the production DB server on every publish attempt.

**How to apply:**
- Publish-mode gate (`--publish` flag, set in `.replit` build command) runs only file/build checks: typecheck, `check-migration-drift.ts --journal-only` (no DB), `npm run build`, bundle budget. Browser audits and DB-backed checks run as dev workflows instead.
- When a gate "needs a server", require one already running (dev workspace) and skip otherwise — never boot one in the build phase.
- Bundle budgets are governance, not physics: an intentional architecture change (e.g. auth provider statically in the entry) warrants re-baselining with ~3-5% headroom, and deleted lazy pages must be pruned from route budgets or the check fails on a missing manifest key.

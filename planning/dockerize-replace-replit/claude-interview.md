# Interview Transcript — Criterion #7 Dockerize & Replace Replit

> Conducted 2026-06-01, informed by spec + claude-research.md decision tables.
> Decisions are binding; they override spec defaults where they conflict.

## Round 1

**Q1 — Auth end-state?** (research rec: finish passport-local 9/10 vs better-auth 6/10)
→ **Finish passport-local.** Rip out `replitAuth.ts` + OIDC; keep passport-local + express-session + connect-pg-simple; fix phantom `SessionUser` type; unify serialize/deserialize.
→ **DOCUMENTED DEVIATION from spec** (spec defaulted to better-auth). Rationale: codebase already mints the shared `{claims:{sub}}` session contract; (a) is ~200-300 LOC mostly deletions at low risk, (b) is a 1-3 day full rewrite for managed features the app already hand-rolls.

**Q2 — Deploy target for Phase 4?** (Railway 8.9 / DO 7.9)
→ **Config-only, no live deploy.** Author + locally-validate config; do NOT execute a live cloud deploy. Phase 4 gate = config schema-valid + documented, not live containers.

**Q3 — Object storage + seed network dependency?**
→ **Investigate storage first.** Phase 1 analysis confirms whether Replit object storage is actually used. If used → add MinIO/S3 to compose; if not → drop from scope. Seed-source (live S3 vs vendored JSON) decision deferred to Phase 3 based on the same finding.

**Q4 — Audit harness + run scope?**
→ **Plan only (gepetto).** This is a planning run: produce plan + sections + execution files. Phases 1-5 execute LATER via ralph-loop / Ralphy. Plan specifies Chrome DevTools MCP as the primary audit harness, with the existing Playwright config/specs as CI codification.

## Round 2 (follow-ups)

**Q5 — Which deploy config SHAPE to author (given config-only)?**
→ **Both Railway + DO.** Finalize `railway.json` (fix `healthcheckPath` → `/api/health`) AND author a new `.do/app.yaml` App Platform spec. Document both. Delete `vercel.json` (dead end for a long-lived Express+SSR container). Maximum flexibility at deploy time.

**Q6 — Seeded admin credentials?**
→ **Parameterize via env.** Seed reads `ADMIN_EMAIL` / `ADMIN_PASSWORD` from env, falling back to `admin@example.com` / `admin123` for local dev only. No hardcoded production creds. Aligns with no-secrets-in-image constraint.

**Q7 — Run external review (Gemini + Codex)?**
→ **Yes, both.** Launch Gemini + Codex review subagents in parallel via Bash; integrate worthwhile feedback into `claude-plan.md`; document accept/reject decisions in `claude-integration-notes.md`.

## Derived constraints for the plan

- Auth phase = SUBTRACTIVE (delete Replit OIDC), not additive (no better-auth install).
- Deploy phase = config authoring + local validation only; no cloud credentials needed.
- Object-storage + offline-seed scope is CONDITIONAL on a Phase-1 finding (plan carries the branch explicitly).
- Admin creds, SESSION_SECRET, DB creds all env/secret-driven — zero secrets committed.
- gepetto stops at plan artifacts; ralph-loop-prompt + Ralphy PRD are the execution handoffs.
- Drizzle journal repair (add 0027/0028 entries after probing `__drizzle_migrations`) is in scope — it's a real runtime-schema-drift bug, not optional.

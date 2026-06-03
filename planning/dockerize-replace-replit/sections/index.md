<!-- SECTION_MANIFEST
section-00-branch-setup
section-01-replace-replit-auth
section-02-containerize-harden
section-03-rebaseline-migrate-seed
section-04-deploy-config
section-05-functional-audit-loop
-->

# Section Index — Criterion #7 Dockerize & Replace Replit

Implementation units derived from `../claude-plan.md`. Each section is **self-contained**: an
implementer should not need to read any other document. Execute in dependency order; each
section ends with its blocking validation gate (VG-N). Do not advance on a FAIL.

## Dependency graph

```
section-00 (branch)
  └─→ section-01 (auth / Replit removal, VG-1)
        └─→ section-02 (containerize + harden, VG-2)
              └─→ section-03 (re-baseline migrate + seed, VG-3)   ← HIGHEST RISK
                    ├─→ section-04 (deploy config, VG-4)          ← parallel-OK with 05 prep
                    └─→ section-05 (functional audit loop, VG-5)  ← needs 03 green
```

| Section | Title | Gate | Depends on | Risk |
|---|---|---|---|---|
| 00 | Branch setup | VG-0 (branch active) | — | trivial |
| 01 | Replace Replit auth (subtractive) | VG-1 | 00 | medium |
| 02 | Containerize + harden (non-root, healthcheck, shutdown) | VG-2 | 01 | medium |
| 03 | Re-baseline migrations + idempotent seed | VG-3 | 02 | **HIGH** |
| 04 | Production deploy config (Railway + DO, no live deploy) | VG-4 | 03 | low |
| 05 | Exhaustive functional audit + remediation loop | VG-5 | 03 | high (volume) |

## Cross-cutting rules (apply to every section)
- Branch `feat/dockerize-replace-replit` only; atomic conventional commits per section.
- Iron Rule: build/run the REAL system. No mocks, stubs, test doubles, or test files.
- Every gate proven by real executed output captured to `e2e-evidence/`.
- No secrets committed; env/secret-driven (`SESSION_SECRET`, `ADMIN_*`, `DATABASE_URL`, tokens).
- Decisions locked: D1 passport-local (not better-auth) · D2 config-only deploy · D3 Railway+DO ·
  D4 no object storage · D5 vendor seed JSON · D6 env admin creds · D10 **re-baseline** (not journal-edit).

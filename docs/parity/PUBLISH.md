# Production release record

## Decision — HOLD (2026-09-16, updated after the full-inventory rerun)

Candidate: the working tree that becomes the next commit on `main` after
`fc92abb9` (the pushed image-trim fix) — see `git log` for the exact SHA.
**Not ready to publish; not published and verified.** No publishing action
was offered or initiated, no deployment configuration was changed, and no
production data was written.

The release contract requires the parity gate and independent verification to
pass first. The full-inventory run `tests/parity/baseline/2026-09-16T05-55-50-268Z-6075`
(all four widths, admin identity) is the current measurement
([STATUS.md](STATUS.md), [REPORT.md](REPORT.md), per-area reasons in
[IMPLEMENTATION.md](IMPLEMENTATION.md)):

- 188 measured pixel cells: **56 pass, 128 fail**, 0 incomplete; 40 blocked
  cells and the token-only rows stay outside that denominator. The previous
  full run was 16 pass / 172 fail.
- Passing at every width: approvals, audit, edits, export, research,
  resources, home (index and curated), shell drawer, shell palette.
- Failing at every width: about, category, subcategory, submit, users, every
  `artifact.docs.*` and `artifact.showcase` cell (the artifact cells carry an
  `@font-face` parity gap — 14 faces on one side — proposed as task 534).
- Selected reruns after the run (`…06-59-13-579Z-19499`, `…07-03-25-409Z-20621`,
  `…07-08-57-394Z-332`) cleared the 768 forced-stacking failures on
  enrichment and database and brought categories/subcategories 768 from
  6.8%/5.6% to 0.60%/0.62%; they do not change the shared report.
- The Journeys budget passes only under an upstream cap increase that the
  independent review identifies as requiring an owner decision. This task
  does not approve or further relax that increase.
- [Independent verification](VERIFICATION.md) still records acceptance
  BLOCKED; browser/auth, incomplete axe and reference-coverage blockers remain
  detailed there.

Static gates on this candidate (validation run `4bA5jAeYRT-L0MgQ3nTdc`):
typecheck, dead-exports, palette-drift, canonical-token-parity,
dead-components, accent-drift all PASS. Do not infer release acceptance from
them.

## Pre-publish checklist

| Requirement | Result / evidence |
|---|---|
| Independent verification passed | **BLOCKED**, as above |
| Migration 0047 journaled | **PASS**, entry idx 23 in `migrations/meta/_journal.json` |
| Migration 0047 idempotent by inspection | **PASS**: column/table/index use `IF NOT EXISTS`; constraint additions use table-scoped `pg_constraint` guards |
| Journal integrity | **PASS**, fresh command below: all 27 migration files journaled, no orphans |
| `task302-build`; exact-candidate `npm run build && npm run bundle:budget` | **UNVERIFIED** in this release attempt; deferred until independent acceptance is resolved |
| `task302-boot-safety` | **UNVERIFIED** on this candidate; earlier results are retained in independent verification, not claimed as fresh proof |
| Full `migration-drift` | **UNVERIFIED** on this candidate; journal-only result is not schema reproduction or sequence proof |
| Local `bash scripts/pre-publish-gate.sh` with app running; retain step logs | **UNVERIFIED**, deferred behind release hold |
| Production config: `VITE_CONTACT_VARIANT` unset; router credential available | **UNVERIFIED**; no secrets accessed |
| No secrets in client bundle | **UNVERIFIED**; must inspect the final release bundle |
| Production-mode local build smoke: `/`, `/api/health`, `/sitemap.xml`, `/category/encoding-codecs` | **UNVERIFIED**, deferred |
| Local production-mode Lighthouse | **UNVERIFIED**, deferred |
| Publishing-only image trimming | **REPAIRED 2026-09-15.** Two user publish attempts (builds `f3055341…` 18:57Z and `ef717b35…` 22:02Z, deployment `b112b7e1…`) passed every gate step and then failed with `image size is over the limit of 8 GiB`; both logs show `SKIP image cleanup — not a Replit publishing container`. Cause: Replit sets `REPLIT_DEPLOYMENT=1` only at runtime, never during the build command, so the trim step could never fire. Fix: the marker is now the production-only env var `REPLIT_PUBLISH_IMAGE_TRIM=1` (set in Replit's production environment, absent from development), and the helper additionally refuses wherever `REPLIT_DEV_DOMAIN` exists (the interactive workspace). Verified on a disposable `/tmp` copy: refuses in the workspace with the marker set, refuses without the marker, removes only `tests/parity/baseline` (2.9 GiB) and `.cache/ms-playwright` (641 MiB) under build-container conditions; the real workspace tree was not touched. Workspace measured 7.1 GiB + 2.2 GiB `.git`; projected trimmed image ≈ 5.8 GiB. Actual image size remains **UNVERIFIED** until the next user publish |

Fresh file-only command, exit code 0:

```text
$ npx tsx scripts/check-migration-drift.ts --journal-only
Journal-only mode (no database connection).
Step 1/3: journal integrity check...
  ✓ 27 migration file(s), all journaled, no orphans.

✅ Journal is consistent with migrations/.
```

The pre-publish script still uses journal-only checks and skips browser checks
in publishing mode; it does not intentionally boot a server or create a scratch
database against production. Never set `REPLIT_DEPLOYMENT=1` in the workspace.
Do not delete evidence to address publishing image size.

## Deployment observation

The deployment service returned on 2026-09-16:

```json
{
  "success": true,
  "isDeployed": true,
  "primaryUrl": "https://awesome.video",
  "additionalUrls": ["https://awesome-list-site.replit.app"],
  "deploymentType": "autoscale",
  "hasSuccessfulBuild": true,
  "visibility": "public"
}
```

This confirms an active successful deployment, **not** that this candidate was
published. Deployment ID/time for this release: **none observed**. Explicit
user publishing action for this candidate: **not received**.

## Resume and post-publish verification

Resolve the independent review's handoffs without changing acceptance
thresholds, then complete the exact-candidate checklist above. Only then offer
Publish and wait for the user to publish through Replit.

After that user action, obtain fresh deployment metadata and record the actual
deployment ID/time, build-image outcome, boot-migration logs and errors.
All post-publish checks remain **PENDING / NOT RUN**:

- `npm run baseline:compare -- --target https://awesome.video` against the
  pre-work snapshot: every inventoried public route's status/redirect,
  title/canonical/robots, testid inventory (no removals), resource/category/tag
  counts and JSON-LD types; zero unexpected differences.
- Built-in browser tester, read-only visitor flow: submit requires sign-in,
  search yields results, category page 2 loads, missing route returns 404,
  and `/api/config` contact options are all unavailable.
- Production mobile Lighthouse on home/category/resource; axe home at 375
  and 1440; single canonical Google Fonts request and all families loaded;
  no console CSP violations; all 50 guest theme combinations persist.
- Read-only production schema and QA residue checks: resource `kind`,
  contact table, no `__qa_test_` rows. No production test accounts or writes.
- Admin AI health: router endpoint and successful connection, without exposing
  credentials. Keep any API cost or authorization limitations explicit.

Use only the authorized built-in browser tester/Screenshot and existing
registered automated gates. Preserve raw results and screenshot provenance.

## Rollback decision

**No rollback performed:** no release was initiated by this task. Leave the
currently serving deployment unchanged. Before publishing, confirm the prior
deployment is retained and available in Replit's publishing history. If
post-publish acceptance fails, stop and record the failure; request a rollback
through the publishing flow or hand off a fix, never hot-patch production.
An application rollback does not imply reversal of schema/data migrations.

`STATUS.md` deliberately remains BLOCKED; change it to “published and verified”
only after the actual release and every required verification pass.

## User-requested closeout — execution handoff

The user redirected this session to review the original design attachments,
produce one comprehensive main-session execution prompt, and close out.
That deliverable is `docs/parity/MAIN-SESSION-EXECUTION-PROMPT.md`. It supersedes
the earlier planning draft as the execution handoff.

This closes the session's documentation work, not the product acceptance or
release. No deployment was initiated. Required implementation, readiness and
post-publish verification remain outstanding; the release stays on HOLD and
`STATUS.md` remains BLOCKED. The main session must execute the prompt, verify
the real app in Replit's built-in browser, and wait for the user's Publish
action before verifying production.
# Independent review: command-safety

Raw scoped review. Assertions are subject to the integrator findings in COMPLETION-REVIEW.md; source inspection is not browser proof. Historical counts and initial candidate findings are not current certification.

Read-only acceptance review complete. No workspace edits, DB writes, auth, browser, workflow, or app commands were performed. The only output created is under `/tmp/design-completion-review`.

**Database safety**
- `vitest.config.ts` applies DB global setup to **all** Vitest suites, including unit tests.
- Current `DATABASE_URL` names `heliumdb`; setup derives/provisions `heliumdb_test`, pushes schema, then global `afterEach` calls `cleanupDatabase()`.
- Cleanup unconditionally deletes every row from roughly 26 tables. It cannot delete `heliumdb` because of the test-name guard, but it **can erase pre-existing/shared rows in `heliumdb_test`**. Therefore I did not run unit or integration tests. Safe execution requires an explicitly isolated, non-co-tenanted `TEST_DATABASE_URL` whose database name contains `test`.

**Fresh lint (run exactly once)**
- Command: `npm run lint -- --format json --output-file /tmp/design-completion-review/eslint.json`
- Exit 1; 638 files checked, 495 affected; **5,286 errors, 23 warnings**; 332 errors and 2 warnings fixable.
- Top files: `server/routes/domains/export-link-health.ts` 374; `server/og-middleware.ts` 371; artifact `CanonicalShowcase.tsx` 288; `user-features.ts` 266; `admin-content.ts` 250; `runAgentQuery.ts` 190; `GenericCrudManager.tsx` 169.
- 282 parser failures largely include `.agents` files outside the TS project. No autofix.

**Genuinely open acceptance**
- Latest retained full parity run is **133 pass / 51 fail of 184**, gate not passed, with 40 blocked and 100 unverified rows. It predates current HEAD `5aa9214f`.
- Current docs are inconsistent: `STATUS/REPORT` use 133/51, while `SUMMARY/VERIFICATION` retain older 16/172 claims; STATUS also says “of 188” although the machine denominator is 184.
- Fresh lint is failing.
- Final exact-candidate independent verification has not been completed.
- Production comparison/post-publish visitor, Lighthouse, axe, font, theme, schema-residue, and AI-health checks remain pending.

**Safe command plan while workspace writes remain forbidden**
1. Do not rerun lint.
2. Run read-only static gates individually, output redirected to `/tmp/design-completion-review`: `npm run check`, `npm run lint:css`, `npm run validate:response-contracts`, `npm run validate:openapi`, `npm run validate:standalone-palette-drift`, `npm run validate:theme-registry-types`, `npm run validate:canonical-token-parity`, `npm run validate:product-profiles`.
3. Defer `test:unit`, `test:integration`, all E2E/parity/browser/performance commands, build/generation, DB scripts, and publish checks.

**Exact external inputs needed**
- Exclusive disposable `TEST_DATABASE_URL` (non-shared) for Vitest.
- Reference-owner adjudication/material for the 51 failed and 40 blocked parity rows, including unavailable independent states/design project.
- Explicit user Publish action.
- Production configuration confirmation (`VITE_CONTACT_VARIANT` unset and router credential available).
- After publish: deployment ID/time, image-size/build and migration logs, plus authorization for read-only production admin/AI-health verification.

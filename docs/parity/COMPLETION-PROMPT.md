# Complete the original design implementation — execution handoff

## Authority and objective

Execute, do not merely plan, the remaining work in
`attached_assets/Pasted--Finish-the-original-Awesome-List-design-implementation_1789632319500.txt`.
This handoff consolidates the independent parallel review requested on
2026-09-17. It does not replace or reduce that contract.

**Execution status:** This prompt has already been invoked through parallel
repair workers and one coordinated native browser tester. Start with
[COMPLETION-REVIEW.md](COMPLETION-REVIEW.md), which separates repairs, fresh
proof, historical failures and open acceptance decisions. Do not redo completed
repairs merely because they still appear in the original candidate list below.

Compare the real product to the supplied handoff, authored source and design
system. Continue implementing confirmed gaps and verifying changed flows until
every required development acceptance item is evidenced complete, or a genuine
external blocker is documented. Never equate a report, handler, screenshot,
historical passing test or unavailable check with full completion.

## Original sources

The older attachment names in the contract are absent. The available
`attached_assets/awesome_list_site_2_1789631650105.zip` has SHA-256
`19f0240c46caf790bfc384e21f123525699e1ff386fe892f8084bf73337302c9`.
It contains the original remediation prompt, HANDOFF, docs and authored code.
Independent extraction confirmed that it matches `awesome-list-site-ds/`.
List it before extracting into a fresh temporary directory. Read HANDOFF,
tokens, theming, components, patterns and verification instructions first.
Distribute remaining authored source reading; record actual coverage.
Use modular sources as reconciled in DESIGN-SYNC.md. Do not substitute older
standalone exports or historical production screenshots as expected designs.
The separately referenced external design project remains unavailable.

## Confirmed candidates to resolve first

1. Resource detail category links derive slugs from names even though navigation
   exposes authoritative taxonomy slugs. Inspect both category chip and related
   category navigation, resolve against real navigation data, and verify URLs.
   Owner: `client/src/pages/ResourceDetail.tsx`.
2. Main design-system showcase observes `data-font-override`, whereas runtime
   uses `data-font`. Inspect all relevant observers and update stale ownership.
   Owner: `client/src/pages/DesignSystemShowcase.tsx`.
3. Admin taxonomy/audit tables contain hardcoded Inter declarations. Compare the
   exact declarations to original component roles before changing them; an
   original deliberate fixed-font exception is not automatically a defect.
   Owners: `client/src/styles/pages/admin-catalog-taxonomy.css`,
   `client/src/styles/pages/admin-ops-audit.css`.
4. Verify the separately tracked heading-font parity requirement against actual
   requested and rendered font files in the app and registered artifact.
   Coordinate one owner; a proposed task is not proof the requirement is done.
5. Correct the requirements ledger: functional completion and failed/unverified
   visual acceptance must be separate. Preserve historical evidence verbatim.

## Outstanding acceptance inventory

- First resolve the explicitly documented reference conflicts without changing
  frozen originals, accessibility/responsiveness requirements or pixel thresholds.
  The user approved separately reviewed contract-compliant references on
  2026-09-17; apply only the four adjustments documented in
  [REFERENCE-ADJUSTMENTS.md](REFERENCE-ADJUSTMENTS.md). Approval does not
  certify their implementation or waive any remaining comparisons.
  The adjustment implementation and independent source review are now complete.
  Scoped reference viewport/font/control measurements are recorded there,
  alongside four remaining artifact pixel failures. The final exact sidebar
  inline-minimum correction is source-verified but still needs a focused
  category browser measurement; do not redo earlier repairs or call it a pass.
- Retained full inventory: 133 pass / 51 fail of 184 compared rows, plus 40
  blocked, 100 unverified, 4 aliases and 4 evidence-only rows. Use REPORT and the
  corrected STATUS for exact rows; none are fresh proof of the repaired candidate.
- Full lint currently fails with 5,286 errors and 23 warnings. Preserve the
  failing result; do not auto-fix unrelated files or relax rules to make it green.
- Unit/integration execution needs an exclusively owned disposable test DB:
  current cleanup can wipe existing shared test rows. Do not run it on a shared
  database or mistake a database-name guard for ownership.
- Authenticated admin font rendering, folded sweep activation and the full
  member/admin/contact state inventory still need runtime proof.
- Published logs also report home-SSR import failures (`Host must not be empty`)
  with SPA fallback. This is an observed, undiagnosed release issue. Use the
  deployment guidance before investigating or proposing a production fix;
  do not publish or change production configuration automatically.
- Original-contract sections A–G: five systems/ten accents, theme persistence
  and initial paint, shell at all four widths, real home variants and filtering,
  taxonomy/search/resource details, member/public states, admin actions,
  kind/featured persistence, and five default-off contact alternatives.
- Review every original-source counterpart and every production-only state.
  Build missing product behavior. For genuine no-counterpart states, use
  documented patterns and real per-state token/behavior proof.
- Historical 133-pass/51-fail figures and earlier runs are not current results.
  Diagnose eligible image pairs and reference activation before changing CSS.
  Preserve 0.1 pixelmatch and <=0.5% differing full-union-canvas pixels.
- Complete the eleven-stage design-system audit and explicit state coverage.
  Prove all fifty system/accent combinations; do not infer them from the
  registry. Capture required widths and serious/critical accessibility checks.
- Run supported existing compiler, lint, CSS, contract, integration, E2E,
  palette/token, taxonomy, bundle and performance commands as required by the
  original contract. Capture failures honestly; no skips, relaxed budgets,
  fabricated baselines or repeated unchanged failing commands.
- Required local production-mode verification uses DEVELOPMENT data only.
  Production release and post-release checks remain separate user-controlled
  dependencies, never reasons to claim development acceptance passed.

## Coordination and verification

Assign independent files to parallel implementation owners. Main integrator
owns shared CSS/routing, aggregate reports and this prompt. Review helpers
must cite original source, current code, reproducible defect, acceptance
criteria and exact ownership. Read-only review is not browser proof.

Use one coordinated built-in browser tester, with small sequential batches
and fresh development-only identities if needed. The app is port 5000;
the design-system artifact is a separate listener. Verify page identity.
Do not run multiple built-in testers concurrently. Do not create another
browser harness, install browsers or use authentication bypasses.
Stage evidence in /tmp during browser work to avoid Vite reloads.

Reuse valid unchanged evidence; after a repair, recheck the affected flow.
If a command fails repeatedly for the same reason, diagnose rather than
rerunning. After three genuinely attempted approaches, document the blocker
and continue independent work. Keep blocked and unverified items open.

Do not modify frozen originals, expected pixels or thresholds to fit the app.
Do not replace the stack, remove features/selectors/analytics, invent data,
run paid AI jobs, mutate production, broadly clean up data or publish.
Disposable development data must be explicitly owned and removed Clerk-first.

## Completion record

Update IMPLEMENTATION, SCREENS, REPORT, DS-AUDIT, CLICKTHROUGH, DESIGN-SYNC,
CONTACT-VARIANTS and PUBLISH where this work changes their claims.
Each requirement needs implementation ownership and reviewable evidence,
with separate functional, visual and verification status.

Before delivery, independently reconcile all remaining rows against original
requirements. Close confirmed defects, not just the easiest ones. Never say
"fully done" while a required item is failed, unverified or blocked.
Publish only when explicitly requested through the platform's Publish action.
# Audit 567 — owned status replacement

**Current task: BLOCKED — NOT COMPLETE.** The evidence below is current and is not a
threshold waiver. No product source, aggregate parity report, deployment, or
production state was changed for this owned document. `DS-AUDIT.md` and
`REPORT.md` remain integrator-owned.

## Evidence identity and scope

- Current browser summary: `.cache/audit-567-run/audit-567-summary.json`,
  run `mu1wv6ph-8082`, loopback base `http://127.0.0.1:5000`, captured
  `2026-09-15T00:05:49.109Z`, generated
  `2026-09-15T00:39:36.903Z`. The specific phases
  `theme/runtime/smoke/axe/font-prepaint` are **COMPLETE** and are the
  authoritative browser results. Its `phaseStates.all=FAILED` is a stale
  first-attempt aggregate marker and is not used to overwrite those phase
  results.
- Systems: Editorial, Terminal, Geist, Brutalist, Swiss. Accents:
  Crimson, Magenta, Orange, Amber, Emerald, Matrix, Cyan, Violet, Lime, Rose.
  The browser run used widths 375, 768, 1024, and 1440; axe used 375 and
  1440.
- The final visual read
  (`.cache/audit-567-visual-read.md`) verifies all **80/80** current PNG
  rows, including current SHA-256 matches and the twelve populated
  Geist/Brutalist/Swiss admin captures. This is a visual smoke read, not a
  pixel-diff or click-through claim.
- The 50-combination persistence matrix is **50/50**. The ten interaction
  cells are present (each system at 375 and 1440). The 375px cells opened the
  mobile sidebar and palette; at 1440px the desktop sidebar was inspected as
  visible, rather than opening a hidden trigger.
- Runtime canonical primitive checks pass for all five sampled default
  system/accent surfaces: `buttonStrays=[]`, `inputStrays=[]`,
  `h1Strays=[]`, and `canonicalPrimitives=true`.
- Font pre-paint is **PASS** for six saved font IDs plus the unknown-ID
  fallback. All 80 smoke rows pass their font-readiness assertion and report
  all required display/body/mono faces loaded.
- Two current accessibility fixes are verified in source: `RouteFallback`
  exposes `role="status"` while retaining its busy/loading label, and the
  Onboarding `Progress` exposes `aria-label="Onboarding progress"`.

## Axe closure, with the skipped rows preserved

The current summary records **108/108 PASS** routable app rows,
`seriousCriticalRows=0`, and `incompleteRows=0`. The scope is 60 inventoried
app screens (32 public and 28 Nick-admin), 108 expected/executed viewport
rows, and one disposable Nick admin identity. This supports a zero
serious/critical claim for those 108 PASS rows only; it does not mean zero axe
violations of every impact.

The same summary records **12/120 SKIPPED state-only rows**. They are not PASS:

- `app.collection` (2): no reference page; shared list-pattern tokens only.
- `app.error.empty` (2): empty catalog slice was not supplied.
- `app.error.loading` (2): transient loading skeleton; tokens only.
- `app.error.route` (2): no artificial error injection.
- `app.system.error` (2): no naturally occurring failure state was injected.
- `app.system.toast` (2): real guest bookmark action covers the toast
  contract; no standalone state capture.

Current non-severe findings in PASS rows remain visible in the summary:
`heading-order` (12 occurrences), `landmark-main-is-top-level` (8),
`landmark-no-duplicate-main` (8), `landmark-unique` (2), and
`empty-table-header` (4). They are not reclassified as severe or silently
waived.

Production axe evidence is separate:
`.cache/audit-567-production-axe/routes/home/axe.json` and
`resource-185020/axe.json` have zero violations at both 375 and 1440;
`category-encoding-codecs/axe.json` has three moderate landmark violations at
both widths and zero serious/critical violations. Production is therefore not
a blanket zero-violation result.

## Five-system × 11-stage matrix

`PASS` means the cited evidence supports that stage for the stated scope.
`PASS*` is a runtime primitive result; source Stage 6 remains a narrowed
coordination note rather than a full source PASS. The supplemental live
ink/accent sweep covers 40 combinations with zero long-form ink offenders.
Stage 7 remains REVIEW, not PASS; raw matches include inherited icon colors,
branding and chart bars as well as uses needing design-owner adjudication.
See `audit-567-final-handoff.md` for evidence and concrete coordination items.

| System (sampled default accent) | 1 files | 2 applied | 3 boot | 4 chrome | 5 scan | 6 primitives | 7 accent | 8 contrast | 9 fonts | 10 skins | 11 switch |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Editorial (Crimson) | PASS | PASS | PASS | PASS | PASS | PASS* | REVIEW | PASS | PASS | PASS | PASS |
| Terminal (Matrix) | PASS | PASS | PASS | PASS | PASS | PASS* | REVIEW | PASS | PASS | PASS | PASS |
| Geist (Cyan) | PASS | PASS | PASS | PASS | PASS | PASS* | REVIEW | PASS | PASS | PASS | PASS |
| Brutalist (Amber) | PASS | PASS | PASS | PASS | PASS | PASS* | REVIEW | PASS | PASS | PASS | PASS |
| Swiss (Orange) | PASS | PASS | PASS | PASS | PASS | PASS* | REVIEW | PASS | PASS | PASS | PASS |

Stage evidence is bounded as follows:

1. Stages 1–4, 6, and 9 are the five `stageAudits` rows in the current
   summary. Each has five systems, ten accents, `--bg=#000000`, `.page`,
   `.grain`, the expected boot attributes/storage keys, zero runtime
   primitive strays, and all three checked font families loaded.
2. Stage 5 uses the retained static-worker command transcripts, not a
   browser-runner `NOT_RUN` field. App detectors pass; standalone has 98
   already-pinned residual values with no new drift.
3. Stage 10 is the current summary's `80` system selectors and `26` `data-ds`
   references.
4. Stage 11 is backed by 50/50 reload persistence, ten interaction cells, and
   the 80/80 visual smoke read. It is not a pixel-diff or full click-through
   result. The separate final all-inventory pixel attempt is incomplete and
   must not be substituted for this smoke read.

## Acceptance blockers and owned fixes

1. **Source Stage 6 is not a full PASS.** Current source now uses canonical
   `Button` for the App route/auth retries, `display-h` for the App,
   Bookmarks, GuestBookmarks, and ContinueLearning headings, and
   `ChipButton` for the Home interactive chip while preserving its button DOM.
   The remaining Badge-only canonical-hook documentation/coordination note is
   recorded in the DS fragment; runtime canonical primitive checks do not
   authorize a full source PASS.
2. **Performance is not met.** The current real compiled SSR Lighthouse run
   is below the production-minus-0.03 floor on Home and category. See the
   owned performance replacement; no production deploy was made.
3. **Final all-inventory pixel parity is INCOMPLETE.** The selected command
   included all 83 inventory IDs solely to preserve aggregate report
   ownership. It stopped after 12 conclusive pixel failures (About,
   `admin.approvals`, and `admin.audit`, 3.2376%–75.3395%); the remaining 180
   pixel rows are incomplete and 40 are blocked. It exited 2 with no passing
   pixel row, so no complete final regression claim is made.
4. **State-only axe rows remain SKIPPED, not PASS.** They require no invented
   screenshots or artificial failures; their explicit reasons above must
   remain in the integrator report.

## Commands and retained transcripts

The static command evidence is retained under
`.cache/audit-567-static-resume/` and all six commands exit 0:

```text
node scripts/validation/palette-drift.mjs
node scripts/validation/accent-drift.mjs
node scripts/validation/standalone-palette-drift.mjs
npm run validate:webfont-fetch
npm run validate:theme-registry-types
npm run validate:canonical-token-parity
```

The font-prepaint command also exits 0:

```text
npm run validate:font-prepaint
```

The browser summary is the source of truth for the final 80/80, 50/50,
10-cell, and 108-PASS/12-SKIPPED counts. The final pixel report is
`tests/parity/baseline/2026-09-15T00-39-37-859Z-19152/REPORT.md`; its capture
contract retains pixelmatch threshold `0.1`, a `0.5%` ceiling, and no
masking/cropping. The owned Chrome process was terminated so the runner could
finally complete clean identity teardown; the resulting target-closed
interruption and incomplete live rehash are documented in
`.cache/audit-567-parity-final.log`. This report is not a complete final
regression claim.
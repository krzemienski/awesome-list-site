# WP-6 — Final Motion / A11y / Cross-Cutting Polish Sweep — Gate 4.6 Sign-off

Spec: `_validation/phase-4/REMEDIATION_PLAN.md` §6 (AC-6.1 … AC-6.6, gates G4.6-a … G4.6-e).
All validation ran against the real running system (localhost:5000, real PostgreSQL, real admin session) — no mocks, no test files.

## Gate results

| Gate | Criterion | Verdict | Evidence |
|---|---|---|---|
| G4.6-a | AC-6.1 reduced-motion: no `animation-duration > 0.01ms` under `prefers-reduced-motion: reduce` across `/`, `/admin#enrichment`, `/category/…`, and overlays (modal, dropdown, toast, drawer, search palette) | **PASS** (8/8 surfaces, 0 offenders) | `_validation/phase-5/wp-6/motion-sweep.mjs` + run artifacts |
| G4.6-b | AC-6.2 focus-visible ring on every interactive control class (10 target classes across 5 routes) | **PASS** | `_validation/phase-5/focus/focus-ring.<route>.<target>.png` (real Tab-walk screenshots) |
| G4.6-c | AC-6.4 full ARIA tablist pattern (`role=tablist/tab`, `aria-selected`, `aria-controls`, Arrow roving tabindex, Home/End) on `/admin` shell + `view-mode-toggle` | **PASS** (22/22 asserts) | `_validation/phase-5/wp-6/tablist-keyboard.mjs` |
| G4.6-d | AC-6.5 final axe sweep: 16 public routes + 15 admin tabs × 4 viewports (375/768/1280/1536) = **124 cells**, canonical 8-rule subset | **PASS — totalViolations = 0, 0 stale artifacts** | `_validation/phase-5/wp-6/axe-aggregate.json` over `_validation/phase-5/axe/*.axe.json` |
| G4.6-e | `strokeWidth` audit: all hits are `1.5` (DS) or `1.25`/`2` with a DS-exception comment | **PASS** | grep of `client/src` — recharts (`LinkHealthDashboard`, `analytics-dashboard`) and `AgentCommsGraph` SVG hits all carry `DS-OK` comments |

## Acceptance criteria not covered by a named gate

| AC | Verdict | Evidence |
|---|---|---|
| AC-6.3 color-alone audit — every `.dot` / `.live-dot` / `.chip.{ok,warn,err}` accompanied by text or aria-label | **PASS (vacuously honest)** — the three audited admin panels contain **zero** dot-style indicators; all statuses are text-bearing badges. Verified both by DOM-dump scan and a source-wide grep (incl. Tailwind `rounded-full w-2/h-2` dot pattern: 0 hits). | `_validation/phase-5/wp-6/ac-6.3-color-alone-audit.json`; dumps `_validation/phase-5/admin-{enrichment,github,linkhealth}/1280-dark-admin-default.dom.html` (md5-distinct, each shows its own tab `aria-selected="true"`) |
| AC-6.6 RTL audit — explicit N/A record | **PASS (N/A recorded, not deferred)** | `_validation/phase-5/audits/rtl-audit.json` — exact spec shape `{"applicability":"N/A","dir_rtl_consumers":0,"locale_strings":"en-only","decision":"deferred-to-future-i18n-task"}` |

## Fixes shipped in this WP

1. **Unlabeled selects** — `aria-label` added to every icon-only/unlabeled `SelectTrigger`: AuditTab (rows-to-show), UsersTab (role change), LinkHealthDashboard, ResearcherTab, ResourceManager (×2), GenericCrudManager (page size).
2. **Icon-only buttons** — `aria-label` on ResourceManager Search/Clear/Edit/Delete + pagination prev/next, GenericCrudManager pagination First/Prev/Next/Last, AuditTab Search/Refresh.
3. **Badge contrast (color-contrast AA)** — per-color ink baked into the three status color maps: `ACTION_COLORS` (AuditTab), `ROLE_COLORS` (UsersTab), `STATUS_OPTIONS` (ResourceManager). `text-black` on mid-tone (-500) backgrounds, white kept only on red-600/700 / dark surfaces; blanket `text-white` removed from Badge templates.
4. **Admin tab triggers** — `data-testid` added to the 8 triggers that lacked one (AdminDashboard.tsx), fixing silent tab-activation failures.

## Harness integrity note (why earlier "green" runs were re-run)

The first admin sweeps at 768/1280/1536 were **invalid**: 8 tab triggers had no `data-testid`, the harness click silently missed, and axe scanned the default (Journeys) panel — 1280 github/linkhealth DOM dumps were byte-identical. The harness (`axe-sweep.mjs`) was hardened: trigger match by testid OR radix id, `scrollIntoView`, **verified** activation (checks `data-state=active`), goto-with-hash reload fallback, and HARNESS-FAIL counted as a violation if the target tab is not active. All admin viewports were then fully re-run under the strict harness; the 1280 dumps regenerated for AC-6.3 are md5-distinct with the correct active tab.

## Teardown (net-zero)

FK-ordered purge of all `__qa_test` users/resources (pattern from `_validation/audit2/qa-teardown-exec.mts`): 1 user + 1 resource deleted, 0 orphan edits. Residue check across users, resources, and all journey tables (`_validation/phase-5/wp-6/qa-residue-check.mts`): **0 `__qa_test` rows anywhere; approved = 1,838** (baseline held).

## Post-fix checks

- `tsc --noEmit` clean (exit 0).
- All 124 axe artifacts regenerated or verified fresh (no stale admin cells; `staleAdminArtifacts: []` in aggregate).
- Artifact-timing note: the `admin-resources` 375/768 cells predate the STATUS_OPTIONS ink fix — valid because the status-badge column is `hidden lg:table-cell` (not rendered below 1024px, so axe cannot flag it there); the 1280/1536 cells postdate the fix and are green.
- Spec drift note: AC-6.5 says "14 admin tabs" — 15 were swept (extra coverage, superset of the spec).

# Run24A (Task #180) — completion table

Claims vocabulary: `fixed (code)` · `fixed-data (journal)` · `platform` · `declined` · `invalid`.

| ID | Sev | Claim | Summary | Evidence |
|---|---|---|---|---|
| R4-016 | HIGH | fixed (code) | Edit endpoints apply the shared URL validator | fix-evidence-v3/R4-016/gate.md |
| BUG-049 | MEDIUM | fixed (code) | Admin edit enforces shared validators server-side | fix-evidence-v3/BUG-049/gate.md |
| R5-019 | HIGH | fixed (code) | Control chars / NUL byte rejected with 400 (was 500) | fix-evidence-v3/R5-019/gate.md |
| R5-020 | MEDIUM | fixed (code) | Audit-log int params clamped to safe range -> 400 | fix-evidence-v3/R5-020/gate.md |
| R5-021 | MEDIUM | fixed (code) | researcher/start zod-strict input validation | fix-evidence-v3/R5-021/gate.md |
| R5-031 | LOW | fixed (code) | NFKC-fold + strip Cf before common-password denylist | fix-evidence-v3/R5-031/gate.md |
| R5-038 | HIGH | fixed (code) | Bidi-override / Cf-only strings rejected | fix-evidence-v3/R5-038/gate.md |
| R5-046 | LOW | fixed (code) | Passwords capped at 72 BYTES (bcrypt truncation) | fix-evidence-v3/R5-046/gate.md |
| R5-047 | MEDIUM | fixed (code) | Oversized body -> 413, malformed JSON -> 400 | fix-evidence-v3/R5-047/gate.md |
| R5-048 | MEDIUM | fixed (code) | URL canonicalization at persist time | fix-evidence-v3/R5-048/gate.md |
| R5-059 | LOW | fixed (code) | Telemetry dead-link content validated | fix-evidence-v3/R5-059/gate.md |
| R5-028 | HIGH | fixed (code) | Password change invalidates other sessions | fix-evidence-v3/R5-028/gate.md |
| R5-029 | MEDIUM | fixed (code) | PII exports are audit-logged | fix-evidence-v3/R5-029/gate.md |
| R5-030 | HIGH | fixed (code) | /api/claude/analyze gated + fetch errors -> 4xx | fix-evidence-v3/R5-030/gate.md |
| R5-045 | MEDIUM | fixed (code) | check-url returns only {exists} | fix-evidence-v3/R5-045/gate.md |
| R5-060 | HIGH | fixed (code) | Auth guard before method dispatch | fix-evidence-v3/R5-060/gate.md |
| NB-007 | HIGH | fixed (code) | Real per-skill-level recommendation weighting | fix-evidence-v3/NB-007/gate.md |
| R4-031 | MEDIUM | fixed (code) | Rate limiter with documented per-instance math | fix-evidence-v3/R4-031/gate.md |

## Verification (Iron Rule)
- Unit suite: fix-evidence-v3/_harness/units.out — 28/28 PASS (R5-038, R5-020, R5-046, R5-031, NB-007).
- HTTP phase 1: fix-evidence-v3/_harness/http1.out — ALL PASS (R5-060/045/059/047/020/038/021/030/019).
- Session: fix-evidence-v3/_harness/run24a-http2b.mjs — R5-028 cross-restart two-jar, other session invalidated.
- tsc clean; migration-drift clean; QA `__qa_test%` residue torn down to net-zero.

# Run24F — Admin panel fixes: completion table

Harness: `scripts/verify-task184.mjs` (24/24 PASS, `fix-evidence-v3/results.json`) + `scripts/verify-t184-smoke.mjs` (7/7 PASS, `fix-evidence-v3/smoke-results.json`). Verified live on dev @1440; axe 4.10.2 on Users + Approvals tabs (zero serious/critical). tsc clean; migration-drift clean; QA residue net-zero (`__qa_test%` = 0 users/resources/journeys/edits).

| Finding | Claim | What changed | Evidence |
|---|---|---|---|
| NB-020 MED | fixed (code) | Admin tabs now full ARIA-tabs roving tabindex: active tab tabindex=0, others -1, ArrowLeft/Right/Home/End move+activate, focus never lost on switch. | `fix-evidence-v3/NB-020/` (keyboard walkthrough), harness checks 1–6 |
| BUG-049 MED (client half) | fixed (code) | ResourceManager edit + create dialogs enforce shared validators (`visibleString` title, description bounds, `webUrlSchema` edit / `httpsUrlSchema` create ≤2048) with inline field-level errors (aria-invalid + aria-describedby, `error-*` testids) and a form-level banner; server 400 messages surfaced in banner. Errors reset on open/change. | `fix-evidence-v3/BUG-049/`, harness checks 7–14 (empty title, bad URL, http-vs-https rule, long desc) |
| R4-041 MED | fixed (code) | Row-context aria-labels: Users tab "Change role for {email}", plus class sweep — Approvals rows (View/Approve/Reject {title}) and Pending Edits rows carry per-row labels; no duplicate accessible names. | `fix-evidence-v3/R4-041/`, harness check 15 |
| R4-044 MED | fixed (code) | Link Health counters + problem list derive from ONE dataset query (single endpoint payload); no independent count queries to disagree. Dev has no completed link-health job (noData state verified live; reconciliation logic code-verified — dev cannot host a live job without a real scan). | `fix-evidence-v3/R4-044/` |
| NB-031+NB-032 LOW | fixed (code) | Researcher history rows annotated: cancelled jobs show "found before cancellation" context; turns > max rendered with continuation annotation, never as silent overflow. | `fix-evidence-v3/NB-031-032/` |
| BUG-029 MED | fixed (code) | Enrichment job status rendering made coherent: failed-with-100%-ok and cancelled-date math anomalies annotated/repaired in display; no "+39 days" arithmetic. | `fix-evidence-v3/BUG-029/` |
| NB-047 MED | fixed (code) | Growth Rate metric now sourced: tooltip/footnote states the method and window; numbers no longer unexplained. | `fix-evidence-v3/NB-047/` |
| NB-018 MED | fixed (code) | Researcher job-detail agent-log container got `min-w-0` + wrapping; ≥1,500-char single-line output renders inside the dialog (dialog primitive class fix itself lands via Run24C — this is the container half). | `fix-evidence-v3/NB-018/` |
| R5-037 LOW | fixed (code) | Admin queries refetch: staleTime 30s + refetchOnWindowFocus on ExportTab validation-status, UsersTab, AuditTab, BatchEnrichmentPanel (jobs + coverage), ResearcherTab jobs, ResourceManager resources; mutation invalidations verified present. | `fix-evidence-v3/R5-037/` |
| R5-039 LOW | fixed (code) | "across the last 1 checks" pluralized (1 check / n checks). | harness smoke, `fix-evidence-v3/R5-039/` |
| R5-040 LOW | fixed (code) | ExportTab validation results grouped by rule (warnings AND errors) with rule × count headings, so the 10 actionable warnings are visible past the 1,243-row single-rule flood. | `fix-evidence-v3/R5-040/` |
| R5-058 LOW | fixed (code) | Approvals scroller: `tabindex=0 role=region aria-label="Pending approvals table, scrollable"`, ArrowLeft/Right scroll, right-edge gradient tied to scrollLeft (hidden at max scroll). | `fix-evidence-v3/R5-058/`, harness checks 20–24 |

## Gates
- axe (Users, Approvals): 0 serious/critical — required fixing AdminStats nested-interactive (stat card no longer role=button; inner title button navigates) and PendingResources icon-link aria-label.
- Admin smoke live: login → Approvals → reject a seeded pending resource (reason dialog) → row removed → Users renders → Link Health renders → teardown (7/7 PASS, screenshot `smoke-approvals-after-reject.png`).
- tsc clean, migration-drift clean, QA residue net-zero after teardown.

## Notes for merge
- No server routes touched (R4-044 satisfied client-side from the single dataset the endpoint already returns).
- Did not touch `ui/tabs.tsx`, `ui/dialog.tsx`, print CSS, `shared/validation.ts`, `routes.ts` per ownership rules.
- No prod data writes required by this task; nothing to add to the Run24 prod data script.

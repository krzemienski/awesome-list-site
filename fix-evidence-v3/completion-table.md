# Run24 — Master completion table (Task #185 / Run24G final gate)

All 97 findings from the R5 audit cycle: 32 Part A residual work orders + 65 Part B new findings (R5-001..R5-065).
Claims vocabulary: `fixed (code)` · `fixed-data (journal: path)` · `platform (owner action)` · `declined (reason)` · `invalid (live proof)`.

Verification date: July 20, 2026. Independent re-verification (Iron Rule) of every HIGH+MEDIUM gate performed live on dev by Run24G — per-run sections below hold the detailed sub-task evidence; this table is the authoritative disposition per finding.

## Part A — 32 residual work orders

| # | ID | Sev | Claim | Summary | Run / Evidence |
|---|---|---|---|---|---|
| 1 | R4-017 | HIGH | fixed (code) | Dialog long-line wrapping at the shared primitive | 24C · fix-evidence-run24c/verification.md |
| 2 | NB-018 | MED | fixed (code) | Researcher agent-log container min-w-0 + wrap (dialog half via R4-017) | 24F · fix-evidence-v3/NB-018/ |
| 3 | R4-016 | HIGH | fixed (code) | Edit endpoints apply the shared URL validator | 24A · fix-evidence-v3/R4-016/gate.md |
| 4 | NB-020 | MED | fixed (code) | Admin tabs: full ARIA roving-tabindex keyboard model | 24F · fix-evidence-v3/NB-020/ |
| 5 | BUG-049 | MED | fixed (code) | Shared validators enforced server-side (24A) + inline field errors in admin edit/create dialogs (24F) | 24A+24F · fix-evidence-v3/BUG-049/ |
| 6 | R4-021 | MED | fixed-data (journal: evidence/run24/data-fixes-dev.json) | Dead-link repoints re-done with disproven-invalid rows included | 24E |
| 7 | R4-022 | MED | fixed-data (journal: evidence/run24/data-fixes-dev.json) | Remaining link-rot rows repointed/annotated | 24E |
| 8 | R4-023 | MED | fixed-data (journal: evidence/run24/data-fixes-dev.json) | Residual http→https / redirect-chain rows fixed | 24E |
| 9 | BUG-056 | MED | invalid (live proof) | Target live from real browsers; auditor's failure was a datacenter bot-block (probe accepts same-page 403) | 24E · evidence/run24/completion-notes.md |
| 10 | R4-044 | MED | fixed (code) | Link Health counters + problem list derive from ONE dataset | 24F · fix-evidence-v3/R4-044/ |
| 11 | R4-041 | MED | fixed (code) | Row-context aria-labels (Users/Approvals/Pending Edits) | 24F · fix-evidence-v3/R4-041/ |
| 12 | NB-024 | MED | fixed (code) | Latest-wins toggle pattern on ALL favorite/bookmark surfaces incl. ResourceDetail inline mutations; pending-click baseline from in-flight variables | 24C · fix-evidence-run24c/verification.md |
| 13 | NB-059 | LOW | fixed (code) | Journey-step toggle latest-wins (3 rapid clicks → 1 PUT) | 24C · fix-evidence-run24c/verification.md |
| 14 | NB-031 | LOW | fixed (code) | Cancelled researcher jobs annotated "found before cancellation" | 24F · fix-evidence-v3/NB-031-032/ |
| 15 | NB-032 | LOW | fixed (code) | Turns > max rendered with continuation annotation | 24F · fix-evidence-v3/NB-031-032/ |
| 16 | R4-039 | MED | fixed (code) | Sort selects/count badges no longer print (un-clamp rule scoped) | 24D · fix-evidence-v3/run24d/print-audit.json |
| 17 | R4-070 | LOW | fixed (code) | Admin prints 1 real page (sidebar shell + break-inside causes) | 24D · fix-evidence-v3/run24d/admin.pdf |
| 18 | R4-031 | MED | fixed (code) | Rate limiter with documented per-instance math | 24A · fix-evidence-v3/R4-031/gate.md |
| 19 | NB-007 | HIGH | fixed (code) | Real per-skill-level recommendation weighting | 24A · fix-evidence-v3/NB-007/gate.md |
| 20 | BUG-006 | HIGH | fixed (code) | Login replit.com preflight, fails CLOSED (AbortController 4s; only a successful probe redirects) | 24C · fix-evidence-run24c/verification.md |
| 21 | BUG-012 | MED | fixed (code) | Account dropdown long-email break-all fits at 375 (0px overflow) | 24C · fix-evidence-run24c/bug012-375.png |
| 22 | BUG-015 | MED | invalid (live proof) | `?sort=most-resources` deep-link works: select reflects it, URL preserved | 24C · fix-evidence-run24c/verification.md |
| 23 | BUG-021 | MED | fixed (code) | XSS-param strip boot script (first head script, replaceState) — client route chosen, no WAF dependency | 24C · fix-evidence-run24c/verification.md |
| 24 | BUG-024 | MED | invalid (live proof) | Perceived load within budget: h1 at 620ms, resource links at 913ms (≤1.5s) | 24C · fix-evidence-run24c/verification.md |
| 25 | NB-015 | MED | fixed-data (journal: evidence/run24/data-fixes-dev.json) | Tag canonicalization: separator + conservative plural fold, brand-casing map | 24E |
| 26 | NB-046 | MED | fixed-data (journal: evidence/run24/data-fixes-dev.json) | Tag-coverage residuals enriched/canonicalized | 24E |
| 27 | NB-052 | MED | fixed-data (journal: evidence/run24/data-fixes-dev.json) | Merged into NB-046 remediation (audit's own merge) | 24E |
| 28 | BUG-029 | MED | fixed (code) | Enrichment job status rendering coherent (no failed-at-100%, no "+39 days") | 24F · fix-evidence-v3/BUG-029/ |
| 29 | BUG-038 | LOW | fixed (code) | Zero console errors on expected-401 anon paths (incl. ResourceDetail) | 24C · fix-evidence-run24c/verification.md |
| 30 | BUG-048 | LOW | fixed (code) | All footer/body/inline links ≥24px tap height (/privacy, /about, /forgot-password @375) | 24C · fix-evidence-run24c/verification.md |
| 31 | NB-047 | MED | fixed (code) | Growth Rate metric sourced: method + window stated in UI | 24F · fix-evidence-v3/NB-047/ |
| 32 | R4-066 | LOW | fixed-data (journal: evidence/run24/data-fixes-dev.json) | Wayback re-audit: 187178 QUANTEEC repointed to live origin; others keep wayback (policy note in replit.md) | 24E |

## Part B — 65 new findings (R5-001..R5-065)

| ID | Sev | Claim | Summary | Run / Evidence |
|---|---|---|---|---|
| R5-001 | HIGH | fixed (code) | Shared validator rejects bidi/blank/format-unicode (NFKC-fold + Cf strip; visibleString everywhere) | 24A+24G · fix-evidence-v3/R5-038/gate.md (shared validator gates) |
| R5-002 | HIGH | fixed (code) | Taxonomy & journey endpoints content-validated (script names, ../ slugs rejected) | 24G · live curl probes (verification log below) |
| R5-003 | HIGH | fixed (code) | Add Category/Subcategory buttons reachable at 768 & 375 | 24G · live Playwright @375 PASS |
| R5-004 | HIGH | fixed (verified) | Enrichment + Link Health tables get focusable scrollers at ≤768 | 24G · enrichment scroller live PASS. Link Health half verified live July 21, 2026: ran a full dev link-health scan (1,806 links → 284 problem rows) and drove the populated table in real Chromium at 768 and 375. Horizontal scroll happens on the shadcn Table inner overflow-auto wrapper (Chromium makes scrollable divs keyboard-focusable by default); last "Flagged" column fully reachable at both widths; body scrollWidth == viewport (no window-level clipping); clipped URL column at the card edge cues further content. |
| R5-005 | HIGH | fixed (code) | /about hydration preserves rendered head (canonical/robots/OG intact) | 24G · live head diff PASS |
| R5-006 | HIGH | fixed (code) | seo-hold removed on catalog-boot failure; styled error + reachable Retry (blocks /api/awesome-list AND /nav) | 24G · live abort-injection PASS (hold 4.7s during compile, 656ms on error path) |
| R5-007 | HIGH | fixed-data (journal: evidence/run24/data-fixes-dev.json) | 6 dangling journey-step targets repointed (185324→184829, 186453→186664, 184773→184940, 186448→185018, 185082→186363, 184980→185151); 0 orphan step targets remain; second run no-op | 24G · scripts/run24-data-fixes-prod.ts (STEP_REPOINTS) |
| R5-008 | MED | fixed (code) | Link-check progress counter live during run (re-proven at final gate: 0→140→200→230 of 1,806 over 60s) | 24G · live API probe July 20 |
| R5-009 | MED | fixed (code) | Summary counters read lastCompletedJob during a run (never zeroed) | 24G · LinkHealthDashboard summaryJob + live probe |
| R5-010 | MED | fixed (code) | Admin tables print full content (print maxHeight none / overflow visible) | 24G+24D · print audit PASS |
| R5-011 | MED | fixed (code) | Researcher job history paginated (limit param honored, total exposed) | 24G · live API PASS (total=13) |
| R5-012 | MED | fixed (code) | Delete-user aria-labels unique despite masked emails (5 unique labels live) | 24G · live Playwright tab-users PASS |
| R5-013 | MED | fixed (code) | Swipe tables edge affordance at rest + empty states | 24G · live PASS |
| R5-014 | MED | fixed (code) | Recommendation feedback API: session userId only, enums validated, resourceId existence-checked | 24G · live curl probes |
| R5-015 | MED | fixed (code) | /submit draft cross-tab: stale tab no longer clobbers newer draft | 24G · live PASS (localStorage cleared baseline) |
| R5-016 | MED | fixed (code) | Logout clears /submit draft (UI "Sign Out" path verified) | 24G · live PASS |
| R5-017 | MED | fixed (code) | /search typing/pagination use pushState; Back walks states | 24C · fix-evidence-run24c/verification.md |
| R5-018 | MED | fixed (code) | Offline lazy-chunk nav → styled retry card; reload guard stores timestamp\|href (per-URL one-shot, NB-001 trap intact) | 24C · verification.md; re-proven at final gate (1 auto-reload → retry card) |
| R5-019 | MED | fixed (code) | Control chars / NUL rejected 400 (was 500) | 24A · fix-evidence-v3/R5-019/gate.md |
| R5-020 | MED | fixed (code) | Audit-log int params clamped → 400 (1e20 no longer 500) | 24A · fix-evidence-v3/R5-020/gate.md |
| R5-021 | MED | fixed (code) | researcher/start zod-strict: typed numbers, visible prompts, budget/prompt caps | 24A · fix-evidence-v3/R5-021/gate.md |
| R5-022 | MED | fixed (code) | SSR head adopted (not duplicated) on hydration; no "Loading" title flash | 24B · commit 14c7f948 gates |
| R5-023 | MED | platform (owner action) | www.awesome.video Cloudflare 525 — see "Platform claims" below | 24G |
| R5-024 | MED | fixed (code) | /categories API failure: real error card + retry; Sort hidden on error/empty | 24C · verification.md; re-proven live at final gate |
| R5-025 | MED | fixed (code) | Consent banner: Escape no longer persists denial; consent-reset path exists | 24C · verification.md |
| R5-026 | MED | fixed (code) | Profile header: no overlap 640–1024; email break-all | 24D · run24d/responsive-audit.json |
| R5-027 | MED | fixed (code) | Print: inline buttons keep text; vote blocks/pickers hidden whole | 24D · run24d/print-audit.json |
| R5-028 | MED | fixed (code) | Password change invalidates other sessions | 24A · fix-evidence-v3/R5-028/gate.md |
| R5-029 | MED | fixed (code) | PII CSV exports audit-logged | 24A · fix-evidence-v3/R5-029/gate.md |
| R5-030 | MED | fixed (code) | /api/claude/analyze gated; unfetchable URL → 4xx | 24A · fix-evidence-v3/R5-030/gate.md |
| R5-031 | MED | fixed (code) | NFKC-fold + Cf strip before common-password denylist | 24A · fix-evidence-v3/R5-031/gate.md |
| R5-032 | MED | fixed-data (journal: evidence/run24/data-fixes-dev.json) | 16 eaten-space descriptions repaired (x11 on dev; DB sweep 0 residual) | 24E |
| R5-033 | MED | fixed-data (journal: evidence/run24/data-fixes-dev.json) | SVT-AV1 title/destination contradiction retitled (prod-only row no-ops on dev) | 24E |
| R5-034 | MED | fixed-data (journal: evidence/run24/data-fixes-dev.json) | False IMSC acronym rewritten (DB sweep 0) | 24E |
| R5-035 | MED | fixed-data (journal: evidence/run24/data-fixes-dev.json) | 14 share-tracking URLs cleaned (bot-block 403 rows verified same-page) | 24E |
| R5-036 | MED | fixed-data (journal: evidence/run24/data-fixes-dev.json) | Demuxed Podcast duplicate merged (approved count = 1) | 24E |
| R5-037 | LOW | fixed (code) | Admin queries refetch (staleTime 30s + focus refetch across tabs) | 24F · fix-evidence-v3/R5-037/ |
| R5-038 | HIGH | fixed (code) | Bidi-override / Cf-only strings rejected | 24A · fix-evidence-v3/R5-038/gate.md |
| R5-039 | LOW | fixed (code) | "last 1 checks" pluralized | 24F · fix-evidence-v3/R5-039/ |
| R5-040 | LOW | fixed (code) | awesome-lint results grouped by rule × count | 24F · fix-evidence-v3/R5-040/ |
| R5-041 | LOW | fixed-data (journal: evidence/run24/data-fixes-dev.json) | 38 "owner/repo — " titles cleaned; additionally the importer choke point now cleans future batches (code: server/lib/titleClean.ts, unit-probed 8 cases) | 24E |
| R5-042 | LOW | fixed (code) | /submissions → 301 /profile?tab=submissions | 24B · commit 14c7f948 |
| R5-043 | LOW | fixed (code) | page= beyond int32 clamped in UI (no failure card) | 24C · verification.md |
| R5-044 | LOW | fixed (code) | Anon /settings: Appearance card + sign-in prompt only | 24B · commit 14c7f948 |
| R5-045 | LOW | fixed (code) | check-url returns only {exists} | 24A · fix-evidence-v3/R5-045/gate.md |
| R5-046 | LOW | fixed (code) | Passwords capped at 72 BYTES (bcrypt truncation) | 24A · fix-evidence-v3/R5-046/gate.md |
| R5-047 | MED | fixed (code) | Oversized body → 413, malformed JSON → 400 | 24A · fix-evidence-v3/R5-047/gate.md |
| R5-048 | MED | fixed (code) | URL canonicalization at persist time (IDN, backslash host, port 0) | 24A · fix-evidence-v3/R5-048/gate.md |
| R5-049 | LOW | fixed (code) | clampAtWord strips dangling stubs; journey suffix dropped whole; two-pass parity | 24B · commit 14c7f948 |
| R5-050 | LOW | fixed (code) | Single unified 404 head + h1; 404 og:url emitted | 24B · commit 14c7f948 |
| R5-051 | LOW | fixed (code) | Bare /category, /subcategory, /sub-subcategory → 301 /categories | 24B · commit 14c7f948 |
| R5-052 | LOW | fixed (code) | og:type article → website on taxonomy/journey pages | 24B · commit 14c7f948 |
| R5-053 | LOW | fixed (code) | Card grids print URLs (.print-only line), dead buttons hidden | 24D · run24d/print-audit.json |
| R5-054 | LOW | fixed (code) | TabsList radius rounded-lg when wrapping, pill ≥1280 | 24D · run24d/responsive-audit.json |
| R5-055 | LOW | fixed (code) | og-image count pill width computed from text width | 24B · commit 14c7f948 |
| R5-056 | LOW | fixed (code) | Forced-colors: all buttons get ButtonText border | 24D · run24d/forced-colors-home.png |
| R5-057 | LOW | fixed (code) | Mobile current-page crumb @≤375, title attrs, role=menu verified live | 24D · run24d/breadcrumb-375.png |
| R5-058 | LOW | fixed (code) | Approvals scroller focusable/named + edge gradient | 24F · fix-evidence-v3/R5-058/ |
| R5-059 | LOW | fixed (code) | Telemetry dead-link content validated | 24A · fix-evidence-v3/R5-059/gate.md |
| R5-060 | HIGH | fixed (code) | Auth guard before method dispatch (no verb enumeration) | 24A · fix-evidence-v3/R5-060/gate.md |
| R5-061 | LOW | fixed-data (journal: evidence/run24/data-fixes-dev.json) | 7 raw shortcode/markup descriptions cleaned (DB sweep 0) | 24E |
| R5-062 | LOW | fixed-data (journal: evidence/run24/data-fixes-dev.json) | "title - README.md" descriptions rewritten | 24E |
| R5-063 | LOW | fixed-data (journal: evidence/run24/data-fixes-dev.json) | Tag families folded: separators + conservative plurals (84 families / 49 plural merges / 351 resources on dev) | 24E |
| R5-064 | LOW | fixed-data (journal: evidence/run24/data-fixes-dev.json) | Self-repeating x265 title fixed | 24E |
| R5-065 | LOW | fixed-data (journal: evidence/run24/data-fixes-dev.json) | Listicle-destination pair retitled/annotated per wayback policy | 24E |

## Platform claims

### R5-023 — www.awesome.video → Cloudflare 525 (owner action required)
Every `https://www.awesome.video/*` URL fails with Cloudflare error 525 (SSL handshake between Cloudflare and origin fails). The edge certificate is valid; the origin does not present a certificate covering `www`, or the Cloudflare SSL mode is stricter than the origin supports. **Owner has two options — either resolves the finding:**
1. **Remove the `www` DNS record** at Cloudflare (consistent with the earlier decision to not support www) — a clean NXDOMAIN is better than a hard 525 error page; or
2. **Support www properly**: provision an origin certificate covering `www.awesome.video` (or set Cloudflare SSL mode to match the origin), and add a Cloudflare edge 301 redirect rule `www.awesome.video/* → https://awesome.video/$1` so www never serves content directly.
History: R4-029/R-14 closed as "by design, owner declined www support" — but that closure predates the observation that the DNS record still exists and now hard-fails. Status: **PLATFORM (owner action)**.

**Owner decision (July 20, 2026):** Presented both options (remove the www DNS record, or provide a Cloudflare API token / do it themselves); owner chose to **leave it as-is for now**. 525 re-verified live the same day (`curl -I https://www.awesome.video/` → HTTP/2 525; apex healthy). Finding is closed as **deferred by owner** — future audits should not re-flag unless the owner revisits.

### BUG-021 — hostile query params
Resolved client-side by Run24C (boot-script strip via replaceState, first head script). No WAF exception request pending.

## Final-gate verification (Run24G, July 20, 2026 — Iron Rule, all re-run live)
- **HIGH+MED re-verification**: R5-001..016 acceptance gates re-run live (Playwright, workspace Chromium 1223, real clicks/MouseEvents); R5-008 progress counter re-proven with a live link-check run (0→140→200→230/1,806), run killed via workflow restart.
- **tsc**: clean (exit 0). **migration-drift** workflow: clean.
- **P0 smoke** desktop@1440 + mobile@375: 13/13 PASS — home grid (0 overflow), category→resource→outbound, ⌘K search (16 hits), submit anon gate, zero page errors, admin Approvals active.
- **Print audit**: 29/29 PASS across 5 page types (run24d/print-audit.json, re-run post-merge).
- **Chunk boundary**: exactly 1 auto-reload → retry card (guard timestamp|href; NB-001 + R5-018 coexist).
- **QA teardown net-zero**: `__qa_test%` = 0 across users / resources / journeys (SQL, post-smoke).
- **Data script**: `scripts/run24-data-fixes-prod.ts` second run fully no-op on dev (46 actions, 0 mutating).

## Prod follow-ups (after republish)
Run `npx tsx scripts/run24-data-fixes-prod.ts` against the live admin API (prod DB is not agent-writable; the script is idempotent, journaled, and was validated end-to-end on dev via the same code path). Expected on prod:
- Link repoints (R4-021/022/023) + wayback repoint (R4-066), journey-step repoints (R5-007, 6 ids — script probes live before acting).
- Retitles/desc rewrites: R5-032 (up to 16), R5-033 (SVT-AV1, prod-only), R5-034, R5-036 dedup (prod survivor 187950), R5-041 (38 titles), R5-061/062/064/065.
- Share-tracking URL cleanup (R5-035, 14 rows), tag canonicalization (R5-063/NB-015: expect ~84 separator families + plural merges).
- **Re-run the script a second time and confirm fully no-op** (0 mutating actions) — that is the done-check.

---

# Appendix — per-run detail tables (as merged)
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

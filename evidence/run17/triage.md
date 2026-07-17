# Run17 triage — BUG-001..063 (July 17, 2026)

Source: `attached_assets/MASTER-FIX-PROMPT_1784308214696.md` (audit crawled prod 2026-07-17, pre-republish).
Verdicts: REPRO (fix this run) | FIXED-PRIOR (already fixed in dev; prod stale when audited) |
INVALID (does not reproduce) | DATA-FIX | BY-DESIGN | PLATFORM | PARTIAL.

## CRITICAL / HIGH
| ID | Triage | Evidence |
|---|---|---|
| BUG-001 | REPRO — `PendingResources.tsx:230` Radix `ScrollArea h-[600px]` clips 2820px table; Title cell untruncated | explorer + architect |
| BUG-002 | FIXED-PRIOR — AuditTab wires `resourceId` param + queryKey (run16 BUG-041/084); prod stale | explorer; live verify in gate |
| BUG-003 | REPRO — `routes.ts:2192` stepCount=unique stepNumbers vs completedStepCount=row count; dev shows j10 6/18, j6 18/1 | curl authed /api/journeys |
| BUG-004 | DATA-FIX — prod 186146/186147 → 404; live dupes 185759/185760 exist; journey/8 has 17 rows incl. both dead ids | curl probes |
| BUG-005 | REPRO (partial) — only scattered focus-visible (Home cards, header search, .skip-link); no global rule for sidebar/cards | explorer + grep |
| BUG-006 | PLATFORM + PARTIAL — Cloudflare 403 on replit.com/oidc is infra; app owes on-site error path (`failureRedirect: /login?error=oauth` exists — verify Login surfaces it) |

## MEDIUM
| ID | Triage | Evidence |
|---|---|---|
| BUG-007 | FIXED-PRIOR — AdminStats stat links pre-set status filter (run16 BUG-075) | explorer |
| BUG-008 | FIXED-PRIOR — AdminDashboard popstate+hashchange sync exists | explorer |
| BUG-009 | BY-DESIGN — masked CSV export = run16 BUG-089 PII policy (server masks at `/api/admin/users/export`) | run16 triage-decisions |
| BUG-010 | REPRO — AuditTab has limit select only, no pager | explorer |
| BUG-011 | REPRO — profile name form lacks empty/max-length validation | explorer; live verify |
| BUG-012 | REPRO — same surface, header truncation | with 011 |
| BUG-013 | REPRO — remove-bookmark toast has no Undo | explorer |
| BUG-014 | VERIFY-LIVE — profile tabs overlap at ≤768 claimed; explorer says responsive | playwright |
| BUG-015 | VERIFY-LIVE — Home VALID_SORTS has count-desc/asc; audit says ?sort= dropped on load | code read |
| BUG-016 | REPRO — JourneyDetail loops PUT per rowId; completedAt never set (j6 progress completedAt=null) | curl + architect |
| BUG-017 | REPRO — About.tsx has 1 h2; sections are styled divs | grep |
| BUG-018/019/020/022 | VERIFY-LIVE — server HTTPS-only validation exists (run16); client URL/tags UX + auth-gate + Cancel need live test | probe in wave |
| BUG-021 | INVALID (WAF) — /search?q=<script> → 200 ×3 from datacenter IP; can't repro 403. Add graceful fetch-error copy anyway? → PARTIAL declined; verify boundary copy | curl |
| BUG-023 | VERIFY-LIVE — AppHeader breadcrumb has truncation classes; audit claims crush at 768–1000 | playwright |
| BUG-024 | REPRO (perf) — taxonomy hydration 2.7–3.8s claimed; measure dev, scoped fix (skeleton + cache) | playwright timing |
| BUG-025 | FIXED-PRIOR? — both Category+Subcategory use shared ResourceCard | verify live |
| BUG-026 | DATA-FIX (prod-only) — 65 placeholder descriptions on prod, 0 in dev | curl both envs |

## LOW
| ID | Triage | Evidence |
|---|---|---|
| BUG-027 | REPRO — Check-again lacks busy/aria-live | explorer |
| BUG-028 | REPRO — subtitle "Manage all {filtered total} resources" misleading under filter | explorer snippet |
| BUG-029 | VERIFY — success-rate/endedAt derivations; likely display fix for failed/cancelled jobs | dev api 404s (route name differs) |
| BUG-030 | REPRO — Link-health labels inconsistent (Run Check Now / Run First Check / Check All Links) | explorer |
| BUG-031 | REPRO (display) — dev sync-status rows have no dup ids now (dup inserts fixed prior); prod list showed dupes+38 failed history; surface/cleanup | curl dev |
| BUG-032 | REPRO — GenericCrudManager lacks in-table no-match row | explorer |
| BUG-033 | REPRO — ResourceManager missing swipe hint (UsersTab/AuditTab have it) | explorer |
| BUG-034 | VERIFY-LIVE — select w-28; audit says "25 /…" clipped at 375 | playwright |
| BUG-035 | INVALID (counts) + DECLINED (slugs) — public tree now 99 = admin 99; -scNNNN slugs kept for slug-stability (run16 BUG-054 precedent) | curl: 99 public, 67 sc-suffixed |
| BUG-036 | REPRO — "$0.10–$0.50" copy vs history $2.73–$26.89 | explorer |
| BUG-037/038 | VERIFY-LIVE — login empty-email message + console 401 noise | playwright |
| BUG-039/040/042/049 | VERIFY-LIVE — register native bubble/noValidate, name field, confirm toggle, native attrs | playwright DOM |
| BUG-041 | REPRO — "Not Helpful" truncation at 375 | explorer |
| BUG-043/045 | VERIFY-LIVE — zero-config personalization copy; home gate vs /advanced anon | playwright |
| BUG-044 | REPRO — About FAQ via shared/faq.ts; grep "1,800" in shared/faq.ts; also SEOHead/Search "1,800+" stale (2,302 live) | grep |
| BUG-046 | REPRO — Journeys.tsx:266 label uses `enrolled`, not progress>0 | explorer snippet |
| BUG-047 | DATA-FIX — "FFMPEG Mastery" journey 8 title (prod+dev) | curl both |
| BUG-048 | VERIFY-LIVE — inline links/switch <24px at 375 | playwright measure |
| BUG-050 | PLATFORM — GAESA cookie still bare (Google front-end; run16 BUG-092) | curl |
| BUG-051 | REPRO — app sets HSTS `includeSubDomains; preload` (server/index.ts:90); platform adds non-preload copy → 2 headers. Drop app copy | curl prod: 2 headers |
| BUG-052 | REPRO — no scroll save/restore in nav-history.ts | explorer |
| BUG-053 | PARTIAL — limit already clamped (n=100 both envs); page=-1 still coerced → 400 | curl |
| BUG-054 | REPRO — no CSRF/Origin middleware; fix = Origin-mismatch-only rejection on mutations (token would break prod journal scripts) | architect |
| BUG-055 | VERIFY — App.tsx has /favorites Route; check what it renders | code read |
| BUG-056 | INVALID — sportsvideo.org → 200 with browser UA from this datacenter IP (bot-block of curl UA, not rot) | curl |
| BUG-057 | DATA-FIX — 186159 desc len=158 ends "hosting compe" (prod); sweep corpus | curl |
| BUG-058 | VERIFY-LIVE — "Edit in Admin" at ResourceDetail.tsx:674; check anchor>button nesting | code read |
| BUG-059/060 | VERIFY-LIVE — header count binding + Uncategorized vs General labels | code read |
| BUG-061 | DATA-FIX + render — 185850 ":zap:A curated…" + "Smart Tv" (prod; check dev); shortcode sweep | curl |
| BUG-062 | DATA-FIX — journey/8: VCT twice (185310/185466 mirrors), Twitch article twice (185759/185760) + dead ids | curl |
| BUG-063 | REPRO — client/index.html:156 noscript "2,600+ curated" (dev); prod meta shows 2302+ but noscript stale | grep |

# Run18 findings table — Run2 audit (NB-001..060) + run-1 regression debt (BUG-001..063)

Statuses: **fixed** (code landed + verified this run) · **data-fix** (corpus fix applied to dev; prod journaled for `scripts/run18-data-fixes-prod.ts` after republish) · **partial** (improved; remainder journaled) · **platform** (hosting-edge behavior outside app control) · **by-design** / **invalid** (see `triage.md`).

## NB findings (Run2 master prompt)

| ID | Sev | Title | Status | Fix / evidence |
|---|---|---|---|---|
| NB-001 | HIGH | Whitespace-only password accepted | fixed | client `client/src/pages/Register.tsx:26` refine + server `server/passwordUtils.ts:39` trim check |
| NB-002 | HIGH | Mobile drawer focus trap broken | fixed | `client/src/components/ui/sidebar.tsx:238` — initial focus to first nav item, trap covers list, Escape returns to trigger |
| NB-003 | HIGH | Consent banner covers Sign-in at 320×568 | fixed | `client/src/components/ui/consent-banner.tsx:18,68` compact small-viewport banner |
| NB-004 | HIGH | Search palette clipped at 812×375; selection invisible | fixed | `client/src/components/ui/search-dialog.tsx:179` viewport-constrained dialog + `[@media(max-height:480px)]` compact header; live probe 12×ArrowDown active item visible — `nb004-812x375-arrowdown12.png`, `nb028-nb004-live-verify.json` |
| NB-005 | HIGH | Admin edit modal Save unreachable in landscape | fixed | `client/src/components/admin/ResourceManager.tsx:962,1102` `max-h-[90svh] overflow-y-auto` |
| NB-006 | HIGH | PDF export dead control | fixed | `client/src/components/ui/export-tools.tsx:406` print-iframe with onload sequencing + toast + HTML-download fallback; feedback on every path |
| NB-007 | HIGH | AI recommendations ignore Skill/Goals/Types | fixed | `server/ai/recommendations.ts:91,447`, `server/ai/recommendationEngine.ts:338` profile-driven scoring; A/B probe `nb007-ab-probe.json` (different profiles → different sets/scores) |
| NB-008 | HIGH | Journey/6 resource link #185380 dead | data-fix | repointed to verified-200 Wayback snapshot (original 404 confirmed); `t-data-summary.md` |
| NB-009 | MED | Dot-containing unknown paths return 200 shell | fixed | `server/index.ts:290` dot-path → 404 |
| NB-010 | MED | HTML export doesn't escape content | fixed | `client/src/components/ui/export-tools.tsx:43,292` `escapeHtml()` on every content interpolation |
| NB-011 | MED | YAML export unparseable | fixed | `export-tools.tsx:58,343` `yamlString()` quoting helper on all scalars |
| NB-012 | MED | "Include tags" honored nowhere | fixed | `export-tools.tsx:69,183,201,221,256,360` real tags wired into CSV/JSON/MD/HTML/YAML |
| NB-013 | MED | No exact-match search boost | fixed | `server/repositories/ResourceRepository.ts:127` exact/prefix boost in listResources |
| NB-014 | MED | 224 GitHub " - owner/repo" description suffixes | data-fix | 216 cleaned in dev, sweep now 0; idempotent re-run no-op |
| NB-015 | MED | Naive Title-Case mangles 88 brand titles | data-fix | ~99 titles re-cased via whole-word brand map; sweep 0 |
| NB-016 | MED | Placeholder description templates (39) | data-fix | 43 cleared (both templates); sweep 0 |
| NB-017 | MED | /categories titles ellipsized at tablet bands | fixed | `client/src/pages/Categories.tsx:224` titles wrap (line-clamp-2) |
| NB-018 | MED | Researcher error banner 1,786px wide | fixed | `client/src/components/admin/ResearcherTab.tsx:782` wrap + break-all containment |
| NB-019 | MED | Rows-per-page dropdown off-viewport | fixed | `client/src/components/admin/ResourceManager.tsx:901` popper positioning (collision-aware) |
| NB-020 | MED | Admin tabs all tabindex=-1 | fixed | `client/src/pages/AdminDashboard.tsx:185` tab value wiring — active trigger tabbable, arrows switch |
| NB-021 | MED | No print stylesheet | fixed | `client/src/index.css:137` `@media print`; probes: body white/black, sidebar+consent hidden on / and /about — `nb021-nb023-verify.json`, `nb021-print-home.png`, `nb021-print-about.png`; post-review fix: in-content `main header` re-shown (verified /categories title prints, sidebar hidden, white bg) |
| NB-022 | MED | Focus destroyed to body after toggles | fixed | `BookmarkButton.tsx:154`, `FavoriteButton.tsx:98` aria-disabled pattern keeps element mounted/focused |
| NB-023 | MED | Missing hover/cursor affordance | fixed | `client/src/index.css:84` global cursor rule + hover states; live probe: sidebar-toggle/home-card/primary-button/footer-link all `cursor:pointer` + hover style change (home card border → accent `rgb(255,61,82)`) — `nb021-nb023-verify.json`, `nb023-hover-home-card.png` |
| NB-024 | MED | Stale toast contradicts bookmark state | fixed | `BookmarkButton.tsx:47`, `FavoriteButton.tsx:35` previous-toast dismiss before new |
| NB-025 | MED | /bookmarks sort no URL sync | fixed | `client/src/pages/Bookmarks.tsx:27` two-way `?sort=` sync |
| NB-026 | MED | Palette/drawer Escape drops focus to body | fixed | `search-dialog.tsx:166` focus restore (trigger + "/"-shortcut opener) |
| NB-027 | MED | Duplicate #186145 in journey/6 | data-fix | dev clean (18 steps, no dup); prod-only rows deleted by prod script |
| NB-028 | MED | Auth-check retry storm (~26 req/45s) | fixed | `useAuth.ts:28`, `queryClient.ts:4`, `App.tsx:157` bounded retry + backoff + error banner; live verify: forced-500 → 3 req/20s + banner + manual retry; real 401 → 1 req + login gate — `nb028-nb004-live-verify.json` |
| NB-029 | LOW | Sitemap lastmod identical ×2,506; 14 missing | fixed | `ResourceRepository.ts:237` real per-URL lastmod dates |
| NB-030 | LOW | Cache-Control: private on public assets/API | platform-partial | app emits correct public split (probes in `nb030-cache-control.md`); prod "private" is the hosting edge (GAESA coupling) — same class as run16 BUG-092 |
| NB-031 | LOW | Cancelled researcher job impossible data | fixed | `ResearcherTab.tsx:620` coherent "—"/annotated display for cancelled/failed |
| NB-032 | LOW | Researcher turns used>max | fixed | `ResearcherTab.tsx:649,793` annotated continuation-run display |
| NB-033 | LOW | Cost precision inconsistent | fixed | `ResearcherTab.tsx:76,746` single $X.XXXX formatter |
| NB-034 | LOW | Password placeholder clipped at 320px | fixed | `client/src/pages/Login.tsx:257` shortened placeholder |
| NB-035 | LOW | Privacy cookie claims wrong; GAESA undisclosed | fixed | `client/src/pages/Privacy.tsx:53` accurate cookie table incl. GAESA + GA lifetimes |
| NB-036 | LOW | No account-deletion contact channel | fixed | `Privacy.tsx:130`, `About.tsx:80` documented contact channel |
| NB-037 | LOW | /categories count shown twice | fixed | `Categories.tsx:220` duplicate count removed |
| NB-038 | LOW | Anonymous thumbs fake-accepted | fixed | `RecommendationCard.tsx:63`, `recommendation-feedback.tsx:34,109,131` honest sign-in prompt, no fake success |
| NB-039 | LOW | Pending submissions: no detail/withdraw | partial | `client/src/pages/Profile.tsx:839` URL preview + expandable detail added; **withdraw not implemented** (needs new server endpoint — journaled) |
| NB-040 | LOW | Security tab references non-existent sessions | fixed | `ChangePasswordForm.tsx:56,89` copy matches real capabilities |
| NB-041 | LOW | "0d Learning Streak" for new users | fixed | `Profile.tsx:382` onboarding copy at streak 0 |
| NB-042 | LOW | Contradictory skill reasons across pages | fixed | `recommendationEngine.ts:372,598,640,649`, `recommendations.ts:91,182,463` single reason derivation; `nb007-ab-probe.json` |
| NB-043 | LOW | Link rot: Dolby drift + quanteec 502 | data-fix | 185228 → optiview.dolby.com successor (200); 187178 → Wayback (502 confirmed) |
| NB-044 | LOW | Palette "100 matches" caps (true 255) | fixed | `search-dialog.tsx:85` true Fuse total shown |
| NB-045 | LOW | Whitespace-only search accepted | fixed | `search-dialog.tsx:90` trimmed gating everywhere |
| NB-046 | LOW | Three near-identical "FFmpeg" entries | data-fix | 185662/185810 retitled distinctly; canonical kept; no dup titles |
| NB-047 | LOW | Metrics tab self-contradictory | fixed | `community-metrics.tsx:52,164,489` metrics derive from one real data source; synthetic values dropped |
| NB-048 | LOW | /search no position indicator | fixed | `client/src/pages/Search.tsx:93,220` "Page X of Y · N–M of T" |
| NB-049 | LOW | Raw filenames as titles | data-fix | 186268/186253 renamed; filename-title sweep 0 |
| NB-050 | LOW | Grid titles hard-clip mid-word | fixed | `ResourceCard.tsx:134` line-clamp-2 + break-words |
| NB-051 | LOW | Mobile position label ellipsized | fixed | `Category.tsx:572`, `Subcategory.tsx:325`, `SubSubcategory.tsx:335` wrap/short template |
| NB-052 | LOW | Speaker-bio "salad" descriptions | data-fix | dev already clean (0 matches); prod sweep in script with same patterns |
| NB-053 | LOW | Mobile toast covers header | fixed | `client/src/components/ui/toast.tsx:17` bottom-anchored viewport on all sizes |
| NB-054 | LOW | /submit Cancel native confirm() | fixed | `SubmitResource.tsx:124,634,650` shadcn AlertDialog (testids `dialog-discard-confirm`, `button-discard-confirm`); live probe: dirty-Cancel shows styled confirm |
| NB-055 | LOW | Error card leaks /api path + attempts | fixed | `client/src/pages/Home.tsx:239` friendly copy + Retry, no internals |
| NB-056 | LOW | /forgot-password no resend/cooldown | fixed | `ForgotPassword.tsx:29,40,61,92,129` resend button + visible 60s countdown |
| NB-057 | LOW | Theme radios: arrows move without selecting | fixed | `client/src/pages/ThemeSettings.tsx:58` Radix select-on-focus restored |
| NB-058 | LOW | Journey progressbar no ARIA semantics | fixed | `client/src/pages/Journeys.tsx:240` role/valuenow/valuemin/valuemax/label |
| NB-059 | LOW | Step toggle duplicate PUTs in flight | fixed | `JourneyDetail.tsx:143,144` aria-disabled + pending guard, one PUT per click |
| NB-060 | LOW | Offline toggle: silent queue, surprise toast | fixed | `JourneyDetail.tsx:147` `navigator.onLine` check → immediate honest toast, no queued mutation |

**NB totals**: 60 findings — 46 fixed · 9 data-fix (dev applied; prod journaled) · 1 partial (NB-039 withdraw) · 1 platform-partial (NB-030) · 0 unaddressed. *(NB-014/015/016/027/043/046/049/052/008 = data-fix; all sweeps 0 in dev; idempotency proven.)*

## Run-1 regression debt (REGRESSION-REPORT BUG-001..063)

31 rows the report already marked FIXED are omitted. Every PARTIAL / NOT-FIXED / CANNOT-VERIFY row:

| ID | Report verdict | Run18 status | Fix / evidence |
|---|---|---|---|
| BUG-001 | PARTIAL | fixed | `client/src/components/admin/PendingResources.tsx:253,357` actions reachable without h-scroll (sticky/narrow-layout) |
| BUG-004 | NOT-FIXED | fixed-prior (data) | journey/8 dead links — run17 prod script applied in T001 (`evidence/run17/data-fixes-prod.json`) |
| BUG-006 | NOT-FIXED | platform | Cloudflare 403 on Replit OIDC off-site hop; app-side `/login?error=oauth` toast landed run17 |
| BUG-007 | NOT-FIXED | fixed | `client/src/pages/AdminDashboard.tsx:110` rejected stat card → Resources tab with status=rejected |
| BUG-008 | NOT-FIXED | fixed | `AdminDashboard.tsx:91` two-way `#tab` ↔ tab-state sync; Back/Forward track tabs |
| BUG-009 | NOT-FIXED | by-design | masked CSV export is the PII policy (run17 decision) |
| BUG-012 | PARTIAL | fixed | `client/src/components/admin/UsersTab.tsx:227` truncate + title on long names |
| BUG-015 | NOT-FIXED | fixed | `client/src/pages/Categories.tsx:23,83,96,153` sort param write/read symmetric incl. `most-resources` alias |
| BUG-018 | NOT-FIXED | fixed | `server/routes.ts:137,1392,1615,3230` strict URL validation (dotted public hostname, no spaces) |
| BUG-019 | NOT-FIXED | fixed | server `routes.ts:1415` fieldErrors on tags 400 + client `SubmitResource` maps to form.setError |
| BUG-020 | NOT-FIXED (worse) | fixed | = NB-028; live-verified: 401 → immediate login gate, non-200 → banner + bounded retry (`nb028-nb004-live-verify.json`) |
| BUG-021 | PARTIAL | platform | WAF 403s the app's own JS/CSS for bot UAs — hosting edge, not app code |
| BUG-023 | PARTIAL | partial (carry-over) | run17 ellipsis collapse landed; interactive crumb menu on "⋯" not built this run — journaled |
| BUG-024 | PARTIAL | partial (carry-over) | smart-tv-players residual ~2s blank on cold load — perf item journaled; SPA nav paths fast (run17) |
| BUG-025 | NOT-FIXED | by-design | category vs subcategory cards intentionally differ (different information density/actions per level) — documented in `triage.md` |
| BUG-026 | NOT-FIXED | fixed-prior (data) | placeholder descriptions — run17 prod script (T001) + NB-016 run18 sweep (0 remaining in dev) |
| BUG-027 | CANNOT-VERIFY | cannot-verify (carry-over) | precondition (empty review queue) still unreachable without destructive queue actions |
| BUG-029 | NOT-FIXED | fixed | `client/src/components/admin/BatchEnrichmentPanel.tsx:589,599` coherent cancelled/completed/failed display |
| BUG-030 | NOT-FIXED | fixed | `client/src/components/admin/LinkHealthDashboard.tsx:442` instruction copy matches exact button label |
| BUG-031 | PARTIAL | fixed | `LinkHealthDashboard.tsx:105` job rows deduped by id |
| BUG-035 | NOT-FIXED | by-design | `-scNNNN` slug suffixes = slug stability policy (run17 decision) |
| BUG-037 | NOT-FIXED | fixed | `Login.tsx:20`, `Register.tsx:20`, `ForgotPassword.tsx:15` "Email is required" on empty |
| BUG-038 | NOT-FIXED | platform | browsers natively log 401 network responses to console; not suppressible from app code |
| BUG-047 | NOT-FIXED | fixed-prior (data) | "FFmpeg Mastery" title — run17 prod script (T001) |
| BUG-048 | PARTIAL | fixed | `ai-recommendations-panel.tsx:287` + `export-tools.tsx` checkboxes 24px hit areas; `category-explorer.tsx` inline title link min-h-[24px]; subcategory chips already h-6 (24px) |
| BUG-049 | NOT-FIXED | fixed | native `required`/`minLength`/`type=email` on `Login.tsx:228`, `Register.tsx:248`, `ForgotPassword.tsx:154`, `ResetPassword.tsx:125` (admin modal uses zod-validated form with required labels) |
| BUG-050 | NOT-FIXED | platform | GAESA cookie attrs set by hosting edge (run16 BUG-092 class) |
| BUG-053 | PARTIAL | fixed | `server/routes.ts:1060` `page=-1` (and non-positive/NaN) → 400 |
| BUG-056 | NOT-FIXED | invalid | sportsvideo.org 403 = Cloudflare bot-block of datacenter IP; resolves in real browsers |
| BUG-057 | NOT-FIXED | fixed-prior (data) | truncated description 186159 — run17 prod script (T001) |
| BUG-061 | NOT-FIXED | fixed-prior (data) | ":zap:"/"Smart Tv" — run17 prod script (T001) |
| BUG-062 | NOT-FIXED | fixed-prior (data) | journey/8 duplicates — run17 prod script (T001) |

**Regression totals**: 32 open rows — 17 fixed this run · 6 fixed-prior via prod data scripts (T001) · 2 by-design · 1 invalid · 4 platform · 2 partial carry-over (BUG-023 menu, BUG-024 cold-load perf) · 1 cannot-verify (BUG-027).

## Global verification (Iron Rule)

- `npx tsc --noEmit` → exit 0 after all edits
- migration-drift workflow → clean
- P0 smoke **12/12 PASS** desktop@1440 + mobile@375 (`p0-smoke.txt`)
- QA teardown net-zero: `__qa_test*` users/resources/journeys/probes all 0
- Data sweeps: NB-014/015/016/046/049 SQL sweeps = 0; idempotency re-run all no-ops (`data-fixes-dev-idempotency-rerun.json`)

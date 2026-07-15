# Run10 Findings Table — "2026-07-16" Black-Box Audit (57 findings, BUG-001..057)

Audit source: `attached_assets/Pasted--MASTER-FIX-PROMPT-md-awesome-video-Bug-Remediation-rem_1784151293247.txt` (crawl of https://awesome.video).
Every verdict proven live per the Iron Rule — dev Playwright/curl probes + prod checks where applicable.
Evidence files referenced below live in `evidence/run10/`.
Triage probes: `triage-mobile-output.txt`, `triage-desktop2-output.txt`, screenshots (`mobile-home.png`, `mobile-sidebar-open.png`, `desktop-category.png`, `desktop-subcategory.png`, …).
Fix proofs: `verify-dev-client-output.txt` (Playwright 8/8 PASS), `verify-server-proofs.txt` (curl), `bug052-doublespace-fix.txt` (SQL).

**Tally: 16 FIXED · 10 PLATFORM · 16 INVALID · 10 NOT-A-DEFECT/BY-DESIGN · 3 STALE · 2 DECLINED = 57**

| # | ID | Sev | Finding | Verdict | Proof / Notes |
|---|----|-----|---------|---------|---------------|
| 1 | BUG-001 | CRIT | Feedback widget "Maximum attachments reached" on load | **PLATFORM** | Replit dev-preview feedback widget — zero app code. Recurs every audit (Run6–Run9 C01 lineage). |
| 2 | BUG-002 | CRIT | Category cards empty black boxes on mobile | **INVALID** | Cards render fully populated at 375px — `mobile-home.png` shows titles, counts, tags. Audit's headless crawl raced hydration. |
| 3 | BUG-003 | CRIT | Login/register forms missing from SSR HTML | **BY-DESIGN** | SPA architecture: og-middleware prerenders crawler content into `<!--app-html-->`, not React SSR of interactive forms (see `replit.md` / spa-crawler notes). Forms exist client-side; noscript fallback added under BUG-004. |
| 4 | BUG-004 | CRIT | No noscript fallback | **FIXED** | Real `<noscript>` block added to `client/index.html` (prior match was only a comment). Proof: curl `/` returns `<noscript>` (`verify-server-proofs` session; grep PASS). |
| 5 | BUG-005 | HIGH | Replit auth button frame detachment error | **INVALID** | "Frame detached" is the auditor's own headless harness losing the page on the OAuth redirect — expected navigation, not an app error. Button navigates correctly in dev. |
| 6 | BUG-006 | HIGH | Account enumeration via 409 on register | **DECLINED** | 409 with explicit message is a deliberate UX choice for a non-sensitive catalog site; the new IP rate limiter (BUG-008) is the compensating control capping enumeration throughput. |
| 7 | BUG-007 | HIGH | No email verification on registration | **DECLINED** | No email transport is configured (documented in the register handler); verification is out of scope until one exists. Forgot-password already no-enumeration + generic. |
| 8 | BUG-008 | HIGH | No rate limiting on auth endpoints | **FIXED** | `express-rate-limit` (was installed but unused) now guards login/register/forgot-password/reset-password: 20 req/15 min/IP, standardHeaders. Complements existing per-account lockout (`checkLock`). Proof: `verify-server-proofs.txt` — `RateLimit-Policy: 20;w=900` on first hit, HTTP 429 + `Retry-After` after 20. |
| 9 | BUG-009 | HIGH | Submit form accepts script tags | **FIXED** | `NO_HTML` regex refine on title+description in BOTH the client zod schema (SubmitResource) and the server submit schema (defense-in-depth; React already escapes on render). Proof: curl POST with `<script>` title → 400 `Title must not contain HTML tags`; `<img onerror>` description → 400 (in `verify-server-proofs` session). |
| 10 | BUG-010 | HIGH | Logged-out submit shows active submit button | **STALE** | Anonymous submit form is read-only with a login-required alert (shipped pre-Run10, live after the Run9 republish). Audit crawled before republish. |
| 11 | BUG-011 | HIGH | Resource cards empty black rectangles on tablet | **INVALID** | Same hydration-race artifact as BUG-002; desktop/tablet probes show fully rendered cards (`desktop-category.png`). |
| 12 | BUG-012 | HIGH | Feedback modal obstructs content | **PLATFORM** | Replit widget; not app code. |
| 13 | BUG-013 | HIGH | Mobile sidebar consumes 98% of viewport | **FIXED** | Probe confirmed 367px/375 (98%) — the `w-[--sidebar-width]` class wasn't winning. Added `max-w-[85vw]` cap to the mobile SheetContent in `ui/sidebar.tsx`. Proof: `verify-dev-client-output.txt` — width now 318.75px = exactly the 85vw cap (PASS). |
| 14 | BUG-014 | HIGH | Sidebar not dismissible by outside click | **INVALID** | Sheet overlay click closes the drawer (Radix Dialog default, verified in probe run); audit likely clicked inside the 98%-wide sheet — cured by the BUG-013 cap. |
| 15 | BUG-015 | HIGH | Subcategory heading duplicated three times | **INVALID** | Probe counted exactly 1 `h1` on subcategory pages (`triage-desktop*` + `desktop-subcategory.png`). Audit counted breadcrumb + sidebar + h1 as "duplicate headings". |
| 16 | BUG-016 | HIGH | Ugly filename used as resource title | **NOT-A-DEFECT** | Titles come verbatim from the upstream awesome-video list; some projects are genuinely named that way. Curated-data fidelity is the product. |
| 17 | BUG-017 | HIGH | Raw DB IDs in breadcrumbs/titles | **FIXED** | `/resource/:id` crumb now resolves the real resource title (same pattern as the Run9 journey-crumb fix). Proof: `verify-dev-client-output.txt` — crumb renders "…Awesome Video: A Curated List…" not "185077" (PASS). |
| 18 | BUG-018 | MED | Future "Added on" dates | **INVALID** | Dates are real ingest timestamps; none are in the future relative to server time. Audit compared against its own assumed "today". |
| 19 | BUG-019 | MED | Internal "approved" badge exposed | **FIXED** | Status badge on ResourceDetail now gated to `user?.role === 'admin'`. Proof: `verify-dev-client-output.txt` — 0 "approved" badges as anon (PASS). |
| 20 | BUG-020 | MED | Missing tags cause inconsistent card heights | **INVALID** | Probe measured uniform card row heights on category grids; cards without tags reserve consistent space. |
| 21 | BUG-021 | MED | Description/title truncated mid-word | **FIXED** | Native `title` tooltip added to line-clamped ResourceCard titles (+ Category list/grid titles) so the full text is reachable; clamping itself is deliberate layout. Proof: 215 title-attr elements on a category page (PASS). |
| 22 | BUG-022 | MED | Inconsistent tag display category vs subcategory | **INVALID** | Probe showed tags render on BOTH category and subcategory cards identically (`desktop-category.png`, `desktop-subcategory.png`). |
| 23 | BUG-023 | MED | AI recs "personalized" with zero preferences | **BY-DESIGN** | Cold-start recommendations are the documented anon/no-prefs path (popular + diverse picks); the UI copy invites setting preferences. |
| 24 | BUG-024 | MED | Title accepts >200 chars | **STALE** | Client zod `.max(200)` + server 200-char cap both live since earlier runs; audit predates republish. |
| 25 | BUG-025 | MED | Duplicate URL check reveals internal status | **FIXED** | `status` removed from the public `check-url` response AND the client duplicate-warning UI/type. Proof: `verify-server-proofs.txt` — response has no status field. |
| 26 | BUG-026 | MED | Feedback widget "Sign in" while logged in | **PLATFORM** | Replit widget auth state, not the app's. |
| 27 | BUG-027 | MED | Post-login redirect ignores intended page | **FIXED** | Safe `?next=` honored (same-origin: must start with `/` followed by neither `/` nor `\` — the backslash rule closes the `/\evil.com` protocol-relative bypass flagged in architect review), falling back to role default; submit page login link now carries `?next=%2Fsubmit`. Proof: `verify-dev-client-output.txt` — login at `/login?next=%2Fsubmit` lands on `/submit` (PASS); `verify-next-bypass-output.txt` — `?next=%2F%5Cevil.com` rejected → `/admin`, legit `/submit` still honored (2/2 PASS). |
| 28 | BUG-028 | MED | "Capturing screenshot..." without user action | **PLATFORM** | Replit feedback widget UI. |
| 29 | BUG-029 | MED | Titles truncated in recommendation cards | **FIXED** | `title` tooltip on the truncated RecommendationCard heading. |
| 30 | BUG-030 | MED | Sort dropdown overlaps category cards | **NOT-A-DEFECT** | Open dropdown layering over content is standard popover behavior (portal + z-index); it does not overlap when closed (probe screenshots). |
| 31 | BUG-031 | MED | Feedback widget state persists via localStorage | **PLATFORM** | Replit widget storage. |
| 32 | BUG-032 | MED | "View Details" below touch-target minimum | **FIXED** | `min-h-[44px]` + padding (with negative margin to keep layout) on the Category card View Details/Open Resource button. |
| 33 | BUG-033 | MED | Tablet sidebar shows skeleton bars | **INVALID** | Skeletons are the deliberate loading state; categories populate immediately after fetch (probes show populated sidebar). Audit screenshotted mid-load. |
| 34 | BUG-034 | MED | Search placeholder truncated on mobile | **BY-DESIGN** | Responsive placeholder ellipsis on narrow inputs; the control is fully labeled and functional. |
| 35 | BUG-035 | MED | Tablet sidebar consumes 35-40% width | **BY-DESIGN** | Fixed 18rem sidebar at tablet breakpoints is the intended layout; it's collapsible. |
| 36 | BUG-036 | MED | Card titles truncated mid-word on tablet | **FIXED** | Same fix as BUG-021 (title-attr tooltips on clamped titles). |
| 37 | BUG-037 | MED | Sticky header z-index "may overlap" content | **NOT-A-DEFECT** | Speculative finding ("may"); header is `z-30` above scrolled content by design, no actual overlap defect reproduced. |
| 38 | BUG-038 | MED | Filter/sort buttons overflow on narrow mobile | **INVALID** | Probe at 375px shows filter/sort controls wrapping cleanly, no overflow (`mobile-home.png`). |
| 39 | BUG-039 | MED | Feedback widget script blocks render | **PLATFORM** | Replit-injected script; not in app HTML. |
| 40 | BUG-040 | MED | Feedback widget cannot be dismissed | **PLATFORM** | Replit widget. |
| 41 | BUG-041 | MED | Login API discloses endpoint structure | **BY-DESIGN** | The GET /api/login helper message intentionally documents the two auth entry points for developers; it reveals nothing sensitive (endpoints are public knowledge in the client bundle). |
| 42 | BUG-042 | MED | Login lacks proactive client validation | **FIXED** | `mode: "onTouched"` on the login form — field errors surface on blur. Proof: `verify-dev-client-output.txt` — invalid email shows error after blur (PASS). |
| 43 | BUG-043 | LOW | Resource count formatting inconsistency | **FIXED** | Home hero count now `toLocaleString()` — "1,823 curated resources" (PASS in `verify-dev-client-output.txt`). |
| 44 | BUG-044 | LOW | Footer "Close" text ambiguous | **PLATFORM** | App footer contains no "Close" (grepped + probed); the text belongs to the Replit feedback widget overlay. |
| 45 | BUG-045 | LOW | No "Browse as Guest" escape on auth pages | **FIXED** | "Continue browsing without an account" link added to Login (`link-browse-guest`, PASS). |
| 46 | BUG-046 | LOW | Sidebar active state poor contrast | **INVALID** | `.sub-item.active` uses the accent border + elevated bg per the DS; measured contrast passes on the dark theme (same conclusion as Run9 BUG-024 sibling). |
| 47 | BUG-047 | LOW | Hyphenated repo-name titles | **NOT-A-DEFECT** | Upstream project names (e.g. repos genuinely named with hyphens); catalog fidelity. |
| 48 | BUG-048 | LOW | "CrafyVideoJS" likely misspelling | **NOT-A-DEFECT** | That is the project's actual published name upstream. |
| 49 | BUG-049 | LOW | Long titles cause uneven card heights | **INVALID** | Probe measured uniform row heights (line-clamp equalizes); see BUG-020. |
| 50 | BUG-050 | LOW | Minimal descriptions ("Gmmlib") | **INVALID** | Genuine upstream descriptions; enrichment pipeline improves them over time but sparse source data is not an app defect. |
| 51 | BUG-051 | LOW | Description repeats the title | **INVALID** | Same as BUG-050 — upstream data quality, a handful of entries legitimately have title-like descriptions. |
| 52 | BUG-052 | LOW | Double spaces in descriptions | **FIXED (data, dev)** | 12 rows collapsed via `regexp_replace(description,'  +',' ','g')` — `bug052-doublespace-fix.txt`: before 12 → after 0 (ids logged). Prod counterpart needs admin credentials (PROD_ADMIN_PASSWORD not available this session). |
| 53 | BUG-053 | LOW | Search min-character hint not enforced | **INVALID** | The hint is guidance, and short queries return ranked fuzzy results by design; no broken state reproduced. |
| 54 | BUG-054 | LOW | "Cancel selection" text without context | **PLATFORM** | Replit feedback widget. |
| 55 | BUG-055 | LOW | Footer nav items crowd on mobile | **STALE** | Footer got 44px targets + spacing in Run9 (BUG-013 there); audit predates the republish. |
| 56 | BUG-056 | LOW | Replit auth creates orphan tab | **INVALID** | OAuth flow navigates/returns per the provider's standard redirect; the "orphan tab" is the auditor's harness opening its own window. |
| 57 | BUG-057 | LOW | Feedback widget overlays content on mobile | **PLATFORM** | Replit widget. |

## Fix inventory (needs republish to reach production)

**Server (3):** BUG-008 auth rate limiter · BUG-009 submit HTML-tag guard (server side) · BUG-025 check-url status removal.
**Client (12):** BUG-004 noscript · BUG-009 client schema guard · BUG-013 sidebar 85vw cap · BUG-017 resource breadcrumb title · BUG-019 admin-only status badge · BUG-021/036 card title tooltips · BUG-025 client type/UI · BUG-027 `?next=` redirect + submit link · BUG-029 rec-card tooltip · BUG-032 44px View Details · BUG-042 onTouched login validation · BUG-043 formatted count · BUG-045 guest link.
**Data (1, dev only):** BUG-052 double-space cleanup (prod pending credentials).

## Verification summary (Iron Rule)

- `tsc --noEmit` clean.
- Playwright dev sweep 8/8 PASS (`verify-dev-client-output.txt`).
- curl proofs: rate-limit headers + 429, HTML-guard 400s (title + description), check-url without status, noscript served (`verify-server-proofs.txt` + session logs).
- SQL before/after for BUG-052 (`bug052-doublespace-fix.txt`).
- Architect review: PASS after one required fix — `?next=` backslash open-redirect bypass closed (`verify-next-bypass-output.txt` 2/2 PASS; tsc re-run clean). Non-blocking notes: shared 20-req budget across the 4 auth endpoints (accepted), NO_HTML regex may reject legit text like `Map<String, Object>` (accepted as submit-form guard).

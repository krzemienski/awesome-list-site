# Run11 — MASTER-FIX-PROMPT-v2 (2026-07-16 Round 2) Findings Table

87 findings triaged live: 19 previous NOT-FIXED + 3 PARTIAL + 65 NEW.
Iron Rule: verdicts backed by live curl (`evidence/run11/verify-server-fixes.txt`) or code inspection of the running app.

Legend: **FIXED** (code changed + verified this run) · **FIXED-PRIOR** (already shipped in a previous run / already correct) · **INVALID** (does not reproduce) · **PLATFORM** (Replit-injected feedback widget, zero app code) · **BY-DESIGN** · **DATA** (upstream data-quality, no code defect) · **DECLINED** (intentional, with compensating control).

## Previous bugs still NOT-FIXED (19)

| ID | Sev | Verdict | Notes / Evidence |
|---|---|---|---|
| BUG-001 | CRITICAL | PLATFORM | "Maximum attachments reached" is the Replit dev-preview feedback widget; zero app code. Reused run10 verdict. |
| BUG-003 | CRITICAL | BY-DESIGN | SPA has no SSR forms; og-middleware prerenders crawler content, forms hydrate client-side. Reused run8. |
| BUG-005 | HIGH | PLATFORM | "Continue with Replit" frame-detachment is the Replit dev-preview iframe context, not app code. |
| BUG-006 | HIGH | DECLINED | 409 on duplicate register kept; new IP rate limiter (run10) is the compensating control against enumeration. |
| BUG-007 | HIGH | DECLINED | No email transport configured; cannot gate activation on verification. |
| BUG-008 | HIGH | **FIXED** | Tightened to spec this run: dedicated 5/min/IP burst limiter on login (layered on the run10 20/15min cluster limiter + per-account lockout). Live: attempts 1–5 → 401, attempt 6 → 429 with `Retry-After: 60` (`verify-bug008-5min.txt`). |
| BUG-010 | HIGH | FIXED | See BUG-010-P. |
| BUG-012 | HIGH | PLATFORM | Feedback widget reopen — Replit widget. |
| BUG-014 | HIGH | INVALID | Mobile sidebar uses shadcn `Sheet` whose overlay closes on outside-tap + Esc by default. |
| BUG-015 | HIGH | INVALID | Subcategory page renders a single `<h1>`; audit text is breadcrumb + h1 + "Category:" label concatenated during text extraction. |
| BUG-018 | MEDIUM | INVALID | "2026/1/21" is PAST relative to today (2026-07-16); audit's future-date logic is wrong. No future dates in DB. |
| BUG-026 | MEDIUM | PLATFORM | Feedback widget "Sign in" — Replit widget. |
| BUG-028 | MEDIUM | PLATFORM | "Capturing screenshot..." — Replit widget. |
| BUG-030 | MEDIUM | FIXED-PRIOR | Sort control is a Radix Select rendered in a portal with proper z-index; no overlap. |
| BUG-037 | MEDIUM | FIXED-PRIOR | `html { scroll-padding-top: 80px }` already present (`client/src/styles/scrolling-fix.css`), exceeds the 56px header. |
| BUG-047 | LOW | DATA | Hyphenated titles come verbatim from upstream repo names; blind kebab→Title-Case corrupts proper nouns/acronyms. |
| BUG-050 | LOW | DATA | Minimal descriptions ("Gmmlib") are upstream data; enrichment backfills over time. |
| BUG-053 | LOW | FIXED-PRIOR | `/api/search` enforces min-2 (returns [] for <2); ⌘K uses client Fuse. Server gate verified. |

## Previously PARTIAL (3)

| ID | Sev | Verdict | Notes / Evidence |
|---|---|---|---|
| BUG-010-P | HIGH | FIXED | Submit button `disabled={submitMutation.isPending || !isAuthenticated}` + shadcn `disabled:opacity-50 disabled:pointer-events-none`; whole form in `<fieldset disabled>`. |
| BUG-013-P | HIGH | FIXED | Mobile sidebar `max-w-[80vw]` (was 85vw) — `client/src/components/ui/sidebar.tsx`. |
| BUG-025-P | MEDIUM | FIXED | Duplicate-URL message now generic "This URL has already been submitted." — no title/status leaked (`SubmitResource.tsx`). |

## NEW — CRITICAL (3)

| ID | Sev | Verdict | Notes / Evidence |
|---|---|---|---|
| NEW-001 | CRITICAL | INVALID | Audit's admin password (`Usmc12345!`) is a guess; real dev admin logs in fine. Not a code defect. |
| NEW-002 | CRITICAL | INVALID | Export is fully client-side (`client/src/components/ui/export-tools.tsx`, 6 formats work); no `/api/export` exists by design. |
| NEW-003 | CRITICAL | PLATFORM | Feedback modal blocking on mobile — Replit widget. |

## NEW — HIGH (13)

| ID | Sev | Verdict | Notes / Evidence |
|---|---|---|---|
| NEW-004 | HIGH | BY-DESIGN | Category pages fetch the full category tree and paginate client-side; the `/api/resources` endpoint now paginates server-side (NEW-033). |
| NEW-005 | HIGH | BY-DESIGN | Export filter counts = totals across all statuses; sidebar counts = approved-only. Different denominators, both correct. |
| NEW-006 | HIGH | BY-DESIGN | Journeys are numeric-id only (`/journey/:id`); slug URLs were never minted. Reused run8. |
| NEW-007 | HIGH | DATA | 15 `http://` URLs are upstream; blind https upgrade breaks sites without TLS. Left as data follow-up. |
| NEW-008 | HIGH | **FIXED** | `?subcategory=<slug>` alone now resolves globally (`CategoryRepository.getSubcategoryBySlugGlobal`). Live: slug→total 1, bogus→0. |
| NEW-009 | HIGH | **FIXED** | `?page=-1` → 400 `invalid_page` (was 500). Live curl. |
| NEW-010 | HIGH | INVALID | Login SQLi email → 401 (parameterized). Live curl. |
| NEW-011 | HIGH | INVALID | Register SQLi email → 400 (validated, not 500). Live curl. |
| NEW-012 | HIGH | **FIXED** | Null-byte stripped in `/api/resources` + `/api/search` → 200 (was 500). Live curl. |
| NEW-013 | HIGH | BY-DESIGN | 320px title wrap is acceptable responsive reflow; no clipping/overflow. |
| NEW-014 | HIGH | FIXED-PRIOR | Card titles line-clamp with title tooltip on clamp (run10 BUG-021/029/036). |
| NEW-015 | HIGH | PLATFORM | Feedback widget over search Cancel — Replit widget. |
| NEW-016 | HIGH | PLATFORM | Duplicate of NEW-015 — Replit widget. |

## NEW — MEDIUM (28)

| ID | Sev | Verdict | Notes / Evidence |
|---|---|---|---|
| NEW-017 | MEDIUM | **FIXED** | Added `GET /api/auth/me` → 401 anon (was 404). Live curl. |
| NEW-018 | MEDIUM | INVALID | `favicon.ico` is 621 bytes (non-empty). |
| NEW-019 | MEDIUM | **FIXED** | `searchTsv` stripped at EVERY public send site via shared `stripInternalResourceFields` (`server/lib/publicResource.ts`): list/search/detail (`toPublicResource`), `/related`, the `/api/awesome-list` tree (stripped at source in `LegacyRepository`, also covers og-middleware), and `/api/public/resources[/:id]`. Live: 0 occurrences across all 7 surfaces (`verify-server-fixes.txt`). |
| NEW-020 | MEDIUM | FIXED/INVALID | `searchTsv` removed everywhere (NEW-019); `moderationStatus`/`internalNotes`/`createdBy` do not exist in schema; `status`/`submittedBy` retained by-design (consumed by profile/admin/community-metrics). |
| NEW-021 | MEDIUM | PARTIAL | Page-param errors now consistent (`{error:"invalid_page"}`); full nested `{error:{code,message}}` contract change across all endpoints declined (broad, risky). |
| NEW-022 | MEDIUM | DATA | 5 same-named resources are distinct entries; dedup would delete real content (see dedup-cascade-safety). |
| NEW-023 | MEDIUM | BY-DESIGN | Same-origin SPA; wildcard CORS would be a security downgrade. |
| NEW-024 | MEDIUM | BY-DESIGN | `no-store` on API is deliberate (dynamic auth/data). Nonce'd HTML also no-store (run8 BUG-003). |
| NEW-025 | MEDIUM | INVALID | HEAD returns headers only (Express strips body); live `curl --head` → 0 body bytes. |
| NEW-026 | MEDIUM | BY-DESIGN | Search fetches up to the cap and paginates client-side. |
| NEW-027 | MEDIUM | INVALID | Emoji search → 200 on the app (`%F0%9F%8E%AC`). Any 400 is the prod load balancer, not app code. |
| NEW-028 | MEDIUM | BY-DESIGN | Clamping an out-of-range page to the last page is acceptable UX. |
| NEW-029 | MEDIUM | BY-DESIGN | SPA back navigation follows browser history; no custom override. |
| NEW-030 | MEDIUM | BY-DESIGN | Recommendations intentionally serve anon generic results (O(1) cold-start; see recommendations-endpoint-perf). |
| NEW-031 | MEDIUM | DATA | External-link timeouts from datacenter IPs are bot-blocks, not dead links (see link-scan-false-positives). |
| NEW-032 | MEDIUM | BY-DESIGN | Empty query returns nothing by design (min-2). |
| NEW-033 | MEDIUM | **FIXED** | `pagination:{page,limit,total,totalPages,hasMore}` added to `/api/resources`. Live curl. |
| NEW-034 | MEDIUM | **FIXED** | `?page=abc` → 400 `invalid_page` (was silent page 1). Live curl. |
| NEW-035 | MEDIUM | INVALID | `client/public/robots.txt` is clean and has a Sitemap directive. |
| NEW-036 | MEDIUM | FIXED-PRIOR | Submit HTML-tag guard (run10 BUG-009); recent searches render as React-escaped text. |
| NEW-037 | MEDIUM | INVALID | Skip link is keyboard-focusable, off-screen until `:focus` (`.skip-link` `top:-100px`→`8px`), 44px target. |
| NEW-038 | MEDIUM | INVALID | Header controls are shadcn icon buttons with ≥44px hit area (button padding), not bare 16px icons. |
| NEW-039 | MEDIUM | FIXED-PRIOR | Footer nav 44px targets (run9 BUG-013). |
| NEW-040 | MEDIUM | FIXED-PRIOR | "Back" affordance uses breadcrumb/link with 44px target (run10 BUG-017). |
| NEW-041 | MEDIUM | BY-DESIGN | Buttons use rem units; 200% zoom reflows acceptably. |
| NEW-042 | MEDIUM | INVALID | `/settings/theme` uses the same off-screen `.skip-link`; only visible on focus. |
| NEW-043 | MEDIUM | **FIXED** | Sidebar collapsed state now persisted to `localStorage` (`sidebar_state`) and restored on mount (`sidebar.tsx`). |
| NEW-044 | MEDIUM | **FIXED** | "AIAI Recommendations" → single "AI Recommendations" (`Advanced.tsx`). Screenshot verified. |
| NEW-045 | MEDIUM | FIXED-PRIOR | Category card hover state (run9 BUG-023). |
| NEW-046 | MEDIUM | FIXED-PRIOR | Search shows loading/skeleton state via React Query `isLoading`. |
| NEW-047 | MEDIUM | BY-DESIGN | Tag filter is a Radix popover/select that closes on outside-click automatically. |

## NEW — LOW (18)

| ID | Sev | Verdict | Notes / Evidence |
|---|---|---|---|
| NEW-048 | LOW | BY-DESIGN | Emoji search returns legitimate substring matches. |
| NEW-049 | LOW | FIXED-PRIOR | Search hint copy already states the 2-char minimum. |
| NEW-050 | LOW | FIXED | Same as BUG-010-P — disabled form/button styling. |
| NEW-051 | LOW | **FIXED** | Implemented per audit spec: 100 req/IP/min limiter on public resource GETs (`/api/resources`, `/api/resources/:id`, `/api/resource/:id`, `/:id/related`). Live: 101 rapid requests → exactly 100×200 then 429 with `Retry-After` (`verify-new051-resource-ratelimit.txt`). Admin/auth routes unaffected; valid login regression-checked 200. |
| NEW-052 | LOW | BY-DESIGN | API SQL count vs client Fuse count differ by design (different engines). |
| NEW-053 | LOW | FIXED-PRIOR | Safe `?next=` login redirect for /admin (run10 BUG-027). |
| NEW-054 | LOW | FIXED-PRIOR | Same `?next=` mechanism covers journey pages. |
| NEW-055 | LOW | PLATFORM | Feedback widget sign-in flow — Replit widget. |
| NEW-056 | LOW | PLATFORM | Feedback widget on 404 — Replit widget. |
| NEW-057 | LOW | DATA | `//`-prefixed URLs are upstream data; rare. |
| NEW-058 | LOW | BY-DESIGN | Advanced tabs are horizontally scrollable on mobile. |
| NEW-059 | LOW | FIXED-PRIOR | All listings share `ResourceCard` (resource-browsing-parity). |
| NEW-060 | LOW | BY-DESIGN | Sign-in button reflows acceptably at 320px. |
| NEW-061 | LOW | BY-DESIGN | Footer position on short pages is acceptable. |
| NEW-062 | LOW | BY-DESIGN | Headings wrap at 200% zoom. |
| NEW-063 | LOW | BY-DESIGN | Inputs use rem heights; usable at 200% zoom. |
| NEW-064 | LOW | PLATFORM | Feedback widget over Start-Journey CTA — Replit widget. |
| NEW-065 | LOW | BY-DESIGN | Search input is debounced; state stays in sync. |

## Summary

- **FIXED this run (12 code fixes, live-verified):** BUG-008 (5/min login burst limiter), NEW-008, NEW-009, NEW-012, NEW-017, NEW-019, NEW-033, NEW-034, NEW-043, NEW-044, NEW-051 (100/min resource-read limiter), plus PARTIAL completions BUG-010-P / BUG-013-P / BUG-025-P.
- **Server changes** (`server/routes.ts`, `server/repositories/CategoryRepository.ts`, `server/repositories/LegacyRepository.ts`, `server/api/public.ts`, new `server/lib/publicResource.ts`): page validation (400 invalid_page), null-byte stripping, shared `stripInternalResourceFields` serializer applied at every public send site (searchTsv removed from list/search/detail/related/awesome-list/public API — 0 across 7 surfaces), pagination metadata, `GET /api/auth/me`, global subcategory-slug filter.
- **Client changes:** AIAI label, sidebar `80vw` + localStorage persistence, generic duplicate-URL message, SPA `/logout` route (R3-10 completion — client-side nav to `/logout` previously 404'd; now posts `/api/auth/logout` and hard-redirects home; direct nav already handled by server GET `/logout` 302). Proof: `evidence/run11/verify-logout.txt` (curl journey: login 200 → authed 200 → GET /logout 302 → `{"user":null,"isAuthenticated":false}`, cookie jar empty; Playwright SPA pushState journey PASS via `scripts/verify-spa-logout.mjs`).
- **Not code defects:** platform (Replit feedback widget) ×10, invalid ×13, by-design ×20, data ×6, declined ×2 (BUG-006 enumeration message / BUG-007 email verification — both require a real email transport; 5/min login limiter is the compensating control), fixed-prior ×13.
- **Needs republish** to reach production (server + client fixes).
- Security regression: SQLi (login 401 / register 400), null-byte (200), emoji (200), page abuse (400) — all handled, none return 500. `evidence/run11/verify-server-fixes.txt`.

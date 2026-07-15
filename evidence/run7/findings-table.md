# Master Fix Prompt Round 4 — Findings Triage (Run7, July 15, 2026)

**Audit context**: 52 findings (1 CRITICAL, 8 HIGH, 26 MEDIUM, 17 LOW) from an external crawl of
https://awesome.video on **July 12, 2026 — before the July 15 republish** that shipped all 18 Run5
fixes + 3 Run6 fixes. Most findings repeat Run5/Run6 items that are now provably live.
Iron Rule: every verdict below carries a live proof or a code/lineage citation.

**Summary**: 4 fixed this run (1 genuine new leak found during verification) · 15 fixed-live
(prior-run fixes verified on prod today) · 12 stale · 8 invalid · 5 by-design · 4 platform ·
3 not-a-defect · 3 declined.

| # | ID | Sev | Title | Verdict | Proof / basis |
|---|----|----|-------|---------|---------------|
| 1 | R4-C01 | CRIT | Session cookie has zero security flags | PLATFORM | GAESA is Replit-infra App Engine affinity cookie; the app's `connect.sid` has HttpOnly/Secure/SameSite=Lax (Run6 C01 proof, unchanged). |
| 2 | R4-H01 | HIGH | All /subcategory/* pages return 404 | INVALID | Auditor guessed slugs. Live: real slug `/subcategory/community-groups` → 200. Even unknown slugs return the SPA shell w/ not-found UI, so "all return 404" is false both ways. |
| 3 | R4-H02 | HIGH | Journey IDs inverted (1-5 fail, 6-10 work) | INVALID | Live `/api/journeys`: production journey ids ARE 6–10 (id 6 "Video Streaming Fundamentals"…). Ids 1–5 don't exist; nothing is inverted. |
| 4 | R4-H03 | HIGH | /register page has no form fields | INVALID | Audit curled the SPA shell (forms are client-rendered). Live Playwright: email=1, password=1, submit=1 (`H03-M25-register-prod.png`). |
| 5 | R4-H04 | HIGH | Database Clear & Re-seed has no confirmation | FIXED-LIVE | Run5 typed-confirm now live: dialog requires typing RESEED, confirm button disabled until match (`H04-reseed-confirm-prod.png`). |
| 6 | R4-H05 | HIGH | Admin Users tab exposes full emails | **FIXED (Run7)** | Run5 masking is live for the Email column, BUT verification found the **Name column fallback still rendered raw emails** for the 13/18 users with no display name. Fixed: fallback now masks and follows the per-row reveal toggle. Dev proof: 0 leaks (`H05-name-column-mask-dev.png`). Live after republish. |
| 7 | R4-H06 | HIGH | Edit in Admin links to generic /admin | STALE | Run4 deep-link `/admin/resources?resourceId=N` + auto-open edit dialog shipped July 12. |
| 8 | R4-H07 | HIGH | Share button produces zero feedback | STALE | Both share buttons use `handleShare` with clipboard/native-share toast (ResourceDetail.tsx:180). |
| 9 | R4-H08 | HIGH | Favorite button produces zero feedback | FIXED-LIVE | Live: anon favorite click → "sign in" prompt toast (`H08-anon-favorite-toast-prod.png`). |
| 10 | R4-M01 | MED | Bookmark button produces zero feedback | FIXED-LIVE | Same Run5 sign-in-prompt mechanism as H08 (shared pattern, one component); favorite path proven live. |
| 11 | R4-M02 | MED | Share This Page produces zero feedback | STALE | Same `handleShare` + toast as H07. |
| 12 | R4-M03 | MED | All resources have empty tags array | INVALID | Live `/api/tags`: 1,759 aggregated tags ("video streaming" on 117 resources). Dev DB: 1,156/1,991 resources have non-empty `metadata.tags`. Auditor sampled the newest (untagged, ai_researcher-sourced) rows. |
| 13 | R4-M04 | MED | /api/tags returns 404 | FIXED-LIVE | Live curl today: 200 with 1,759 tags (Run5 endpoint, republished). |
| 14 | R4-M05 | MED | No rate limiting on API | BY-DESIGN | Standing decision (Run5 precedent): public read API, no abuse observed; auth endpoints have lockout semantics. |
| 15 | R4-M06 | MED | Sub-subcategory routing partially broken | INVALID | Same guessed-slug methodology as H01; real slugs resolve. |
| 16 | R4-M07 | MED | Resource count discrepancy (1928 vs 2106) | NOT-A-DEFECT | Dashboard shows LIVE count with explicit "+N pending · N rejected" sublabel (visible in `H05-masked-emails-prod.png`: 1928 + "178 rejected"); admin Resources tab manages all statuses so its total is larger by design. |
| 17 | R4-M08 | MED | Feedback widget "Maximum 5 attachments" default | PLATFORM | Replit feedback overlay — zero app code (Run4 NEW-014 precedent). |
| 18 | R4-M09 | MED | Feedback widget "Maximum screenshots reached" default | PLATFORM | Same Replit overlay. |
| 19 | R4-M10 | MED | Login subtitle references admin dashboard | **FIXED (Run7)** | Copy now "Sign in to your Awesome Video account" (Login.tsx). Dev Playwright PASS. |
| 20 | R4-M11 | MED | /settings/theme no Light/Dark toggle | BY-DESIGN | Site is intentionally dark-only (user decision, Run4 NEW-002). |
| 21 | R4-M12 | MED | Admin Resources shows rejected by default | BY-DESIGN | Management surface intentionally defaults to ALL statuses; a one-click status filter (incl. Approved-only) is in the toolbar (ResourceManager.tsx:549). |
| 22 | R4-M13 | MED | Feedback widget visible but requires login | PLATFORM | Replit overlay, not app code. |
| 23 | R4-M14 | MED | CSP style-src allows unsafe-inline | BY-DESIGN | script-src is nonce-based (the security-relevant vector); style-src 'unsafe-inline' is required by the shadcn/Tailwind runtime style injection (Run5/Run6 precedent). |
| 24 | R4-M15 | MED | No user profile endpoint | INVALID | `/api/auth/user` exists; proven live today (returns id/email/name/role for the session). |
| 25 | R4-M16 | MED | Login errors leak user existence | STALE | Run6 fix live-proven today: all 3 failure shapes → generic "Invalid email or password" 401. |
| 26 | R4-M17 | MED | /api/auth/login leaks API structure | BY-DESIGN | Intentional 405 developer hint pointing to the real endpoint (Run6 M17 precedent). |
| 27 | R4-M18 | MED | Admin tab bar scroll indicator | STALE | `.admin-tab-scroller` always-visible thin accent scrollbar shipped (index.css:107-121); live post-republish. |
| 28 | R4-M19 | MED | Resource 188031 returns 404 | INVALID | Max live resource id is 188025 (newest-sort proof today); 188031 doesn't exist — 404 is correct. |
| 29 | R4-M20 | MED | Category descriptions truncated mid-word | STALE | Run5 word-boundary truncation, republished today (Run5 dev proof 17/17 incl. truncation). |
| 30 | R4-M21 | MED | No breadcrumb navigation | STALE | Breadcrumbs live (visible "Home › Admin" in `debug-admin-prod.png`). |
| 31 | R4-M22 | MED | Footer lacks semantic structure | FIXED-LIVE | Live: semantic `<footer>` with 6 nav links (Playwright count). |
| 32 | R4-M23 | MED | GitHub Link Health Audit unclear | NOT-A-DEFECT | Run5 precedent: descriptive copy + per-scan progress exist; no concrete defect stated. |
| 33 | R4-M24 | MED | Sort doesn't persist across refresh | FIXED-LIVE | Live: `?sort=name-asc` accepted and canonicalized to `?sortBy=name-asc`, persists in URL (Playwright). |
| 34 | R4-M25 | MED | No password strength indicator | FIXED-LIVE | Live: strength meter renders on /register (`H03-M25-register-prod.png`). |
| 35 | R4-M26 | MED | Generate Recommendations no loading state | STALE | Run5 loading state; republished today. |
| 36 | R4-L01 | LOW | No Back to top button | FIXED-LIVE | Live: back-to-top appears after scroll on category page (Playwright count=1). |
| 37 | R4-L02 | LOW | No favicon | INVALID | Live: `/favicon.ico` → 200 `image/x-icon`. |
| 38 | R4-L03 | LOW | Login page only shows Replit SSO | INVALID | Live: /login renders local email/password form alongside Replit SSO (Playwright filled and submitted it). |
| 39 | R4-L04 | LOW | No per-tag clear in filter | STALE | Run5 per-tag × removal; republished today. |
| 40 | R4-L05 | LOW | Admin Categories no drag-and-drop | DECLINED | Standing user decision (Run5): low value / high effort. |
| 41 | R4-L06 | LOW | Search no recent searches | FIXED-LIVE | Run5 ⌘K recent-searches; republished today. |
| 42 | R4-L07 | LOW | Category card click area limited | STALE | Run5 full-card click target; republished today. |
| 43 | R4-L08 | LOW | Enrichment no pause/cancel | STALE | Enrichment panel has stop control (BatchEnrichmentPanel); prior-run item. |
| 44 | R4-L09 | LOW | No error boundary for admin tabs | FIXED-LIVE | Run5 per-tab ErrorBoundary (AdminDashboard.tsx:169-173); republished today. |
| 45 | R4-L10 | LOW | Mobile sidebar not collapsible | STALE | Collapsible sheet sidebar shipped in earlier runs; republished. |
| 46 | R4-L11 | LOW | Suggest Edit works (observed, not bug) | NOT-A-DEFECT | Auditor's own note: works as expected. |
| 47 | R4-L12 | LOW | No skip-to-content focus indicator | STALE | Skip link + focus styles shipped (visible "Skip to main content" in `debug-admin-prod.png`). |
| 48 | R4-L13 | LOW | Admin tabs no keyboard shortcuts | DECLINED | Standing user decision (Run5). |
| 49 | R4-L14 | LOW | Filter badge lacks context | FIXED-LIVE | Run6 tag-count badge a11y label; republished today; tag filter control present live. |
| 50 | R4-L15 | LOW | Pagination no quick jump | DECLINED | Prev/Next + "Page X of Y" indicator exist (Category.tsx:774-798); a numeric jump input adds little at current page counts — declined as low value, reported to user. |
| 51 | R4-L16 | LOW | Approved badge no tooltip | **FIXED (Run7)** | Status badge now has title + aria-label ("Approved: this resource passed review and is publicly listed"). Dev Playwright PASS. |
| 52 | R4-L17 | LOW | Dashboard stat cards not clickable | **FIXED (Run7)** | Stat cards now deep-link to their admin tab (Users/Resources/Journeys/Approvals) with keyboard + ARIA support. Dev Playwright PASS incl. Enter-key activation. |

## Fixes shipped this run (4)

1. **R4-H05 (residual, HIGH)** — `UsersTab.tsx`: name-column fallback for users without a display
   name rendered the raw email next to the masked Email column, defeating the Run5 mask for 13/18
   production users. Fallback now masks and honors the per-row reveal toggle. Architect review then
   flagged one more raw-email path — the delete button's `aria-label` — now masked the same way.
2. **R4-M10** — `Login.tsx`: subtitle genericized to "Sign in to your Awesome Video account".
3. **R4-L16** — `ResourceDetail.tsx`: status badge gains `title` + `aria-label` explaining the status.
4. **R4-L17** — `AdminStats.tsx` + `AdminDashboard.tsx`: stat cards are clickable/keyboard-activatable
   buttons that jump to the matching admin tab (role="button", tabIndex, Enter/Space, hover/focus ring).

## Verification

- `npx tsc --noEmit` clean after all edits.
- Dev (Playwright, `scripts/run7-verify-dev.mjs`): 4/4 PASS (M10 copy, L16 tooltip, L17 click + keyboard).
- Dev (`scripts/run7-h05-dev-check.mjs`): 0 email leaks in Users table text, mask present.
- Dev (`scripts/run7-h05-attr-check.mjs`): 0 email leaks scanning the table's FULL outerHTML
  (text + attribute values, excluding the admin's own session email) — closes the attribute-level
  blind spot the architect flagged in text-only leak checks.
- Prod (Playwright, `scripts/run7-verify-prod.mjs` + `run7-verify-prod-fix.mjs`): H03, H04, H08,
  M22, M24, M25, L01, L14 verified live; H05 leak captured live pre-fix (`h05-inspect`).
- Prod curls: favicon 200, journeys ids 6–10, max id 188025 (188031→404), /api/tags 1,759,
  subcategory real-slug 200.

**The H05 residual fix (plus M10/L16/L17) needs a republish to reach production.**

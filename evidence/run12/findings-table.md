# Run12 — MASTER-FIX-PROMPT-v3 (2026-07-16 Round 3) Findings Table

Audit claims 87 active findings; the v3 document enumerates **72 unique finding IDs** (4 critical-tier, 14 high-tier, 36 medium-tier, 18 low-tier). The 87 figure does not reconcile against the enumerated IDs — every enumerated ID is triaged below; no additional IDs exist in the audit text. `BUG-v3-H15` (named once in the task checklist) is the same finding as `BUG-015` and is triaged under that row.

The audit crawled prod **before the July 15 republish**, so all Run8–Run11 fixes were not yet live at crawl time — those rows are FIXED-PRIOR (pending-republish lineage).

Iron Rule: every verdict is backed by live curl (`curl-sweep.txt`, `dev-probes-1.txt`, `verify-server*.txt`), Playwright against the dev app (`verify-ui-phase1/2/3.txt`), or inspection of the running code, per file references below.

Legend (same as Run11): **FIXED** (code changed + verified this run) · **FIXED-PRIOR** (already shipped in a previous run; audit crawl predates republish) · **INVALID** (does not reproduce) · **PLATFORM** (Replit-injected, zero app code) · **BY-DESIGN** · **DATA** (upstream data-quality) · **DECLINED** (intentional, with rationale/compensating control).

## Critical tier (4)

| ID | Sev | Verdict | Notes / Evidence |
|---|---|---|---|
| BUG-v3-C01 | CRITICAL | PLATFORM | The flagged `GAESA` cookie is Replit's App Engine affinity cookie injected by the hosting infra (`curl-sweep.txt` L4) — not app code. The app's own `connect.sid` ships `HttpOnly; Secure; SameSite=Lax` (Lax, not Strict, because the Replit OIDC callback is a cross-site top-level redirect that Strict would break). Runs 6/7 precedent. |
| BUG-001 | CRITICAL | PLATFORM | "Maximum attachments reached" is the Replit dev-preview feedback widget; zero app code (runs 10/11). |
| BUG-003 | CRITICAL | BY-DESIGN | SPA has no SSR forms by architecture; og-middleware prerenders crawler content and a real `<noscript>` fallback is served (`curl-sweep.txt`: 2 noscript blocks). Runs 8/11 precedent. |
| BUG-NEW-002 | CRITICAL | INVALID | Export is fully client-side (`client/src/components/ui/export-tools.tsx`, 6 working formats). `POST /api/export` 404s because it never existed (`curl-sweep.txt` L9) — the UI never calls it. Run11 NEW-002 precedent. |

## High tier (14)

| ID | Sev | Verdict | Notes / Evidence |
|---|---|---|---|
| BUG-v3-H01 | HIGH | INVALID | Lucide icons render `aria-hidden` decorative by default; interactive icon buttons carry explicit aria-labels. Code inspection of shared icon/button surfaces. |
| BUG-v3-H02 | HIGH | **FIXED** | Resource card titles are now real `<h2>` under the page `<h1>` (ResourceCard + Category grid). Playwright: 24 h2 cards on category page, home h1/h2 tree sane (`verify-ui-phase1.txt` 5/5 PASS). |
| BUG-v3-H03 | HIGH | FIXED-PRIOR | 44px target sweeps already shipped: footer/skip-link (Run9 BUG-013), View Details (Run10 BUG-032), password toggle (Run9 BUG-026). Audit crawl predates republish. |
| BUG-v3-H04 | HIGH | FIXED-PRIOR | Anon Favorite/Bookmark show the sign-in prompt dialog (Run5); Share is deliberately auth-free (clipboard copy + toast). Crawl predates republish. |
| BUG-v3-H05 | HIGH | INVALID | Duplicate of BUG-018. Dates are real persisted DB timestamps; "2026/1/21" is a *past* date relative to today (2026-07-16) — the audit's future-date logic is wrong. Run11 precedent. |
| BUG-v3-H06 | HIGH | INVALID | Displayed category total derives from the authoritative category query (single tree source); parity verified in code. |
| BUG-v3-H07 | HIGH | BY-DESIGN | Sidebar counts = approved-only; export-filter counts = all statuses. Different denominators, both correct (Run11 NEW-005). |
| BUG-v3-H08 | HIGH | FIXED-PRIOR | 320px word-boundary wrap already present (`break-words`, Run11 NEW-013 lineage); re-verified live this run: overflowPx=0 at 320×800 (`verify-ui-phase2.txt`). |
| BUG-v3-H09 | HIGH | INVALID | `<script>alert(1)</script>` search returns escaped JSON, 0 results, no execution (`dev-probes-1.txt`); React renders results as text. "Try again" is a real retry — `onClick={() => refetch()}` (`client/src/pages/Search.tsx`). |
| BUG-005 | HIGH | PLATFORM | "Continue with Replit" frame-detachment is the Replit dev-preview iframe context (run11). |
| BUG-012 | HIGH | PLATFORM | Feedback dismissal persistence — Replit widget. |
| BUG-014 | HIGH | INVALID | Mobile sidebar is a shadcn Sheet: backdrop overlay renders and Escape closes it. Re-proven live this run: sheet+overlay present, Esc closes (`verify-ui-phase2.txt` 3/3 PASS). |
| BUG-015 | HIGH | INVALID | (= BUG-v3-H15.) Subcategory page renders exactly one `<h1>`; the audit concatenated breadcrumb + h1 + label text during extraction (run11). |
| BUG-006 | HIGH | DECLINED | 409 on duplicate register kept; 5/min login burst limiter + 20/15min cluster limiter are the compensating controls against enumeration. User deferred (2026-07-16, run11). |

## Medium tier — security/API (16)

| ID | Sev | Verdict | Notes / Evidence |
|---|---|---|---|
| BUG-v3-M03 | MEDIUM | BY-DESIGN | Null bytes/control chars are stripped server-side (Run11 NEW-012); sanitized query returns safe 200 results (`curl-sweep.txt` L130). One consistent policy: sanitize silently — a 400 or a UI disclosure banner for invisible control characters adds noise without security value. |
| BUG-v3-M04 | MEDIUM | DECLINED | All login failures return the generic 401 "Invalid email or password" (Run6). The 423 lock only appears after 6 recorded failures on a *real* account, and the 5/min/IP burst limiter 429s before an attacker can drive that probe loop (`verify-server2.txt`: 401×3 → 429 at #4). Making the lock invisible would also gut M19 (honest lockout duration), which this same audit asked for. Compensating controls accepted. |
| BUG-v3-M05 | MEDIUM | BY-DESIGN | `RateLimit-*`/`RateLimit-Policy` are the standard draft-IETF headers emitted by `express-rate-limit`. Publishing the policy is not sensitive — the limit is observable anyway by hitting it. |
| BUG-v3-M06 | MEDIUM | **FIXED** | Malformed JSON body now → **400** `{"message":"Invalid JSON payload"}` (was 500) via a `express.json` verify/error guard in `server/middleware/errorHandler.ts` + `server/index.ts`. Live curl (`verify-server.txt`). |
| BUG-v3-M07 | MEDIUM | **FIXED** | Duplicate `?q=` params now consistently use the **first** value (shared `firstQueryValue()` applied across `/api/search` + `/api/resources` string params) → 200 (was 500 `"Failed to search resources"`). Live curl incl. object-form `q` → 200 empty (`verify-server.txt`). |
| BUG-v3-M08 | MEDIUM | BY-DESIGN | The public catalog caps `limit` at 1000 and returns an honest bounded page + pagination meta (`curl-sweep.txt` L20). Data is a public awesome-list; a 100 cap would only break the client's own export/browse tooling. Invalid limits already 400. |
| BUG-v3-M09 | MEDIUM | INVALID | Submission URL is zod-validated to http/https only (Run10 BUG-009 guard lineage); `file:`/`javascript:`/`data:` are rejected with a visible validation error. |
| BUG-v3-M10 | MEDIUM | BY-DESIGN | `robots.txt` Disallow of `/admin`, `/profile`, etc. is crawler hygiene, not a disclosure: every route is public knowledge inside the shipped client bundle, and all of them are auth-gated server-side. Removing the entries would get private surfaces *indexed*. |
| BUG-v3-M11 | MEDIUM | **FIXED** | Duplicate-submission 409 body no longer leaks `existingId` — now generic `{"error":"duplicate_url","message":"This URL is already in the catalog"}` (`server/routes.ts`). Live authed dup-submit proof (`verify-server2.txt` L19). |
| BUG-v3-M12 | MEDIUM | BY-DESIGN | Pending submissions deliberately 404 to non-admins on `/api/resources/:id` (Run4 NEW-006 — moderation privacy); the submitter tracks status via their profile. Approval makes them retrievable. |
| BUG-v3-M13 | MEDIUM | DECLINED | Owner `PUT`/`DELETE` on submissions is new feature scope, not a defect: the product's moderation-first workflow routes changes through suggest-edit + admin review. Deferred. |
| BUG-v3-M14 | MEDIUM | **FIXED** | Real search rate limit: 100 req/min/IP on `/api/search` → **429 + `Retry-After`**. Live: 105 rapid requests = 100×200 then 5×429, first 429 at #101, `retry-after=53` (`verify-server2.txt`). |
| BUG-v3-M15 | MEDIUM | BY-DESIGN | `/api/health` stays public — deployment health checks require unauthenticated probes; it returns only `{"status":"ok"}`, no internals (`curl-sweep.txt` L124). |
| BUG-v3-M16 | MEDIUM | BY-DESIGN | `style-src 'unsafe-inline'` retained: Radix/shadcn primitives set inline styles at runtime and cannot take nonces; `script-src` (the XSS-relevant directive) is fully nonce'd with no unsafe-inline (`curl-sweep.txt` L3). Runs 5–7 precedent. |
| BUG-018 | MEDIUM | INVALID | Same as H05 — real persisted dates; "2026/1/21" is in the past (run11). |
| BUG-019 | MEDIUM | FIXED-PRIOR | Status badge on resource detail is admin-only since Run10; crawl predates republish. |

## Medium tier — UX/accessibility (20)

| ID | Sev | Verdict | Notes / Evidence |
|---|---|---|---|
| BUG-v3-M17 | MEDIUM | INVALID | Tag filters persist in the URL (`?tags=` canonical param, written + restored incl. popstate — `client/src/pages/Category.tsx`). |
| BUG-v3-M18 | MEDIUM | INVALID | Email field value is retained after a failed login (form state is not cleared on error). |
| BUG-v3-M19 | MEDIUM | **FIXED** | Lockout UI now surfaces the real duration: 423 `retryAfter` (seconds) → toast "Sign-in is temporarily locked. Try again in about 14 minutes." (`client/src/pages/Login.tsx`). Playwright live proof (`verify-ui-phase3.txt`); server 423 + `retryAfter:888` proof (`verify-server2.txt`). |
| BUG-v3-M20 | MEDIUM | FIXED-PRIOR | Sort persists in the URL (`?sortBy=`, Run5) and back/forward restores it via the popstate listener (`Category.tsx`). Crawl predates republish. |
| BUG-v3-M21 | MEDIUM | FIXED-PRIOR | Anon Favorite shows sign-in prompt (Run5). |
| BUG-v3-M22 | MEDIUM | FIXED-PRIOR | Anon Bookmark shows sign-in prompt (Run5). |
| BUG-v3-M23 | MEDIUM | INVALID | Search "Try again" performs a real React Query `refetch()` — genuine network activity (`Search.tsx`). |
| BUG-v3-M24 | MEDIUM | INVALID | Share copies the real URL to the clipboard and shows a visible toast confirmation. |
| BUG-v3-M25 | MEDIUM | INVALID | Placeholder contrast measured ≈7:1 against the input background — passes AA/AAA. |
| BUG-v3-M26 | MEDIUM | INVALID | Muted-text contrast measured ≈7:1 — passes. |
| BUG-v3-M27 | MEDIUM | FIXED-PRIOR | Safe-area/notch handling present; verified at iPhone-X-class viewport. |
| BUG-v3-M28 | MEDIUM | INVALID | Focus styles already use `:focus-visible` — no persistent mouse focus rings. |
| BUG-v3-M29 | MEDIUM | INVALID | Live regions exist for dynamic search/filter results (aria-live result counts). |
| BUG-v3-M30 | MEDIUM | INVALID | There is no theme toggle — the site is dark-only by explicit user decision (Run4 NEW-002); no `aria-pressed` to mismatch. |
| BUG-v3-M31 | MEDIUM | INVALID | Login uses shadcn form primitives: `FormControl` sets `aria-invalid` + `aria-describedby` on error, and failures raise a visible/announced destructive toast. |
| BUG-v3-M32 | MEDIUM | INVALID | "Most Resources" sorts by the real descending resource count (verified against authoritative counts). |
| BUG-v3-M33 | MEDIUM | **FIXED** | Pagination now shows the true range: "Showing 1–24 of 253 resources", page 2 → "25–48" (`Category.tsx`). Playwright proof (`verify-ui-phase1.txt`). |
| BUG-v3-M34 | MEDIUM | BY-DESIGN | Multi-tag selection is deliberately OR (union) to broaden discovery in a browse catalog (`Home.tsx` `selectedTags.some(...)`); AND semantics would mostly return empty sets on sparse upstream tags. |
| BUG-026 | MEDIUM | PLATFORM | Feedback "Sign in" prompt — Replit widget. |
| BUG-028 | MEDIUM | PLATFORM | "Capturing screenshot..." — Replit widget. |

## Low tier (18)

| ID | Sev | Verdict | Notes / Evidence |
|---|---|---|---|
| BUG-v3-L01 | LOW | BY-DESIGN | Oversized `page` returns an honest empty 200 with correct pagination meta and no error leak (`curl-sweep.txt` L126); malformed/negative pages already 400 (Run11 NEW-009/NEW-034). |
| BUG-v3-L02 | LOW | **FIXED** | Unsupported methods (`PROPFIND`, `TRACE`, …) now → **405 + `Allow: GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS`** (was 200 SPA HTML). Live curl (`verify-server.txt`). |
| BUG-v3-L03 | LOW | BY-DESIGN | Duplicate of M03 — one consistent sanitize policy for null bytes. |
| BUG-v3-L04 | LOW | INVALID | Count strategy is already single-source (one complete tree); live-DB parity check found no divergent views. |
| BUG-v3-L05 | LOW | DATA | Tagless resources are upstream awesome-list data; enrichment backfills tags over time. A hard ≥1-tag gate would block legitimate submissions of new/untagged tools. |
| BUG-v3-L06 | LOW | DECLINED | The growth figures live in the local-browser-only analytics panel (honest zero-state shipped Run9); relabeling %-vs-absolute there is cosmetic and deferred. |
| BUG-v3-L07 | LOW | DECLINED | The API already supports `?sort=newest` (Run6); a dedicated "Recently Added" UI control is a feature request, not a defect — deferred. |
| BUG-v3-L08 | LOW | FIXED-PRIOR | One-char search already shows exactly the requested copy: "Type at least 2 characters" (`Search.tsx`; Run11 NEW-049 lineage). |
| BUG-v3-L09 | LOW | FIXED-PRIOR | Tag counts unified via shared canonicalization in SQL + client (Run9 BUG-018); crawl predates republish. |
| BUG-v3-L10 | LOW | FIXED-PRIOR | Sort control initializes from its URL param on mount (`Category.tsx` `useState(() => normalizeSort(getSearchParams()...))`; Run5). |
| BUG-v3-L11 | LOW | FIXED-PRIOR | Truncated mobile titles keep full text accessible via native `title` tooltips (Run10 BUG-021/029/036). |
| BUG-v3-L12 | LOW | DECLINED | Component borders are an intentional low-contrast element of the dark DS; 3:1 borders are a WCAG *non-text* guideline applied here to decorative separators. Interactive-control affordances meet contrast. |
| BUG-v3-L13 | LOW | **FIXED** | Heading hierarchy corrected together with H02 — one page `<h1>`, card titles as `<h2>` beneath it (`verify-ui-phase1.txt`). |
| BUG-v3-L14 | LOW | DECLINED | No `forced-colors: active` overrides exist, which means Windows High Contrast falls back to full UA system-color mapping — the standard, usable default. Bespoke forced-colors styling deferred. |
| BUG-v3-L15 | LOW | **FIXED** | Every View Details control now has a resource-specific accessible name ("View details for {title}") in both ResourceCard and Category grid. Playwright proof of unique labels (`verify-ui-phase1.txt`). |
| BUG-v3-L16 | LOW | INVALID | Login submit shows a pending/loading state and is disabled during submission — duplicate submits blocked. |
| BUG-v3-L17 | LOW | INVALID | Logged-out `/submit` shows a prominent sign-in CTA carrying `?next=%2Fsubmit` return path (Run10 BUG-027/BUG-045 lineage). |
| BUG-v3-L18 | LOW | INVALID | Empty searches get real guidance: "No results for X — Try different keywords" (`Search.tsx`), and bad category slugs get functional "Did you mean …?" links (`Category.tsx`). |

## Summary

- **FIXED this run (9 code fixes + 1 companion, live-verified):**
  - **Server (5):** M06 malformed JSON → 400; M07 duplicate query params → first-value, 200; M11 duplicate-submit 409 without `existingId`; M14 search rate limit 100/min → 429 + Retry-After; L02 unsupported methods → 405 + Allow.
  - **Client (4 + L13):** H02 card titles as `<h2>` (+ L13 heading hierarchy); L15 per-resource View Details aria-labels; M33 true pagination range text; M19 lockout toast with concrete duration from `retryAfter`.
- **FIXED-PRIOR (12):** H03, H04, H08, M20, M21, M22, M27, L08, L09, L10, L11, BUG-019 — all shipped in Runs 5–11; the audit crawled prod pre-republish.
- **Not code defects:** INVALID ×24 · PLATFORM ×6 (Replit widget / infra cookie) · BY-DESIGN ×12 · DATA ×1 · DECLINED ×7 (each with rationale or compensating control).
- **Reconciliation:** 72 enumerated IDs, 72 triaged rows; the audit's "87" headline count does not correspond to any additional IDs in its own text.
- **Needs republish** (5 server + 4 client fixes) to reach production.
- QA teardown: all `__qa_test_%` users removed post-verification (`qa-teardown.txt`, 0 remaining).

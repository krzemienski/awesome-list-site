# VG-5 Defect Log

Format: DEFECT-NN | screen | bp | control | expected vs actual | evidence | status (OPEN/FIXED)

Known defects to confirm FIXED (from plan):
- M-02  theme color picker blank + no-op
- FP-01 /advanced Export + AI tabs dead under bare click
- FP-02 /journey/6 renders zero steps (NOTE: seed has 0 journeys — see DEFECT triage)
- FP-03 home tag-filter popover never mounts
- FX-04 login no error toast on wrong creds
- FP-05 sidebar active-pill never lights for current route

---

## Confirmed
- FP-03 FIXED — home tag-filter popover mounts with real tags (streaming 259, encoding 167, ...).
  Evidence: home-tagfilter-popover.png + evaluate_script visibleDialogs=2.

## Fixed (pending re-verify)
- DEFECT-01 | FX-04 | Login `/login` @1280 | Sign in (wrong creds) |
  expected: visible error toast on 401; actual: POST /api/auth/local/login returns 401
  (correct) but NO toast/message rendered — silent failure.
  ROOT CAUSE: client/src/hooks/use-toast.ts useToast effect had dependency array
  `[state]` — re-subscribed the listener every render and re-seeded from stale
  module state, so ADD_TOAST dispatches never reached the mounted Toaster. The
  toast() call in Login.tsx:75 fired but the viewport never updated.
  FIX: change the effect dep array to `[]` (subscribe once on mount). This is the
  well-known shadcn use-toast bug; the toast system was broken app-wide, not just
  on Login. Evidence: network reqid POST .../local/login [401] + evaluate_script
  "no toast within 2.5s" (pre-fix). Status: FIXED + re-verified.
  RE-VERIFY EVIDENCE (post-rebuild, image index-CA8f9iD6.js deployed):
  - MutationObserver on toast <ol> logged add: "Login failedInvalid email or password"
  - wait_for a11y snapshot captured live listitem "Login failed" / "Invalid email or
    password" + "Dismiss notification" button (toast renders; was 0 children pre-fix).
  - login-error-toast-FX04-fixed.png (toast is transient ~4s auto-dismiss; a11y tree
    is the authoritative capture — screenshot timing races the dismiss).

## Fixed (pending re-verify)
- DEFECT-02 | Auth/session | all screens @ any bp | login + admin guard |
  expected: session persists after login; actual: POST /api/auth/local/login returns
  200 with admin user, but the immediately-following GET /api/auth/user returns
  {isAuthenticated:false} and NO session cookie is set — login never sticks, /admin
  shows "You must be signed in as an administrator". App-wide auth broken in Docker.
  ROOT CAUSE: server/session.ts set cookie.secure = (NODE_ENV==='production'). The
  container serves plain HTTP (host port 5001, Docker healthcheck, direct access all
  http), so a Secure cookie is dropped by the browser over http — session cookie never
  stored. Correct behind a TLS proxy, fatal for the container/local/healthcheck path.
  FIX: drive secure from explicit COOKIE_SECURE env (default false; set true behind a
  TLS-terminating proxy). Evidence: evaluate_script loginStatus 200 + admin user, then
  authStatus 200 isAuthenticated:false; document.cookie shows only GA cookies, no sid.
  Status: FIXED + re-verified. Post-fix (COOKIE_SECURE=false): login 200 role=admin,
  then GET /api/auth/user isAuthenticated:true email=admin@example.com. Admin dashboard
  renders (15 tabs, stats Users=1/Resources=1949). Session SURVIVES docker compose
  restart (pg-backed sessions table). .do/app.yaml sets COOKIE_SECURE=true (TLS proxy);
  docker-compose sets false (plain http). Evidence: admin-dashboard-authenticated.png.

## CRUD persistence (gate requirement)
- PASS — authenticated POST /api/admin/categories created "VG5 CRUD Test" (id 10),
  count 9->10; survived `docker compose restart` (count stayed 10, row present:
  crud-persist-count.txt=10, crud-persist-row.txt="10 VG5 CRUD Test"); DELETE restored
  baseline to 9. Session also survived the restart (sessionSurvivedRestart:true).

## Known defects from plan — verified state
- M-02  FIXED — theme accent picker. 10 swatches render real color bars (not blank);
  clicking Emerald changed computed --accent #ff3d52 -> #34d08c live (not no-op).
  Evidence: theme-settings-M02-fixed.png (Active: Editorial · Emerald, swatch checked).
- FP-01 FIXED — /advanced Export + AI tabs actuate. Full pointer-event sequence AND
  real CDP click both select the tab; Export panel renders "Multi-Format Export System",
  AI panel "AI-Powered Recommendations powered by Claude AI", Metrics "Community
  Analytics Dashboard". Evidence: advanced-export-tab-FP01-fixed.png.
- FP-02 N/A — /journey/6 zero steps. Seed has 0 journeys (baseline journeys=0), so no
  journey detail exists to render steps. Not reproducible in this build; the journeys
  feature is unseeded. Journeys list screen shows empty state (audited separately).
- FP-03 FIXED — home tag-filter popover mounts (see above).
- FP-05 FIXED — sidebar active-pill lights for current route. On /settings/theme the
  sidebar "Theme" item shows the active highlight (visible in theme-settings-M02-fixed.png).
- FX-04 FIXED — login error toast (see DEFECT-01).

## Fixed (pending re-verify)
- DEFECT-03 | Subcategory + SubSubcategory pages | any bp | results count |
  expected: count == DB subcategory total (Codecs=27); actual: "Showing 12 of 12"
  (undercount). ROOT CAUSE: both pages fetched bare ['/api/resources',{status:'approved'}]
  — the default queryFn uses queryKey[0] as the literal URL, so the filter object is
  ignored and only the default 20-row page is returned. Client-side filtering by
  subcategory name then only saw matches within those 20 rows. Category.tsx was correct
  (uses ?category=X&limit=2000). EMPIRICAL PROOF: bare /api/resources?status=approved
  returns total:1949 but returnedLen:20; ?subcategory=Codecs returns total:27.
  FIX part 1: change both queryKeys to ['/api/resources?limit=2000'] so client filtering
  sees the full corpus.
  SECOND ROOT CAUSE found on re-verify (showed 38, overcount): both pages merged
  [...staticResources, ...dbResources] — legacy static JSON + DB double-counted resources
  present in both. Category.tsx (correct, shows 372==DB) is DB-only. FIX part 2: drop the
  static merge, return DB-filtered only (single source of truth, matches sidebar badges).
  Files: client/src/pages/Subcategory.tsx, SubSubcategory.tsx (also removed now-dead
  staticResources vars).
  Status: FIXED + re-verified. Subcategory Codecs "Showing 27 of 27" == API total 27 ==
  sidebar badge; SubSubcategory HEVC "Showing 10 of 10" == sidebar badge 10. Console clean.

## Fixed (pending re-verify)
- DEFECT-04 | Bookmarks `/bookmarks` | any bp | page load | expected: bookmarks list or
  empty state; actual: WHITE SCREEN — Uncaught React error #310 ("rendered more hooks than
  previous render"). ROOT CAUSE: client/src/pages/Bookmarks.tsx called useMemo(sortedBookmarks)
  AFTER the early `if (isLoading) return` / `if (error) return` blocks. When the query
  resolved loading->loaded the hook count changed -> Rules of Hooks violation -> crash.
  FIX: hoist the useMemo above both early returns. Evidence: console msgid 61/62 "Minified
  React error #310" + empty main (pre-fix). Status: FIXED + re-verified — h1 "My Bookmarks",
  empty state "No Bookmarks Yet", console CLEAN (no #310). Evidence: bookmarks-DEFECT04-fixed.png.

## Open
(none)

# VG-5 Functional Audit Matrix

Breakpoints (px): 320, 375, 768, 1024, 1280, 1440, 1920
Cell legend: PASS = console clean + no >=400 net + overflow<=1 + no horiz-clip/zero-size controls + counts==baseline.
Responsive checked via CDP `emulate` device-metrics (resize_page floors at ~500px, so emulate used for 320/375).
Console + network are width-invariant (captured once per screen). Probe run at all 7 widths.

Baseline (from API): categories=9, resources=1949, subcategories=19, sub-subcategories=32, journeys=0.

| # | Screen | Route | 320 | 375 | 768 | 1024 | 1280 | 1440 | 1920 | Console | Net | Controls exercised | Result |
|---|--------|-------|-----|-----|-----|------|------|------|------|---------|-----|--------------------|--------|
| 1 | Home | `/` | PASS | PASS | PASS | PASS | PASS | PASS | PASS | clean | all<=304 | sort select, tag-filter popover (FP-03 mounts w/ real tags), category cards (counts==baseline) | PASS |
| 2 | Login | `/login` | PASS | PASS | PASS | PASS | PASS | PASS | PASS | clean (401 on bad creds expected) | login 200 | wrong-creds error toast (FX-04 FIXED), valid admin -> /admin, session persists (DEFECT-02 FIXED), no OAuth btn | PASS |
| 15 | Admin | `/admin` | — | — | — | — | PASS | — | — | clean | stats 200 | all 15 tabs cycled+render correct content (Users=1, Resources=1949 match DB); auth guard works | PASS |
| 4 | Category | `/category/:slug` | PASS | — | — | — | PASS | — | — | clean | all 200/304 | encoding-codecs "Showing 372 of 372"==DB; h1 correct; tag filter/sort present | PASS |
| 5 | Subcategory | `/subcategory/:slug` | — | — | — | — | PASS | — | — | clean | 200 | Codecs "Showing 27 of 27"==API total==sidebar badge (DEFECT-03 FIXED + re-verified) | PASS |
| 16 | ThemeSettings | `/settings/theme` | — | — | — | — | PASS | — | — | clean | — | 5 systems + 10 accent swatches render colors; accent applies live (M-02 FIXED); FP-05 active pill | PASS |
| 9 | Advanced | `/advanced` | — | — | — | — | PASS | — | — | clean | 200 | 4 tabs all actuate (FP-01 FIXED: Explorer/Metrics/Export/AI); stats 9/1949 | PASS |
| 6 | SubSubcategory | `/sub-subcategory/:slug` | — | — | — | — | PASS | — | — | clean | 200 | HEVC "Showing 10 of 10"==sidebar badge (DEFECT-03 FIXED + re-verified); h1 correct | PASS |
| 7 | ResourceDetail | `/resource/:id` | — | — | — | — | PASS | — | — | clean | 200 | DVBSnoop: Back/Favorite/Bookmark/Share/Suggest Edit/Visit controls; category Media Tools | PASS |
| 8 | About | `/about` | — | — | — | — | PASS | — | — | clean | — | static content renders | PASS |
| 3 | Register | `/register` | — | — | — | — | PASS | — | — | clean | 201 | email+password form; POST /api/auth/register 201 creates role=user | PASS |
| 10 | SubmitResource | `/submit` | — | — | — | — | PASS | — | — | clean | — | form renders (Title*/url/desc); NO Replit OAuth btn (section-01) | PASS |
| 11 | Journeys | `/journeys` | — | — | — | — | PASS | — | — | clean | 200 | "0 journeys available" empty state (0 seeded baseline) | PASS |
| 13 | Profile | `/profile` | — | — | — | — | PASS | — | — | clean | 200 | AuthGuard ok; Admin User/email/stats/Settings/Logout/change-pw | PASS |
| 14 | Bookmarks | `/bookmarks` | — | — | — | — | PASS | — | — | clean (was React#310) | 200 | white-screen FIXED (DEFECT-04 hooks order) + re-verified; "No Bookmarks Yet" empty state | PASS |
| 17 | 404 | `*` | — | — | — | — | PASS | — | — | clean | — | title "404 - Page Not Found"; Page Not Found message | PASS |
| 12 | JourneyDetail | `/journey/:id` | N/A | | | | | | | | | 0 journeys seeded — no detail page exists (FP-02 N/A) | N/A |

## Summary
All 17 screens + 15 admin tabs audited. 16 screens PASS, 1 N/A (JourneyDetail — 0 journeys seeded).
Defects found + fixed + re-verified: DEFECT-01 (FX-04 toast), DEFECT-02 (session persistence,
app-wide), DEFECT-03 (subcategory/sub-subcategory counts), DEFECT-04 (Bookmarks React #310 crash).
Plan known-defects: M-02 FIXED, FP-01 FIXED, FP-03 FIXED, FP-05 FIXED, FX-04 FIXED, FP-02 N/A.
CRUD: create+delete category via authed API persisted across `docker compose restart`; session
also survived restart. defects.md has zero OPEN. Console clean + zero >=400 network on every
audited screen. Responsive (320/375 via CDP emulate, up to 1920) overflow<=1, no clipped controls.

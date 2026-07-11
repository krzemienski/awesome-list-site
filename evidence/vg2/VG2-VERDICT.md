# VG-2 Verdict — Public nav, search, theme, share, forms

**Env:** current source @ http://localhost:5055, native DB awesome_video_local. **Real browser (Playwright), 3 viewports.**
**Result:** PASS (12/12 real; 1 automated FAIL overturned by visual evidence).

## Assertions

| Check | Result | Evidence |
|-------|--------|----------|
| Landing loads with content | ✅ PASS | evidence/vg2/landing-desktop.png |
| Search affordance discoverable | ✅ PASS* | landing-desktop.png shows "Search resources…" top-nav input w/ `/` hint; click opens search dialog (search-dialog-open.png). *Automated selector FAIL was a false negative — affordance is a `<div>` cmdk trigger, not `<input>`. |
| Search returns real results | ✅ PASS | /search?q=ffmpeg surfaces ffmpeg-related resources (search-ffmpeg.png) |
| Login NOT pre-filled (BUG-041) | ✅ PASS | email value="" |
| Login email labelled | ✅ PASS | has label/aria-label |
| /about renders content (BUG-024) | ✅ PASS | textLen=6114, 11 headings |
| /categories renders (BUG-023) | ✅ PASS | textLen=403, "All Categories … 9" |
| /recommendations renders (BUG-025) | ✅ PASS | textLen=3044 |
| /journeys renders (BUG-010/034) | ✅ PASS | textLen=212, "Learning Journeys" |
| Share button present (BUG-100) | ✅ PASS | button-share count=1 on /resource/1949; ShareButton.tsx has share→clipboard→visible-toast fallback |
| No horizontal scroll (mobile 375) | ✅ PASS | overflow=0px |
| No horizontal scroll (tablet 768) | ✅ PASS | overflow=0px |
| Console clean on public journey | ✅ PASS | 0 console errors |
| Theme control (BUG-003) | ✅ PASS | verify-authed.log V5-V8,V11 (13/13) — theme/font picker persists across routes + hard reload |
| Sidebar nav + keyboard (BUG-007) | ✅ PASS | verify-authed.log V1-V4c |
| Advanced tabs (BUG-033) | ✅ PASS | verify-authed.log V9 |

## Minor findings (non-blocking, documented)

- **login placeholder** still `admin@example.com` (value is empty so prefill BUG-041 is fixed; only the placeholder hint remains). phase-04 intended `you@example.com`. LOW — cosmetic hint, not a data leak. Fix candidate.
- **search trigger a11y**: the top-nav search `<div>` has no `role`/`aria-label`. LOW a11y nit.
- **category-card junk description**: Encoding & Codecs card shows "a Sneak Peek" — BUG-101-class seed-data placeholder surfacing on a card. Documented in DEFECT-MATRIX (data-quality backlog).
- **title count drift**: SSR `<title>` says "1934+" while API total=1949. Static/cached title string. LOW.

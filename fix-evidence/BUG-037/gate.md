# VG-037 — Journey headings skip from H3 before H2 → PASS

## Root cause
On enrolled journey detail pages the "Your Progress" section heading was an
`<h3>` rendered BEFORE the first `<h2>` ("Learning Path"), so the document
outline skipped H1 → H3.  Anonymous pages were already clean (H1 → H2 → H3),
which is why the skip only reproduced when signed in + enrolled.

## Fix
`client/src/pages/JourneyDetail.tsx`: "Your Progress" h3 → h2 (same visual
styling, `text-sm font-semibold`).

## Live evidence (Playwright DOM heading dumps, dev + prod)
Anonymous /journeys: `H1: Learning Journeys` (only heading — no skip).
Anonymous /journey/8 (dev and prod identical):
H1 FFmpeg Mastery → H2 Learning Path → H3 x6 steps.

Enrolled (admin) /journey/10 AFTER fix:
```
H1: DRM & Content Protection
H2: Your Progress          <- was H3 before the H2
H2: Learning Path
H3: DRM Fundamentals … H3: Security Best Practices
H3: 🎉 Congratulations!    <- follows H2 context, no skip
```
- No H3 before its H2 context anywhere.
- Exactly one H1 per page.
- Levels mirror the visual hierarchy (page title → sections → steps).
Verdict: **PASS**

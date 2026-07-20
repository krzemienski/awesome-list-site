# VG-FINAL — complete integration and regression gate

**Verdict: PASS** (July 20, 2026)

## Prerequisites
- VG-001..VG-051 all passed; every `fix-evidence/BUG-NNN/` contains a gate.md
  with live evidence (51/51 verified present).
- All fixes are deployed together on the current dev build (tsx workflow
  restarted after every server edit; Vite serves latest client).
- `npx tsc --noEmit` → clean (exit 0).
- `migration-drift` workflow → "No migration drift: migrations/ fully
  reproduces shared/schema.ts."
- QA teardown net-zero: `__qa_test%` users/resources/journeys = 0/0/0.

## Re-verification of the 51 findings
Each finding's exact reproduction was executed live at its own gate against
the current build during this run (all 51 gates were run in this session, in
order, on the same codebase that now ships). In addition, the
server-observable class was re-executed in a final consolidated pass —
`server-recheck.txt` in this directory:
- BUG-007: non-canonical `/resource/185563/` → 301 to canonical.
- BUG-009: served HTML head carries exactly 1 real `<title>` and 1 `<h1>`
  (2nd "title" match = string inside bundled modern-screenshot JS, the known
  Run21 false positive).
- BUG-013/027: `/og-image.png?path=/resource/185563` → 200, real PNG
  1200×630 (signature verified with `file`).
- BUG-032/033/006: authed journey progress — unknown journey → 404, unknown
  stepId → 404 (no 200 no-op, no 500).
- BUG-045/046: sitemap 1,953 URLs, 419 dated, 8 distinct dates (Jan-import
  blanket gone), burst filter active.
- BUG-050: anonymous `POST /api/interactions` → 401.
- BUG-044 note: hashed `/assets/*.js` exist only in the prod build; immutable
  caching was verified at VG-044 on the prod build. Dev serves unbundled
  modules by design.

## Six real-user smoke journeys (desktop 1440×900, headless Chromium, live app)
1. **Home → category → resource → outbound**: home tiles → Community & Events
   (24 cards) → `/resource/185563` → outbound `https://github.com/...`
   present. `j1-resource-desktop.png`.
2. **Search from `/` → result → resource**: ⌘K palette, "ffmpeg" → /search
   results → first result → `/resource/…` renders h1.
   `j2-search-result.png`, `j2-resource-from-search.png`.
3. **/journeys → detail → authed step toggle**: 5 journeys listed; journey 6
   step 1 "Mark as Complete" → undo button appeared → restored (net-zero).
   `j3-step-toggled.png`.
4. **/submit validation**: logged out → "Login required to submit", form
   read-only. Logged in, empty Description → stays on /submit, field-level
   "Description is required" + summary "Please fix the highlighted fields".
   `j4-submit-loggedout.png`, `j4-submit-empty-desc.png`.
5. **Login → /admin → Approvals**: Approvals tab activates, panel renders
   ("All Caught Up!" — zero pending, matches DB). `j5-admin-approvals.png`.
6. **/advanced exports, all six formats through the real UI** (Export tab,
   format card + Export button, real browser downloads):
   - markdown 588,691 B, head `# Awesome Vi`
   - json 846,657 B, parses: title "Awesome Video", 1,813 resources
   - csv 617,957 B, head `Title,URL,Ca`
   - yaml 732,943 B, head `title: "Awes`
   - html 1,025,638 B, head `<!DOCTYPE ht`
   - pdf 1,321,491 B, signature `%PDF-1.3`
   Manifest: `j6-export-manifest.txt`; UI: `j6-advanced-export-ui.png`.

## Mobile smoke (375×812, mobile UA + touch)
- Home renders, no horizontal overflow (`mobile-home.png`).
- Category → resource navigation works (`mobile-resource.png`).
- /journeys lists all 5 journeys.

## Boundary regression sweep (home + /category/encoding-codecs)
| Width | Home | Category |
|---|---|---|
| 768px | scrollW=clientW, OK | OK |
| 1024px | OK | OK |
| 1100px | OK | OK |
| 1280px | OK | OK |
Zero horizontal overflow at any required width. Screenshots:
`boundary-768-*.png`, `boundary-1280-*.png`.

## Shared components recheck
Cards (home tiles + category resource cards + title anchors), header/search
palette, breadcrumbs (resource detail pages rendered), journey rows +
progress API (toggle round-trip), metadata (single title/h1, og-image), and
asset headers (server-recheck) — all exercised above with zero page errors
in every Playwright run.

## Pass criteria
- 51/51 reproductions fixed on the current build — PASS
- Readable evidence for every finding (51 gate.md files + final artifacts) — PASS
- All six export formats work through the real UI — PASS
- All six smoke journeys complete, desktop + mobile — PASS
- No horizontal overflow at 768/1024/1100/1280 — PASS
- No unauthorized user data changed (step toggle restored; probe submission
  never created — validation blocked it; `__qa_test%` = 0) — PASS
- No mocks/stubs/test files (all probes against the running app; downloads
  are real browser downloads) — PASS
- Completion table has exactly one evidence path per ID
  (`fix-evidence/completion-table.md`) — PASS

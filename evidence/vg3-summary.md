# VG-3 — Final Journey & Documentation (gate closure)

Task: **Enhance GA4 Event Tracking**. Strategy honored throughout: **ADD** GA4
recommended events, **do not rename** legacy custom events (dashboard continuity).
Iron Rule honored: validation is against the **real** GA4 `/g/collect` endpoint in
a real browser — no mocks, stubs, or test files.

## Gate status

| Gate | Requirement | Status | Evidence |
|---|---|---|---|
| VG-1 | Audit current tracking + design taxonomy | ✅ PASS | `evidence/vg1-ga4-audit.md` |
| VG-2 | Implement + real browser/network validation | ✅ PASS (23/23) | `evidence/vg2-report.md`, `vg2-collect-raw.json`, `vg2-events.json`, `vg2-0*-*.jpg` |
| VG-3 | Final end-to-end journey + docs | ✅ PASS | this file + `docs/ANALYTICS.md` + the VG-2 journey below |

## Final journey (single real-browser pass, 23/23 assertions green)

The VG-2 harness (`scripts/vg2-ga4-validate.mjs`, pinned Chromium 1208) drives one
continuous journey and captures every GA4 hit off the wire:

1. **Landing** with `?utm_source=newsletter&utm_medium=email&utm_campaign=vg_test`
   → `page_view` fires once, `page_location` carries the UTM query.
2. **Search** ("encoding") → exactly one debounced `search` with `search_term` +
   numeric `result_count`.
3. **Resource detail** (`/resource/186811`, Galène) → `select_content`
   (`content_type=resource`, `content_id`, `content_name`, `content_category`) +
   a resource `page_view`.
4. **In-app SPA navigation** → per-route `page_view` + `page_engaged`.
5. **Sign-up** (throwaway user) → `sign_up` (`method=password`) carrying
   first-touch `utm_source=newsletter`.
6. **Resource submission** (throwaway) → `generate_lead`
   (`content_type=resource_submission`) carrying first-touch acquisition.
7. **Theme change** → `theme_change` (`theme_name`, `theme_type=system`).

PII guard: every raw `/g/collect` body scanned — the throwaway email and password
appear in **zero** payloads. No console errors during any flow.

## Net-zero

All rows created during validation were purged via `scripts/vg2-teardown.ts`
(3 QA resources + 5 accrued `__qa_test_*` users). Post-teardown DB check:
`qa_users_remaining=0`, `qa_resources_remaining=0`. `resource_audit_log` rows for
the deleted resources were nulled by the schema's `SET NULL` FK rule (append-only
audit trail — intended behavior, not residue).

## Known finding (from architect code review) — GA4 Enhanced Measurement double page_view

On the **one true SPA navigation** in the journey, GA4 emitted **two** page_views:
our manual one **plus** GA4 Enhanced Measurement's automatic "page changes based
on browser history events" page_view (the auto one carried the `ae` flag and the
correct title; ours carried the previous page's title because `react-helmet`
flushes `document.title` a tick after the route-change effect). Hard loads are not
affected (`send_page_view:false` suppresses the config-time view).

- **Root cause:** a GA4 **property Admin** setting (Enhanced Measurement history
  tracking is ON by default), **not** application code — it cannot be toggled from
  the app.
- **Remedy (documented as a deployment prerequisite in `docs/ANALYTICS.md`):**
  turn OFF "Page changes based on browser history events" in the GA4 web stream's
  Enhanced Measurement so the app's single-source manual `page_view` is
  authoritative.
- **Why the manual page_view stays synchronous:** it must fire on route change so
  `page_location`/`page_path` are always correct; deferring it to catch the fresh
  title would risk logging the wrong URL during rapid navigation. `page_path`/
  `page_location` are the reliable dimensions; `page_title` is best-effort.

Everything else in the architect review passed: initGA pattern, `sendEvent`
enrichment + PII stripping (no PII path found), first-touch acquisition privacy,
all wired call sites, and the harness being a genuine real-network proof with safe
FK teardown.

## Documentation

`docs/ANALYTICS.md` documents the full event taxonomy, per-event wiring sites and
params, first-touch acquisition, the PII exclusion policy, the preserved-but-unwired
helpers, the GA4 Enhanced Measurement deployment prerequisite, and how to run the
validation harness + teardown.

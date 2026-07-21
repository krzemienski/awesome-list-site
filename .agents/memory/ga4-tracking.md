---
name: GA4 event tracking gotchas
description: Non-obvious GA4/gtag pitfalls for this SPA — init ordering, SPA double page_view, batching during validation, PII policy.
---

# GA4 (gtag.js) tracking — durable gotchas

## SPA self-tracked page_view double-counts unless Enhanced Measurement is disabled
When the app fires its own `page_view` on route change (single-source pattern),
GA4 **Enhanced Measurement → "Page changes based on browser history events"**
(ON by default) *also* fires an automatic `page_view` on every SPA navigation, so
in-app navigations get counted **twice**. The auto event carries the `ae` flag.
**Why:** `send_page_view:false` only suppresses the config-time (hard-load) view;
it does NOT disable Enhanced Measurement's history-based SPA tracking, which is a
**GA4 property Admin setting, not code**.
**How to apply:** if we self-track page views, the deploy checklist must include
turning that sub-toggle OFF in the GA4 web stream. Otherwise SPA page_view ≈ 2×.
Documented as a deployment prerequisite in `docs/ANALYTICS.md`.

## initGA must run at module load, before React renders
Call `initGA()` at client entry module load (idempotent), NOT only from a mount
effect. **Why:** React runs child effects (Router / `useAnalytics`) *before*
parent effects (`App`), so a mount-only init leaves `window.gtag` undefined when
the very first `page_view` fires → the initial view (with landing UTMs) is
dropped. The inline gtag stub is defined synchronously so `window.gtag` exists
immediately even before `gtag/js` finishes loading.

## Manual SPA page_view carries a stale page_title (accept it)
`react-helmet` flushes `document.title` a tick after the route-change effect, and
detail-page titles resolve after async data. So the manual `page_view` fired
synchronously on nav reads the *previous* title. **Decision:** keep it
synchronous — accurate `page_location`/`page_path` beat a fresh title; deferring
to catch the title would risk logging the *wrong* URL on rapid back-to-back nav.
Treat `page_title` on the manual event as best-effort; GA4's own view has the
correct title.

## Real-browser GA4 validation: gtag batches, so poll + force-flush
gtag buffers events and flushes a batch on `visibilitychange → hidden`. A
freshly full-loaded page needs several seconds for `gtag/js` to load and drain its
queue, so **fixed sleeps race**. Validate by intercepting `/g/collect` requests,
toggling document visibility to force a flush, then **polling** for the expected
event name (with a timeout) rather than sleeping. This is a genuine real-network
proof (no mocks) — decode the batched `/g/collect` body to get individual events.

## PII policy that must hold
Never send email / password / token / raw copied text. `copy_action` sends only
type + length. Acquisition stores referrer **hostname** + landing **pathname**
only (no full URLs/queries), UTM values capped. Enforce with a validation scan of
every raw `/g/collect` body for known secrets.

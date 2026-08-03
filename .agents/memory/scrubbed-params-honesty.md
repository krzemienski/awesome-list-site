---
name: Pre-boot param scrubber honesty
description: The index.html XSS param scrubber silently rewrites URLs before React boots — any "silent full-catalog fallback" on q/tags at full page load traces to it, and it must stay in lockstep with the notice UI.
---

The SPA's `client/index.html` contains a pre-boot script that deletes any query
param matching an XSS-shaped regex (via `history.replaceState`) BEFORE React
boots. Since audit 2 the policy is deliberately NARROW: only HTML tag-open
shapes (`<` followed by a letter, `!`, `/`, or `?`) are scrubbed, tested across
recursive percent-decoding (multi-encoded payloads can't slip through), while
prose like "javascript: the good parts" or "a < b > c" survives — bare
`javascript:`/`on*=` text is inert without markup context because every sink
escapes. Consequences:

- A full page load of `/search?q=<img …>` or `/?tags=<script>…` arrives in React
  with the param already gone — the app renders the scrubbed view and nothing
  in React ever saw the param. This looked like a "silent fallback to the full
  catalog" bug (edge-input audit) but is a deliberate security scrub. (Empty
  /search now shows an explicit "enter a search term" prompt, not the catalog.)
- Fix pattern: the scrubber records dropped param NAMES in
  `window.__scrubbedParams`, and a global notice component (mounted in App
  layout) surfaces "part of this link was ignored". Keep the two in lockstep —
  if the scrubber changes, the notice must too.
- SPA-internal navigation never runs the scrubber; typed HTML-shaped queries go
  to the server, which searches them literally (escaped ILIKE) and honestly
  returns 0 rows. Only full document loads are affected.

**Why:** two audits in a row flagged the "silent full catalog" symptom before
the scrubber was identified as the cause; reproducing at the network/server
level shows nothing wrong (server never receives the param).

**How to apply:** when a query param "disappears" or a filter silently doesn't
apply on a fresh page load, check the pre-boot scrubber first — and verify
honesty fixes at the rendered UI, on a full document load, not via SPA nav.

---
name: The site is dark-only by design
description: Why "light mode is broken" audit findings must be rejected, and what the real underlying defect was.
---

# Dark-only is a design decision, not a bug

This site ships a single dark theme. There are no `.light` selectors and every
token block is dark-only. Requests for `prefers-color-scheme: light` correctly
keep rendering the dark palette.

**Why:** A parallel UX audit produced multiple independent High findings all
saying light mode was broken or "forcibly replaced with dark". Acting on them
would have meant inventing an entire light token set the product never had —
fabricating a feature rather than fixing a defect. Multiple validators agreeing
is not evidence; they were each applying a generic heuristic without checking
whether the theme existed.

The genuine defect underneath those reports was that `color-scheme` was never
declared, so the browser rendered form controls, scrollbars and other UA
surfaces for a *light* UA on top of a dark page. Declaring `color-scheme: dark`
fixed the real problem; a post-mount light/dark class mutation in the theme
provider was also dead weight and was removed.

**How to apply:** Reject any finding whose remedy is "add light mode" unless the
user explicitly asks for one. Before accepting a theming finding, grep for
`.light` selectors / light token blocks to confirm the feature is supposed to
exist. When auditors report a theming problem, check `color-scheme` first.

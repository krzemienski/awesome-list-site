---
name: Responsive-audit cold-boot flake
description: profile@640/700 nameW=0 false-fails right after a dev-server restart; rerun before debugging
---

The `responsive-audit` profile checks measure the first `h1` on /profile. Right after the dev server restarts (cold caches), the page can still be in its loading/skeleton state when the harness measures, so `nameW=0` false-fails — observed only at the first viewports the sweep visits (640/700), while later viewports pass.

**Why:** the harness navigates immediately after server boot; profile data fetch is slower on cold start, and the h1 exists but is empty/zero-width until data hydrates.

**How to apply:** FIXED July 24, 2026 — the harness now waits (30s) for non-empty h1 text before the sweep and retries once per viewport when nameW=0, so a genuine missing name still fails but the cold-boot skeleton race no longer can. If nameW=0 failures ever reappear, the wait/retry guard in the profile section of `responsive-audit` is the first place to look.

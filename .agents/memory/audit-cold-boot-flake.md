---
name: Responsive-audit cold-boot flake
description: profile@640/700 nameW=0 false-fails right after a dev-server restart; rerun before debugging
---

The `responsive-audit` profile checks measure the first `h1` on /profile. Right after the dev server restarts (cold caches), the page can still be in its loading/skeleton state when the harness measures, so `nameW=0` false-fails — observed only at the first viewports the sweep visits (640/700), while later viewports pass.

**Why:** the harness navigates immediately after server boot; profile data fetch is slower on cold start, and the h1 exists but is empty/zero-width until data hydrates.

**How to apply:** if responsive-audit fails only `profile@640`/`profile@700` with `nameW=0` (all else passing) right after a workflow restart, rerun once before debugging — two clean runs bracketing one nameW=0 run means flake, not regression. Durable fix if it recurs: make the harness wait for non-empty h1 text before measuring. Relevant because the pre-publish gate also boots a cold server before running this audit.

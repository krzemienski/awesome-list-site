---
name: Validation-audit cold-boot flakes
description: responsive/print audit false-fails right after a dev-server restart; rerun before debugging
---

The `responsive-audit` profile checks measure the first `h1` on /profile. Right after the dev server restarts (cold caches), the page can still be in its loading/skeleton state when the harness measures, so `nameW=0` false-fails — observed only at the first viewports the sweep visits (640/700), while later viewports pass.

**Why:** the harness navigates immediately after server boot; profile data fetch is slower on cold start, and the h1 exists but is empty/zero-width until data hydrates.

**How to apply:** the harness guards against this (waits for non-empty h1 text before the sweep, retries once per viewport when nameW=0), so a genuine missing name still fails but the skeleton race cannot. If nameW=0 failures ever reappear, the wait/retry guard in the profile section of `responsive-audit` is the first place to look.

**print-audit variant (July 2026):** `recommendations:content-prints` + `recommendations:pdf-not-blank` can both fail (identical numbers, e.g. 591 chars / 3616-byte pdf) when the audit starts seconds after a server restart — the recommendations page rendered only a skeleton. A single rerun passed 49/49. Rule stands: when an audit fails on a page that passed recently and the server just restarted, rerun once before debugging.

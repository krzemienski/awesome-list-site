---
name: Validation-audit cold-boot flakes
description: responsive/print audit false-fails right after a dev-server restart; rerun before debugging
---

The `responsive-audit` profile checks measure the first `h1` on /profile. Right after the dev server restarts (cold caches), the page can still be in its loading/skeleton state when the harness measures, so `nameW=0` false-fails — observed only at the first viewports the sweep visits (640/700), while later viewports pass.

**Why:** the harness navigates immediately after server boot; profile data fetch is slower on cold start, and the h1 exists but is empty/zero-width until data hydrates.

**How to apply:** the harness guards against this (waits for non-empty h1 text before the sweep, retries once per viewport when nameW=0), so a genuine missing name still fails but the skeleton race cannot. If nameW=0 failures ever reappear, the wait/retry guard in the profile section of `responsive-audit` is the first place to look.

**Concurrent-suite variant:** when the whole validation suite runs at once, a different server-dependent gate can fail on each run — cold-cache 503s, connection resets, a sign-in race, or one gate's test-data teardown deleting another gate's user mid-run. Rule: when a failure lands in a gate your change cannot touch, reproduce it solo once; if it passes solo, it was contention, not a regression.

**Nobody starts the app for you:** the completion-validation harness runs the gates but does NOT bring up the `Start application` workflow. In a task environment where it was never started (or died), roughly half the suite FATALs at once with `app not reachable at http://localhost:5000 after 120s` — print/responsive/tablet/collections/seo/taxonomy/pool/resilience all failing together is that, not a code regression. Curl the port, start the workflow, retry.

**print-audit variant (July 2026):** `recommendations:content-prints` + `recommendations:pdf-not-blank` can both fail (identical numbers, e.g. 591 chars / 3616-byte pdf) when the audit starts seconds after a server restart — the recommendations page rendered only a skeleton. A single rerun passed 49/49. Rule stands: when an audit fails on a page that passed recently and the server just restarted, rerun once before debugging.

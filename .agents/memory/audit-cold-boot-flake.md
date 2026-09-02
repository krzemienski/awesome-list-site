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

**Audit-key auth variant:** responsive-audit can FATAL at setup with "audit-key auth failed — /api/auth/user did not return the admin. Is ADMIN_PASSWORD set (>=8 chars) in the SERVER environment and the admin user seeded?" while the key is perfectly valid. The admin row is seeded from ADMIN_PASSWORD during boot, so a probe that lands in the boot window sees a server that is already answering HTTP but has not finished seeding. The tell: curl the identity endpoint with the header by hand afterwards and it returns the admin. Diagnose it as a race, not a missing credential — do not go hunting for the secret in .env (task envs can have ADMIN_PASSWORD in the process environment and NOT in .env, which is fine because the server inherits it), and do not add it via setEnvVars. Rerun the gate solo; it passes.

**ds-button-sweep authed scenarios are the flakiest gate in the suite.** Its signed-in and admin scenarios each depend on a live Clerk sign-in plus seeded bookmark/collection data, and any of them can time out on a given run: overlay-authed-note-dialog and overlay-authed-delete-collection-confirm report "authed overlay sweep failed twice (trigger/chrome missing?): page.waitForSelector: Timeout", and admin-scenario reports "Clerk UI sign-in did not produce an authenticated session". Observed across four runs of the same unchanged tree in one hour: 2 failed, then ALL PASSED, then 2 failed, then 2 failed with a DIFFERENT second check. The failing pair is not stable, which is the tell.

How to prove it is not yours in minutes instead of re-running a 7-minute gate blind: the per-run gate logs under .local/state/workflow-logs/<runId>/ persist across sessions, so grep them for the check name and compare the file mtimes against when you started editing. A run that predates your first edit and shows the identical failure line settles it. Do not reach for skip_validation_reason on a gate that has a green run in its own history — retry it.

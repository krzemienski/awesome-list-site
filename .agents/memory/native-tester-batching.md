---
name: Built-in tester execution ceiling
description: How to size steps for the Playwright testing subagent when a plan needs hundreds of repeated interactions or slow navigations.
---
Keep each tester browser execution to one control family × ≤4 items, and never combine a navigation with a long poll in the same execution.

**Why:** the tester's browser worker has a ~45 s ceiling per execution and a step budget per message. A single loop over dozens of cards crashes/resets the worker and loses the ledger, and a `goto` + 45 s poll in one execution times out even when the navigation succeeded (the worker is then lost, so the result is unknowable). The same work in small batches with a running ledger completes.

**How to apply:** exhaustive per-instance censuses — give the batch rule, ask for a running ledger + resume-from-last-confirmed on reset, poll with waitForJob (600 s max, several rounds). Split "navigate" and "wait for state" into separate executions. Tell it to report rather than restart workflows (it may pick the wrong one; check `curl 127.0.0.1:<app port>` and restart yourself). Intermediate screenshots are not retrievable later (`viewImage` → "image not found"); ask it to cite the frames you need in the final report.

Clerk sign-in from the tester: its own backend-minted `sign_in_tokens` can be rejected with `ticket_invalid_code` (issued against a different instance than the app's publishable key). Mint the ticket yourself from the workspace's `CLERK_SECRET_KEY` (shell curl, never print the key), hand the single-use `/sign-in?__clerk_ticket=` URL to the tester, and own the teardown (Clerk delete → wait for JWT expiry → local row). A ticket navigation whose worker timed out may still have created the session — check Clerk sessions before assuming failure.

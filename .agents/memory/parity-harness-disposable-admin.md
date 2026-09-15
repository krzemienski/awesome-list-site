---
name: Parity harness disposable Clerk admin
description: Rules for disposable Clerk admins in capture harnesses: page fetch, token refresh, cleanup verification and main-scoped identity checks.
---

- **Put the `__qa_test_` prefix on the email**, not just the bridge ID, so
  disposable accounts remain discoverable in both identity systems.
  Delete only identities owned by the current run when workers run concurrently.
- **Admin reads use the signed-in page's `fetch(..., {credentials:"include"})`**,
  not `context.request` (shares the jar yet gets 401 on `/api/admin/*`).
- **Frozen clock stops ClerkJS refreshing its ~60 s token.** Snapshot a fresh
  `storageState()` per row after `getToken({skipCache:true})`, check
  `/api/auth/user` right after navigation, and settle within about a minute.
- **The sweep fails closed on BOTH sides:** re-list Clerk after deleting and
  exit non-zero on any deletion failure or leftover — "remaining" computed
  from the local table alone exited 0 with a Clerk user still there.
- **Identity checks scope to the main content** (navigation removed, breadcrumb
  kept): the sidebar names every taxonomy label on every page, so body-wide
  matching passes two pages that both fell back to home. Compare the heading
  with the catalogue label where the design's heading is the entity; admin
  tab checks compare the ACTIVE tab to the requested slug, not "some tab".

- **Treat interrupted read-only audits as potentially identity-writing.**
  **Why:** A worker reported no accounts created because admin panels had not
  been reached, but authentication had already provisioned an admin before the
  public crawl. A shell timeout skipped its cleanup.
  **How to apply:** Inspect provisioning order, journal exact owned identities
  before browsing, and independently verify local and provider removal after
  interruption. Never infer absence from the last screen or purge other workers'
  shared-prefix accounts.

---
name: Parity harness disposable Clerk admin
description: Rules for an automated create → sign-in → promote → delete Clerk admin in a capture harness (numeric bridge id, admin reads via page fetch, frozen clock vs token refresh, fail-closed sweep, main-scoped identity checks).
---

- **Bridge id / Clerk `external_id` must be a random integer** (2 000 000 000–
  2 147 483 647): the admin user routes type `:id` as a bounded int4, so a
  prefixed string id is JIT-provisioned on sign-in but can never be renamed,
  promoted or deleted through the API (residue only SQL removes). Put the
  `__qa_test_` prefix on the **email** and sweep by `email LIKE '__qa_test_%'`
  (the admin users `q=` search and Clerk `?query=` both match it).
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

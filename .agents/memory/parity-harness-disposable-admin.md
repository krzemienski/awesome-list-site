---
name: Parity harness disposable Clerk admin
description: Constraints discovered while automating a create → sign-in → promote → delete Clerk admin for the visual parity harness (numeric bridge id, admin reads via page fetch, frozen clock vs token refresh).
---

## Bridge id must be numeric for API-managed test users

The admin user routes (`/api/admin/users/:id/name|role`, `DELETE :id`) go
through the contract guard that types every `id` param as a bounded int4
string. A prefixed string bridge id (`__qa_test_…`) is happily JIT-provisioned
on sign-in but can never be renamed, promoted or deleted through the API — it
becomes residue only direct SQL can remove.

**Rule:** bridge id / Clerk `external_id` = random integer in
2 000 000 000–2 147 483 647; put the `__qa_test_` prefix on the **email**
instead and sweep by `email LIKE '__qa_test_%'` (admin users search `q=`
matches email; Clerk list `?query=` matches too).

**Why:** the first harness attempt left an undeletable row behind.

## Admin reads: use the signed-in page's fetch, not context.request

Playwright's `context.request` shares the cookie jar but `/api/admin/*`
answered 401 for the disposable admin; a same-origin `fetch(..., {credentials:
"include"})` evaluated in the signed-in page works (same path the app uses).

## Frozen clock vs ClerkJS

`context.clock.setFixedTime()` freezes `Date`, so ClerkJS believes its ~60 s
session token never ages and stops refreshing. Mitigate with a fresh
`storageState()` per row (after `Clerk.session.getToken({skipCache:true})`) and
an immediate `/api/auth/user` check after navigation; a page must settle within
about a minute. `clock.install()` is worse: it pauses timers and stalls the
handshake.

## Sweep must fail closed on BOTH sides

A cleanup sweep that computes "remaining" from the local users table alone
can exit 0 while a Clerk user is still there (Clerk deletion failed but was
only appended to a `failed` list). Re-list Clerk after deleting, and treat any
deletion failure or any leftover on either side as a non-zero exit.

## Identity guard: scope label checks to the main content

"Both sides show the same entity" checks must not search `body` text — the
sidebar tree names every taxonomy label on every page, so a wrong-but-similar
page (both sides fell back to home) passes. Compare the page heading with the
catalogue label where the design's heading is the entity, and search only the
main content (navigation removed, breadcrumb kept) elsewhere; admin tab checks
must compare the ACTIVE tab against the requested slug, not "some tab".

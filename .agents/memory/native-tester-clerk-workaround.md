---
name: Built-in tester + Clerk on this repo
description: How to get the built-in browser tester signed in when its own Clerk helper fails on the proxied dev host, and how to keep its runs net-zero.
---

Rule: mint a `__qa_test_<slug>+clerk_test@example.com` user through the Clerk
backend API (password + the `424242` test code), promote/demote its local
`users.role` with `UPDATE users`, and hand the tester the credentials in every
follow-up message; sign in through the app's own `/sign-in`.

**Why:** the tester's built-in Clerk sign-in helper fails here because the
proxied dev hostname serves the design-system artifact, not the app; and the
tester drops credentials on context compaction, so a follow-up without them
returns `general` asking for an account.

**How to apply:** one tester name per unit of work, one flow per message,
resend credentials + "if signed out, sign in again" each time. Teardown order:
Clerk user first (a live session re-provisions the local row via JIT), then the
local row with `resource_audit_log.performed_by` nulled; `user_interactions`
cascades. Also sweep Clerk for older `__qa_test_` residue — it accrues across
sessions and does not show in the local table.

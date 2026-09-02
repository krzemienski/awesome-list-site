---
name: Detecting a real Clerk auth completion
description: Why createdSessionId matching never fires, and the sequence-based signal that does, for login/sign_up conversion tracking.
---

# Detecting a real Clerk auth completion (conversion tracking)

**Rule:** A completed sign-in/sign-up and the session it created are **never
visible in the same Clerk resource update**. By the time `session` is populated,
clerk-js has already reset `client.signIn` / `client.signUp` to empty
(`status`, `createdSessionId`, and the strategy all read null). Matching
`client.signUp.createdSessionId === session.id` therefore never fires.

The signal that does work is the **sequence** observed by `Clerk.addListener`:
an attempt goes past with a non-null `status`, and a session id appears a few
updates later. Remember the attempt (kind + strategy) as it passes, redeem it
when the session shows up, then clear it.

**Why:** A session restore, page reload and token refresh all publish a session
with **no** preceding attempt, so the same listener stays silent for them —
which is the whole point of the signal. Do not substitute
`useAuth().isAuthenticated`: it is true on every page load with a live cookie,
so it counts one conversion per visit, per tab, forever. Note the listener's
first invocation on a normal page load also reports no session (Clerk has not
loaded yet), so "no session → session" alone is not enough; the attempt in
between is what distinguishes creation from restore.

**How to apply:**
- Check `signUp.status` before `signIn.status` — an OAuth "sign in" with no
  account is transferred into a sign-up, and that is a registration.
- The strategy is usually still empty while the attempt is in flight
  (`needs_first_factor` carries no `firstFactorVerification.strategy`). Read
  `client.lastAuthenticationStrategy` at session time instead; it is set once
  the attempt succeeds. Keep the in-flight strategy only as a fallback.
- Persist the last reported session id (localStorage): Clerk emits several
  updates per completion, invokes each new listener immediately with current
  state, and shares storage across tabs.
- Only ever read the strategy. `signIn.identifier` / `signUp.emailAddress` hold
  the visitor's email.

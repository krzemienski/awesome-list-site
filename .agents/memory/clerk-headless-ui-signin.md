---
name: Clerk headless UI sign-in
description: Non-sensitive interaction details for Clerk's client-trust step in headless browser validation.
---

# Headless Clerk UI sign-in

**Rule:** Headless/new-device sessions can land on `/sign-in/client-trust`.
The verification field has no stable name/class, so locate it by its accessible
label. Enter the approved test value with sequential, user-like keypresses;
programmatic whole-value filling may not trigger Clerk's field state.

**Why:** Browser validation previously stalled at client-trust because generic
OTP selectors did not match and whole-value filling did not enable submission.

**How to apply:** Use only values supplied by approved runtime test
configuration; never store verification values in memory or repository
documentation. Always delete the throwaway identity and matching database row.

---
name: Clerk conversion detection
description: How to tell a completed Clerk sign-in/sign-up apart from a session restore in a client listener, and why the in-flight-status approach silently missed conversions.
---
- One-step Clerk completions (email + password with no code/new-device step, and sign-up with no verification step) never expose `client.signIn`/`client.signUp` status to `addListener`: both stay null and the session just appears. Restores arrive with the session already present on the first loaded emission.
  **Why:** a tracker that waited for an in-flight status fired zero `logged_in`/`sign_up_completed` on prod while dev (which always adds a new-device code step) looked fine.
  **How to apply:** trigger on the "signed out (Clerk loaded) → session" transition. Classify sign-up by a tight user-vs-session creation window (same request, ~16 ms) plus a per-browser "already reported this user's sign-up" guard, so sign-up → sign-out → sign-in never double-counts.
- Dev cannot exercise the one-step sign-up path: dev sign-up sits behind Turnstile, and every new account's first sign-in adds a new-device code step that pushes the session well outside any sign-up window.

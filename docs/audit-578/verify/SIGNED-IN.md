# SIGNED-IN: bookmark, favorite, theme, journey on production

Status: PASS on the owner admin account (owner-approved); a throwaway account was not possible.

Blocker: production /sign-up shows a Cloudflare "Verify you are human" challenge plus a real email code (docs/audit-578/live-smoke/shots/signup-try.jpg). No __qa_test_578_ account could be created without bypassing bot protection.

Command: `STEP=<bookmark|theme|journey> node docs/audit-578/live-smoke/signed-in.mjs` (UI-driven writes; before/after API snapshots).

| Flow | Observed |
|---|---|
| Bookmark + note on /resource/190152 | note rendered on the page; API notes match; removal → DELETE 200, gone from UI and API |
| Favorite on/off | POST/DELETE 200; aria-pressed true → false |
| Theme Brutalist → restore Terminal/Matrix | server prefs {brutalist,amber} → survives reload → restored to exactly {terminal,matrix} |
| Journey 9 start | POST start 200 created:false (idempotent) |
| Journey step 1 complete → undo | PUT 200 completedSteps [217,218,219], 17% → PUT 200 [] |

Net-zero: every run printed `NET-ZERO DIFF KEYS: []` (docs/audit-578/live-smoke/signed-in-{bookmark,theme,journey}.json).
Prod residue SQL (read-only): users_578 0, bookmark_notes_578 0, bookmarks_190152 0, favorites_190152 0.
Side effects that can't be undone: one interactions view row; journey 9 lastAccessedAt refreshed.

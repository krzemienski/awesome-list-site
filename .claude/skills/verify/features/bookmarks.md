# Bookmarks

A guest can save resources on this device with no account; a member's bookmarks live in their account at `/bookmarks`, with collections, notes and bulk actions. On sign-in, guest saves merge into the account once.

## Sub-features

- BM-GUEST: guest save/remove (localStorage `guest-bookmarks-v1`, cap 50), header `button-guest-saved` count, `/bookmarks` guest page.
- BM-MEMBER: member add/remove via `button-bookmark` → `POST|DELETE /api/bookmarks/:resourceId`, visible at `/bookmarks` (`bookmark-card-<id>`).
- BM-MERGE: guest saves pushed to the account after sign-in, one toast.
- BM-RAPID: rapid toggles converge to the server state; focus stays on the button.

## How to get to it (user POV)

- `button-bookmark` on a resource page or card.
- Header `button-guest-saved` (guests) or the account menu → Bookmarks (members).
- Direct `/bookmarks`.

## Driving it with chrome-devtools MCP

Preconditions: guest context for BM-GUEST; a member or admin context on a throwaway clone for BM-MEMBER and BM-MERGE (local data starts with 0 bookmarks).

- **Guest save.** On `/resource/1` click `button-bookmark` (aria "Bookmark on this device — no sign-in required") → label flips to "Remove bookmark saved on this device"; `button-guest-saved` shows 1; `evaluate_script` reads `localStorage['guest-bookmarks-v1']` containing id 1; `/bookmarks` shows `text-guest-save-count` 1 and `banner-guest-signin-prompt`. No network request is made.
- **Member add/remove.** Signed in: click `button-bookmark` on `/resource/1` → `POST /api/bookmarks/1` 2xx; `/bookmarks` shows `bookmark-card-1`; remove it there or on the resource page → `DELETE /api/bookmarks/1`; reload `/bookmarks` → gone. `psql` on your clone: `select count(*) from user_bookmarks where resource_id=1` → 0.
- **Rapid.** Click `button-favorite` three times quickly → final state equals the state after reload; focus remains on the button.
- **Merge.** As a guest save resources 1 and 2, then sign in → one toast naming them; both appear in `/bookmarks`; reloading shows no second toast.

## Gotchas

- `button-bookmark` / `button-favorite` are not id-scoped on cards; scope them inside `card-resource-<id>`.
- The remove mutation once became an upsert POST (`references/regression-watchlist.md` §1c); always confirm with a reload and the DB.
- Use a throwaway clone for member writes; the Clerk test account is shared across runs.

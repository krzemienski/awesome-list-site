# VG-020 — BUG-020 (LOW): Deletion only available through a public GitHub issue

## Root cause
Both `/privacy` (section 5) and `/about` instructed users to request account/data deletion by opening a **public GitHub issue** — which forces them to expose their email/identity publicly, with no authenticated or private channel.

## Fix — real private, authenticated deletion channel
- **Schema/migration**: `users.deletion_requested_at` (migration `0035_add_user_deletion_requested_at.sql`, idempotent `ADD COLUMN IF NOT EXISTS`, journaled; applied to dev; ships to prod via publish pre-apply + boot migrator). NULL = no pending request.
- **Server**: `POST /api/user/deletion-request` (session-authenticated; 401 anonymous; 201 on new request; idempotent 200 `alreadyRequested` keeping the ORIGINAL timestamp) and `DELETE /api/user/deletion-request` (withdraw; 409 when nothing pending). Marker whitelisted into `sanitizeUser` + `/api/auth/user` payload so self and admins can see it; admins action requests via the existing guarded delete-user flow (content detached, not cascaded).
- **Client**: Profile → Security → "Delete account & data" card — request button + styled confirm dialog; pending state shows request date + withdraw button (aria-disabled pattern during mutation).
- **Copy**: `/privacy` §5 now documents the private path (deep link to `/profile?tab=security`); GitHub issues demoted to a lost-access fallback that explicitly instructs **username only, no email or personal data** (ownership verified privately). `/about` likewise splits deletion (private channel) from questions/corrections (public issues).

## Live evidence (Iron Rule — real API + real browser)
**API (curl, real registered user):**
- Anonymous POST → **401**. Authed POST → **201** `{deletionRequestedAt: "2026-07-20T00:56:22.061Z"}`.
- Repeat POST → **200** `alreadyRequested: true` with the SAME timestamp (idempotent).
- `/api/auth/user` reflects the marker; DELETE → **200** withdrawn; second DELETE → **409**.

**UI (Playwright, 7/7 PASS):** `/privacy` + `/about` document the private path (`bug020-privacy.png`, `bug020-about.png`); Security-tab card → confirm dialog (`bug020-confirm-dialog.png`) → pending state "Your deletion request from 7/20/2026 is pending…" (`bug020-pending.png`) → withdraw restores the request button.

**Hygiene**: tsc clean; migration-drift check clean; QA users torn down (`__qa_test_%` count = 0 — no unrelated user data touched).

**Verdict: PASS**

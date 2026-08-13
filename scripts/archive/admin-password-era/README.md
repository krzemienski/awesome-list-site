# Archived: admin-password-era one-off scripts

These one-off prod-fix and verification scripts authenticated via the old
local password login (`POST /api/auth/local/login` with `ADMIN_PASSWORD`).
That endpoint and all server-side password code were removed when the app
switched to Clerk authentication, so **none of these scripts can run anymore**.

They are kept only as a historical record of the data fixes they performed
(each carries its own journal/snapshot notes). Do not revive them as-is —
any future prod maintenance script must authenticate through Clerk.

`scripts/reset-admin-password.ts` was deleted outright (it rotated a password
hash nothing reads).

The still-active validation scripts under `scripts/validation/` (and the
pre-publish gate that invokes them) are being migrated to the new auth under
a separate task and intentionally remain in place.

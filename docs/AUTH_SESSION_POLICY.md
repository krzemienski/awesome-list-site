# Authentication session policy

Awesome Video uses server-side PostgreSQL sessions identified by the
`connect.sid` cookie.

- **Lifetime:** authenticated browser sessions expire 24 hours after creation.
- **Cookie protections:** `HttpOnly`, `SameSite=Lax`, and `Secure` in production.
- **Concurrency:** each account may have at most three active sessions. A new
  login beyond that limit revokes the oldest older session.
- **Current-device sign out:** `POST /api/auth/logout` destroys the current
  server session, clears the cookie, and only then reports success.
- **All-device revocation:** `POST /api/auth/logout-all` and the Profile page's
  **Sign out all devices** action revoke every server session for the account.
- **Credential changes:** password reset revokes every session; password change
  revokes every session except the current one.
- **CSRF:** auth and admin mutations require a same-origin `Origin` header.
  Every cookie-authenticated mutation follows the same rule. Cross-site
  `Origin` or `Sec-Fetch-Site` values are rejected, and GET requests never
  mutate authentication state.

The client confirms `/api/auth/user` reports an unauthenticated state before it
clears local identity state or navigates away after sign out.
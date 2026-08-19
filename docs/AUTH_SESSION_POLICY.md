# Authentication and session policy

Clerk owns credentials, browser session cookies, sign-in/sign-up, password
reset, current-device sign-out, and session lifetime. The application does not
run Express sessions and does not store active sessions in PostgreSQL.

The application-specific policy is:

- `clerkMiddleware` verifies Clerk session claims.
- `clerkUserContext` resolves the local `users` row used for roles and
  application data. First-time users are provisioned from trusted claims; an
  email collision with another local row fails closed.
- `GET /api/auth/user` is the canonical identity endpoint and always returns
  `200` with `{ user, isAuthenticated }`.
- `POST /api/auth/logout-all` uses Clerk's backend API to revoke every active
  session for the caller. Current-device sign-out is handled by Clerk's client.
- Cookie-authenticated mutations pass the application's same-origin CSRF checks.
- The `sessions` and `password_reset_tokens` tables are retained legacy schema
  artifacts; current authentication code does not read or write them.

See [ENVIRONMENT.md](./ENVIRONMENT.md) for required Clerk keys and
[API.md](./API.md) for generated API-contract entry points.
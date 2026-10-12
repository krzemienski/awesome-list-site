---
name: Auth and security lessons
description: Topic index for identity migration, login failures, redirect safety, admin access, and session validation.
---

Read the linked lesson that matches the current authentication or security issue.

**Why:** login/session failures often originate at a different layer from the
visible symptom; seemingly local changes can affect identity or redirect safety.

**How to apply:** use the narrow topic below before changing authentication,
building an authenticated probe, or diagnosing a login complaint.

- [Clerk migration](clerk-auth-migration.md) — read first for login complaints and owner-admin access.
- [Identity claim sweeps](identity-sweep-claim-token.md) — receiver-based searches miss aliases.
- [OIDC email collisions](replit-oidc-local-email-collision.md) — local-account collisions can cause login loops.
- [Safe next redirects](next-redirect-validation.md) — backslash normalization bypasses simple slash checks.
- [Admin password rotation](admin-password-rotation.md) — secret changes require the supported boot-sync path.
- [Audit-key access](audit-key-header-auth.md) — authenticated validation has a fail-closed header path.
- [Full-origin CSRF](origin-check-port-normalization.md) — schemes, hosts, and effective ports all matter.
- [Guest document routes](spa-guest-route-document-gates.md) — document redirects precede client routing.
- [SSR Clerk hosts](ssr-clerk-empty-host.md) — module-evaluation errors can occur before any browser session exists.
- [Automated Clerk sessions](clerk-automated-testing.md) — prefer backend-minted disposable sessions.
- [JIT teardown order](jit-teardown-order.md) — live sessions can silently recreate deleted local rows.

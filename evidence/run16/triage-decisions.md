# Run16 T006 — Triage-only / decision findings (2026-07-17)

## BUG-021 (MED) — no rate-limit/lockout on POST /api/auth/local/login → FIXED-PRIOR (run10/11; dev-verified this run; prod caveat noted)
Code has had a 3-layer guard since run10/11: `loginBurstLimiter` (5/min/IP, 429 + Retry-After),
`authLimiter` (20/15min/IP), and per-account `checkLock` cooldown (423). Live dev re-repro of the
audit's exact scenario (6 rapid failed attempts): `401 401 401 401 401 429` — see
`bug-021-login-ratelimit.txt`. `trust proxy` is set (server/routes.ts:523) so prod keys on the real
client IP. Why the auditor saw no 429 on prod: the limiter store is in-memory per instance — under
autoscale with >1 instance the counters split, so a 6-burst can stay under each instance's window.
Accepted residual risk: the per-account lockout (`checkLock`) still catches sustained brute force on
any single account regardless of which instance serves it once one instance accumulates failures;
a shared-store (DB/redis) limiter is out of scope for this run and journaled as a known limitation.

## BUG-096 (LOW) — no per-client rate limiting on 3.1MB /api/awesome-list → DECLINED (mitigated)
The bandwidth-amplification concern is materially mitigated by Run16 BUG-002: the endpoint now has a
server-side cache + strong ETag/304 (cold 152ms, warm 13ms, 304 = 3ms/0 bytes — see
`bug-002-awesome-list-cache.txt`), so repeat fetches no longer rebuild a 3.1MB payload. Browser
clients revalidate with If-None-Match and get 304s. A per-client edge rate limit is platform/CDN
territory, and in-process limiters split across autoscale instances (same limitation as BUG-021).
Declined as its own control; revisit if egress abuse is observed.

## BUG-069 (LOW) — registration requires no email verification → BY-DESIGN
Local email/password auth is a development/admin convenience path (replit.md: "local email/password
for development/admin"); the primary public sign-in is Replit Auth (GitHub/Google/Apple/X), which
delegates identity verification to the OAuth provider. The app sends no email of any kind (no mail
infrastructure/secret configured), so a verification loop is impossible without new infrastructure.
Instantly-active accounts hold only "user" role: they can bookmark/favorite and *submit* resources,
which land in the admin approval queue — nothing is published without moderation.

## BUG-089 (LOW) — users CSV export masks emails → BY-DESIGN
Masking in the export is deliberate PII minimization, matching the admin UI (emails are masked
everywhere in the DOM — see Run14/15 PII-masking work). An unmasked CSV would create the single
easiest PII-exfiltration path (one GET → full user email list on any admin's disk). The export's
purpose is account inventory/audit (ids, names, roles, providers, created dates), not a mailing
list. If a future feature needs real emails, it should be a separate, explicitly-audited endpoint.

## BUG-092 (LOW) — GAESA cookie lacks Secure/HttpOnly/SameSite → PLATFORM
GAESA is injected by Replit's Google-infrastructure edge (appears on `curl -I` before the app runs;
also documented in Run15 as the edge affinity cookie). The application never sets it and cannot
alter its attributes. It carries no session/identity data. Not app-fixable.

## BUG-093 (LOW) — 7-day session, no "remember me" option → BY-DESIGN
Sessions are intentionally 7-day, HttpOnly + Secure + SameSite=Lax, server-side (PostgreSQL session
store) and revocable. A session-only/remember-me split is a product preference, not a defect; the
current TTL matches common practice for a content directory with no financial/PII-heavy user data.

## BUG-068 (LOW) — ~30 tab stops to reach /login form → BY-DESIGN (standard mitigation present)
The auditor's own repro lists the skip link as tab stop #1. That skip link ("Skip to main content")
is the standard WCAG 2.4.1 bypass-blocks mechanism: activating it jumps focus past the sidebar/nav
directly to the main content containing the login form (2 stops instead of ~32). Reordering DOM so
the form precedes navigation would break layout/reading order for every other page.

## BUG-026 (MED) — $0-budget job accepted then dies with raw process error → FIXED (code) 
Server-side preflight validation (Run16 BUG-008 wave, `bug-008-researcher-validation.txt`) now
rejects invalid budget/maxTurns at POST time (400 with field errors) instead of accepting and
crashing. Historical failed job rows (e.g. #34) retain their raw error strings — historical data,
not retro-edited.

## BUG-028 (MED) — Job History internally inconsistent (turns>max, $0 cancelled with 73 finds) → FIXED (code) + historical rows left as-is
Enforcement/accounting fixes are code-side (validation + cancel path preserving accounting).
Rows #24–33 were created by the OLD code; their stored numbers are historical facts of those runs
and are not retroactively rewritten (audit-trail integrity). New jobs cannot reproduce the
inconsistencies. Dev QA residue jobs (#23–29) are torn down in T007 QA cleanup.

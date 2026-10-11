# S-04 — Security headers; secrets in committed config
Commit: prod `26450e08ba174abf77836fc36eada0e06b2e32a5`, dev `0f986c357d37ad03563c88d31af06c47c9943a33+workspace`   Persona: none (anonymous HTTP)   Tool: curl -sI, git grep

**Status: NOT-REPRODUCED**: headers are complete and no secret is committed (awaiting reviewer).

## Reproduction steps
1. `curl -sI` against https://awesome.video/, /api/categories and /resource/1 (a 404 page), and against http://127.0.0.1:5000/. Output is in `headers.txt`; the prod CSP split by directive is in `csp-prod.txt`.
2. Pattern scan of tracked files: `git grep -nIE` for Anthropic, GitHub (classic and fine-grained), Stripe, AWS, credentialed Postgres URLs and PEM private keys.
3. Value scan: for every configured secret (ADMIN_PASSWORD, the Anthropic keys and token, CLERK_SECRET_KEY, both GitHub tokens, NEON_DATABASE_URL, OWNER_PASSWORD, SESSION_SECRET, DATABASE_URL), count the tracked files, and the files in `docs/audit-final/`, that contain the exact value. Only counts were printed, never values.
4. `git ls-files | grep .env` and `git check-ignore .env`.

## What was seen
**Prod headers:** HTML, API and 404 responses all carry the same set:
- `content-security-policy`:
  - `default-src 'self'`; `script-src 'self' 'nonce-…'` plus the analytics, Replit and Turnstile hosts, with **no `'unsafe-inline'` and no `'unsafe-eval'`**
  - `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`; `frame-src` is limited to self and Turnstile; `worker-src 'self' blob:`
- `strict-transport-security: max-age=63072000; includeSubDomains`
- `x-content-type-options: nosniff`, `x-frame-options: DENY`
- `referrer-policy: strict-origin-when-cross-origin`
- `permissions-policy: camera=(), microphone=(), geolocation=()`
- `cross-origin-opener-policy: same-origin-allow-popups`, `cross-origin-resource-policy: same-origin`
- No `x-powered-by`. `server: Google Frontend` is the platform edge.

**Accepted, not a defect:**
- `style-src` keeps `'unsafe-inline'`. Radix and React inline styles need it, and style injection can't run script under this script-src.
- Dev omits CSP, HSTS and XFO by design (production-only middleware). Dev still sends nosniff, Referrer-Policy, Permissions-Policy and COOP/CORP.

**Secrets:**
- Value scan: 0 tracked files and 0 files in `docs/audit-final/` contain any configured secret's value.
- Pattern hits, all placeholders or deliberate fakes:
  - `ghp_xxxx…` in a skill reference doc
  - `user:password@host` examples in docs/DEPLOYMENT.md, docs/ENVIRONMENT.md, docs/SETUP.md and tests/README.md
  - `postgres:postgres@postgres` in docker-compose.yml, the local compose container's default
  - `ghp_qa592invalid…` strings in the audit-578 GitHub failure harnesses, which are intentionally invalid
- The only tracked env file is `.agents/skills/sequential-thinking/.env.example` (a template). The local `.env` is git-ignored.

## Frames
None: this row is HTTP-only. The proof is the raw header dumps (`headers.txt`, `csp-prod.txt`).

## Unexpected items → new rows
None.

## Reviewer verdict
Pending.

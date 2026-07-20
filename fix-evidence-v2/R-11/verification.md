# R-11 — /assets/* Cache-Control private + Expires + Set-Cookie GAESA (LOW, relates BUG-044)

**Date:** July 20, 2026 · **Status:** ORIGIN-CORRECT / PLATFORM-EDGE (documented) · **Verified live**

## Finding

Prod `curl -sI https://awesome.video/assets/index-B4gzNlZQ.js` returns
`cache-control: private, max-age=31536000, immutable`, a contradictory
`expires: <response time>`, and `set-cookie: GAESA=…`.

## Root cause — split by layer

**Origin (our Express app) is correct.** The dedicated `/assets` static handler
(`server/index.ts`, Run16 BUG-016) serves hashed assets with
`Cache-Control: public, max-age=31536000, immutable`, no Set-Cookie, no Expires.
Proof against the real production build run locally with `NODE_ENV=production`
(`origin-headers.txt`):

```
Cache-Control: public, max-age=31536000, immutable
(no Set-Cookie header, no Expires header)
```

**The rewrite happens at the Replit deployment edge (Google Frontend).** The prod
response carries `server: Google Frontend` + `via: 1.1 google` + an
`x-cloud-trace-context`, and the GAESA cookie is the documented Google edge
session-affinity cookie (same platform cookie documented in Run22 BUG-051). The
edge (a) sets GAESA on every response, and (b) because a Set-Cookie is now
attached, downgrades `public` → `private` and stamps `expires: now` so shared
caches never cache the cookie — standard GFE behaviour. None of this is
reachable from app code: the origin already emits the exact acceptance headers.

## Evidence

- `origin-headers.txt` — local production build (`npm run build` +
  `NODE_ENV=production node dist/index.js`), curl transcript: `public,
  max-age=31536000, immutable`, zero Set-Cookie/Expires.
- `prod-edge-headers.txt` — live prod transcript July 20, 2026 showing the edge
  rewrite (`server: Google Frontend`, GAESA cookie, private + expires).

## Verdict

Same class as R-13 (`:443` redirect) and R-14: platform/edge-layer behaviour.
App-side acceptance (origin emits `public, max-age=31536000, immutable`, no
cookie) is PROVEN; the edge rewrite is outside application control and is
documented here for future audits. Browser caching still works (private +
immutable caches fine in the browser); only shared-cache reuse is lost, which
the platform enforces deliberately because of its own affinity cookie.

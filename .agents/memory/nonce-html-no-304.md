---
name: Nonce'd HTML must never be 304-revalidated
description: Static ETag + rotating per-request CSP nonce = 304 pairs cached stale-nonce body with fresh-nonce header, blocking ALL inline scripts.
---

**Rule:** Any HTML document that embeds a per-request CSP nonce must be served with
`Cache-Control: no-store`, no `ETag`/`Last-Modified`, and must never answer `304 Not Modified`.

**Why:** Express static `sendFile` stamps a *template-based* ETag (size+mtime of index.html) that
never changes across requests, while the CSP nonce rotates per response. On revalidation the
browser gets 304, keeps the CACHED body (old nonce), but per HTTP spec adopts the 304's fresh
headers — including the new-nonce CSP. Every inline script then violates
(`script-src-elem` inline blocks) even though the served HTML looks perfectly nonce'd when
curl'd. Symptom is maddening: violations only on repeat visits, HTML inspection shows correct
nonces, and the blocked "lines" point at nonce'd scripts.

**How to apply:**
- Drop `If-None-Match`/`If-Modified-Since` from GET document navigations (non-API,
  extension-less paths) before they reach the static handler, so it always answers 200.
- In the HTML-buffering middleware, strip `ETag`/`Last-Modified` and set
  `Cache-Control: no-store` before flushing.
- Keep normal caching for hashed assets and API routes — only the nonce-bearing document is
  affected.
- Debugging tip: prove it with curl — compare header nonce vs body nonce, then send
  `If-None-Match` with the captured ETag; a 304 that carries a `Content-Security-Policy`
  header is the smoking gun.

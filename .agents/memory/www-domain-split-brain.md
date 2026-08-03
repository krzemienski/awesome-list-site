---
name: www/apex split-brain DNS
description: Why www.awesome.video 525s while the apex works; how to diagnose it from the workspace and the only two real fixes
---
- Zone NS = Cloudflare. The apex record is DNS-only → resolves straight to Replit's Google Frontend edge (34.111.x) and serves fine. `www` is **orange-cloud proxied** → Cloudflare terminates TLS for www, then fails its handshake toward an origin that has no certificate/route for the www host → uniform **HTTP/2 525**, and `http://www` 301s into that dead https endpoint.
- Diagnosing from the workspace: `dig` is absent — use node `dns.promises` (resolve4/resolveCname/resolveNs). Cloudflare proxy A records look like 172.67.x / 104.21.x; `server: cloudflare` (+ cf-ray) on the response proves CF's edge is answering, not the app — so no app log will ever show the request.

**Why:** www traffic never reaches the app, so no code change can fix or even observe the failure; only DNS/edge configuration can.

**How to apply:** owner fixes are (A) a Cloudflare redirect rule `www → apex` keeping www orange-clouded (CF Universal SSL covers first-level subdomains, origin never contacted), or (B) adding www as a Replit custom domain and grey-clouding the record so Replit can issue the cert. The app already carries a www→apex 301 middleware that activates only if www traffic ever terminates at it. Related: the apex HSTS header (`includeSubDomains`, no preload) belongs to Replit's edge — never re-add an app-level copy (duplicate-header incident), and preload is a platform-support ask, not code.

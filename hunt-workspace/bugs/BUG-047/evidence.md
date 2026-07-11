# BUG-047 — /bookmarks and /profile blocked in robots.txt but return HTTP 200 to anonymous

**Severity:** LOW (SEO contradiction, also see BUG-027 and BUG-017)
**Affected page:** https://awesome.video/bookmarks, /profile

## Reproduction
```bash
curl -sI https://awesome.video/bookmarks | head -1      # 200 OK
curl -s https://awesome.video/robots.txt | grep profile  # Disallow: /profile
curl -s https://awesome.video/robots.txt | grep bookmarks # Disallow: /bookmarks
```

Three different policies for the same routes:
1. robots.txt says "no crawl."
2. HTTP returns 200 with full sidebar.
3. The body says "Please sign in" — so a crawler that ignores robots.txt will index a gating page.

## Expected
Consistent state: either robots.txt Disallow + 401/302, OR full public access + no Disallow.

## Evidence
- `quickprobe` outputs earlier
- `contrast-seo-vuln.json` empty-state status

## Fix prompt

```
Task: /bookmarks and /profile are listed as Disallow in robots.txt but
serve HTTP 200 with a "Please sign in" body. Make the routes return
401 (or 302 to /login) so the robots.txt instruction matches reality.

Acceptance:
1. /bookmarks and /profile return 401 (or 302 → /login) for anonymous.
2. Authenticated users get 200 + the user's content.
3. Verifiable with `curl -I`.
```

# BUG-027 — robots.txt blocks /bookmarks + /profile but routes serve auth-gate page with HTTP 200

**Severity:** LOW (SEO contradiction)
**Affected page:** https://awesome.video/bookmarks, https://awesome.video/profile

## Reproduction
1. /robots.txt contains:
   ```
   Disallow: /profile
   Disallow: /bookmarks
   ```
   so search engines are told NOT to crawl them.
2. But `curl -I https://awesome.video/bookmarks` → **200** with the
   full sidebar rendered.
3. The pages aren't gated behind a 401/302 (see BUG-017), so anonymous
   users see the full chrome with a "Please sign in" body.

While robots.txt says "don't crawl," the body content isn't actually
hidden behind auth — Google could still index the body via direct link.

## Expected
Either follow the robots.txt instruction strictly (return 401 / 302)
OR remove the Disallow since the page is publicly visible anyway.

## Actual
Inconsistent state: blocks crawling of /bookmarks + /profile in
robots.txt, but HTTP-200s the same routes to anonymous clients.

## Evidence
- `/Users/nick/.claude/skills/website-bug-hunt/screenshots/empty__bookmarks.png`
- `/Users/nick/.claude/skills/website-bug-hunt/screenshots/empty__profile.png`
- `contrast-seo-vuln.json`, `empty_state_/bookmarks.status = 200`

## Fix prompt

```
Task: https://awesome.video/robots.txt declares
  Disallow: /profile
  Disallow: /bookmarks
but those routes return HTTP 200 to anonymous clients with a
"Please sign in" body. Choose:

(a) Remove the Disallow lines (treat these as public landing pages,
    even if the SPA shell says "auth required").

(b) Make /profile and /bookmarks return HTTP 401 or 302 to /login so the
    robots.txt instruction matches reality.

Acceptance: pick (a) or (b) and ensure robots.txt and the actual HTTP
response agree.
```

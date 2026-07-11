# BUG-096 — /og-image.png accepts arbitrarily long titles and embeds them in the image (DDoS / spam surface)

**Severity:** LOW
**Affected endpoint:** /og-image.png

## Reproduction
```bash
curl -sI 'https://awesome.video/og-image.png?title=$(printf "A%.0s" {1..5000})' | head -3
```
Returns 200 + PNG for a 5 KB title. The image is generated server-side
and may take longer for huge titles.

## Expected
Either reject overly long titles (400 Bad Request) or cap + truncate.

## Actual
No cap.

## Evidence
- `even-more.json`, `ogImage`

## Fix prompt

```
Task: /og-image.png should cap the title parameter (e.g., 200 chars)
and reject over-long queries.

Acceptance:
1. /og-image.png?title=<3000 chars> returns 400 with a clear message.
2. The cache layer caches by title-hash so SSR load stays bounded.
```

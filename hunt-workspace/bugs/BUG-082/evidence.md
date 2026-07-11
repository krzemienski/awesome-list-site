# BUG-082 — /og-image.png always 200 (any title) — risk of arbitrary image generation

**Severity:** LOW (defense-in-depth; design system open to spam)
**Affected endpoint:** https://awesome.video/og-image.png

## Reproduction
```bash
curl -sI 'https://awesome.video/og-image.png?title=test&subtitle=spam&author=evil'
```
Returns 200 + PNG (~54 KB) regardless of payload.

The site generates OG images for arbitrary titles. If the parameter
parser ever trusts user-supplied content, this enables social-graph
spam.

## Expected
Either bound the title length, strip HTML, or adopt a regex whitelist.

## Actual
No visible filtering observed, but the title parameter flows straight
to image generation.

## Evidence
- `even-more.json`, `ogImage`

## Fix prompt

```
Task: /og-image.png accepts arbitrary ?title=... parameters. Add length
limits (e.g., 120 chars) and HTML escaping / strip.

Acceptance:
1. /og-image.png?title=<title-with-1000-chars> either rejects with 400
   or truncates cleanly.
2. /og-image.png?title=<script>alert(1)</script> does not embed raw
   script text in the rendered image text.
```

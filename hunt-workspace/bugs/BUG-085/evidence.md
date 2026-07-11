# BUG-085 — /resource pages on mobile lack a "View more in this category" affordance

**Severity:** LOW
**Affected page:** /resource/<id> at 375×812

## Reproduction
1. Open any /resource/<id> at 375×812.
2. The page shows title + content. There is no visible filter control
   to "show similar resources in this category."

## Expected
A "View more in this category" CTA or filter chip on mobile.

## Actual
User must navigate to the category page manually.

## Evidence
- `resources-audit` outputs

## Fix prompt

```
Task: On /resource/<id> pages, add a "More from this category" CTA
that links to /category/<slug>/#<resource-id>.

Acceptance:
1. /resource/<id> on mobile (375) shows a "More from <category>" link.
2. Verifiable with Playwright.
```

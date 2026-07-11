# BUG-097 — Tab panels under /admin don't expose `aria-current` or `aria-selected`

**Severity:** LOW (a11y)
**Affected page:** /admin (any tab)

## Reproduction
Inspect the admin tabs (Approvals, Edits, Categories, …). Today
they likely toggle visual styling via CSS but lack `role="tab"`,
`aria-selected`, `aria-controls`.

## Expected
Each tab is `role="tab"` with `aria-selected` on the active tab and
`aria-controls` pointing to its panel `role="tabpanel"`.

## Actual
Visual toggle only — keyboard navigation (Arrow Left/Right) and
screen-reader announcement are missing.

## Evidence
- manual inspection of /admin HTML

## Fix prompt

```
Task: /admin tablist should follow ARIA Authoring Practices.

Acceptance:
1. Each tab is role="tab".
2. Active tab carries aria-selected="true".
3. Panels carry role="tabpanel" and aria-labelledby the tab id.
4. Arrow-key navigation between tabs is supported.
```

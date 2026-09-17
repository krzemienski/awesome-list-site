---
name: Accessibility-tree gates need two probes
description: Playwright getByRole misses `inert`; a visually hidden (sr-only) control must be gated by role/name AND an ancestor walk
---

# Accessibility-tree gates need two probes

When a control is `sr-only` by design (the app's shell breadcrumb), a geometry check (`getBoundingClientRect().width > 10`) is the wrong contract and fails forever. The right contract is accessibility-tree membership — but `getByRole` alone is not that contract.

**Why:** a mutation probe showed Playwright `getByRole('link', { name, current: 'page' })` still counts the crumb when an ANCESTOR is `inert` (it does drop it for ancestor `aria-hidden` and `display:none`). So role/name lookup plus an ARIA snapshot proves name + hidden-ancestor rules, and an in-page walk of every ancestor for `display:none` / `visibility:hidden` / `aria-hidden` / `hidden` / `inert` covers what the role engine misses and names the offending ancestor.

**How to apply:** for any hidden-by-design control, require both probes and keep the overflow comparator; prove the gate can fail by mutating an ancestor before trusting it. Also: forced-colors button borders from a global `button` rule are silently lost under any more specific `border: 0` — add a `@media (forced-colors: active)` override next to that rule (no pixel effect outside HC).

---
name: Product-profile gate targets the design-system artifact
description: Why the product-profile gate validates the repo-owned design-system artifact instead of the canonical awesome-list-site-ds source, and how consumer checks must be written.
---

**Rule:** the product-profile drift/browser gate validates the registered
design-system artifact, never `awesome-list-site-ds/`. Never write
`data-product-profile` markers or token consumers into the canonical
directory; it must stay byte-identical to the uploaded archive.

**Why:** a generator once patched markers into the canonical source to make
the gate pass; re-syncing the source to the archive (a contract of the parity
work) then left the gate permanently red. The artifact is the repo-owned
surface that may carry app-specific instrumentation.

**How to apply:**
- Consumer assertions must be per-selector against the owning rule's
  declarations, not a stylesheet-wide substring: with two rules consuming the
  same token, a substring check stays green when one regresses to a literal.
  Prove it with mutation probes (literal swap, selector dropped, declaration
  deleted) before trusting the gate.
- When a shared profile value changes (e.g. the accessible-target floor), the
  browser gate's per-route expectations must move in the same commit or the
  gate goes red silently for weeks.

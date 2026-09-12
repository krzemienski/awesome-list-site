---
name: Product-profile gate targets the design-system artifact
description: Why the product-profile drift/browser gate reads the registered design-system artifact instead of the canonical awesome-list-site-ds source, and what that forbids.
---

**Rule:** `product-profile-drift.mjs` (and the `product-profile-browser`
workflow) validate `artifacts/awesome-video-design-system/` (its `index.html`
markers + `src/index.css` consuming `--profile-control-height`) and re-run the
artifact generator in `--check` mode. Never point the gate back at
`awesome-list-site-ds/`, and never write `data-product-profile` markers into
that directory.

**Why:** `awesome-list-site-ds/` is contractually byte-identical to the
uploaded archive (`docs/parity/source-sync.json` hashes; `diff -rq` against the
extracted zip must be empty). A generator that patched markers into it made
the canonical source drift and left the gate permanently red once the source
was re-synced. The artifact is the repo-owned surface that may carry app
specific instrumentation.

**How to apply:** any parity task touching the artifact's CSS must keep the
two control-height rules on `var(--profile-control-height)`;
`--profile-page-measure` is intentionally unconsumed there until the docs
pages gain a measure-bounded prose column (decision left to the design-system
docs tasks).

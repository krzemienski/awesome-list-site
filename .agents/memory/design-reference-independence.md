---
name: Reference sync gate history
description: Why the canonical design archive root is frozen out of the standalone palette/product-profile gates, what broke when it was raw-copied, and the gitignored-archive trap those gates now carry.
---

**Rule:** the supplied design archive is a *reference*; gated shipping surfaces
(design-system artifact, runtime CSS/registry) are translated from it, never
the same bytes. The canonical copy in `awesome-list-site-ds/` is a frozen
reference root: excluded from the Stage 5 palette scan only while it is
byte-identical to the pinned archive, and no longer the product-profile gate's
target (see the companion notes `standalone-palette-gate-scope.md` and
`product-profile-gate-target.md`).

**Why:** raw-copying the archive's files into `awesome-list-site-ds/` made the
palette scan report the reference's own literals as regressions (more with
every extra file copied) and hard-failed the product-profile gate (the
reference's HTML declares no profile attribute). The parity harness serves the
reference from that same directory, so "fixing" the findings in place would
have silently rewritten the reference. Freezing + verifying was the
resolution; do not re-open it by editing files under a frozen root.

**Gitignored-archive trap:** the frozen-reference check reads the zip at the
path recorded in the sync record. Uploads are gitignored and get per-upload
names, so another workspace holding the same bytes under a different name
crashes the gate with `ENOENT` — not a drift verdict. Copy the zip to the
recorded path (same hash) before reading the result. Likewise, anything
written under `.local/` does not survive a task merge; commit ledgers into
`docs/` before closing.

**How to apply:** before any design-source sync, run
`validate:standalone-palette-drift` and `validate:product-profiles`; if the
plan is "copy the archive in", the destination must be a frozen root and the
sync record's hash/entry count must be updated in the same change.

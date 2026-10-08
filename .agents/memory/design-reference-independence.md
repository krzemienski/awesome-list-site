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

**Where the 2026-09-29 handoff lives:** only in Claude Design project
49c7785a-b6d4-4c30-9d2d-9f0229ebc042 (fetched via the claude_design MCP into a
gitignored `.cache/ds-fetch-20260929T0714Z/`). It is in no git branch, and the
owner's "awesome_list_site_2" zip is the 09-10 prototype (identical to the
frozen root). Check `styles.css` sha256 = 31fde358… before treating any upload
as the 09-29 handoff.

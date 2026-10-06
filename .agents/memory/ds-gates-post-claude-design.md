---
name: DS deep gates vs adopted Claude Design
description: Why verify-ds --deep FAILs on main after the Claude Design adoption, and which failures are gate defects rather than app defects.
---

After the Claude Design adoption merge, `verify-ds --mode full --deep` gives FAIL on both dev and the prod build: 1 BLOCK and 5 FIX. The frozen gates predate the new markup.

- pixel-parity and the prod parity-systems run crash with ENOENT `client/src/styles/design-system.css`. The merge deleted that file and the frozen tests/parity harness still reads it.
- The dev parity-systems run fails with "theme state did not settle for swiss/orange". This is a gate race: `assertTheme`'s waitForFunction returns an object, which is always truthy, so it resolves on the first poll. The app sets the theme correctly.
- live-probe stage 3 and font-prepaint fail because the frozen pre-boot script depends on the external /ds/design-system.js and writes 'Inter' before the font override.
- ds-button-sweep and ink-accent flag un-hooked chrome added by the merge (account-list-item, admin-tab-scroller__edge, home-index-title h1, taxonomy chip.accent).

**Why:** these are owner decisions (frozen gates or frozen pre-boot code). They are not regressions from later work.
**How to apply:** if a run shows only these failures, it is baseline. Diff against this list before debugging. Deep runs rewrite tracked docs/parity/evidence, so `git checkout -- docs/parity` afterwards.

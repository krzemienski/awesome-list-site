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

## Status after the delegated-decision pass (2026-10-06)
- Remaining deep FAILs are accepted residue: parity-systems BLOCK = axe color-contrast on `--text-3` meta only (canonical pair is sha-pinned; fix belongs at the design source), font-prepaint + live-probe stage 3 (#26 boot order), pixel-parity (#26 visual delta vs frozen EXPECTED, not re-baselined).
- Several post-#26 "timeouts" were stale activation proofs in the gate, not app bugs; reproduce with `--only=<scope>` and print the full Playwright call log before touching app code.
- Restoring evidence after a deep run: `git checkout` only the changed evidence files — a blanket `git checkout -- tests/parity` also reverts harness source edits.
- Full deep pixel-parity is ~1.4 captures/min (~4 h for 83 screens) and outlives workspace recycles; scope it.

## ink-accent renderer crash (2026-10-09)
- ink-accent can crash Chromium's renderer after roughly 30 cells. The point moves between runs: brutalist × 1440 in one run, swiss × 375 on the resource page in another. There was no cgroup OOM and /dev/shm was empty.
- Treat this as UNVERIFIED (environment), not a FIX finding. Cite the completed cells' 0 violations.
- A fix would belong in the gate (fresh page per cell), not in app CSS.

# Verified design parity — current status

## Gate status

| Phase | Status | Evidence / limitation |
|---|---|---|
| 0 — source, inventory, real home | **PASS** | `PHASE-0-RESULTS.json`; synchronized source and evidence committed locally |
| 1 — complete baseline | **IN PROGRESS / NOT PASSED** | Only the home state has been attempted; the full screen/state matrix has not run |
| 2 — foundations and registered artifact | **NOT STARTED** | No production foundation or artifact presentation changes |
| 3 — shell and public screens | **NOT STARTED** | No production presentation changes |
| 4 — kinds, featured, admin, contact | **NOT STARTED** | No schema/API changes, admin mutations, or contact delivery |
| 5 — full audit and cleanup | **NOT STARTED** | No fresh axe, Lighthouse, five-system audit, complete click-through, or cleanup deletion |

## Latest four-width diagnostic

Run: `tests/parity/baseline/2026-09-10T06-22-31-938Z-18941/`.
This is a **filtered diagnostic**, not the complete baseline. The recorded input fingerprint did not change during capture.

| Home width | Result | Retained comparison |
|---|---|---|
| 375 | **BLOCKED before comparison** | Two reference captures differed at 68 raw pixels; both are retained, not silently accepted |
| 768 | **BLOCKED / diagnostic only** | 52.7611% difference; expected 768×3836, actual 768×1927 |
| 1024 | **BLOCKED / diagnostic only** | 60.1525% difference; expected 1024×3529, actual 1024×1487 |
| 1440 | **BLOCKED / diagnostic only** | 56.6642% difference; expected 1440×2976, actual 1440×1363 |

These percentages are not accepted parity scores: native font and reference identity alignment are incomplete. The 768/1024/1440 raw repeat captures were byte-identical on each side. Category identities, per-category counts, and category order matched in those three completed comparisons after scoping the assertion to category controls.

The latest run contains 19 PNGs, structured results, a report, and an output-hash manifest. Earlier diagnostics remain separate and unchanged. The first recorded attempt lacked concrete font readiness; the next exposed a whole-body text-order false positive. That false positive was corrected before the four-width run.

## Coverage accounting

- Current normalized harness inventory: 72 identities, including one full-page shell alias.
- Pixel scope: 61 declared IDs / 241 rows, or **60 unique capture IDs / 237 rows** after excluding the four shell-alias rows.
- Passing pixel screens: **0**. Passing eligible pixel rows: **0**.
- Home attempts: four widths; three comparisons completed but remain blocked, one did not reach comparison.
- Token-only scope: 11 identities / 44 rows, **all unverified**.
- Other configured rows remain filtered, not executed. Additional feature/overlay/create/edit/delete states in `SCREENS.md` still need complete capture mapping before any full-inventory claim.
- All five system audits, all 50 theme combinations, axe counts, Lighthouse scores, role-specific journeys, and five contact screenshots are **unverified**.

## Concrete blockers and gaps

1. **Native font parity:** the main app loads normal Fraunces but not the required native italic face. The browser can report `fonts.check(...) === true` while synthesizing an italic; the harness correctly distinguishes that from a loaded native face.
2. **Reference identity and demonstration metrics:** the source shell displays its demonstration administrator while the real app is a visitor. Some source metrics are also static demonstration values. These are not accepted as aligned production data.
3. **Mobile reference stability:** the two 375px reference captures differed at 68 pixels within x=41–333, y=119–490, despite equal 375×5453 dimensions. Investigate rather than mask or discard this evidence.
4. **Major presentation differences:** the current app still has taxonomy cards and recommendations rather than the reference's dense Index, stat strip, kind strip, and recent-resource rail. Shell/footer presentation also differs.
5. **Incomplete scope:** other public routes, authenticated/admin states, and registered-artifact chapter surfaces have not been captured in the full matrix. Missing actual artifact chapters must stay explicit, not become duplicate screenshots of one page.
6. **Backend boundaries:** kind/featured support requires the authorized additive work; no separate posts/CMS model was found. Unsupported backend capabilities and unavailable contact destinations must remain blocked rather than fabricated.
7. **Existing dependency findings:** the root audit reported 28 findings, including one critical. Pixelmatch was not listed as affected; no release-readiness or security-clean claim is made.

## Harness corrections retained

- `npm run test:parity`, exact Pixelmatch 7.1.0, fixed threshold 0.1, maximum 0.5%, no resizing/cropping.
- Full public corpus bound through its authoritative tree placement; one pre-existing stale leaf assignment is transparently reconciled to the same parent used by the real app. No catalog records were changed.
- Independent in-memory source server; approved loopback bases; Chromium sandbox explicitly enabled and verified.
- Persistent inventory, unique capture identities, explicit aliases, exact terminal-row accounting, and a nonzero eligible denominator before any pass.
- Late stylesheet registration, concrete font faces, image decoding, layout settling, and raw repeat captures checked.
- Blocked font or identity comparisons retain diagnostic images without entering the passing denominator.
- Full source/browser/input fingerprints, nonce-normalized document drift checks with raw hashes retained, and immutable named evidence runs with output hashes.

## Next authorized work

Complete the remaining reference-data/auth mapping and baseline capture configuration, investigate the mobile stability issue, and run the complete required matrix before advancing dependent phases. Keep the governing archive geometry intact unless reconciling a documented explicit brief conflict. Do not replace expected images with app captures.

No publishing, GitHub push, production mutation, authentication bypass, schema migration, or cleanup deletion has occurred. The main app and the actual registered design-system artifact remain running.
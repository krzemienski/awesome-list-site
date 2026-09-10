# Initial harness integrity review

This review concerns the initial, unexecuted implementation. It is not a baseline result. Corrections must be checked before using the harness as evidence.

**FAIL — the harness can omit required scope, inflate coverage with duplicate/non-counterpart rows, and label mutable/non-hermetic evidence as a full baseline.**

**Critical findings**
- **Global gate fails open:** `inventory` is parsed without schema/cardinality/uniqueness validation, and `report.gatePassed` only checks status counters. Zero executed rows (for example empty inventories or `screen.widths: []`) can pass. More immediately, `inventory.unconfiguredScreens` and `inventory.adminSections` are never consumed, so 26 declared gaps disappear while `claim` still becomes `full-inventory-baseline`. Require an exact expected-row set, nonzero denominator, unique IDs/capture identities, and one terminal row per required screen×width.
- **Coverage is not genuine:** `app.home.index` and `app.shell.default` have identical kind/path/actions and produce the same full-page capture, yet both enter the denominator. `artifactDocs` generates 21 pixel-gated rows targeting `/#docs-*`, but `artifacts/awesome-video-design-system/src/App.tsx` implements no docs hash router—only `#top/#foundations/#themes/#components/#profiles/#governance`. `actualRequiredText` is only a broad visibility search and cannot establish state identity. Deduplicate captures and classify unsupported artifact states as missing counterparts rather than independent parity coverage.
- **Screenshot anti-flake is insufficient:** `settlePage` treats 500 ms without DOM mutations as ready; it does not await screen-specific API completion, image decode/lazy content, or layout stability, and it performs no repeated-capture hash check. CSS/image/font layout can change without a DOM mutation. Add explicit per-screen readiness plus decoded-image checks and require two stable captures (or retain an unmodified diagnostic before any documented grain suppression).
- **“Immutable” evidence is not immutable:** `referenceAssetHashes` is computed before live files are served, creating a hash/read TOCTOU; output PNGs/results have no manifest hashes. `finalRoot` merely refuses name reuse—files remain editable. Provenance omits runner/inventory hashes, browser-binary hash, commit/dirty state, and app/artifact build identity.

**Security:** Serious issue: `normalizeBase` accepts arbitrary HTTP(S) origins while Chromium runs with `--no-sandbox`. A supplied or compromised remote origin executes untrusted content without Chromium’s sandbox. Restrict both bases to the approved loopback app/artifact endpoints and remove `--no-sandbox` unless the environment provides an independently isolated browser container.

**Next actions**
1. Add fail-closed inventory schema/exact coverage validation and deduplicate capture identities.
2. Make captures state-specific and repeatably stable.
3. Snapshot verified inputs, record complete build/commit provenance, and hash every evidence output.

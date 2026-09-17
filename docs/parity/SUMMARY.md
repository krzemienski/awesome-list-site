# Parity final summary (blocked)

> **Superseded snapshot:** the counts below describe an older capture.
> Latest retained full results are 133 pass / 51 fail of 184 compared rows,
> plus 40 blocked and 100 unverified. These also predate the latest repairs.
> [COMPLETION-REVIEW.md](COMPLETION-REVIEW.md) is the current reconciliation;
> the original capture history below is preserved, not relabelled.

- Documentation HEAD / final documented application SHA: `a1e2a9fc598a34b4e662a27f5c8bdb6a869c8f3e`; historical capture is not relabelled.
- Full regression `2026-09-15T17-47-51-897Z-9407` originated at `2b44a2bc08692059cc4ab63c526a5871451fbe1f`: **16/188** pixel PASS; **172/188** FAIL.
- Outside pixel denominator: 40 blocked, 96 token-only UNVERIFIED, 4 evidence-only, 4 aliases; 83 exact harness IDs.
- Re-skinned Home Index, Curated, Drawer, and Palette are 16/16 four-width PASS; this is not inventory closure.
- Rebuilt artifact docs retain 21 pixel IDs; anatomy remains artifact-docs evidence-only; neither is promoted.
- Baseline compare: 26 routes / 1 unchanged / 0 approved intentional / 25 unresolved; 12 APIs / 8 changed; 43 deltas.
- Axe: 107/108 attempted rows pass with zero serious/critical completed rows; research@1440 incomplete; 12 state-only rows skipped.
- Five-system audit: 50/50 persistence, 80/80 smoke, 10/10 chrome, 108/108 audit rows PASS. Lighthouse is 83 Home / 75 category / 83 resource; Home is below 88.
- Scoped click-through visitor/admin, keyboard, net-zero, and cleanup flows passed; they are not a pixel waiver.
- [Independent verification](VERIFICATION.md) at `a1e2a9fc`: check, 16 files/315 unit tests, contracts (19/0), OpenAPI (178/178/150), migration safety/drift, dead exports, and root-script drift passed.
- Fresh five-ID selection: exit 2 (missing `BASE_URL`), exit 2 (`net::ERR_CONNECTION_REFUSED`), then wrapper timeout `-1` at 300s with partial `about` (4 FAIL) and `category` (2 FAIL) measurements; no complete selected-run result.
- The partial timed-out selected run remains UNVERIFIED, but verifier cleanup is resolved: exact two-ID operation deleted one local and one Clerk record and verified zero local/Clerk records remaining.
- Verbatim handoff: “172/188 pixel cells fail”; “17 cells exceed 0.01-point repeat tolerance”; “57 first-pass failures are font-gap-only.” [Full exact table](worklog/full-regression-2026-09-15.md#owner-handoffs-and-exact-repro).
- Verbatim handoff: “DECISION NEEDED: either ratify the upstream re-baseline ... or revert it and shrink the route”; “5,218 errors / 23 warnings”; “390 Firefox/WebKit launch failures.” [Full exact table](worklog/full-regression-2026-09-15.md#owner-handoffs-and-exact-repro).
- Verbatim handoff: “Supported Clerk handshake reaches artifact; rewritten handshake 404s”; “Bookmark seed 401 before required overlays”; “Four H1 expectations plus account-dashboard distinct-body assertion fail.” [Full exact table](worklog/full-regression-2026-09-15.md#owner-handoffs-and-exact-repro).
- Verbatim handoff: “RIST, MPEG & Forums, Official Specs show ‘Something went wrong’ in sidebar traversal”; “Research@1440 missing `[data-testid=\"tab-research\"]`”; “40 blocked and 96 token-only unverified parity cells; 12 state-only axe cells skipped.” [Full exact table](worklog/full-regression-2026-09-15.md#owner-handoffs-and-exact-repro).
- Verbatim handoff: “Production comparison has missing routes and unresolved differences”; “26 routes / 1 unchanged / 0 approved intentional / 25 unresolved; not full inventory acceptance.” [Full exact table](worklog/full-regression-2026-09-15.md#owner-handoffs-and-exact-repro).
- Final Task 571 static audit: [report](evidence/verification-571/parity571-missing-targets.txt), [JSON](evidence/verification-571/parity571-links.json), and [runnable script](evidence/verification-571/parity571-audit.js.txt) cover 163 Markdown files, 1,674 links, and 1,298 PNG references (698 unique), with zero missing local targets, zero missing PNGs, and zero existing-but-untracked PNGs; unavailable historical raw artifacts remain explicit UNVERIFIED and the SCREENS aggregate remains excluded.
- Canonical chunk coverage is an explicit manifest gap: historic wave ledgers do not consistently record canonical-file line ranges, so no retroactive chunk coverage is fabricated.
- Conventional-prefix audit gap: the historical worklog ledger does not itself establish a conventional-prefix commit audit for every phase; preserve the listed SHAs and verify prefixes from Git before a compliance claim.
- Evidence: [report](REPORT.md), [inventory](SCREENS.md), [worklog](WORKLOG.md), [assumptions](ASSUMPTIONS.md), [audit](DS-AUDIT.md), [click-through](CLICKTHROUGH.md), [cleanup](CLEANUP.md), [verification](VERIFICATION.md).
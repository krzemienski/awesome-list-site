# Authorized static-shell Lighthouse evidence

## Scope and provenance

This directory retains the one authorized, read-only mobile Lighthouse capture
of `/` performed through the managed static/API integration shell
(`http://127.0.0.1:5101`). It was not a production-server run and did not
start, restart, modify, or seed the application.

The browser was configured with the compiled build's development Clerk host.
Only the narrow anonymous Clerk bootstrap and empty-body Environment
initialization were permitted; no authenticated state, request body, or secret
was retained. The browser was released after the capture.

The included files are:

- `lighthouse/home.json` — redacted Lighthouse result for `/`.
- `lighthouse/scores.json` — redacted performance-score ledger.
- `inventory.json` — capture inventory.
- `manifest.json` — redacted capture provenance and guard ledger.

## Gate result — FAIL

The retained capture reports a performance score of **0.54**, below the
required **0.82** gate. Its recorded FCP, LCP, and TBT are 4054 ms, 4143 ms,
and 1063 ms respectively. This result is retained as authorized diagnostic
evidence only; it does not replace the genuine retained 0.85 production
baseline.

## Static-shell versus production limitation

This evidence is not production-comparable for gate replacement. The local
static shell synchronously serves compressed assets without the production
delivery topology, proxies API traffic locally, and uses direct development
Clerk initialization rather than the production same-origin proxy topology.
The run also showed abnormal main-thread “Other” time. No additional
benchmark was run to avoid consuming the restricted capture budget.

## Privacy controls and integrity

Before retention, all four JSON documents were checked for unredacted
sensitive query values. The evidence sanitizer redacts credential-like query
values, URL userinfo, fragments, Lighthouse objects, and every serialized
refusal collection (requests, allowed initializations, WebSockets, workers,
popups, and service workers). The all-collections serializer assertion passed
after this final mapping was applied.

SHA-256 digests of retained files:

| File | SHA-256 |
| --- | --- |
| `inventory.json` | `cbddc24a3545a401ac1459d09d5d45d0f2c934dbfe5a5d0c6618f9acb8f5e3ca` |
| `manifest.json` | `dffd7d06603a2cf046a6fab08aeaf5c481afb11bdd48f1845a726d8e8df55a56` |
| `lighthouse/home.json` | `52a7c02ae615797833bb22fbefcb9819af1a70f99157a13aa40675e43e598c1e` |
| `lighthouse/scores.json` | `7b419ce9a8e396e450f25b76da5134bb6f7c4f0c783eb5c0fc131f46776c97f9` |
# Postfix static-cache Lighthouse evidence

## Scope

This directory retains the one parent-coordinated mobile Lighthouse capture of
`/` after the performance shell was changed to preload static files and
precompute gzip before listening. It is read-only static-shell evidence from
`http://127.0.0.1:5101`, not a production-server run. No application source,
production/Express process, publication action, or retry was performed by the
performance-harness work.

## Result — gate still fails

| Metric | Postfix static shell | Prior authorized static shell | Genuine production baseline |
| --- | ---: | ---: | ---: |
| Performance | **0.57** | 0.54 | 0.85 |
| FCP | **3186 ms** | 4054 ms | 3191 ms |
| LCP | **3553 ms** | 4143 ms | 3269 ms |
| TBT | **1811 ms** | 1063 ms | 130 ms |

The required performance gate is **0.82**, so the postfix result is an
explicit **FAIL**. It is diagnostic evidence only and cannot replace the
retained genuine 0.85 production baseline. The improved FCP after static
preloading removes the demonstrated per-request static-shell file-read/gzip
delivery confound, but the increased TBT confirms that it was not the sole
performance issue.

## Read-only guard provenance

Per-route guard refusal collections were empty. One approved development-Clerk
initialization was recorded in the route ledger. The browser-global guard
recorded one separate refused POST XHR:

| Origin | Path | Query parameter names |
| --- | --- | --- |
| `https://gorgeous-jennet-4.clerk.accounts.dev` | `/v1/dev_browser` | `__clerk_api_version`, `_clerk_js_version` |

Only origin, path, and parameter names are recorded here; no query values,
request bodies, authentication state, or secrets are retained.

## CPU attribution boundary

The stored Lighthouse report attributes 2237 ms bootup time (883 ms scripting)
to the initial local application bundle, compared with 378 ms third-party
main-thread time for the two Clerk execution sources. Lighthouse assigns 273 ms
of the 1811 ms TBT to Clerk, leaving at least 1538 ms outside that third-party
estimate. It also reports 3674 ms as main-thread `Other`, 1251 ms script
evaluation, and 798 ms style/layout.

The stored script treemap was intentionally stripped as bulk evidence and the
initial application bundle lacks a source map. This report therefore supports
an application-side CPU predominance over Clerk but does not identify a module
or function. No nonvisual app optimization is justified from this evidence
alone, and no retry is authorized until a causal change is selected.

## Privacy and integrity

All retained JSON documents were parsed and checked for unredacted sensitive
query values before retention. The report-write sanitizer covers URL userinfo,
fragments, credential-like query values, Lighthouse evidence, and every guard
refusal collection.

| File | SHA-256 |
| --- | --- |
| `inventory.json` | `cbddc24a3545a401ac1459d09d5d45d0f2c934dbfe5a5d0c6618f9acb8f5e3ca` |
| `manifest.json` | `cc7499172f1a63a8e8e0892f617ca4b8ed9542e80a3957812b93d0e5f1a98fa3` |
| `lighthouse/home.json` | `b3afee5a617cf4d5536d8a93b98aba2e57e568b4583d644a2fe26d8b8d1ca1c0` |
| `lighthouse/scores.json` | `283078633190483654e863e90e64376a365545c2af25cb4f8cb085a7a79d38aa` |
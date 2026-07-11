# BUG-055 — /recommendations has no `cross-origin-opener-policy` (Spectre-class)

**Severity:** LOW (defense-in-depth)
**Affected page:** /recommendations (and all others)

## Reproduction
```bash
curl -sI https://awesome.video/recommendations | grep -i cross-origin
```
No output — no COOP/COEP/CORP headers.

## Expected
A modern site should set:
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp`
- `Cross-Origin-Resource-Policy: same-origin`

## Actual
None are set.

## Evidence
- `even-more.json` `hdr_*`

## Fix prompt

```
Task: Add isolation headers to responses.
Acceptance:
1. /recommendations and / emit COOP: same-origin, COEP: require-corp.
2. Verifiable with curl.
```

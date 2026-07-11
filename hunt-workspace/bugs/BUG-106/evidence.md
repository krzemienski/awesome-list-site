# BUG-106 — Server leaks internal Google Cloud infrastructure details in headers

**Severity:** LOW (information disclosure)
**URL:** https://awesome.video/ (and any other endpoint)
**Component:** Response headers

## Reproduction

1. `curl -I https://awesome.video/`
2. Observe headers:
   - `server: Google Frontend`
   - `via: 1.1 google`
   - `x-cloud-trace-context: 3de0486aa3d06db0df17243b4655dacb`
   - `x-content-type-options: nosniff`
   - `x-frame-options: DENY`

## Expected

Strip the `server`, `via`, and `x-cloud-trace-context` headers at the CDN/proxy layer so the deployment topology is not advertised to clients.

## Actual

All three headers are present verbatim. The `x-cloud-trace-context` contains a 32-hex-digit Google Cloud Trace ID and a span ID — both can be replayed against the GCP Trace API if an attacker has even read-only project access, and they fingerprint the deployment as a Google Frontend / GCP load balancer. This is also a small but real privacy weakness: a CDN trace ID can sometimes be cross-correlated with Google Analytics data when the same edge cluster handles both flows.

## Evidence

- `admin-fast-api.json` line 471-491: response headers from GET `/admin` (admin-fast-api `phase: headers` block).

## Fix prompt

```
Task: Strip server-identifying response headers from the edge layer.
Acceptance: curl -I https://awesome.video/ must NOT include any of:
  • server
  • via
  • x-cloud-trace-context
  • x-powered-by

Keep x-content-type-options=nosniff and x-frame-options=DENY (they are
defensive — keep them).
```

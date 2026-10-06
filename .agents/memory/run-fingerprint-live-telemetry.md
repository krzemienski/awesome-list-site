---
name: Run-input fingerprints vs live telemetry endpoints
description: Hashing an endpoint that reports the process's own request counters makes every run report "inputs changed"; exclude telemetry from the fingerprint but keep the raw snapshot hash.
---
The admin operations-health endpoint is live process telemetry: it re-probes the DB
on every call and its per-endpoint request counters advance with the run's own
requests. Any fingerprint that includes it differs between run start and end
by construction, so every admin-identity run flagged `inputsChangedDuringRun`
(anonymous runs, which never read it, looked fine).

**Why:** a first fix that stripped only the probe timestamp was insufficient —
the endpoint counters change too. But dropping the WHOLE endpoint is also
wrong (independent review): the overview PAINTS `status` / `lastProbe.ready` /
`reason`, so a ready→degraded flip mid-run must still change the fingerprint.

**How to apply:** project telemetry endpoints down to exactly the semantic
fields the reference renders (mirror the painter's reads), and drop only the
per-request leaves (probe timing, pool counters, request averages). Keep the
raw snapshot hash separately so the projection itself is auditable.

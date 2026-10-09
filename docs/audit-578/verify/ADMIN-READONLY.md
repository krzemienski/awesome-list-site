# ADMIN-READONLY: admin sections on production

Status: PASS (12/12).

Command: `node docs/audit-578/live-smoke/admin-sweep.mjs`. Owner admin cookie; every page-initiated non-GET /api request is aborted (only POST /api/send beacons were attempted and blocked).

overview, approvals, edits, resources, categories (taxonomy), journeys, users, export, linkhealth, github, research, enrichment: each 200, the correct tab/heading rendered, no error text, no skeletons left, 0 API responses >= 400, 0 page errors. Detail: docs/audit-578/live-smoke/admin-sweep-1440.json.
Screenshots inspected: overview, approvals, journeys, categories, research, linkhealth (the PII-free ones are copied to docs/audit-578/live-smoke/shots/).

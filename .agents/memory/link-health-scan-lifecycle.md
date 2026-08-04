---
name: Link Health scan lifecycle
description: How the admin Link Health dashboard decides what it flags, and scan runtime expectations.
---

**Rule:** the dashboard's problem list comes ONLY from the latest *completed* link_health_jobs row; fixing a resource URL does not clear its flag until a new full scan completes. A full prod scan (~3.8k links) takes ~85-90 min at ~45 links/min, and status can sit at checked==total for several minutes during the finalize pass — wait for status:"completed".

**Why:** after repointing dead URLs (Aug 2026) the old flags persisted until a fresh POST /api/admin/link-health/run finished.

**How to apply:** repoint URLs first, then trigger one scan and poll /api/admin/link-health/status; "suspect" = 200 but off-domain redirect/takeover heuristic — prefer repointing to the redirect's final host.

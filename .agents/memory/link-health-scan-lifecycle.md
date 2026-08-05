---
name: Link Health scan lifecycle
description: How the admin Link Health dashboard decides what it flags, and scan runtime expectations.
---

**Rule:** the dashboard's problem list comes ONLY from the latest *completed* link_health_jobs row; fixing a resource URL does not clear its flag until a new full scan completes. A full prod scan (~3.8k links) takes ~85-90 min at ~45 links/min, and status can sit at checked==total for several minutes during the finalize pass — wait for status:"completed".

**Why:** after repointing dead URLs (Aug 2026) the old flags persisted until a fresh POST /api/admin/link-health/run finished.

**How to apply:** repoint URLs first, then trigger one scan and poll /api/admin/link-health/status; "suspect" = 200 but off-domain redirect/takeover heuristic — prefer repointing to the redirect's final host. When a repoint target is already owned by another row (resources.url UNIQUE), that's a duplicate resource in disguise: give the flagged row a distinct live URL (Wayback snapshot of the original, or an about/sub page) or delete it via the admin DELETE route (it handles audit+FK cleanup). Incomplete-SSL-chain hosts (UNABLE_TO_VERIFY_LEAF_SIGNATURE but 200 with -k) are browser-viewable via AIA — classify false positive, don't repoint.

# PROD-REVISION: which code is live on awesome.video

Status: VERIFIED (finding). Production runs 572e6739, not the 13:29 publish commit 723b71dd.

## Commands and observed output (2026-10-09)
- `curl -s https://awesome.video/api/version` → `{"revision":"572e6739578cbe2cc96ef6f607ba9b8a37ddabf4"}` (re-checked 22:4x UTC, unchanged)
- `curl -s https://awesome.video/api/public/tags` → top-level keys `['tags']`; DEV (723b71dd code) → `['total','tags']`
- `node docs/audit-578/live-smoke/http-probe.mjs https://awesome.video` → `/api/awesome-list` rows still carry `metadata.twitterImage` (old denylist serializer). DEV run of the same probe: 0 occurrences (new allowlist in server/lib/publicResource.ts, part of the 723b71dd diff)
- Downloaded all 123 prod JS files (index-Z4u6uXGJ.js + chunks) and grepped for the new not-found strings added to shared/seo-templates.ts in 723b71dd: 0 matches
- `git diff --stat 572e6739 723b71dd` → 85 files changed, including server/lib/publicResource.ts, server/routes/domains/catalog-contributions.ts, shared/seo-templates.ts

## Why the version endpoint alone isn't trusted
The build bakes BUILD_REVISION from `git rev-parse HEAD`, and the platform creates the publish commit around the build. The server-behavior markers (tags shape, serializer) are what show the old code is running.

## Consequence
None of the 723b71dd changes are live. The next republish ships them for the first time.

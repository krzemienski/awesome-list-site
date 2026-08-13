---
name: z.json() validates in-memory, not wire format
description: Why response-contract schemas must describe the serialized wire payload, not the pre-serialization object
---

Rule: a response-contract schema applied inside a `res.json` wrapper sees the PRE-serialization body. zod v4 `z.json()` rejects `Date` instances (and any toJSON-able value) that Express serializes fine, so every DB-backed payload with a timestamp logs a false "[contract] response mismatch ... <root>: Invalid input".

**Why:** drizzle rows carry Date objects; `res.json` converts them via `toISOString()`, but validation runs before that.

**How to apply:** for a generic "is JSON" response check, validate serializability (`JSON.stringify` succeeds and is defined) instead of `z.json()`; the shared JsonResponse schema in the contracts installer does this. For typed response schemas, model dates as `z.union([z.string(), z.date()])` or coerce. After schema changes, re-export docs/api/openapi.yaml (`npx tsx scripts/export-openapi-yaml.ts`) or the openapi-drift gate fails on staleness.

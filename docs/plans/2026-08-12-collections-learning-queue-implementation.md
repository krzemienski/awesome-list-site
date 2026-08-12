# Collections and Learning Queue — Implementation Plan

## Phase 1 — Durable Data Foundation

1. Add shared queue/status/tag validators and Drizzle tables/constraints/indexes.
2. Add idempotent migration `0041` and journal entry, preserving all bookmark
   rows and notes.
3. Prove the raw-SQL boot migrator reproduces `shared/schema.ts` from a scratch
   database and that existing bookmark integration tests still pass.

## Phase 2 — Transactional Domain and API

1. Expand `UserFeatureRepository` with owner-scoped collection CRUD, ordering,
   membership, bookmark-state, bulk, publish, and safe-public read operations.
2. Add authenticated routes with strict request validation and compatibility for
   the existing flattened `/api/bookmarks` response (`id` remains the resource
   ID) and add/remove endpoints.
3. Add the public collection endpoint and an integration matrix for ownership,
   partial failures, stable publication, revocation, and privacy.

## Phase 3 — Private and Public Interfaces

1. Redesign `/bookmarks` around URL-backed collection/status/archive/sort state,
   counts, collection management, selection, and bulk actions.
2. Add a compact optional collection picker to the existing bookmark save/edit
   dialog without expanding every resource card.
3. Add `/collection/:shareId`, route metadata, approved-only read-only cards,
   loading/error/empty states, client + OG-middleware routing, matching
   `noindex,follow` metadata, and mobile/desktop accessibility.

## Phase 4 — Acceptance Harness and Review

1. Add a permanent real-system validation script with full teardown.
2. Restart the app after server changes and run integration, migration drift,
   typecheck, build, responsive/tablet, auth, browser desktop/mobile, logs, and
   residue checks.
3. Run architecture/code review against every acceptance criterion and repair
   all blockers before completion submission.

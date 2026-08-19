---
name: Journey funnel transition authority
description: Funnel analytics for idempotent journey writes must rely on server-issued transition flags.
---

Journey funnel events must be emitted only from server-authoritative transition metadata, never inferred from a cached `isEnrolled`, `completedAt`, or local optimistic state.

**Why:** stale tabs and retries can successfully repeat idempotent start/progress writes. The database operation knows whether the row was newly inserted or a logical/journey completion truly transitioned; clients do not, so client inference silently inflates funnel counts.

**How to apply:** preserve atomic `created`, logical-step-transition, and journey-transition flags whenever changing journey start/progress endpoints. Keep same-user journey progress writes serialized and extend the concurrent API race gate if the response shape or completion semantics change.
---
name: Read-only browser capture guarantees
description: Principles for safe, comparable browser and Lighthouse evidence.
---

A capture that must not mutate an origin needs defense in depth:

1. Block non-safe HTTP methods at the browser target level. This covers pages,
   frames, popups, and workers, but not WebSocket handshakes.
2. Apply context-wide routing and startup guards to every page and popup.
   Page-only hooks do not cover every popup or worker realm.
3. Seal window APIs that can create sockets, workers, popups, or service-worker
   registrations. A realm that cannot be sealed must not be allowed to exist.

Keep enforcement separate from attribution. Record sanitized initiator evidence
for refused operations; constructor counts, opaque worker URLs, and consent
state alone do not identify the responsible SDK. Do not create startup
exceptions from correlation.

Treat all refusal evidence as sensitive. Redact every URL-bearing value and
nested diagnostic at the persistence boundary, including worker, popup, socket,
and allowed-initialization records. Verify the complete serialized artifact.

Fault-injected cold captures are not normal-auth regression tests. Verify
sign-in, reload, refresh, and sign-out in a normal real-identity lane before
changing authentication code, and report that result independently.

For performance comparisons, compare like-for-like documents. A compiled shell
must retain equivalent semantic prerender content; an empty client root is not
comparable to a prerendered production navigation. Preserve failed and
exception-enabled artifacts as historical provenance, but do not promote them
to current performance status.
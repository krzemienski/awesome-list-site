---
name: og-middleware outage response shape
description: How og-middleware answers when route-meta resolution hits a DB outage — HTML shell for browsers, JSON for everything else.
---
During a bounded dependency failure, browser navigations (`Accept: text/html`) get the SPA shell with **HTTP 503 + Retry-After: 1**, which is stamped in the buffered res.end the same way the soft-404 is. The app boots and shows its own error card with a Retry action. Non-HTML requests still get the JSON 503.

**Why:** a raw JSON 503 document meant the client error/Retry branch could never render on a cold load. The `task302-resilience` cache-admission probe deliberately sends no Accept header and expects JSON.
**How to apply:**
- Keep both branches when touching that catch.
- Prove outages with a real `LOCK TABLE … ACCESS EXCLUSIVE` on a scratch DB (55P03 → 503), never mocks.

---
name: Client API shape drift
description: Hand-typed client interfaces for API responses can silently diverge from the real server shape; how to spot it.
---

Hand-written client TypeScript interfaces describing an API response are NOT verified against the server. React Query does no runtime validation, so a wrong hand-typed interface compiles clean while the real payload has a different shape.

**Symptoms of shape drift (list rendering):**
- React "Encountered two children with the same key" / "unique key prop" warning — the key expression resolves to `undefined` (field doesn't exist on the real object), so every item gets the same undefined key.
- Navigation/links land on `/something/undefined` — same missing field used in a URL.
- A child component renders blank titles/fields — the parent passed the wrong wrapper object as a prop.

**How to apply:** when you see those symptoms, do NOT trust the local interface. Cross-check it against the server's actual response type (e.g. the engine/route that builds the payload) and fix the client type + accessors to match. Prefer keying by a real DB id from the nested object over a top-level field that may not exist.

**Why:** these bugs are invisible to `tsc` because the lie is in the hand-authored type itself; only runtime/browser evidence exposes them.

**Request-payload variant:** the same drift happens in the other direction — hardening a server route to require strict types (e.g. `typeof x !== 'number'` → 400) silently breaks any client that still sends the raw input string from a text field. `JSON.stringify` bodies are untyped, so tsc can't catch it. When tightening server validation, sweep EVERY caller (admin tabs, scripts) and convert form-state strings with `Number(...)` at the call site; verify by intercepting the real UI request in a browser (route.fulfill a fake 400 so no paid job starts).

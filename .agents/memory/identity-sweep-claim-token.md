---
name: Identity sweep by claim token
description: Mechanical auth refactors must grep the semantic claim pattern, not the receiver variable name.
---

# Identity sweep by claim token

When mechanically migrating an auth identity shape (e.g. `req.user.claims.sub` → `req.dbUser.id`), sweep by the **semantic token** (`claims.sub`, `claims?.sub`, `.user?.claims`), never by the receiver name.

**Why:** a `req.user`-anchored sed missed three live authorization sites in this codebase because they spelled the receiver differently: `request.user?.claims?.sub` (param named `request`) and `(req as any).user?.claims?.sub` (cast to escape typing). tsc could not catch them — the old shape was optional-chained, so they silently evaluated to `undefined`/`""` at runtime: notification routes operated on an empty user id, and admin gates treated real admins as anonymous.

**How to apply:** after any identity-shape sweep, run a final grep for the OLD claim/property tokens across server/, tests/, scripts/ — including `as any` casts and every parameter alias — and require zero hits. Also grep tests for imports of deleted auth modules.

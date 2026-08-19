---
name: SPA guest route document gates
description: How server document-level auth gates interact with client-side guest state.
---

Routes that make a client-side decision from local state (for example, guest
saves in localStorage) must not be included in a server document-level
authentication redirect list. The browser must first receive the SPA shell so
the client can determine whether to show a guest experience or an auth prompt.

**Why:** A server 302 runs before React mounts. It cannot inspect the
browser-local entitlement and makes an otherwise correct client gate
unreachable.

**How to apply:** Keep the public document route outside protected-page
patterns, let the client route guard redirect visitors with no qualifying local
state, and keep every data-changing and account-data API endpoint behind its
existing server authentication middleware.
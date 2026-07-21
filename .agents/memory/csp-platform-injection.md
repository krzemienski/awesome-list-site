---
name: CSP vs platform-injected & runtime-inline scripts
description: Why prod CSP must allowlist replit-cdn.com and why runtime-created inline scripts die under nonce CSP
---

Two ways a strict nonce-based, production-only CSP silently breaks things that work in dev:

1. **Replit's deployment platform injects a feedback-widget script** (`https://replit-cdn.com/feedback-widget/widget.global.js`) into the served prod HTML. It is NOT in the repo source, carries no nonce, and cannot be removed — the only fix is allowlisting `https://replit-cdn.com` in `script-src` (+ `replit.com`/`replit-cdn.com` in `connect-src`). If the widget later spawns an iframe and the console shows a frame-src violation, add `frame-src https://replit.com https://replit-cdn.com` — but only reactively, after seeing a real violation on prod.

2. **Dynamically-created inline `<script>` elements never carry the nonce**, so any library bootstrap that does `document.createElement('script'); s.text = '...'` (the classic GA/gtag snippet) is blocked in prod only. Fix pattern: run the bootstrap as module code instead (`window.dataLayer = window.dataLayer || []; window.gtag = function(){ dataLayer.push(arguments); }`) — must be a regular `function` pushing the `arguments` object, not an arrow/rest, to match gtag.js expectations.

**Why:** dev has no CSP (NODE_ENV check), so both failures are invisible until a production build/publish; GA was dead in prod for months this way.

**How to apply:** after any CSP change or republish, load prod in a real browser and check the console for `Refused to`/CSP violations; verify `typeof window.gtag === 'function'` and that a page_view lands in `dataLayer`. A local `NODE_ENV=production node dist/index.js` reproduces the nonce CSP (but NOT the platform widget injection — that only exists on the live deployment).

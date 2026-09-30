---
name: Published home-SSR "Host must not be empty"
description: Clerk's publishableKeyFromHost runs at module evaluation and reads window.location.hostname; inside the SSR renderer that host is empty, so the import throws and the page silently falls back to the SPA shell.
---
`Host must not be empty` in production logs is Clerk deriving the publishable
key from the (absent) browser host while the SSR renderer bundle is being
imported. The renderer import rejects, the middleware logs it and serves the
SPA shell, so the site looks fine while home SSR is dead.

**Why:** the key resolution lived in App.tsx module scope; on the server there
is no `window`. The fix is to resolve the explicit `VITE_CLERK_PUBLISHABLE_KEY`
at module evaluation and throw a clear "missing key" configuration error when
it is absent — never a fake fallback key.

**How to apply:** if the message reappears after a publish, check that the
published bundle post-dates the fix (local production-mode boot of the current
build shows 0 occurrences). Diagnose it locally only: `vite build --ssr` to a
/tmp outDir with a fake non-secret key, then import the renderer; confirm the
missing-key path fails with the configuration error. Republishing is the
user's decision, not part of a verification pass.

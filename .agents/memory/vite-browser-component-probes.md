---
name: Vite browser component probes
description: Importing real unwired components for isolated browser verification
---

For browser-side isolated component probes, discover dependency URLs from the
running Vite-transformed module rather than guessing `/node_modules/.vite/...`.
Optimized CommonJS dependencies may expose React and ReactDOM through `default`,
not named exports.

**Why:** The Vite root is the client directory while dependencies live above it;
guessed URLs return the SPA shell, and namespace destructuring can leave
`createRoot` undefined.

**How to apply:** Inspect the served component and entry module import URLs;
use their exact runtime module identity for probes. Isolated probes do not
prove integrated shell wiring or production bundle reachability.
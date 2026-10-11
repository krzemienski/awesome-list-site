---
name: Vite transformIndexHtml query OOM
description: Why the dev server wedged/OOMed on home URLs with a query string, and the rule that prevents it.
---
Pass ONLY the pathname to `vite.transformIndexHtml` in the dev catch-all.

**Why:** with a query on "/" (`/?tags=x`, `/?utm_source=…`) Vite's devHtmlHook resolves the HTML filename to the existing `client/` directory, treats the URL as a real file, derives the inline-style proxy module's file as "/" and `watcher.add("/")`. Chokidar then crawls /nix/store, /mnt, /usr until the heap OOMs (~4.7 GB, event loop blocked, every request 30–60 s timeouts, DB pool starved). Re-crawling the workspace via its /mnt real path also produced bogus "every file changed" bursts and in-process Vite restarts, which looked like a platform snapshot problem but weren't.

**How to apply:** if the dev server wedges with high RSS, attach the inspector (`kill -USR1 <pid>`, CDP Debugger.pause on 127.0.0.1:9229) and sample stacks; a readdirp `_read/_formatEntry` stack means a bad watch root — log callers of `vite.watcher.add`.

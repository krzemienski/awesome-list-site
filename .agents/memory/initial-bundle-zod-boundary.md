
## Merged from the older "initial bundle zod-free" note
- If a shared module is needed in the shell, check its import chain for zod/drizzle first.
- To diagnose a bundle-budget failure, build the last successfully published commit in /tmp and compare initial module sets from `dist/public/bundle-modules.json` (normalize symlinked node_modules paths first).

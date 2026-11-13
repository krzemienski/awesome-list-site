Earlier entries: [docs/history/CHANGELOG-through-2026-11-12.md](docs/history/CHANGELOG-through-2026-11-12.md)

## B1 — 2026-11-13

- Removed the agent tooling from the repository: agent skill and memory folders, Codex and Oh-My-Pi configuration, MCP configuration, the TLA+ models, archived one-off scripts and data-fix receipts. The deploy scripts, `replit-deploy` skill and design-system sources stay.
- The build no longer runs a separate lint pass; it runs `tsc --noEmit`, then the Vite, SSR and server bundles.
- Moved `reports/`, `audit/` and the old changelog to `docs/history/` (renames only, nothing deleted). Kept three project notes under `docs/notes/`.
- Trimmed `CLAUDE.md`, `AGENTS.md`, `replit.md` and `README.md` to the product description, build gates, deploy procedure, audit-account convention and QA title prefix. The deploy pitfalls are now one section in `replit.md`.
- The `replit-deploy` visitor check now lists its four steps inline.

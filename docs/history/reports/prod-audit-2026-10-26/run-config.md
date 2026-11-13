# Run config — full UI experience audit (production)

- App: awesome.video (https://awesome.video). Platform: full-stack web (React/Vite + Express). Mode: team (pstack:swarm, opus workers).
- Threshold: zero-defects (0 findings of any severity + 2 clean confirmation passes). Binding; only the owner relaxes it.
- Max cycles: 10. Revision under audit at start: live f476d79c (main 54c08c71 = +docs only).
- Widths: 1440×900, 820×1180 touch, 390×844 touch.
- Coverage axes: light theme yes; dark/alt design systems yes (/settings/theme); reduced motion yes; keyboard yes; signed-out yes; member yes (owner account); admin yes (all 17 tabs, every control); fresh member sign-up not-supported (live Clerk, no throwaway account).
- Browser: agent-browser (own AGENT_BROWSER_SESSION per worker); chrome-devtools MCP (own isolatedContext) allowed where agent-browser cannot scroll or a Radix trigger needs real pointer input.
- Prod writes: only rows the run creates, titled `[QA-audit-1026]`, removed by id before the cycle ends. Owner-confirm list unchanged (no deleting real data, no approving real submissions, no secret changes, no force push).
- QA analytics windows are logged in PROGRESS.md (Replit tracker counts page views regardless of consent).
- Evidence: this directory (untracked; HARs and cookies never committed).

## Reflect items folded into this run (owner: "handle everything from the reflect")
- Accepted rows 1–18 → project skills `.claude/skills/replit-deploy`, `.claude/skills/verify` (PR). Row 19 → poteto-mode (plugin cache, local) + note upstream.
- Backlog: sign-out does not revoke owner cookie server-side (security); #42 ?page 404 vs hydrated listing; #43 publish-build guard; #44 deploy doc drift; #45 stale comment; model sheet line; memory Radix caveat; audit doc correction.

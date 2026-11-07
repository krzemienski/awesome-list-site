# prod-ops 2026-11-07: decisions (proposed; final once the owner answers APPROVAL.md §9)

| topic | decision | reason | pinned version / source |
|---|---|---|---|
| Run method | Brief run directly, not as a ProofPunk run | PP guards block the replit-deploy push Phase 5 needs (memory proofpunk-blocks-deploys) | ProofPunk 7.0.1 |
| Prior work | Built on the 07b pass and the 11-06 pass; re-checked them rather than redoing them | 07b ran on 60e07dcf; the only app diff to 1cd25ab0 is a dev-only CSP line | `git diff 60e07dcf 1cd25ab0 -- server/` |
| Tiering | 27 Primary, 14 Owner-critical, 49 Secondary, 15 Vestigial (`tiers.tsv`) | DOC counters, `/api/admin/usage` real/test split, audit log, nav reachability, owner use (APPROVAL §2) | revision 1cd25ab0 |
| Contract | Per deploy: 104 rows, 57 contracts. Weekly: 355 / 81. On change: 300 / 49. Retired: 1 row, 23 contracts | mapping rule in APPROVAL §3, computed by script into `tier-rows.tsv` | denominators: 760 rows (`prod-audit-2026-10-26/INVENTORY.md`), 210 registrations today (the "196" is not reproducible) |
| Usage source of record | First-party DOC counters (persisted under W1) for anonymous traffic; `/api/admin/usage` for members | the only sources that see visitors before consent, and that agents can read | `operationalTelemetry.ts:228-234` |
| Log source of record | App Storage sink via `/api/admin/logs`, plus Replit deployment logs once OAuth is done | unattended agent read proven (20,494 records) | `server/lib/logSinkStorage.ts` |
| PostHog | Plugin posthog@posthog **1.1.91**, MCP `https://mcp.posthog.com/mcp`. Project id and region unknown until OAuth. Write gate on; `POSTHOG_LLMA_CC_ENABLED` unset | read tools only before approval | `~/.claude/plugins/cache/posthog/posthog/1.1.91` |
| Redeploy flow | branch → PR → independent review → squash merge → replit-deploy → Tier 1 → 30-min watch → promote or roll back (APPROVAL §6) | the established deploy gate, plus a watch window and explicit rollback triggers | replit-deploy skill (repo `.claude/skills/replit-deploy`) |
| Self-healing | Supervised loop proposed; the autonomous loop not recommended | the owner dropped the autonomous loop on 2026-11-07 at 02:34Z after guard bypasses (PR #307) | APPROVAL §7, Decision 1 |
| Lane restarts | visitor (stalled 30 min, never started a browser), admin and member (idle, missed a nudge) were stopped and relaunched from their own lane files | the stall rule; no work was lost because the lane files were the checkpoint | PROGRESS.md 21:01Z, 21:21Z |
| Lead corrections | Withdrew visitor S-1 (robots has a Sitemap line) and S-3 (one meta description). Corrected the 07b claim that the anonymous recommendations GET calls Claude | live `curl` 2026-11-07 ~21:5xZ; code read `journeys-recommendations.ts:690-704` | APPROVAL §1 |

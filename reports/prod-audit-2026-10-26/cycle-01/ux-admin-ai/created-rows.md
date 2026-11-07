# ux-admin-ai — rows created on production

| what | id | details |
|---|---|---|
| research job | **68** | brief `[QA-audit-1026] smoke: find 1 new open-source video tool`, target 1, budget cap $0.30, max turns 10, all categories, server endpoint/models (router.hack.ski, cc/claude-opus-5, scout cc/claude-haiku-4-5-20251001). Launched 2026-10-26T09:39:04Z from the 820 run view; ended `budget_stopped` 09:39:36Z. |
| spend | — | **$0.3062** (costBasis `reported`), 3 turns. Total audit spend $0.3062, within the $0.40 limit. |
| discoveries | none | `/api/researcher/discoveries?jobId=68` → `[]`. Nothing to reject; nothing approved. |
| enrichment jobs | none | Start dialog opened, validated and cancelled only. |
| GitHub | none | One synchronous dry run `POST /api/admin/import-github {repoUrl: krzemienski/awesome-video, dryRun: true}` → 200, "Nothing was written." Sync queue 49 → 49, history 49 → 49. No import or export. |

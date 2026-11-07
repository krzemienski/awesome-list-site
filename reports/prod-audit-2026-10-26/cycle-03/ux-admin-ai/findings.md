# ux-admin-ai — cycle 03 (rev b89d3e4b) — ISSUES 1 LOW; AI-19..27 FIXED, AI-28 superseded by AI-29
(saved by lead from the auditor's final message). No side effects; dry runs only.

| id | sev | URL | width | saw | expected | evidence | source |
|---|---|---|---|---|---|---|---|
| AI-29 | Low | /admin/researcher budget < $1.32 | 1440 | warning "No run in the job history below saved a discovery for less than $1.32" but #2 $0.43 saved 5, #11 $0.46 saved 2, #9 $0.47 saved 1, #8 $0.67 saved 5 (costBasis null = estimated); figure appears to use reported-cost runs only | wording true for this deployment (include estimated costs, say "about"), or no number | r-1440-budget-warn-030.png | ResearchLaunchGuide.tsx |

## Re-checks: AI-19, 20, 21, 22, 23, 24, 25, 26, 27 FIXED (evidence pngs in folder). AI-28 → AI-29. AI-16 STILL-OPEN (owner/upstream). AI-18 UNVERIFIED-by-rule.
## UNVERIFIED: confirm/error flows at 820/390 (layout only there); real touch; keyboard/reduced motion; live run/cancel/approve flows; dry-run count accuracy.

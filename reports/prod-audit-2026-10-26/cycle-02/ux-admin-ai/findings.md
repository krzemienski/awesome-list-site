# ux-admin-ai — cycle 02 (rev c25cd76f, 16:56:54Z–17:21:22Z) — ISSUES 10 (1 MEDIUM, 9 LOW)
(saved by lead from the auditor's final message; harness refused the auditor's Write). No writes: research jobs 68, enrichment 33, sync history 49; dry runs only.

| id | sev | URL | width | saw | expected | evidence | likely source |
|---|---|---|---|---|---|---|---|
| AI-19 | Low | /admin/researcher | all | "Invalid discovery target…" alert stays after field fixed and Launch enabled; clears only on next Launch | error clears/re-validates on change | r-1440-stale-error*.png | ResearchLaunchGuide.tsx:190-193, :412 |
| AI-20 | Low | /admin/researcher?jobId=68 | all | budget-stopped 0-save run: "review the 0 saved discoveries" | zero-save wording | r-1440-run-68.png | ResearchRunView.tsx:54 |
| AI-21 | Low | /admin/enrichment | all | 33 "View Details" + 6 "Logs" buttons with no job id in name | names include job id (as Researcher/GitHub) | snapshot | BatchEnrichmentPanel.tsx:487-495, :997-1005 |
| AI-22 | Low | /admin/enrichment Custom endpoint | 1440 | http://example.com + token: Start enabled, confirm doesn't name endpoint or warn plain http; Researcher requires insecure-http checkbox and names host | parity with Researcher | en-1440-confirm-http.png | BatchEnrichmentPanel.tsx:160-162, :1250-1254 |
| AI-23 | Medium | /admin/github Preview import | all | "Warnings (1254)": 1,243 false-positive `Use "GitHub" instead of "github"` from URLs; the one real taxonomy-merge warning is item 1,254; count lacks thousands separator | lint ignores URLs; taxonomy warnings first/separate; formatted count | gh-1440-preview-plan.png, github-dryrun-response.json | server/validation/awesomeLint.ts:294-301; GitHubImportPreview.tsx:97-104 |
| AI-24 | Low | /admin/github preview nonexistent repo | 1440 | "File not found: README.md in <repo>" though the repo is 404 | "Repository not found (or not public)" | gh-1440-preview-missing-repo.png | server/github/client.ts:153,160 |
| AI-25 | Low | /admin/github Pull after failed preview | 1440 | confirm says preview could not plan, but "Start Import" enabled | disable or "Start anyway" when current-target preview had runError | gh-1440-pull-dialog-missing-repo.png | GitHubSyncPanel.tsx:688-721 |
| AI-26 | Low | /admin/github | all | Sync jobs ID column mixes "Run #N"/"Job #N" with overlapping numbers, no dates; Recent Sync Jobs shows no ids | one id scheme / type-qualified, id+date in both lists | gh-1440.png, gh-1440-more.png | export-link-health.ts:546, :596 |
| AI-27 | Low | /admin/github More → Sync Status | all | static "Last Export" summary card is role="alert" | role="status" or none | eval [role=alert] | ui/alert.tsx:28; GitHubSyncPanel.tsx:449 |
| AI-28 | Low | /admin/researcher budget <$1.25 | all | warning claims "cheapest run that saved a discovery cost $1.14"; prod history: #2 $0.43 saved 5, #11 $0.46 saved 2, #9 $0.47 saved 1 | copy true for this deployment (derive from data) or hedged | r-1440-budget-warn-030.png | ResearchLaunchGuide.tsx:41-44, 305-307; docs/AI-SERVICES.md:365 |

## Cycle-1 re-checks: AI-01..15, AI-17 FIXED (AI-14 launch path UNVERIFIED-by-rule); AI-16 STILL-OPEN (upstream README "RTMPRTSPHTTP Protocol Servers", subcategory 2233 — owner decision); AI-18 UNVERIFIED-by-rule (needs real Pull).
## Passed: brief validation, base-URL preflight cases, launch confirm focus/cancel at 3 widths, history, deep links (64, 99999, invalid ids), enrichment dialogs, GitHub preview plan + error state + reset, Pull dialogs cancel, no element <44 at 820/390, no overflow, no console errors.
## UNVERIFIED: real touch input; AI-18; AI-14 launch; dry-run 799 updates realness; AI-22 server behaviour; keyboard order/reduced motion; live-run/enrichment cancel and discovery approve/reject (none active).

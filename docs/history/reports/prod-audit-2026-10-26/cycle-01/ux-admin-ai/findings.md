# ux-admin-ai — Admin AI tabs UX audit (Researcher, Research, Enrichment, GitHub)

- Auditor: ux-validator-5 · agent-browser session `ux-admin-ai` · owner session (role admin confirmed via `/api/auth/user`)
- Revision: start `229f004d6cf10eea93a69bf3120d3f66fda7de99` (live 2026-10-26T09:23:54Z), end `229f004d6cf10eea93a69bf3120d3f66fda7de99` (09:48:32Z)
- UTC window: 09:23:54Z – 09:48:32Z
- Verdict: **ISSUES** (no blocker; 1 Medium functional, rest Low/Medium UX)
- Widths: 1440×900, 820×1180, 390×844. Touch flag could not be enabled in agent-browser (`set device "iPad Air"` gives iPad UA but `maxTouchPoints 0`, `pointer: coarse` false). Admin CSS has no pointer/hover media queries and no hover-only controls in these tabs, so geometry is the same; real touch input is UNVERIFIED.
- Tall viewports (e.g. 1440×2200, 820×2400) were used for below-fold clicks only; widths unchanged.

## Findings

| id | sev | tab | width | saw | expected | evidence | likely source |
|---|---|---|---|---|---|---|---|
| AI-01 | Medium | Researcher (run view) | 820 (repro ×2) | "Relaunch with a higher cap" hides the run view and shows the guide, but focus lands on `BODY`; budget field not focused. Manual `#budget.focus()` works. | Focus moves to the Budget cap field (`focusBudget`), as the code intends | live eval after click at 0.2/0.5/1/2 s: `{"f":"BODY","guideHidden":false}`; `r-820-run68-ended.png` | `ResearcherTab.tsx:330-334` (`pendingGuideFocus` effect → rAF `focusBudget`), `ResearchLaunchGuide.tsx:70-75` |
| AI-02 | Medium | Researcher (launch guide) | all | Budget cap accepts $0.30 with no warning, but a $0.30 cap is consumed by the first orchestrator turns: run #68 stopped at budget in 0:32 (3 turns, 0 searches, scout aborted); run #65 did the same ($0.3213, 0:23). The guide only shows "Past runs cost $0.15–$75.23". | Guide warns when the cap is below what a run needs to get past planning (a minimum, or "runs under ~$X usually stop before searching") | `/api/researcher/jobs/68` → `budget_stopped`, cost 0.3062, turnsUsed 3, events "Scout #1 aborted: 0 searches"; job #65 same pattern | `ResearchLaunchGuide.tsx:293-318` |
| AI-03 | Low | Researcher (run view) | all | Spend meter reads "$0.3062 of $0.30" (#68), "$0.3213 of $0.30" (#65), bar pinned full; hint says "The run stops when it reaches this spend." | Copy names it a soft cap ("may overshoot slightly"), or meter marks overshoot | `r-820-run68-ended.png`; meters text | `ResearchRunView.tsx` meters; `ResearchLaunchGuide.tsx:298` |
| AI-04 | Medium | GitHub | all | No dry-run/preview in the UI. "Pull" confirm says resources "may be updated" with no counts; the API dry run of the same repo says it would add 36 and update **737** resources. | Pull dialog offers a preview, or shows dry-run counts before "Start Import" | `github-dryrun-response.json`; `rg -i dry.?run client/src` → no matches; `gh-1440-pull-dialog-ownerrepo.png` | `GitHubSyncPanel.tsx:648-687`; API `server/routes/domains/export-link-health.ts:1293` |
| AI-05 | Low | GitHub | all | After editing Target Repository (under More) to `owner/repo`, the card header still names `krzemienski/awesome-video` next to Pull/Sync now; only the confirm dialog names the real target. | Header or buttons reflect the draft target ("Pull from owner/repo"), or mark the draft as differing | eval: title `krzemienski/awesome-video` while Pull dialog says "pulls … from owner/repo" | `GitHubSyncPanel.tsx:249-252` (C4-V5B-01 comment) |
| AI-06 | Low | GitHub | all | Clearing Target Repository disables Pull and Sync now with no message (`aria-invalid=false`, no error text). | Inline reason, e.g. "Enter a repository" | eval on `''` → `pullDis:true`, no `text-repo-url-error` | `GitHubSyncPanel.tsx:276-334` |
| AI-07 | Low | Enrichment | all | Batch size `2.5` passes validation (no error, buttons enabled); dialog then says "batches of 2" (silent `parseInt` truncation). | Same guard as the API (`Number.isInteger`), with the 1–50 integer error | eval `2.5` → `inv:false, startDis:false`; `en-1440-confirm-2.5.png` | `BatchEnrichmentPanel.tsx:135-136,155` |
| AI-08 | Low | Enrichment | all | Advanced Base URL accepts `not a url` with no client validation; Start opens the paid-job dialog (server would 400 in dialog). | Inline URL validation before the confirm dialog | eval: no `aria-invalid`, no alert; `en-1440-confirm-badurl.png` | `BatchEnrichmentPanel.tsx:630-645` |
| AI-09 | Low | Enrichment | all | "Last enriched 101d ago · batch #32 · 0 entries" while jobs #33/#34 today enriched 30 and 10 resources (cancelled, 100% OK); last "completed" batch processed nothing. | Stat reflects the last batch that enriched resources (or says "last completed") | `en-1440.png`, details table ("10/10 OK", "Nothing to process") | `BatchEnrichmentPanel.tsx:420-428` |
| AI-10 | Low | Enrichment | 820 | Job History "View Details" buttons cut at right edge (button 678–813 in a 738px box); nested scrollers (`max-h-[400px] overflow-auto` > `relative w-full overflow-auto`, 788 vs 738) with no name/role. | Columns fit, or the scroll region is named/focusable like the Researcher table | `enrichment-820-open.png`; eval chain | `BatchEnrichmentPanel.tsx:842`; `components/ui/table.tsx:9` |
| AI-11 | Low | GitHub | 390 | "Last Export" date chip (146–342px) overflows its alert box (57–327px), touching the card edge. | Chip wraps under the title inside the box | `github-390-more.png`; eval rects | `GitHubSyncPanel.tsx` last-sync Alert (~411-470) |
| AI-12 | Low | Research | 820, 390 (touch) | Note-open buttons for one-line titles are 43px tall (305×43 / 226×43). | ≥44px touch target | measure eval at 820 and 390 | `ResearchWorkspace.tsx:107-122`, note CSS in `queues-agent.css` |
| AI-13 | Low | Researcher | all | Two identically named "Load more (20 of 67)" buttons once the history disclosure is open (compact table + full history), both loading the same list. | One control, or distinct names ("Load more jobs in compact table" / history) | eval: `button-show-more-research-jobs` and `button-load-more-jobs` both "Load more (20 of 67)" | `ResearcherTab.tsx:449-462, 801-810` |
| AI-14 | Low | Researcher | all | Following a launched run does not put `?jobId=68` in the URL (stays `/admin/researcher`), so the live run view can't be shared or bookmarked; deep links do work. | URL reflects the followed run | eval after launch: `url:"https://awesome.video/admin/researcher"` | `ResearcherTab.tsx` follow effect (~318-327) |
| AI-15 | Low | Researcher | all | Compact jobs table renders every cost in red accent (`td.accent`) incl. $0.15; red reads as error/over-budget. Full history shows the same costs neutral. | Neutral cost text; red only for over-cap | `r-1440-initial.png`, `r-1440-history.png` | `ResearcherTab.tsx` (`td className="mono accent"`) |
| AI-16 | Low (data) | Researcher run view / catalog | all | Subcategory chip "RTMPRTSPHTTP Protocol Servers": the live subcategory name lost its slashes (scout text says "RTMP/RTSP/HTTP servers"). | "RTMP/RTSP/HTTP Protocol Servers" | `/api/subcategories` → `'RTMPRTSPHTTP Protocol Servers'`; `r-1440-run-64.png` | catalog data (import slugging), not the run view |
| AI-17 | Low | GitHub | all | Focusable unnamed scroll containers: Recent Sync Jobs ScrollArea viewport (`tabindex=0`, no role/label) and the Sync jobs table wrapper (`tabindex=0` though not scrollable at 1440). | Named region (`role=region`, `aria-label`) only when scrollable | eval `.ops-github-panel [tabindex="0"]` | Radix ScrollArea use in `GitHubSyncPanel.tsx`; global tabindex shim |

Observation for the lead (another lane's artifact, not filed): the live Researcher **Focus** select lists a category `[QA-audit-1026] category`, created by another auditor and visible in production.

## PASS (driven, with evidence)

- Launch guide steps 1–5 render at 1440/820/390 with no horizontal page scroll (`sw == cw` at each width; `r-1440-initial.png`, `r-820-initial.png`, `researcher-390.png`).
- Validation messages (all `role=alert`, focus stays on Launch): brief <10 chars; budget 0 and −1; turns 2.5; target 0 and 1001. Inline hints turn amber.
- Advanced fields: toggle `aria-expanded`; model override → step 4 shows "1 OVERRIDE", summary re-queries (scout "inherits the orchestrator model"); plain-http base URL shows the insecure-http checkbox and preflight error "Could not resolve host: example.invalid"; Launch disabled with "Launch is blocked until the configuration issue above is fixed."
- Launch confirm dialog: text names limits + host; Cancel and Escape both close it and return focus to Launch.
- Live run #68 at 820: focus moves to "Research run #68" heading; timeline Planning → Scouting; live region "Phase: Scouting, 1 scout searching." then "Run stopped at budget. 0 discoveries to review."; focus to "Review discoveries"; ending alert + "Relaunch with a higher cap"; jobs table total updated to 68.
- Existing run views #64 (completed), #65 (budget), #66 (cancelled): timeline, scouts, meters, ending copy, discoveries with status/verification chips, event log (38/66 events, 44×44 detail toggles), agent graph SVG.
- Missing job `?jobId=99999`: "There is no research run #99999…" + Start another run.
- History disclosure: Review Discoveries (empty state "No pending discoveries to review"), Job History, Load more (limit=20→40, "Showing latest 40 of 67"), job details dialog (#64), Escape returns focus to its eye button.
- Research tab: 4 notes, note dialog, "Review candidates for job #64" → `/admin/researcher?jobId=64`, Escape returns focus to the note button; run #68 appears as NOTE 01.
- Enrichment: stats, jobs table, Logs dialog (#34), Show all 33 / Show fewer, batch size 0/51/empty/−3 → inline `role=alert` and both Start buttons disabled; start dialog shows scope (2,737 resources, 274 batches, ~$15.98) → Cancel and Escape close it and return focus; no job started.
- GitHub: repo validation error for "not a repo"; Pull and Sync now confirm dialogs (Escape / Cancel, focus returns); reset button; More/Less; Logs dialog (Run #4) with focus return. Sync queue 49 / history 49 unchanged after.
- GitHub dry run (API, once): 200 in 10.9 s, `dryRun:true`, "Dry run of …: an import would add 36 and update 737 resources. Nothing was written." Queue/history counts unchanged (49/49).
- Target size: no failures at 820/390 except AI-12; all buttons/inputs/tabs 44px.
- Keyboard: Tab order through guide → table region → Show more → disclosure → skip link/header is logical, with a visible ring on every stop; Select opens with Enter and changes with ArrowDown+Enter; radio checks with Space.
- Reduced motion: `prefers-reduced-motion: reduce` collapses animations/transitions to 0.01 ms; discovery list items render with no transform.
- Contrast (sampled, alpha-blended): 4.72–7.97 for muted text, th, timeline labels, chips (10px chip 4.76).
- Console: no errors or warnings on all four tabs + run view (capture verified with a probe warning).

## UNVERIFIED

- Cancel-run confirm dialog on a **live** run: #68 hit its $0.30 cap 5 s after reaching scouting (09:39:36Z), before the cancel click landed; the one-run limit stops a retry. Dialog copy is from source only.
- Reject-discovery dialog and the run-view Approve/Reject buttons: no pending discoveries exist (#68 saved none); no rejection was made, and none was needed.
- Enrichment cancel-job dialog (no active job).
- Real touch input (see header); radio arrow-key selection (synthetic keyup arrives before Radix's timer-based roving focus, so this result is not trustworthy).
- "Start from a generated brief" (paid brief generation; not run).
- Running/streaming state of the job-details dialog, and the event log of a live run beyond its first 30 s.

# Production research and deployment

## R1/R3: Replit integration and deployment route

Chosen route: GitHub `main` → Replit workspace → Autoscale. Use SSH for a fast-forward-only sync when available; otherwise use one Agent `update_app_using_prompt` sync-only/write-no-code brief, then read-only `ask_question` until the workspace is idle, clean and at the target. Install and run dev-only `npm run db:push` only when the live→target diff needs them. Run the build precheck, then MCP `get_publish_status` → `publish_app`. Prove cutover with `/api/version == origin/main`, readiness and browser behavior—not an MCP success response.

Why the alternatives lose: publishing snapshots the Replit workspace rather than GitHub, so a GitHub-only publish cannot be correct; SSH cannot trigger Publish; `update_app_using_prompt` is paid and may create workspace-only commits, so it is only the sync fallback, never a code-editing mechanism. MCP has no raw deployment-log/build-id/rollback endpoint. Use Agent `ask_question` for quoted logs and Publishing → History/logs for authoritative inspection and rollback. `/api/version` is the application revision, not Replit's build id.

- Official MCP endpoint and tools (`publish_app`, `get_publish_status`, `ask_question`, `update_app_using_prompt`): https://docs.replit.com/platforms/mcp-server.md
- Publish/Autoscale and production verification: https://docs.replit.com/build/publish-your-app.md and https://docs.replit.com/features/publishing/deployment-types.md
- Logs, deployment secrets vs workspace secrets, republish after secret changes: https://docs.replit.com/help/deployment-and-publishing.md
- `[deployment]` build/run and `.replit` configuration: https://docs.replit.com/features/project-setup/configuration.md
- Package Firewall (default-on, no setting; blocks flagged installs): https://docs.replit.com/features/security/package-firewall.md
- Development vs production databases and publish-time schema application: https://docs.replit.com/features/data-and-storage/development-and-production.md

The configured `[postMerge]` runs `scripts/post-merge.sh` (`npm install` + `npm run db:push`) with a 90-second timeout; it does not replace the diff-conditional manual-pull steps. Deployment C required the owner's Publishing schema review for migration 0059, so each later batch must recompute its schema diff rather than assume MCP publish is always sufficient.

Current tooling gaps: `awesome-replit` does not resolve; the Agent sync-only fallback is therefore active. This session has no production `DATABASE_URL`, so direct SQL evidence is blocked. Replit MCP is registered and authenticated through the Claude CLI (not mounted directly in OMP). A read-only `get_publish_status` for app `71ccccc7-37f7-4f07-a880-5973ae4aa911` returned deployment `b112b7e1-f0c4-49e1-8590-681f3b849f42`, status `success`, URL `https://awesome.video`.

## Researcher runs on production (2026-10-26)

Every run below ran on `https://awesome.video` against the deployed configuration. No override was used except where a row says so. Evidence paths are relative to `evidence/`.

## Resolved configuration

`GET /api/researcher/config` and the first log line of every run reported the same configuration. It contains no secret value.

| Field | Value | Source |
|---|---|---|
| Endpoint | `router.hack.ski` | `ANTHROPIC_BASE_URL` |
| Credential | router via ANTHROPIC_BASE_URL | `ANTHROPIC_AUTH_TOKEN` (presence only) |
| Orchestrator | `cc/claude-opus-5` | `ANTHROPIC_MODEL` |
| Scout | `cc/claude-haiku-4-5-20251001` | haiku tier via `ANTHROPIC_DEFAULT_HAIKU_MODEL` |
| Preflight | ok | |

Evidence: `p0-researcher-config.json`, `c1/b-job64-t1.json`.

## Runs

| Run | Width | Purpose | Outcome | Turns | Cost | Discoveries |
|---|---|---|---|---|---|---|
| #64 | 1440 | Proof run on the default config | completed | 9 of 40 (orchestrator; equals SDK `num_turns`) | $1.3245 of $3.00, `cost_basis` reported | 2 saved: #2043 MediaMTX (approved, became public resource 190342), #2044 SRS blog (rejected with a QA reason) |
| #65 | 390 | Budget stop | `budget_stopped` at the $0.30 cap | | $0.3213 | 0 |
| #66 | 820 | Cancel through the confirm dialog | finishing (cancelled) | 3 (orchestrator only; 3 scout turns excluded) | $0.2753, `cost_basis` lower_bound | 0 |
| #67 | 1440 | QA brief that asked for placeholder saves | completed; the orchestrator refused to save fabricated URLs | | $0.1508 | 0 |

Total research spend: $2.07. Enrichment jobs 33 (30 resources, $0.2102) and 34 (10 resources, cancelled, $0.0408) ran on the shared resolver with the haiku model; the cost is stored in `metadata.agent.estimatedCostUsd` and shown in the admin enrichment panel. Run total: $2.32.

## What each run proved

- **#64 (B1–B5, C1–C4, C7).** The run record and first log line name the router host, "router via ANTHROPIC_BASE_URL", the orchestrator model and the scout model, with no token. Phases ran planning → scouting → verifying → saving → finishing. Each `scout_end` paired with its `scout_start` by task and tool-use id. Both saved URLs passed the scout-URL gate, and the stored URLs equal the `save_discovery` inputs. The UI meters matched the database ("9 of 40", "$1.3245 of $3.00"). Approving #2043 in place made resource 190342 public, and the header count went from 3,824 to 3,825 in the same tab.
- **#65 (B13, C5, C8).** The run ended inline with "Budget cap reached ($0.30)" and a "Relaunch with a higher cap" button (192×57 at 390). With reduced motion on, `document.getAnimations()` stayed empty.
- **#66 (B12, C3).** Live at 820, the timeline advanced and two scouts showed "SEARCHING…". The confirm-dialog cancel ended as "finishing (cancelled)", and the UI shows the cost as a lower bound.
- **#67 (U1/U2).** The orchestrator refused to save fabricated discoveries, so the failure paths for a bad save could not be triggered without fake data. They stay unexercised by design.

## Refusals proven without creating a run

| Case | Response |
|---|---|
| Second concurrent start | 409 `RESEARCH_JOB_ACTIVE`, naming run #65 |
| Plain-http base URL override with a token, unconfirmed | 400 `insecure_http_unconfirmed`, no job row |
| Base URL with a query string | 400 "Base URL must not contain a query string or fragment" |
| Unsupported scout model | 400 `unsupported_scout_model` |
| `?jobId=` for a missing run | "There is no research run #…", "Start another run", polling stops after two 404s |

## Not proven on production

- **B10, missing env variable fails before launch.** Proving it needs a deployment secret removed from production, which is on the owner-confirmation list. It was proven on dev in PR #28.
- **U3, stall timer.** The deploy logs over this run show no "stall" lines, so the timer path never fired.

## Production rows this work created

research_jobs 64–67, research_discoveries 2043 (approved) and 2044 (rejected), resource 190342 (public; the owner decides whether to keep it), enrichment_jobs 33 and 34. The full table and cleanup status are in `PROGRESS.md`.

## Extended researcher proof (2026-10-27)

| Run | Model | Actual duration | Turns | Cost | Saved discoveries / terminal reason |
|---|---|---:|---:|---:|---|
| #68 | router default | short smoke | 3/10 | $0.3062 | 0; stopped at budget |
| #69 | cx/gpt-6-astra | 1m46s | 10/80 | $0.4199 | 0; completed |
| #70 | cx/gpt-6-astra | under 30m | 18/80 | $1.1166 | 0; completed |
| #71 | gc/grok-4.7 | 5m55s | 41/200 | $3.3100 | 9; shared web-search budget exhausted |
| #72 | glm/glm-5.3 | 3s | 1/200 | $0 | 0; provider 402 credits exhausted |
| #73 | gc/grok-4.7 | 10m51s | 155/200 | $5.4603 | 4; shared web-search budget exhausted |
| #74 | cx/gpt-6-astra | 3m08s | 13/600 | $0.5650 | 0; empty search results and no direct-fetch tool |
| #75 | cx/gpt-6-astra | 6m11s | 93/600 | $1.2973 | 0; partial top-level coverage ledger |
| #76 | cx/gpt-6-astra | 5m38s | 28/600 | $0.7600 | 0; partial five-pass ledger |
| #77 | gc/grok-4.7 | 22m11s | 140/600 | $7.9741 | 9; completed below the requested duration |
| #78 | cx/gpt-6.1-sol | 1m20s | 8/600 | $0.2914 | 0; partial first-subcategory ledger |
| #79 | gc/grok-4.7 | cancelled during launch correction | 5/40600 | $0 lower bound | 0; cancelled after the numeric field appended 40 to 600 |
| #80 | gc/grok-4.7 | 14m25s | 2 reported (prior-round usage was lost on terminal error) | $3.0430 actual across two rounds; $0.0878 incorrectly persisted | 13; stopped at the $3 budget before 30 minutes |
| #81 | cx/gpt-6-astra | 5s | 1/600 | $0 | 0; provider 429 quota reset after 136h19m |
| #82 | cx/gpt-6-luna | about 5m before the combined deployment restart | 0 persisted | $0 persisted; actual usage unavailable after orphaning | 3; orphaned by server restart |
| #83 | cx/gpt-6-luna | active; relaunched 2026-10-27T16:18Z with a 30-minute minimum | active, cap 600 | active, cap $3 | pending |

Total research/enrichment spend through #80: **$26.8638 of $30**. Structured events, agent graphs, turns, costs and pending-discovery source URLs were inspected in the real production UI. Run #73 discovery #2054 was approved as public resource **190359**; audit entry **27553** says “AI researcher approval: discovery #2054 (research job #73)”. The signed-out resource page loaded with no admin API requests and the catalog increased from 3,825 to 3,826.

The owner's latest instruction reinstated the mandatory **30-minute minimum per model**. Run #80 proved real scouts, 524 structured events and 13 discoveries, but its second continuation consumed the remaining budget and stopped at 14m25s; it is not a duration PASS. It also exposed terminal-error accounting loss: the first round cost $2.9552 and the second $0.0878, while only the latter was persisted. PR #122 preserves prior-round usage on subsequent continuation errors. Run #81's Astra attempt failed without spend on a provider quota reset. Luna run #82 saved three discoveries before the combined deployment restarted and orphaned its worker, so run #83 is the stable duration attempt on the final revision. The duration criterion remains **OPEN** until timestamps prove at least 30 minutes.
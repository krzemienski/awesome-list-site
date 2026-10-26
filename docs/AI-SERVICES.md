# AI Services

Reference for the AI features in the Awesome Video Resource Viewer. All AI code
lives under `server/ai/`; HTTP handlers are registered in domain files:
enrichment + researcher routes in `server/routes/domains/ai-jobs.ts`,
single-URL Claude analysis in `server/routes/domains/admin-content.ts`, and
recommendation routes in `server/routes/domains/journeys-recommendations.ts`
(all composed by `registerRoutes` in `server/routes.ts`).

AI is **optional**. Every service degrades gracefully when its API key is
missing — the app keeps working, and AI-only actions return a clear
"unavailable" response instead of crashing.

## Providers & keys

| Provider | Used for | Key env vars (first match wins) |
|----------|----------|---------------------------------|
| Anthropic Claude | Enrichment, tagging, single-URL analysis, recommendations text, research/enrichment agents | Router: `ANTHROPIC_BASE_URL` + `ANTHROPIC_AUTH_TOKEN` (bearer) — then `AI_INTEGRATIONS_ANTHROPIC_API_KEY`, then `ANTHROPIC_API_KEY` |
| OpenAI | Vector embeddings (semantic similarity) | `AI_INTEGRATIONS_OPENAI_API_KEY`, then `OPENAI_API_KEY` |

Optional custom endpoints: `AI_INTEGRATIONS_ANTHROPIC_BASE_URL`,
`AI_INTEGRATIONS_OPENAI_BASE_URL`. Encrypted per-run agent config uses
`CONFIG_ENCRYPTION_KEY` (see `server/ai/configCrypto.ts`).

### Single source of truth: `server/ai/anthropicConfig.ts`

Every Claude call — the direct Messages API (`@anthropic-ai/sdk`) **and** the
Claude Agent SDK subprocess behind the Researcher / Enrichment agents —
resolves endpoint, credential and model ids through this one module.

Credential precedence (first match wins; a resolved set carries exactly one
secret, never both):

1. **Router** — `ANTHROPIC_BASE_URL` + `ANTHROPIC_AUTH_TOKEN` (bearer). A base
   URL with `ANTHROPIC_API_KEY` instead is also accepted explicitly.
   A base URL with **no** credential is treated as *not configured* (fail
   closed — it never falls through to the options below).
2. **Managed** — `AI_INTEGRATIONS_ANTHROPIC_API_KEY` + `_BASE_URL`.
3. **Direct** — `ANTHROPIC_API_KEY` against api.anthropic.com.

Model tiers map through env: `ANTHROPIC_DEFAULT_HAIKU_MODEL`,
`ANTHROPIC_DEFAULT_SONNET_MODEL`, `ANTHROPIC_DEFAULT_OPUS_MODEL`,
`ANTHROPIC_DEFAULT_FABLE_MODEL` (router ids look like `cc/claude-opus-5`);
unset tiers fall back to first-party ids. `ANTHROPIC_MODEL` is the primary
model and drives the Researcher orchestrator. Which tier each flow uses lives
in `FLOW_TIERS` (URL analysis / tagging / recommendations / enrichment /
scout = haiku, journey seeding = sonnet, orchestrator = `ANTHROPIC_MODEL`).

Agent SDK runs get a purpose-built subprocess env (`buildAgentEnv`): every
credential key is stripped, then only the resolved router URL + bearer are
re-added. Per-run admin overrides win — a custom base URL only ever travels
with the admin-supplied token (platform credentials never reach a custom
host), and a token-only override always targets `ANTHROPIC_BASE_URL`, even
when the server has no credential of its own; with `ANTHROPIC_BASE_URL` unset
a token-only override is refused (400 at launch, and the env builder throws)
rather than sent to api.anthropic.com.
Subagents (scout) are given the tier **alias** (`haiku`), which the CLI maps
through `ANTHROPIC_DEFAULT_HAIKU_MODEL`; a literal custom id would be
rejected by the CLI's per-agent allowlist. Structured JSON responses use
`createStructuredMessage`: `zodOutputFormat(schema).schema` as the input
schema of one `strict: true` tool, forced with `tool_choice` +
`disable_parallel_tool_use`, then validated with zod (no regex JSON scraping).

**The Researcher does not use these fallbacks.** Research runs resolve their
configuration strictly in `server/ai/researchRunConfig.ts` (see "Research
agent" below): a missing `ANTHROPIC_BASE_URL`, `ANTHROPIC_AUTH_TOKEN`,
`ANTHROPIC_MODEL` or scout tier variable refuses the launch instead of
falling back to another credential source or a first-party model id. Every
other flow (enrichment, URL analysis, tagging, recommendations) keeps the
shared resolver unchanged.

`GET /api/health/ai` (admin shape) returns `config` — a secret-free snapshot
(endpoint kind/host, tier models, per-flow models) that the Researcher and
Enrichment panels use for their placeholders. `?deep=1` performs a real
round-trip. Unit coverage: `tests/unit/anthropic-config-precedence.test.ts`.

- Embeddings: **`text-embedding-3-small`** (1536 dimensions).

## Module map (`server/ai/`)

| File | Responsibility |
|------|----------------|
| `claudeService.ts` | Singleton Claude client: caching, rate limiting, SSRF-safe URL analysis, cost tracking |
| `enrichmentService.ts` | Batch enrichment job queue + processing (singleton `enrichmentService`) |
| `tagging.ts` | `generateResourceTags()` — Claude-based tag generation |
| `urlScraper.ts` | `fetchUrlMetadata()` — fetch page title/description/OG/favicon |
| `embeddingService.ts` | OpenAI embeddings + cache (singleton `embeddingService`) |
| `recommendationEngine.ts` | Personalized recommendations, hybrid AI + rule-based scoring (singleton `recommendationEngine`) |
| `recommendations.ts` | Recommendation scoring helpers + `generateAIRecommendations()` |
| `researchService.ts` | AI research agent that discovers new candidate resources (singleton `researchService`) |
| `webResearch.ts` | `WebResearchService` helper used during research |
| `agentRuntime.ts` | Agent config parsing, model resolution, base-URL validation/preflight |
| `agentEvents.ts` | Structured agent event log (`research` / `enrichment` jobs) |
| `runAgentQuery.ts` | Thin wrapper over `@anthropic-ai/claude-agent-sdk`'s `query()` |
| `configCrypto.ts` | Encrypt/decrypt per-run agent credentials |
| `promoteEnrichmentSuggestions.ts` | Promote accepted enrichment suggestions onto resources |

## ClaudeService — core client

`server/ai/claudeService.ts` exposes the singleton `claudeService`
(`ClaudeService.getInstance()`). Notable public methods:

- `isAvailable()` — true when an Anthropic key is configured.
- `generateResponse(prompt, systemPrompt?, model?)` — core completion call.
- `analyzeURL(url)` — SSRF-guarded fetch + Claude analysis of a page.
- `generateEmbedding(text)` — delegates to the embedding path.
- `batchProcess(...)` — process multiple prompts with concurrency control.
- `testConnection()` — makes one tiny live call to verify connectivity.
- `getStats()` / `getCostStats()` / `resetCostStats()` — cache + cost telemetry.
- `calculateCost(model, inputTokens, outputTokens)` / `clearCache()`.

**Caching (in-memory Maps, LRU-style eviction):** a response cache (~1 hour TTL)
for repeated prompts and an analysis cache (~24 hour TTL) for URL analysis.

**Rate limiting & safety:** requests are throttled with a minimum interval, and
`analyzeURL` blocks private/loopback/link-local targets (SSRF protection) before
fetching. Cost is accumulated per model in `getCostStats()`.

## EnrichmentService — batch enrichment

`server/ai/enrichmentService.ts` (singleton `enrichmentService`) runs enrichment
as background jobs backed by the `enrichment_jobs` / `enrichment_queue` tables.

- `queueBatchEnrichment(options)` — create a job and start processing.
- `getJobStatus(jobId)` / `getActiveJobIds()` — progress + processed/failed
  counts.
- `cancelJob(jobId)` — stop a running job (partial progress is preserved).

Enrichment fills in metadata (title/description cleanup, Open Graph / favicon
data via `urlScraper.ts`, AI tags via `tagging.ts`, and taxonomy hints).
Enrichment work can also run through the Claude Agent SDK
(`@anthropic-ai/claude-agent-sdk`) with events streamed to `agentEvents.ts`.

## Embeddings (OpenAI)

`server/ai/embeddingService.ts` generates 1536-dim `text-embedding-3-small`
vectors for semantic similarity, with an in-memory cache. `isAvailable()`
returns false (and features are skipped) when no OpenAI key is set.

## Recommendations

`server/ai/recommendationEngine.ts` (singleton `recommendationEngine`) produces
personalized recommendations using a hybrid AI + rule-based approach with a
multi-factor score (skill match, goals match, resource-type match, popularity,
and semantic similarity when embeddings are available). `recommendations.ts`
holds the pure scoring helpers (`calculateSkillMatch`, `calculateGoalsMatch`,
`calculateTypeMatch`, `buildRecommendationReason`) plus
`generateAIRecommendations()` and rule-based
fallbacks. When AI is unavailable the engine falls back to rule-based scoring.

## Research agent

`server/ai/researchService.ts` (singleton `researchService`) runs an AI agent
(via `runAgentQuery.ts` → Claude Agent SDK) that searches the web for new
candidate resources and records them as **discoveries** for admin review.
One orchestrator (`ANTHROPIC_MODEL`) delegates web searches to up to two
parallel **scout** subagents (scout tier, WebSearch only) and owns four
in-process tools: `get_coverage_gaps`, `get_existing_resources`,
`check_duplicate`, `save_discovery`.

Supporting modules:

| Module | Role |
|---|---|
| `researchRunConfig.ts` | Strict endpoint / credential / model resolution + preflight |
| `researchPhases.ts` | Typed `phase` / `scout_start` / `scout_end` events |
| `delegationTracker.ts` | One start + one end per delegation, web searches per scout, concurrency cap |
| `researchDedup.ts` | URL normalization, project-level near-duplicates, mid-run refresh |
| `usageCost.ts` | Lower-bound cost from streamed per-model usage when no SDK result arrives |
| `shared/researcherContract.ts` | Types shared by server, admin UI and the guided researcher view |

### Run configuration (no silent fallbacks)

With the launch form's advanced fields empty, a run uses exactly:

| What | Source | Missing → |
|---|---|---|
| Endpoint | `ANTHROPIC_BASE_URL` | launch refused (`missing_env`) |
| Credential | `ANTHROPIC_AUTH_TOKEN` (bearer) | launch refused; `ANTHROPIC_API_KEY` is not used for research |
| Orchestrator model | `ANTHROPIC_MODEL` | launch refused |
| Scout model | `haiku` alias → `ANTHROPIC_DEFAULT_HAIKU_MODEL` | launch refused (the CLI would otherwise silently pick its own model) |

Per-run overrides go through the same rules:

| Override | Runs as | Refused when |
|---|---|---|
| Base URL + token | the override URL with the override token | no token (`override_token_required`); plain `http://` without `allowInsecureHttp: true` (`insecure_http_unconfirmed`); invalid or private host, or a query string or fragment in the URL (`invalid_base_url`) |
| Token only | `ANTHROPIC_BASE_URL` with the override token | `ANTHROPIC_BASE_URL` unset (`missing_env`) |
| Orchestrator model | the given id | — |
| Scout model = orchestrator model | `inherit` | — |
| Scout model = tier alias (`haiku`, `sonnet`, `opus`, `fable`) | that alias | its `ANTHROPIC_DEFAULT_<TIER>_MODEL` is unset (`missing_env`) |
| Scout model = the id a `ANTHROPIC_DEFAULT_<TIER>_MODEL` maps to | that tier's alias | — |
| Any other scout model id | — | always (`unsupported_scout_model`): the CLI's per-agent allowlist would swap it for its own default |

Overrides are labelled as overrides in the job row (`resolved_config`), the
first log line, the API and the admin UI. The launch dialog asks for
`allowInsecureHttp` with a checkbox. `resolved_config.endpoint.baseUrl` is
recorded without credentials, query string or fragment (an override URL with
either is refused). When the agent
starts, the runner checks that the subprocess env's endpoint host equals
`resolved_config.endpoint.host` and refuses the run otherwise; the agent log
then records `Agent endpoint: <host>`.

The run row stores the resolution as `research_jobs.resolved_config`
(migration 0058), and the first agent-log line states it, for example:

```
Research started. Endpoint router.hack.ski (router via ANTHROPIC_BASE_URL) · Orchestrator cc/claude-opus-5 (ANTHROPIC_MODEL) · Scout cc/claude-haiku-4-5-20251001 (haiku via ANTHROPIC_DEFAULT_HAIKU_MODEL). Budget: $1.5, …
```

### Accounting

- **Turns** — the SDK result's `num_turns` when a result arrives; otherwise
  the orchestrator's distinct API turns (assistant `message.id`s with no
  `parent_tool_use_id`) seen in the stream. Scout turns are left out because
  `maxTurns` limits the orchestrator only; counting them showed cancelled runs
  as "50 of 40" turns. The result event's `detail.streamed` records both
  `turns` (orchestrator) and `api_messages` (all agents).
- **Tokens** — streamed usage deduplicated by `message.id` (the SDK repeats a
  turn's usage on every content-block message).
- **Cost** — `research_jobs.cost_basis` says where `estimated_cost_usd` came
  from: `reported` (SDK `total_cost_usd`), `lower_bound` (a cancel/abort
  emits no result, so the cost is priced from the agents' streamed per-model
  usage) or `unknown` (no model that ran has a known price). The streamed
  usage takes each message's final `message_delta` counts
  (`includePartialMessages`): assistant messages only carry the
  `message_start` snapshot, which put 52 output tokens next to the SDK's 5,317
  on job 3. Even with full token counts the stream misses model calls made
  inside tools (WebSearch), so it is only a lower bound: on job 6 it priced
  to $0.5174 against the reported $1.1390 for the same run (tokens matched:
  3,726 vs 3,716 out). Prices in `usageCost.ts` come from
  https://platform.claude.com/docs/en/about-claude/pricing (read 2026-10-25).
  The admin UI shows "lower bound" next to such costs.
- **Discovery target** — reaching "Stop after N" no longer aborts the SDK
  query. Further saves are refused, the orchestrator is told to end its turn,
  and the SDK's own result (real turns + cost) closes the run. An abort after
  90 s is only a backstop.

### Researcher run contract (for the guided researcher view)

**`GET /api/researcher/config`** (admin) — what a launch would use, resolved
exactly as `POST /api/researcher/start` resolves it. Optional query params
preview overrides: `model`, `scoutModel`, `baseUrl` (validated like start),
`hasAuthToken=1`, `allowInsecureHttp=1`. The token itself is never sent.

```json
{
  "success": true,
  "config": {
    "version": 1,
    "endpoint": { "host": "router.hack.ski", "baseUrl": "https://router.hack.ski", "scheme": "https", "source": "env" },
    "credential": { "source": "env", "label": "router via ANTHROPIC_BASE_URL", "tokenLast4": null },
    "orchestrator": { "model": "cc/claude-opus-5", "source": "ANTHROPIC_MODEL" },
    "scout": { "value": "haiku", "model": "cc/claude-haiku-4-5-20251001", "source": "ANTHROPIC_DEFAULT_HAIKU_MODEL" },
    "overrides": { "baseUrl": false, "authToken": false, "model": false, "scoutModel": false, "insecureHttp": false },
    "preflight": { "ok": true, "issues": [] }
  }
}
```

`preflight.issues[]` items are `{ code, message, variable? }` with `code` one
of `missing_env`, `override_token_required`, `insecure_http_unconfirmed`,
`invalid_base_url`, `unsupported_scout_model`. `POST /api/researcher/start` returns the same `config` on
success, and on a refused launch returns
`400 { success: false, code, message, config }` without creating a job.
`GET /api/researcher/jobs/:id` includes `resolvedConfig` and `costBasis`.

**Events** — `GET /api/researcher/jobs/:id/events?afterSeq=N` returns
`agent_events` rows ordered by `seq`. Besides the existing types, research
runs emit:

| `eventType` | `actor` → `targetActor` | `detail` |
|---|---|---|
| `phase` | `orchestrator` | `{ phase, previous, trigger, outcome? }` |
| `scout_start` | `orchestrator` → `scout` | `{ scoutIndex, taskId, toolUseId, description, concurrent }` |
| `scout_end` | `scout` → `orchestrator` | `{ scoutIndex, taskId, toolUseId, status, durationMs, webSearches, candidateUrls }` |

- `phase` ∈ `planning` (run start, `get_coverage_gaps`,
  `get_existing_resources`), `scouting` (a scout started), `verifying`
  (`check_duplicate`), `saving` (`save_discovery`), `finishing` (always last;
  `outcome` is the terminal status: `completed`, `cancelled`,
  `budget_stopped` or `failed`). Phases repeat as the orchestrator moves
  between gaps; an event is emitted only on change.
- `scout_end.status` ∈ `completed`, `failed`, `aborted` (still running when
  the run stopped). Every `scout_start` gets exactly one `scout_end`.
- `trigger` values: `run_started`, `scout_started`, `tool:<name>`,
  `run_ended`, `run_error` (the agent query threw: budget-cap error result or a failure).

### Engine findings (October 2026)

Sources read: Anthropic, "How we built our multi-agent research system"
(https://www.anthropic.com/engineering/multi-agent-research-system);
LangChain open_deep_research (https://github.com/langchain-ai/open_deep_research,
now archived); GPT-Researcher (https://github.com/assafelovic/gpt-researcher);
Stanford STORM (https://github.com/stanford-oval/storm); dzhng/deep-research
(https://github.com/dzhng/deep-research); Jina node-DeepResearch
(https://github.com/jina-ai/node-DeepResearch); Hugging Face open deep research
(https://huggingface.co/blog/open-deep-research); Agent SDK sessions
(https://code.claude.com/docs/en/agent-sdk/sessions).

Adopted:

- **Parallel scouts, capped at 2.** Gaps are independent searches, the case
  Anthropic's write-up says multi-agent wins on; open_deep_research also caps
  concurrency (`max_concurrent_research_units`) and answers overflow with an
  error instead of queueing. The cap is enforced in the PreToolUse hook
  (`maxConcurrentDelegations`), and each delegation must target a different
  gap so scouts do not repeat searches (Anthropic's vague-brief finding).
- **Structured scout reports.** Scouts end with a JSON candidate list
  (`url, title, description, fits_gap, source_type, maintained`), following
  the typed outputs every surveyed project uses. `save_discovery` only accepts
  URLs that appeared in a scout report this run, so the "never fabricate"
  rule is enforced server-side, not only prompted.
- **Stronger dedup.** `check_duplicate` refreshes known URLs from rows added
  after the run started (another run's saves, new submissions) and reports
  `sameProjectAs` when the catalog or queue already has the same GitHub/GitLab
  project or its GitHub Pages site (dzhng's `visitedUrls`, the
  open_deep_research unique-URL rule). The known-URL set can lag, so
  `save_discovery` re-reads `resources` and `research_discoveries` for the
  exact normalized URL before it inserts. If that read fails, the save is
  refused with `retry: true`; it never falls back to the in-memory set.

  Accepted limits:
  - *Check-then-insert race.* There is no lock between that read and the
    insert. Only one research run is admitted at a time
    (`admitResearchJob`), so two runs cannot race each other. A manual
    submission landing in that gap can still produce one duplicate
    `pending_review` discovery. Approval re-checks the normalized URL against
    `resources` and refuses it (409), so it never becomes a duplicate
    resource. A per-URL advisory lock in `save_discovery` would not close
    this: submissions do not take that lock.
  - *Near-duplicates inside the refresh window.* `sameProjectAs` comes from
    the in-memory set, which refreshes at most every 5 s, so it can miss a
    same-project URL saved moments earlier. It is advice to the model; the
    save gate checks the exact normalized URL, and admins review every
    discovery.
  - *Unindexed save-time lookup.* That lookup is `ILIKE '%host/path%'` on
    both tables, which cannot use the `url` index. It runs once per save
    (`check_duplicate` uses the in-memory set), over about 2k resources and
    a small discovery table, so it costs a few ms. The proper fix is a stored
    normalized-URL column with an index (a migration). That column also
    fixes stored rows whose URL spells the host or default port differently
    from the normalized form, which this pattern misses.
- **Phase / scout events** derived from the message stream at no extra model
  cost (dzhng `onProgress`).
- **Confidence rubric** in the orchestrator prompt (primary source,
  maintained, fills a gap, depth; penalties for listicles/content farms and
  same-project hits), after Anthropic's source-quality heuristics. No
  separate judge pass: admins already review every discovery.

Rejected:

- **Session resume after a restart.** `resume` needs the CLI transcript on
  the same machine (Autoscale instances do not share it) and the in-process
  MCP bridge does not survive a restart; replaying a run cut off mid-delegation
  is also unsafe. The orphan watchdog keeps marking such runs failed; saved
  discoveries survive.
- **LLM source curation / judge pass** (GPT-Researcher's curator is off by
  default, costs a call per batch, and the admin queue already reviews).
- **Embedding similarity for near-duplicates** — the project-key match covers
  the observed repo-vs-docs case without a vector dependency.

Budget: none of the surveyed projects publishes a dollar or turn limit for an
Opus-class orchestrator; all cap iterations. Measured on `cc/claude-opus-5`
with haiku scouts (2026-10-25): one saved discovery cost $1.14 in 8 turns
(job 6, target 1); a target of 2 hit a $1.50 cap after 11 turns ($1.59
reported, job 3). Most of the spend is the orchestrator re-reading its large
cached system prompt (taxonomy + saturated domains) every turn. The launch
form now defaults to a $3.00 cap and 40 turns (was $1.00 / 15, which cannot
finish even a two-discovery run).

### SDK versions (October 2026)

`@anthropic-ai/claude-agent-sdk` 0.3.310 and `@anthropic-ai/sdk` 1.3.0.

- sdk 1.0.0's only breaking change is the default API version 2026-10-21
  (`anthropic-version` header); its types drop `temperature`/`top_p`/`top_k`
  from Messages params. The app sends none of them. `zodOutputFormat` from
  `@anthropic-ai/sdk/helpers/zod` (zod 4), `strict: true` tools, forced
  `tool_choice` with `disable_parallel_tool_use`, and `authToken` +
  `apiKey: null` are unchanged (installed `CHANGELOG.md`, `client.d.ts`,
  `resources/messages/messages.d.ts`).
- agent-sdk 0.3.272 → 0.3.310: `AgentInput` still has `run_in_background`,
  `model` and `isolation` (the PreToolUse sync-delegation rewrite still
  applies); `PreToolUseHookSpecificOutput` still takes `updatedInput` and
  `permissionDecision`; `task_started` still carries `subagent_type` and now
  `tool_use_id`; the result still has `num_turns`, `total_cost_usd`, `usage`,
  `terminal_reason`. The package ships no CHANGELOG; the typings diff
  (`sdk.d.ts`, `sdk-tools.d.ts`) is the record. The GitHub releases page
  (https://github.com/anthropics/claude-agent-sdk-typescript/releases, read
  2026-10-25) lists two default changes in 0.3.302: fork subagents are on by
  default, and an omitted `permissionMode` starts in `default` on third-party
  providers. The researcher passes `permissionMode: "bypassPermissions"` and an
  explicit `agents: { scout }`, and real runs after the upgrade still delegate
  to `scout`.

### Single loop or subagents (October 2026)

Anthropic's article "Building agents: When to fold subagents into your main
agent loop"
(https://claude.com/resources/articles/building-agents-when-to-fold-subagents-into-your-main-agent-loop)
and its kit (https://github.com/anthropics/single-agent-loop-kit) recommend
folding most subagents into one loop that loads skills and tools on demand.
They keep a subagent only when it earns its own context: large reads, parallel
or independent exploration in fresh contexts, or tool overload.

The kit's audit (`skill/steps/00-audit.md`), applied to the researcher with
real run data, gives the scout the `as-tool` verdict:

- It works from one brief, returns a structured candidate list, and never
  talks to the user.
- Two scouts explore different gaps in parallel fresh contexts, which is the
  article's own example of a subagent worth keeping.
- Each scout call reads about 12k input tokens (lower bound from the event
  stream). The orchestrator reads about 117k–137k per run, most of it the
  cached system prompt.

So the scouts stay. Two gaps against the kit's `as-tool` guidance
(`skill/steps/04-as-tool.md`) are open, and neither is done yet:

- The scout result is not validated against a schema at the tool boundary.
  The kit wants every field checked, an empty reply treated as an error, and
  caveats carried to the main agent. Today the server only enforces that a
  saved URL appeared in a scout report.
- Cost is dominated by the orchestrator's long prompt. Moving the brief and
  rubric into skills or tool output loaded on demand is the larger lever.

Both changes need an eval to measure before and after (the kit starts with
about 10 golden tasks, 2–3 reps each). The project currently has no eval
tooling by owner decision.

## HTTP API surface

All routes are admin-only (`isAuthenticated` + `isAdmin`) unless noted.

**Single-URL analysis**
- `POST /api/claude/analyze` — analyze one URL (rate-limited via `aiLimiter`).

**Enrichment**
- `POST /api/enrichment/start`
- `GET /api/enrichment/jobs`
- `GET /api/enrichment/jobs/:id`
- `GET /api/enrichment/jobs/:id/events`
- `DELETE /api/enrichment/jobs/:id`
- `GET /api/admin/enrichment/coverage`
- `POST /api/admin/enrichment/backfill-suggestions`

**Research agent**
- `GET /api/researcher/config` — resolved run configuration + preflight (see "Researcher run contract")
- `POST /api/researcher/start`
- `GET /api/researcher/jobs`
- `GET /api/researcher/jobs/:id`
- `GET /api/researcher/jobs/:id/events`
- `DELETE /api/researcher/jobs/:id`
- `GET /api/researcher/discoveries`
- `POST /api/researcher/discoveries/:id/approve`
- `POST /api/researcher/discoveries/:id/reject`

**Recommendations** (public unless noted)
- `GET /api/recommendations/init`
- `GET /api/recommendations`
- `POST /api/recommendations`
- `POST /api/recommendations/feedback` *(authenticated)*
- `POST /api/recommendations/:resourceId/feedback` *(authenticated)*

**Health**
- `GET /api/health/ai` — reports AI availability. A deep check makes one tiny
  live Claude call to verify connectivity; do not point automated monitors at
  deep mode. (General app health is `GET /api/health`.)

## Graceful degradation

- No Anthropic key → `claudeService.isAvailable()` is false; enrichment,
  tagging, single-URL analysis, and the research agent return an unavailable
  status and the rule-based recommendation fallback is used.
- No OpenAI key → embeddings are skipped; similarity-based ranking falls back to
  the non-embedding factors.

## Related documentation

- [Admin Guide](./ADMIN-GUIDE.md) — Enrichment, Researcher, and Journeys tabs.
- [Architecture](./ARCHITECTURE.md) — where AI sits in the overall stack.
- [Environment](./ENVIRONMENT.md) — full env-var reference.

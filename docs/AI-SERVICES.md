# AI Services

Reference for the AI features in the Awesome Video Resource Viewer. All AI code
lives under `server/ai/`; all HTTP handlers live in the single file
`server/routes.ts` (registered via `registerRoutes(app)`).

AI is **optional**. Every service degrades gracefully when its API key is
missing — the app keeps working, and AI-only actions return a clear
"unavailable" response instead of crashing.

## Providers & keys

| Provider | Used for | Key env vars (first match wins) |
|----------|----------|---------------------------------|
| Anthropic Claude | Enrichment, tagging, single-URL analysis, recommendations text, research/enrichment agents | `AI_INTEGRATIONS_ANTHROPIC_API_KEY`, then `ANTHROPIC_API_KEY` |
| OpenAI | Vector embeddings (semantic similarity) | `AI_INTEGRATIONS_OPENAI_API_KEY`, then `OPENAI_API_KEY` |

Optional custom endpoints: `AI_INTEGRATIONS_ANTHROPIC_BASE_URL`,
`AI_INTEGRATIONS_OPENAI_BASE_URL`. Encrypted per-run agent config uses
`CONFIG_ENCRYPTION_KEY` (see `server/ai/configCrypto.ts`).

Models (as configured in code):
- Default Claude model: **`claude-haiku-4-5`** (`server/ai/claudeService.ts`,
  key `claude-3-5-haiku`; `claude-sonnet-4-5` is available for heavier work).
- Agent defaults (`server/ai/agentRuntime.ts`): research =
  `claude-sonnet-4-5`, enrichment = `claude-haiku-4-5`.
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
| `recommendations.ts` | Recommendation scoring helpers + `generateAIRecommendations()` / `generateAILearningPaths()` |
| `learningPathGenerator.ts` | Learning-journey generation (templates + AI) (singleton `learningPathGenerator`) |
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
`generateAIRecommendations()` / `generateAILearningPaths()` and rule-based
fallbacks. When AI is unavailable the engine falls back to rule-based scoring.

## Research agent

`server/ai/researchService.ts` (singleton `researchService`) runs an AI agent
(via `runAgentQuery.ts` → Claude Agent SDK) that searches the web for new
candidate resources and records them as **discoveries** for admin review.
Per-run model/base-URL/credentials come from `agentRuntime.ts` and are stored
encrypted (`configCrypto.ts`). Progress is emitted to `agentEvents.ts`.

## Learning path generator

`server/ai/learningPathGenerator.ts` (singleton `learningPathGenerator`) builds
structured learning journeys from category templates, optionally enhanced by
Claude, and falls back to template-only generation without a key. See the
**Journeys** admin tab and `/journeys` for the user-facing surface.

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

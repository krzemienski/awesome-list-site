---
name: Recommendations endpoint performance model
description: Why /api/recommendations can hang or run slow, and which costs are legitimate vs bugs.
---

# /api/recommendations performance model

The anonymous "Popular picks" page once hung forever on skeletons. Root causes and the
durable rules that came out of fixing it:

## Cold-start path must stay O(1) in DB queries
Anonymous requests (and any brand-new user) hit the **cold-start branch**, which returns
EARLY — before any Claude call. Its only real cost is ranking "popular" resources.

- **Rule:** rank popularity with ONE aggregate query over the interactions table, never a
  per-resource query in a loop / `Promise.all`.
- **Why:** the old code fired one interaction query per resource (~2k) concurrently. That
  does not just run slow — it exhausts the Postgres connection pool and the endpoint
  **hangs permanently** (every later request waits on a connection that never frees). A
  handful of early requests succeed, then it wedges. Symptom looked route-dependent/flaky
  but was pool starvation.

## learningPaths is computed but thrown away by the HTTP routes
`generateRecommendations()` returns `{ recommendations, learningPaths }`, but BOTH the GET
and POST `/api/recommendations` routes `res.json(result.recommendations)` only — they
discard `learningPaths`. Generating it makes a **blocking Claude call (~9s)** at every exit
point (cache-hit, cold-start, normal).

- **Rule:** callers that only need `recommendations` must pass `includeLearningPaths=false`
  (4th arg). The client never receives learningPaths from these routes anyway (it fetches
  learning paths from a separate query endpoint), so skipping it is safe.
- **Why:** left on, it added a wasted ~9s to every recommendations request and, combined
  with the N+1 above, made anonymous requests time out entirely.

## ~9s on the AUTHENTICATED non-cold-start path is legitimate, not a bug
Once a user has history, the request skips cold-start and calls
`generateClaudeRecommendations()` — a real Claude API call that *produces* the personalized
recommendations. That ~9s is the feature working. Do NOT try to "optimize" it away; it is
inherent. (Before the learningPaths fix this path was ~18s = two sequential Claude calls.)

**How to apply:** if recommendations are slow, first check WHICH branch you're in. Anonymous
should be <100ms (any slowness there = a reintroduced DB loop or an un-guarded learningPaths
call). Authenticated slowness is the AI recommendation call itself.

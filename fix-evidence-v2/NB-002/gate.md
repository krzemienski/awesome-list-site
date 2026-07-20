# NB-002 — AI cost amplification via unauthenticated learning-path endpoints

**Verdict: PASS** (July 20, 2026, dev live-system probes; server logs cross-checked)

## Fix
- `server/routes.ts`:
  - New `aiLimiter` (10 req / 15 min / IP, standardHeaders) on GET `/api/learning-paths/suggested`, POST `/api/learning-paths/generate`, POST `/api/learning-paths`.
  - GET `/suggested`: anonymous requests are **pinned to the boot-warmed default profile** (mirrors `warmDefaultSuggestedPaths()` exactly, limit fixed at 5, response sliced to requested limit). No unauthenticated input can mint a new generation cache key. Signed-in requests keep bounded personalization; `userId` now comes from the session, never the query string.
  - Both POSTs: `isAuthenticated` + `aiLimiter` + `sanitizeBodyProfile()` (field whitelist, enum clamps, array/length caps, session-forced identity). Raw client bodies no longer reach the generator.
- `client/src/components/ui/recommendation-panel.tsx`: legacy learning-paths POST query now `enabled` only when signed in (+ `response.ok` check, credentials include); guests see a sign-in prompt in the Learning Paths tab instead of a silent 401.

## Live probes (dev, 2026-07-20 ~06:50 UTC)
| # | Probe | Result |
|---|---|---|
| 1 | anon `POST /api/learning-paths/generate` novel goals | **401** in 0.4s (`anon-post-generate-401.json`) |
| 2 | anon `POST /api/learning-paths` novel cats/goals | **401** in 7ms (`anon-post-legacy-401.json`) |
| 3 | anon `GET /suggested` plain | 200 in **4.8ms** (`anon-get-plain.json`) |
| 4 | anon `GET /suggested?goals=NOVEL_PROBE_<ts>&skillLevel=advanced&categories=NOVEL_CAT_X&timeCommitment=daily&userId=spoofed-admin` | 200 in **6.7ms**, body **byte-identical** to #3 (`diff` empty) — no new cache key, no generation |
| 5 | 12 rapid anon GETs (novel `goals=SPAM_i` each) | first 10 → 200 (all 1–2ms, warm cache), then **429** |
| 6 | 429 headers | `RateLimit-Policy: 10;w=900`, `RateLimit-Limit: 10`, `RateLimit-Remaining: 0`, `Retry-After: 900` (`429-body.json`) |

## Server-log cross-check (no paid path from unauthenticated input)
Workflow log for the window shows **only** the boot warm ran Claude
(`✓ Suggested learning paths cache warmed: 3 paths in 28265ms`); every
novel-param anon GET logged `200 in 1–2ms` and the POST probes logged
`401 in 1ms`. Zero `Generating new Claude response` lines correlate with any
probe request.

## Cache-key note
`getSuggestedPaths` keys on `{c,s,g,t,l}` (no userId), so signed-in requests
with default params also hit the warmed entry; personalized keys are reachable
only behind auth + the 10/15min limiter.

## Signed-in path still works (post-restart, fresh limiter)
- Local admin login → 200.
- Authed `GET /suggested?limit=3` → **200 in 4.6s** (deduped into the in-flight boot warm — no extra generation run), 3 paths returned.
- Authed `POST /api/learning-paths` (sanitized body) → **200 in 1.1s** from warm cache.

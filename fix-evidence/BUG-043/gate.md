# VG-043 — "Total time spent" pinned at 0h 0m despite completions

**Verdict: PASS (fixed)**

## Fix
`GET /api/user/progress` (server/routes.ts) previously hardcoded
`totalTimeSpent: '0h 0m'`. There is no wall-clock tracking anywhere in the schema,
so the metric is now **computed as estimated learning time**:

- For each enrolled journey: midpoint of the journey's `estimated_duration`
  range (e.g. "10-12 hours" → 11h) × fraction of logical steps completed
  (journeys with `completedAt` count as full; steps grouped by `stepNumber`
  via `listJourneyStepsBatch` — up-to-3-rows-per-step shape respected).
- Summed across journeys, rendered as "Xh Ym".

Client (Profile.tsx) label changed from "Total time spent" to **"Estimated
learning time"** to match the definition, and the row hides at zero instead of
displaying a hardcoded "0h 0m".

## Documented definition
`totalTimeSpent` = Σ over enrolled journeys of
`midpoint(estimated_duration) × (completed logical steps / total logical steps)`,
with fully-completed journeys (`completedAt` set) counted at 100%.

## Live evidence (dev, admin user d460f5e7, July 20 2026)
- Baseline state (journey 10 completed 18/18 @ "10-12 hours" → 11h; journey 6 at
  1/18 of "8-10 hours" → 0.5h): API returns `totalTimeSpent: "11h 30m"` —
  exactly 11h + 30m. Profile renders "Estimated learning time: 11h 30m"
  (screenshot: `profile-estimated-time.png`).
- Cross-check with a second completion (journey 7 completed via real UI during
  the VG-042 probe; "15-20 hours" → 17.5h): API returned `totalTimeSpent:
  "29h 0m"` = 11.5h + 17.5h. Profile showed "Estimated learning time: 29h 0m".
  The audit's exact claim ("two completions still show 0h 0m") is disproven.
- After teardown the metric returned to "11h 30m" — value tracks real data.

tsc clean. No mocks; live API + rendered-UI probes.

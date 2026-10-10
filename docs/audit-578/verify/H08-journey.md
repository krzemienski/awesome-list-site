# H08 (journey half) — Missing journey pages report dead-link telemetry

**Status: FIXED and proven** in a real browser, desktop 1366px and 390px, 2026-10-09.

## Before
The resource page reported missing ids to the route monitor, but `/journey/:id` with a missing, draft or archived id rendered "not found" and reported nothing.

## Fix
`client/src/pages/JourneyDetail.tsx` calls the same route-monitor dead-link reporter the resource page uses (`client/src/lib/route-monitor.ts`, shared contract). It fires once, when the journey query resolves to 404 or the id is not a number.

Draft and archived journeys are indistinguishable from missing ones (B01), so they report too, without disclosing anything.

## Proof — `browser-public.mjs` → `out/browser-public.json` (`H08 …`)
Anonymous Chromium; console captured.

| Path | HTTP | Page | Telemetry |
|---|---|---|---|
| `/journey/2147483000` (missing) | 404 | "Journey not found." | `[route-monitor] dead link: {path: /journey/2147483000, referrer: null, ts: …}` |
| `/journey/30` (QA **draft** fixture) | 404 | "Journey not found.", no private text | `[route-monitor] dead link: {path: /journey/30, …}` |
| `/journey/not-a-number` | 404 | "Journey not found." | `[route-monitor] dead link: {path: /journey/not-a-number, …}` |
| `/journey/7` (published) | 200 | "Building Your First Streaming Platform" | none |

Identical at desktop and 390px.

Screenshots (opened and viewed): `screenshots/H08_journey_2147483000-{desktop,390}.png`, `H08_journey_30-*.png`, `H08_journey_not_a_number-*.png`, `H08_journey_7-*.png`.

## Cleanup
Draft fixture 30 deleted. Residue is 0 (see B01.md).

## Harness
All proof scripts and raw outputs are under `task581-harness/`. They read `DATABASE_URL`, `CLERK_SECRET_KEY` and `ADMIN_PASSWORD` from the environment, and none are stored. They were originally run from `.cache/b581/`.

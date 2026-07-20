# VG-042 — Current Learning Path shows a completed journey as "current"

**Verdict: PASS (fixed)**

## Fix
`GET /api/user/progress` (server/routes.ts) previously picked `currentPath` as the
most-recently-accessed journey regardless of completion. Now it selects the
most-recently-accessed **non-completed** journey (`completedAt IS NULL`), so a
journey the user just finished can never be presented as their current path.

## Live evidence (dev, admin user d460f5e7, July 20 2026)

State before probe: journey 7 "Building Your First Streaming Platform" active 0/18
(most recently accessed), journey 10 "DRM & Content Protection" COMPLETED 18/18,
journey 6 "Video Streaming Fundamentals" active 1/18.

1. **API baseline** — `currentPath: "Building Your First Streaming Platform"`
   (active journey, NOT completed journey 10 even though it has newer activity
   than journey 6). `completedResources: 1`.
2. **Regression trigger via real UI** (Playwright, chromium): completed all 6
   logical steps of journey 7 through the step buttons on /journey/7 —
   `badge-journey-completed` appeared. Journey 7 is now BOTH most-recently-accessed
   AND completed — exactly the state that reproduced the audit finding.
3. **Profile probe** — "Current Learning Path" showed **"Video Streaming
   Fundamentals"** (the remaining active journey), never journey 7:
   - visit 1: Video Streaming Fundamentals
   - after full reload: Video Streaming Fundamentals
   - after nav to /journeys and back: Video Streaming Fundamentals
   Screenshot: `profile-current-path-after-completion.png`.
4. **API during completed state** — `currentPath: "Video Streaming Fundamentals"`,
   `completedResources: 2`.
5. **Teardown (reversible, real UI)** — un-completed all 6 steps of journey 7 via
   the UI uncomplete buttons; `completedAt` clears when not all steps complete
   (LearningJourneyRepository sets `completedAt: allCompleted ? new Date() : null`).
   API back to baseline: `currentPath: "Building Your First Streaming Platform"`,
   `completedResources: 1`, `totalTimeSpent: "11h 30m"`. Net-zero data change.

No mocks; all probes against the running dev server + real DB via the real UI.

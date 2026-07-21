---
name: Journey step data shape (rows vs logical steps)
description: Learning-journey steps are stored as multiple rows per logical step; UI must group and completion must mark all rows.
---

# Journey steps: rows vs logical steps

A learning journey's "step" is **logical**, identified by `stepNumber`. The seed
(`server/cli/seedJourneyStepsForExisting.ts`, `resourcesPerStep = 3`) stores up
to **3 `journey_steps` rows per logical step** — one row per linked resource,
all sharing the same `stepNumber`, `title`, and `description`. So a 6-step
journey has up to 18 rows. `/api/journeys` exposes the correct logical count as
denormalized `stepCount`; `/api/journeys/:id` returns the raw `steps[]` rows
(length = row count, not logical count).

**Rule 1 — display:** any UI that counts or renders journey steps must group
`steps[]` by `stepNumber` (one card per logical step, listing all its resources)
and use the logical count. Using `steps.length` shows inflated counts (e.g. 18)
and triplicated step titles.

**Rule 2 — completion:** the backend
(`LearningJourneyRepository.updateUserJourneyProgress`) sets `completedAt` only
when **every non-optional row id** is in `completedSteps`. Therefore completing
a logical step in the UI must mark **all** of that step's underlying row ids,
not just one — otherwise an authenticated journey can reach "100%" in the UI but
never finalize server-side.

**Rule 3 — hydration:** the journey detail UI reads `step.resource` (id/title/
url/description) to render real clickable resource links. The API only carries
that field if `LearningJourneyRepository.listJourneySteps` **LEFT JOINs**
`resources` on `journeySteps.resourceId` and maps each row to `{ ...step,
resource }` (guarding `resource.id != null` so the leftJoin's all-null row
becomes `undefined`). Use LEFT (not INNER) JOIN — a step whose resource was
deleted must still appear, just without a link.

**Why:** found during E2E QA — detail page showed "18 steps"; a naive grouping
fix that marked only one row per step would have silently broken authenticated
journey completion. Separately, steps rendered with no resource links until
`listJourneySteps` was changed to hydrate the linked resource.

**How to apply:** when touching `client/src/pages/JourneyDetail.tsx` or any
journey progress code, preserve the group-by-`stepNumber` rendering, the
"mark all rowIds on complete" behavior, and the LEFT-JOIN resource hydration in
`listJourneySteps`.

**Rule 5 — the active progress path is a TOGGLE, and two divergent impls exist.**
`PUT /api/journeys/:id/progress` calls `LearningJourneyRepository.updateUserJourneyProgress`
(routes wires this one directly, bypassing `storage`). It **toggles**: sending a
stepId that is absent adds it; sending one already present **removes** it. So
un-complete IS a real feature — the UI renders "Completed — Undo" and re-PUTs the
same id to reduce progress and clear `completedAt`. A separate, append-only impl
lives in `UserFeatureRepository.updateUserJourneyProgress` (takes a
`listJourneySteps` param) but the route does NOT use it. **Gotcha for QA:** any
harness that marks a step and then re-marks it in a "mark all" loop will toggle it
back off (17/18 → never completes) — mark each unique step exactly once. To prove
completion, use a fresh user and mark each step id once.
**How to apply:** don't "fix" the toggle into append-only, and don't collapse the
two impls without checking which the route calls — the toggle is intentional.

**Rule 4 — admin step endpoints exist and RENUMBER destructively.** Full CRUD is
present (multi-line route signatures evade a naive single-line grep): `POST`
(adds one row at `stepNumber = max+1`), `PATCH`, `DELETE`, and
`POST .../steps/reorder`. Both `reorderJourneySteps` and the delete handler
reassign `stepNumber` **sequentially (1..N, one per row)** — this flattens the
3-rows-per-logical-step grouping into 18 distinct single-row steps and is **not**
reversible through the API (reorder always emits unique sequential numbers).
Reorder also requires the payload to list *every* step id exactly once.
**How to apply:** for net-zero QA on seeded journeys, capture the original rows
first (`SELECT id, step_number ... WHERE journey_id=N`) and restore `step_number`
via a direct DB `UPDATE ... CASE id` afterward — there is no unique constraint on
`(journeyId, stepNumber)`, so a plain CASE update works. There is no
create-journey endpoint, only step endpoints.

-- Journey 6 ("Video Streaming Fundamentals") stored its 18 resource rows under
-- 18 distinct step_numbers (1..18), so the group-aware UI rendered 18 logical
-- steps with every title triplicated. Every sibling journey (7-10) packs up to
-- 3 resource rows per logical step_number (1..6). This renumbers journey 6's
-- rows into the same 6-step shape: 1-3 -> 1, 4-6 -> 2, ... 16-18 -> 6.
--
-- Data-only, no schema change. Row ids are untouched, so user_journey_progress
-- rows (which key on journey_steps.id, not step_number) need no reconciliation.
--
-- Idempotency: the guard only renumbers while journey 6 still has more than 6
-- distinct step_numbers, so reruns after the fix are a no-op.
UPDATE "journey_steps"
SET "step_number" = ((("step_number" - 1) / 3) + 1)
WHERE "journey_id" = 6
  AND (
    SELECT COUNT(DISTINCT "step_number")
    FROM "journey_steps"
    WHERE "journey_id" = 6
  ) > 6;

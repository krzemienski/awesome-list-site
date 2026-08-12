import { z } from "zod";
import {
  LEARNING_FORMAT_VALUES,
  LEARNING_GOAL_VALUES,
  ONBOARDING_STATUS_VALUES,
  ONBOARDING_STEP_COUNT,
  SKILL_LEVEL_VALUES,
  TIME_COMMITMENT_VALUES,
} from "./onboarding-values";
export * from "./onboarding-values";

/**
 * Canonical learning-preference vocabulary.
 *
 * Category choices are intentionally not listed here: they are validated
 * against the live taxonomy by the API. Everything else is a stable,
 * controlled value shared by the client and server.
 */
const categorySchema = z
  .string()
  .trim()
  .min(1)
  .max(100);

export const learningPreferencesValuesSchema = z
  .object({
    preferredCategories: z.array(categorySchema).max(12),
    skillLevel: z.enum(SKILL_LEVEL_VALUES),
    learningGoals: z.array(z.enum(LEARNING_GOAL_VALUES)).max(6),
    preferredResourceTypes: z.array(z.enum(LEARNING_FORMAT_VALUES)).max(8),
    timeCommitment: z.enum(TIME_COMMITMENT_VALUES),
  })
  .strict();

export const completedLearningPreferencesSchema =
  learningPreferencesValuesSchema.extend({
    preferredCategories: z
      .array(categorySchema)
      .min(1, "Choose at least one topic")
      .max(12),
    learningGoals: z
      .array(z.enum(LEARNING_GOAL_VALUES))
      .min(1, "Choose at least one goal")
      .max(6),
    preferredResourceTypes: z
      .array(z.enum(LEARNING_FORMAT_VALUES))
      .min(1, "Choose at least one format")
      .max(8),
  });

export const learningPreferencesUpdateSchema = learningPreferencesValuesSchema
  .partial()
  .extend({
    // Clients send the monotonic row revision they edited. Null means they
    // observed no preference row; omitted remains for backward-compatible API
    // callers, while the first-party UI always sends a revision.
    expectedRevision: z.number().int().min(1).nullable().optional(),
    onboardingStatus: z.enum(ONBOARDING_STATUS_VALUES).optional(),
    onboardingStep: z
      .number()
      .int()
      .min(1)
      .max(ONBOARDING_STEP_COUNT)
      .optional(),
  })
  .strict();

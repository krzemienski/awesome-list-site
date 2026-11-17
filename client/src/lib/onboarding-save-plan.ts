import { completedLearningPreferencesSchema } from "@shared/onboarding";
import type { LearningPreferencesValues } from "@shared/onboarding-values";

export type PreferenceErrors = Partial<
  Record<keyof LearningPreferencesValues, string>
>;

/** The onboarding step that edits each preference field. */
const FIELD_STEP: Record<keyof LearningPreferencesValues, number> = {
  skillLevel: 1,
  preferredCategories: 2,
  learningGoals: 3,
  preferredResourceTypes: 4,
  timeCommitment: 5,
};

export type SavePlan =
  | { action: "send" }
  | { action: "block"; step: number; errors: PreferenceErrors };

/**
 * Decide whether a save that would write `onboardingStatus: "completed"` can
 * be sent. The server rejects a completed profile with an empty section (400),
 * so a save that cannot pass is blocked and the caller moves the member to the
 * first incomplete step instead of sending it. Saves that do not write a
 * completed profile (first run, dismissal) are never blocked here.
 */
export function planSave(
  values: LearningPreferencesValues,
  writesCompleted: boolean,
): SavePlan {
  if (!writesCompleted) return { action: "send" };
  const parsed = completedLearningPreferencesSchema.safeParse(values);
  if (parsed.success) return { action: "send" };

  const errors: PreferenceErrors = {};
  let step = Number.POSITIVE_INFINITY;
  for (const issue of parsed.error.issues) {
    const field = issue.path[0] as keyof LearningPreferencesValues | undefined;
    if (!field || !(field in FIELD_STEP)) continue;
    errors[field] ??= issue.message;
    step = Math.min(step, FIELD_STEP[field]);
  }
  return Number.isFinite(step)
    ? { action: "block", step, errors }
    : { action: "send" };
}

export const PREFERENCE_SECTION_TEST_IDS = [
  "preferences-section-skill",
  "preferences-section-topics",
  "preferences-section-goals",
  "preferences-section-formats",
  "preferences-section-time",
] as const;

/** Move focus to the first control of a step's section (after a blocked save). */
export function focusPreferenceSection(step: number): void {
  const section = document.querySelector<HTMLElement>(
    `[data-testid="${PREFERENCE_SECTION_TEST_IDS[step - 1]}"]`,
  );
  section
    ?.querySelector<HTMLElement>("button:not([disabled]), input:not([disabled])")
    ?.focus();
}

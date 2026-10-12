// Recommendation-quality and onboarding drop-off events (tracking-plan
// questions 6 and 7 in docs/ANALYTICS.md). Every helper goes through the
// shared, consent-gated `track()` so all four tools receive the same cleaned
// event. Properties are ids, counts and fixed choice values only — never
// resource titles, user-authored text or anything typed by the visitor.

import { track } from './analytics';
import {
  ONBOARDING_STEP_COUNT,
  type LearningPreferencesValues,
} from '@shared/onboarding-values';
import type { RecommendationFeedbackValue } from '@shared/recommendations';

/** `popular` = anonymous rule-based picks; `personalized` = signed-in results. */
type RecommendationSource = 'popular' | 'personalized';

/** Where a sign-in call to action on a recommendation surface was clicked. */
type RecommendationSignInPlacement =
  | 'recommendations_page' // guest card under the picks on /recommendations
  | 'panel_footer' // guest footer card inside the recommendations panel
  | 'panel_empty_state'; // guest empty state inside the recommendations panel

/** Which link on a recommended item was opened. */
type RecommendationLinkTarget = 'detail' | 'external';

const sourceFor = (signedIn: boolean): RecommendationSource =>
  signedIn ? 'personalized' : 'popular';

// ---------------------------------------------------------------------------
// Recommendations
// ---------------------------------------------------------------------------

/** Once per surface load, when results (or the empty state) are first shown. */
export const trackRecommendationsViewed = ({
  recommendationCount,
  signedIn,
  fromCache = false,
}: {
  recommendationCount: number;
  signedIn: boolean;
  fromCache?: boolean;
}) => {
  track('recommendations_viewed', {
    recommendation_count: recommendationCount,
    signed_in: signedIn,
    source: sourceFor(signedIn),
    from_cache: fromCache,
  });
};

/**
 * The visitor asked for new results: `refresh` = the Refresh button,
 * `retry` = a Try again after a failed, stale or empty load. Fired from the
 * click that starts the request, so it never adds a request of its own.
 */
export const trackRecommendationsRefreshed = ({
  trigger,
  signedIn,
  recommendationCount,
}: {
  trigger: 'refresh' | 'retry';
  signedIn: boolean;
  recommendationCount: number;
}) => {
  track(trigger === 'refresh' ? 'recommendations_refreshed' : 'recommendations_retried', {
    signed_in: signedIn,
    source: sourceFor(signedIn),
    recommendation_count: recommendationCount,
  });
};

/** A recommended item was opened. `position` is 1-based in the shown list. */
export const trackRecommendationOpened = ({
  resourceId,
  position,
  recommendationType,
  signedIn,
  linkTarget,
}: {
  resourceId: string | number;
  position: number;
  recommendationType: string;
  signedIn: boolean;
  linkTarget: RecommendationLinkTarget;
}) => {
  track('recommendation_opened', {
    resource_id: String(resourceId),
    position,
    recommendation_type: recommendationType,
    signed_in: signedIn,
    source: sourceFor(signedIn),
    link_target: linkTarget,
  });
};

/** Server-confirmed feedback change on a recommendation (`cleared` = removed). */
export const trackRecommendationFeedbackSaved = ({
  resourceId,
  feedback,
  previousFeedback,
}: {
  resourceId: number;
  feedback: RecommendationFeedbackValue | null;
  previousFeedback: RecommendationFeedbackValue | null;
}) => {
  track('recommendation_feedback_saved', {
    resource_id: String(resourceId),
    feedback: feedback ?? 'cleared',
    previous_feedback: previousFeedback ?? 'none',
  });
};

/** Server-confirmed restore of a hidden recommendation from the hidden list. */
export const trackRecommendationRestored = (resourceId: number) => {
  track('recommendation_restored', { resource_id: String(resourceId) });
};

export const trackRecommendationSignInClicked = (placement: RecommendationSignInPlacement) => {
  track('recommendation_sign_in_clicked', { placement });
};

// ---------------------------------------------------------------------------
// Onboarding
// ---------------------------------------------------------------------------

const stepProps = (stepNumber: number, stepName: string) => ({
  step_number: stepNumber,
  step_name: stepName,
  total_steps: ONBOARDING_STEP_COUNT,
});

/**
 * Number of answers given across all five questions: one skill level, one time
 * commitment, plus every selected topic, goal and format.
 */
const answerCount = (values: LearningPreferencesValues) =>
  2
  + values.preferredCategories.length
  + values.learningGoals.length
  + values.preferredResourceTypes.length;

/**
 * Choice values only (fixed option values and catalog category names). GA4
 * cannot store list parameters, so its half carries the lists as
 * comma-separated strings while the product tools keep real lists.
 */
const choiceProps = (values: LearningPreferencesValues) => ({
  answer_count: answerCount(values),
  skill_level: values.skillLevel,
  time_commitment: values.timeCommitment,
  topic_count: values.preferredCategories.length,
  topics: values.preferredCategories,
  learning_goals: values.learningGoals,
  resource_formats: values.preferredResourceTypes,
});

const gaChoiceParams = (props: Record<string, unknown>) => {
  const params: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    params[key] = Array.isArray(value) ? value.join(',') : value;
  }
  return params;
};

/** A step became visible (first load, Continue, Back, browser history). */
export const trackOnboardingStepViewed = (stepNumber: number, stepName: string) => {
  track('onboarding_step_viewed', stepProps(stepNumber, stepName));
};

/** Continue saved the step and moved forward. */
export const trackOnboardingStepCompleted = (stepNumber: number, stepName: string) => {
  track('onboarding_step_completed', stepProps(stepNumber, stepName));
};

export const trackOnboardingNavigatedBack = (fromStep: number, stepName: string) => {
  track('onboarding_navigated_back', {
    ...stepProps(fromStep, stepName),
    to_step_number: fromStep - 1,
  });
};

/** "Save and browse later" saved; `step_number` is the step it was left on. */
export const trackOnboardingSkipped = ({
  stepNumber,
  stepName,
  values,
  alreadyCompleted,
}: {
  stepNumber: number;
  stepName: string;
  values: LearningPreferencesValues;
  alreadyCompleted: boolean;
}) => {
  const props = {
    ...stepProps(stepNumber, stepName),
    answer_count: answerCount(values),
    already_completed: alreadyCompleted,
  };
  track('onboarding_skipped', props);
};

/** "Save preferences" on the last step was confirmed by the server. */
export const trackOnboardingCompleted = ({
  values,
  alreadyCompleted,
}: {
  values: LearningPreferencesValues;
  alreadyCompleted: boolean;
}) => {
  const props = {
    ...choiceProps(values),
    total_steps: ONBOARDING_STEP_COUNT,
    already_completed: alreadyCompleted,
  };
  track('onboarding_completed', props, { ga: { params: gaChoiceParams(props) } });
};

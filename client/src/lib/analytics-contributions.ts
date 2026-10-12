// Contribution and continue-learning events (catalog: docs/ANALYTICS.md →
// "Shared event catalog → Contributions and continue learning").
//
// Every helper goes through the shared consent-gated `track()`, so nothing is
// sent (or even loaded) before an analytics grant. Properties are ids, enums
// and counts only — never proposed edit text, search text or titles typed by
// the contributor.

import { track } from './analytics';

// ---------------------------------------------------------------------------
// Suggest-edit funnel: resource_edit_started → (ai_analysis_requested →
// ai_suggestions_applied) → resource_edit_submitted | resource_edit_cancelled.
// Product tools only, like the pre-existing resource_edit_submitted step, so
// the whole funnel lives in the same tools.
// ---------------------------------------------------------------------------

export type SuggestEditEntryPoint = 'resource_card' | 'resource_page';

interface SuggestEditInfo {
  resourceId: string | number;
  entryPoint: SuggestEditEntryPoint;
}

const editProps = ({ resourceId, entryPoint }: SuggestEditInfo) => ({
  resource_id: String(resourceId),
  entry_point: entryPoint,
});

/** The editable suggest-edit form opened for a signed-in visitor. */
export const trackResourceEditStarted = (info: SuggestEditInfo) => {
  track('resource_edit_started', editProps(info), { ga: false });
};

/** A confirmed (paid) AI analysis request settled. */
export const trackResourceEditAiAnalysisRequested = (
  info: SuggestEditInfo,
  outcome: 'succeeded' | 'unavailable' | 'failed',
) => {
  track(
    'resource_edit_ai_analysis_requested',
    { ...editProps(info), outcome },
    { ga: false },
  );
};

export const trackResourceEditAiSuggestionsApplied = (
  info: SuggestEditInfo,
  appliedFieldCount: number,
) => {
  track(
    'resource_edit_ai_suggestions_applied',
    { ...editProps(info), applied_field_count: appliedFieldCount },
    { ga: false },
  );
};

/** The dialog closed (Cancel, Esc, overlay or ✕) without a submitted edit. */
export const trackResourceEditCancelled = (
  info: SuggestEditInfo,
  state: { formChanged: boolean; aiSuggestionsApplied: boolean },
) => {
  track(
    'resource_edit_cancelled',
    {
      ...editProps(info),
      form_changed: state.formChanged,
      ai_suggestions_applied: state.aiSuggestionsApplied,
    },
    { ga: false },
  );
};

/** Server accepted the edit suggestion (name predates this module). */
export const trackResourceEditSubmitted = (
  info: SuggestEditInfo,
  state: { changedFieldCount: number; aiSuggestionsApplied: boolean },
) => {
  track(
    'resource_edit_submitted',
    {
      ...editProps(info),
      changed_field_count: state.changedFieldCount,
      ai_suggestions_applied: state.aiSuggestionsApplied,
    },
    { ga: false },
  );
};

// ---------------------------------------------------------------------------
// Contributions page (/contributions)
// ---------------------------------------------------------------------------

type ContributionKind = 'resource' | 'edit';

/** Type / status / sort select changed, or the debounced search settled. */
export const trackContributionFilterChanged = (
  change:
    | { filterType: 'type' | 'status' | 'sort'; filterValue: string }
    | { filterType: 'search'; queryLength: number },
) => {
  track(
    'contribution_filter_changed',
    change.filterType === 'search'
      ? { filter_type: 'search', query_length: change.queryLength }
      : { filter_type: change.filterType, filter_value: change.filterValue },
  );
};

export const trackContributionFiltersCleared = (activeFilterCount: number) => {
  track('contribution_filters_cleared', { active_filter_count: activeFilterCount });
};

/** Server confirmed the withdraw. */
export const trackContributionWithdrawn = (kind: ContributionKind, contributionId: number) => {
  track('contribution_withdrawn', {
    contribution_kind: kind,
    contribution_id: String(contributionId),
  });
};

export const trackContributionsPageChanged = (pageNumber: number, totalPages: number) => {
  track('contributions_page_changed', { page_number: pageNumber, total_pages: totalPages });
};

export const trackContributionPublicResourceOpened = (
  kind: ContributionKind,
  resourceId: number,
) => {
  track('contribution_public_resource_opened', {
    contribution_kind: kind,
    resource_id: String(resourceId),
  });
};

/** The submitted URL on a resource-submission card was opened. */
export const trackContributionExternalLinkOpened = (url: string) => {
  let linkDomain: string | undefined;
  try {
    linkDomain = new URL(url).hostname;
  } catch {
    linkDomain = undefined;
  }
  track('contribution_external_link_opened', {
    contribution_kind: 'resource',
    link_domain: linkDomain,
  });
};

export const trackContributionSubmitCtaClicked = (placement: 'header' | 'empty_state') => {
  track('contribution_submit_cta_clicked', { placement });
};

// ---------------------------------------------------------------------------
// Continue learning
// ---------------------------------------------------------------------------

export type ResumeSurface = 'continue_learning_page' | 'home_preview';

/**
 * Server confirmed the resume (idempotent start POST). Deliberately NOT
 * journey_started — that event is reserved for genuinely new enrollment.
 */
export const trackJourneyResumed = (resume: {
  journeyId: number;
  surface: ResumeSurface;
  hasNextStep: boolean;
  progressPercent?: number;
}) => {
  track('journey_resumed', {
    journey_id: String(resume.journeyId),
    surface: resume.surface,
    has_next_step: resume.hasNextStep,
    progress_percent: resume.progressPercent,
  });
};

type ContinueLearningCta =
  | 'recent_resource'
  | 'review_journey'
  | 'find_another_journey'
  | 'browse_available_journeys'
  | 'suggested_journey'
  | 'start_journey'
  | 'browse_resources';

export const trackContinueLearningCtaClicked = (
  cta: ContinueLearningCta,
  ids: { journeyId?: number; resourceId?: number } = {},
) => {
  track('continue_learning_cta_clicked', {
    cta,
    journey_id: ids.journeyId !== undefined ? String(ids.journeyId) : undefined,
    resource_id: ids.resourceId !== undefined ? String(ids.resourceId) : undefined,
  });
};

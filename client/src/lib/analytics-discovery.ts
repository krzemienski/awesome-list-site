import { getAnalyticsConsent, journeyOutcomeVendors, track } from "./analytics";

interface SearchPageAttempt {
  attempt_id: string;
  requested_page: number;
  trigger: "pagination" | "retry";
}

export function startSearchPageAttempt(
  page: number,
  trigger: SearchPageAttempt["trigger"],
): SearchPageAttempt | null {
  if (getAnalyticsConsent() !== "granted" || !globalThis.crypto?.randomUUID) return null;
  const attempt = { attempt_id: crypto.randomUUID(), requested_page: page, trigger };
  track("search_page_requested", { ...attempt }, journeyOutcomeVendors);
  return attempt;
}

export function trackSearchPageRendered(attempt: SearchPageAttempt, renderedPage: number) {
  track("search_page_rendered", { ...attempt, rendered_page: renderedPage }, journeyOutcomeVendors);
}

export function trackMissingRoute(event: "navigation_not_found" | "not_found_suggestion_clicked", destination?: string) {
  // Destinations come from the site's suggestion builder. Discard discovery parameters.
  const suggestionPath = destination?.split(/[?#]/, 1)[0];
  track(event, suggestionPath ? { suggestion_path: suggestionPath } : {}, journeyOutcomeVendors);
}

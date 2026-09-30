/**
 * Why a query has nothing to show, or null when its data (or loading state)
 * can be trusted.
 *
 * TanStack Query pauses — rather than fails — a fetch that starts while the
 * browser is offline: isLoading and isError are both false and there is no
 * data, so a page that branches only on those falls through to its empty
 * state and tells the user they have nothing saved. A paused query with no
 * data is "offline"; it resumes on its own when the connection returns.
 */
export type QueryUnavailableReason = "offline" | "error";

export function queryUnavailableReason(query: {
  isPending: boolean;
  isPaused: boolean;
  isError: boolean;
}): QueryUnavailableReason | null {
  if (query.isPending && query.isPaused) return "offline";
  return query.isError ? "error" : null;
}

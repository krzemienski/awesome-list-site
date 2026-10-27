import { useRef } from "react";

/**
 * React Query resets a data-less query to `pending` with `error: null` when it
 * refetches, so a parent that renders ErrorPage only while `error` is set
 * unmounts it on every retry and its attempt budget starts over. Hold the last
 * error through the refetch so ErrorPage stays mounted: no skeleton flash and
 * a retry bound that survives. `scope` (the query's identity) drops a held
 * error when the page moves on to a different query.
 */
export function useHeldError(error: unknown, refetching: boolean, scope: string) {
  const held = useRef<{ scope: string; error: unknown } | null>(null);
  if (error) held.current = { scope, error };
  else if (!refetching || held.current?.scope !== scope) held.current = null;
  return error ?? held.current?.error ?? null;
}

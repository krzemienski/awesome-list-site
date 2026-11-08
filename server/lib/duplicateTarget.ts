import type { Resource } from "@shared/schema";

/** Longest duplicate chain followed before giving up (A -> B -> C ...). */
export const MAX_DUPLICATE_HOPS = 5;

type ResourceLookup = (id: number) => Promise<Resource | undefined>;

/**
 * Follow an archived duplicate's `duplicateOf` pointers to the first approved
 * row. Returns that row's id, or null when the chain ends on a row that is not
 * approved, has no pointer, is missing, loops back on itself, or is longer than
 * MAX_DUPLICATE_HOPS. A null keeps the caller's existing 410/404 answer.
 */
export async function resolveDuplicateTarget(
  start: Pick<Resource, "id" | "status" | "duplicateOf">,
  getResource: ResourceLookup,
): Promise<number | null> {
  if (start.status !== "archived") return null;
  const seen = new Set<number>([start.id]);
  let nextId = start.duplicateOf;
  for (let hop = 0; hop < MAX_DUPLICATE_HOPS && nextId != null; hop++) {
    if (seen.has(nextId)) return null;
    seen.add(nextId);
    const next = await getResource(nextId);
    if (!next) return null;
    if (next.status === "approved") return next.id;
    if (next.status !== "archived") return null;
    nextId = next.duplicateOf;
  }
  return null;
}

import type { QueryClient } from "@tanstack/react-query";

const MAX_DEPTH = 6;
const MAX_NODES = 50_000;

type CachedResource = { id: number; title: string; url: string } & Record<string, unknown>;

function isResourceFor(value: Record<string, unknown>, id: number): value is CachedResource {
  return value.id === id && typeof value.title === "string" && typeof value.url === "string";
}

/**
 * In-app links to a resource page almost always come from a list that already
 * holds that resource (related, search, category listings, home feeds,
 * bookmarks). Returning the richest cached copy lets the detail page show its
 * title, description and actions — and set the tab title — while the detail
 * request is in flight, instead of a skeleton titled "Loading resource".
 */
export function findCachedResource(
  queryClient: QueryClient,
  id: number,
  ownKey: readonly unknown[],
): CachedResource | undefined {
  let best: CachedResource | undefined;
  let bestSize = 0;
  let visited = 0;
  const walk = (value: unknown, depth: number) => {
    if (visited >= MAX_NODES || depth > MAX_DEPTH || !value || typeof value !== "object") return;
    visited++;
    if (Array.isArray(value)) {
      for (const item of value) walk(item, depth + 1);
      return;
    }
    const record = value as Record<string, unknown>;
    if (isResourceFor(record, id)) {
      const size = Object.keys(record).length;
      if (size > bestSize) {
        best = record;
        bestSize = size;
      }
      return;
    }
    for (const child of Object.values(record)) {
      if (child && typeof child === "object") walk(child, depth + 1);
    }
  };
  for (const query of queryClient.getQueryCache().getAll()) {
    if (
      query.queryKey.length === ownKey.length &&
      query.queryKey.every((part, index) => part === ownKey[index])
    ) {
      continue;
    }
    walk(query.state.data, 0);
  }
  return best;
}

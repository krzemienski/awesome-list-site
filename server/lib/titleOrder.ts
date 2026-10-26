/**
 * The one catalog title order: case-insensitive title, then id.
 *
 * The SQL key and the TypeScript comparator express the same rule so database
 * listings, in-memory sorts and exports agree. The id tie-breaker keeps page
 * boundaries deterministic when titles differ only by case or repeat exactly.
 */
import { asc, desc, sql } from "drizzle-orm";
import { resources } from "@shared/schema";

const titleSortKey = sql`lower(${resources.title})`;

export const titleOrderAsc = [asc(titleSortKey), asc(resources.id)];
export const titleOrderDesc = [desc(titleSortKey), desc(resources.id)];

export function compareTitles(
  left: { title: string; id: number },
  right: { title: string; id: number },
): number {
  const a = left.title.toLowerCase();
  const b = right.title.toLowerCase();
  if (a !== b) return a < b ? -1 : 1;
  return left.id - right.id;
}

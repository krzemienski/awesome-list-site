import { resourceTags, tags as tagTable } from "@shared/schema";
import { resolveResourceKind, type ResourceKind } from "@shared/resourceKinds";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { config } from "../config";

interface ResourceKindRow {
  id: number;
  kind?: unknown;
  metadata?: unknown;
}

/** Add relational-tag-aware resolvedKind without changing any other row keys. */
export async function attachResolvedResourceKinds<T extends ResourceKindRow>(
  rows: T[],
): Promise<(T & { resolvedKind: ReturnType<typeof resolveResourceKind> })[]> {
  if (rows.length === 0) return [];
  const ids = Array.from(new Set(rows.map((row) => row.id)));
  const tagRows = await db
    .select({ resourceId: resourceTags.resourceId, name: tagTable.name })
    .from(resourceTags)
    .innerJoin(tagTable, eq(resourceTags.tagId, tagTable.id))
    .where(and(inArray(resourceTags.resourceId, ids)));
  const tagsByResource = new Map<number, string[]>();
  for (const tag of tagRows) {
    const current = tagsByResource.get(tag.resourceId) ?? [];
    current.push(tag.name);
    tagsByResource.set(tag.resourceId, current);
  }
  return rows.map((row) => {
    const metadata =
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? row.metadata as Record<string, unknown>
        : {};
    return {
      ...row,
      resolvedKind: resolveResourceKind(
        typeof row.kind === "string" ? row.kind as ResourceKind : null,
        [
          ...(Array.isArray(metadata.tags) ? (metadata.tags as unknown[]).filter((tag): tag is string => typeof tag === "string") : []),
          ...(tagsByResource.get(row.id) ?? []),
        ],
        config.resource_kinds.tag_mappings,
      ),
    };
  });
}
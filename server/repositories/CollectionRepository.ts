import crypto from "crypto";
import {
  bookmarkCollectionItems,
  bookmarkCollections,
  resources,
  userBookmarks,
  type BookmarkCollection,
} from "@shared/schema";
import {
  personalTagsSchema,
  type BookmarkQueueStatus,
} from "@shared/bookmarkCollections";
import { db } from "../db";
import {
  and,
  asc,
  eq,
  inArray,
  isNotNull,
  isNull,
  sql,
} from "drizzle-orm";

export interface CollectionWithCount extends BookmarkCollection {
  itemCount: number;
}

export type BookmarkBulkAction =
  | { type: "status"; status: BookmarkQueueStatus }
  | { type: "archive"; archived: boolean }
  | { type: "tag"; tag: string; mode: "add" | "remove" }
  | {
      type: "move";
      destinationCollectionId: number;
      sourceCollectionId?: number | null;
    };

export interface BookmarkBulkFailure {
  resourceId: number;
  code: "not_bookmarked" | "not_in_source";
  message: string;
}

export interface BookmarkBulkResult {
  succeeded: number[];
  failed: BookmarkBulkFailure[];
}

export interface PublicCollectionResource {
  id: number;
  title: string;
  url: string;
  description: string;
  category: string;
  subcategory: string | null;
  subSubcategory: string | null;
  resourceFormat: string;
  provider: string;
  skillLevel: string;
}

export interface PublicCollection {
  shareId: string;
  name: string;
  publishedAt: Date;
  resources: PublicCollectionResource[];
}

export class CollectionNotFoundError extends Error {
  constructor() {
    super("Collection not found");
    this.name = "CollectionNotFoundError";
  }
}

/**
 * Owner-scoped collection and learning-queue operations.
 *
 * Collection membership always anchors to an existing user_bookmarks row. The
 * composite database FKs are the final ownership boundary; these checks provide
 * clearer API semantics before a constraint would fail.
 */
export class CollectionRepository {
  async listCollections(userId: string, includeArchived = false): Promise<CollectionWithCount[]> {
    const rows = await db
      .select({
        collection: bookmarkCollections,
        itemCount: sql<number>`count(${bookmarkCollectionItems.resourceId})::int`,
      })
      .from(bookmarkCollections)
      .leftJoin(
        bookmarkCollectionItems,
        and(
          eq(bookmarkCollectionItems.collectionId, bookmarkCollections.id),
          eq(bookmarkCollectionItems.userId, userId),
        ),
      )
      .where(
        includeArchived
          ? eq(bookmarkCollections.userId, userId)
          : and(
              eq(bookmarkCollections.userId, userId),
              isNull(bookmarkCollections.archivedAt),
            ),
      )
      .groupBy(bookmarkCollections.id)
      .orderBy(
        asc(bookmarkCollections.position),
        asc(bookmarkCollections.createdAt),
        asc(bookmarkCollections.id),
      );

    return rows.map(({ collection, itemCount }) => ({
      ...collection,
      itemCount: Number(itemCount),
    }));
  }

  async createCollection(userId: string, name: string): Promise<BookmarkCollection> {
    return db.transaction(async (tx) => {
      const [positionRow] = await tx
        .select({
          next: sql<number>`coalesce(max(${bookmarkCollections.position}), -1)::int + 1`,
        })
        .from(bookmarkCollections)
        .where(eq(bookmarkCollections.userId, userId));

      const [created] = await tx
        .insert(bookmarkCollections)
        .values({
          userId,
          name,
          position: Number(positionRow?.next ?? 0),
        })
        .returning();
      return created;
    });
  }

  async updateCollection(
    userId: string,
    collectionId: number,
    patch: { name?: string; archived?: boolean },
  ): Promise<BookmarkCollection | null> {
    const values: Partial<typeof bookmarkCollections.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (patch.name !== undefined) values.name = patch.name;
    if (patch.archived !== undefined) {
      values.archivedAt = patch.archived ? new Date() : null;
      // Archiving is a privacy action too: it immediately revokes publication.
      if (patch.archived) values.publishedAt = null;
    }

    const [updated] = await db
      .update(bookmarkCollections)
      .set(values)
      .where(
        and(
          eq(bookmarkCollections.id, collectionId),
          eq(bookmarkCollections.userId, userId),
        ),
      )
      .returning();
    return updated ?? null;
  }

  async reorderCollections(userId: string, orderedIds: number[]): Promise<boolean> {
    return db.transaction(async (tx) => {
      const owned = await tx
        .select({ id: bookmarkCollections.id })
        .from(bookmarkCollections)
        .where(
          and(
            eq(bookmarkCollections.userId, userId),
            inArray(bookmarkCollections.id, orderedIds),
          ),
        );
      if (owned.length !== orderedIds.length) return false;

      const now = new Date();
      for (const [position, id] of orderedIds.entries()) {
        await tx
          .update(bookmarkCollections)
          .set({ position, updatedAt: now })
          .where(
            and(
              eq(bookmarkCollections.id, id),
              eq(bookmarkCollections.userId, userId),
            ),
          );
      }
      return true;
    });
  }

  async deleteCollection(userId: string, collectionId: number): Promise<boolean> {
    const deleted = await db
      .delete(bookmarkCollections)
      .where(
        and(
          eq(bookmarkCollections.id, collectionId),
          eq(bookmarkCollections.userId, userId),
        ),
      )
      .returning({ id: bookmarkCollections.id });
    return deleted.length > 0;
  }

  async addMembership(
    userId: string,
    collectionId: number,
    resourceId: number,
  ): Promise<"added" | "already-present" | "collection-not-found" | "not-bookmarked"> {
    return db.transaction(async (tx) => {
      const [collection, bookmark] = await Promise.all([
        tx
          .select({ id: bookmarkCollections.id })
          .from(bookmarkCollections)
          .where(
            and(
              eq(bookmarkCollections.id, collectionId),
              eq(bookmarkCollections.userId, userId),
            ),
          )
          .limit(1),
        tx
          .select({ resourceId: userBookmarks.resourceId })
          .from(userBookmarks)
          .where(
            and(
              eq(userBookmarks.userId, userId),
              eq(userBookmarks.resourceId, resourceId),
            ),
          )
          .limit(1),
      ]);
      if (!collection.length) return "collection-not-found";
      if (!bookmark.length) return "not-bookmarked";

      const [positionRow] = await tx
        .select({
          next: sql<number>`coalesce(max(${bookmarkCollectionItems.position}), -1)::int + 1`,
        })
        .from(bookmarkCollectionItems)
        .where(eq(bookmarkCollectionItems.collectionId, collectionId));

      const inserted = await tx
        .insert(bookmarkCollectionItems)
        .values({
          collectionId,
          userId,
          resourceId,
          position: Number(positionRow?.next ?? 0),
        })
        .onConflictDoNothing()
        .returning({ resourceId: bookmarkCollectionItems.resourceId });
      return inserted.length ? "added" : "already-present";
    });
  }

  async removeMembership(
    userId: string,
    collectionId: number,
    resourceId: number,
  ): Promise<"removed" | "not-present" | "collection-not-found"> {
    return db.transaction(async (tx) => {
      const collection = await tx
        .select({ id: bookmarkCollections.id })
        .from(bookmarkCollections)
        .where(
          and(
            eq(bookmarkCollections.id, collectionId),
            eq(bookmarkCollections.userId, userId),
          ),
        )
        .limit(1);
      if (!collection.length) return "collection-not-found";

      const deleted = await tx
        .delete(bookmarkCollectionItems)
        .where(
          and(
            eq(bookmarkCollectionItems.collectionId, collectionId),
            eq(bookmarkCollectionItems.userId, userId),
            eq(bookmarkCollectionItems.resourceId, resourceId),
          ),
        )
        .returning({ resourceId: bookmarkCollectionItems.resourceId });
      return deleted.length ? "removed" : "not-present";
    });
  }

  async updateBookmarkState(
    userId: string,
    resourceId: number,
    patch: {
      queueStatus?: BookmarkQueueStatus;
      archived?: boolean;
      personalTags?: string[];
    },
  ): Promise<typeof userBookmarks.$inferSelect | null> {
    const values: Partial<typeof userBookmarks.$inferInsert> = {};
    if (patch.queueStatus !== undefined) values.queueStatus = patch.queueStatus;
    if (patch.archived !== undefined) values.archivedAt = patch.archived ? new Date() : null;
    if (patch.personalTags !== undefined) values.personalTags = personalTagsSchema.parse(patch.personalTags);

    const [updated] = await db
      .update(userBookmarks)
      .set(values)
      .where(
        and(
          eq(userBookmarks.userId, userId),
          eq(userBookmarks.resourceId, resourceId),
        ),
      )
      .returning();
    return updated ?? null;
  }

  async bulkUpdate(
    userId: string,
    resourceIds: number[],
    action: BookmarkBulkAction,
  ): Promise<BookmarkBulkResult> {
    return db.transaction(async (tx) => {
      if (action.type === "move") {
        const collectionIds = [
          action.destinationCollectionId,
          ...(action.sourceCollectionId ? [action.sourceCollectionId] : []),
        ];
        const owned = await tx
          .select({ id: bookmarkCollections.id })
          .from(bookmarkCollections)
          .where(
            and(
              eq(bookmarkCollections.userId, userId),
              inArray(bookmarkCollections.id, collectionIds),
            ),
          );
        if (owned.length !== new Set(collectionIds).size) throw new CollectionNotFoundError();
      }

      const bookmarks = await tx
        .select({
          resourceId: userBookmarks.resourceId,
          personalTags: userBookmarks.personalTags,
        })
        .from(userBookmarks)
        .where(
          and(
            eq(userBookmarks.userId, userId),
            inArray(userBookmarks.resourceId, resourceIds),
          ),
        );
      const bookmarkById = new Map(bookmarks.map((bookmark) => [bookmark.resourceId, bookmark]));
      const failed: BookmarkBulkFailure[] = resourceIds
        .filter((resourceId) => !bookmarkById.has(resourceId))
        .map((resourceId) => ({
          resourceId,
          code: "not_bookmarked",
          message: "Resource is not in your bookmarks",
        }));

      let succeeded = resourceIds.filter((resourceId) => bookmarkById.has(resourceId));

      if (action.type === "move" && action.sourceCollectionId) {
        const sourceRows = await tx
          .select({ resourceId: bookmarkCollectionItems.resourceId })
          .from(bookmarkCollectionItems)
          .where(
            and(
              eq(bookmarkCollectionItems.userId, userId),
              eq(bookmarkCollectionItems.collectionId, action.sourceCollectionId),
              inArray(bookmarkCollectionItems.resourceId, succeeded),
            ),
          );
        const inSource = new Set(sourceRows.map((row) => row.resourceId));
        for (const resourceId of succeeded) {
          if (!inSource.has(resourceId)) {
            failed.push({
              resourceId,
              code: "not_in_source",
              message: "Resource is no longer in the source collection",
            });
          }
        }
        succeeded = succeeded.filter((resourceId) => inSource.has(resourceId));
      }

      if (!succeeded.length) return { succeeded: [], failed };

      if (action.type === "status") {
        await tx
          .update(userBookmarks)
          .set({ queueStatus: action.status })
          .where(
            and(
              eq(userBookmarks.userId, userId),
              inArray(userBookmarks.resourceId, succeeded),
            ),
          );
      } else if (action.type === "archive") {
        await tx
          .update(userBookmarks)
          .set({ archivedAt: action.archived ? new Date() : null })
          .where(
            and(
              eq(userBookmarks.userId, userId),
              inArray(userBookmarks.resourceId, succeeded),
            ),
          );
      } else if (action.type === "tag") {
        const wanted = action.tag.toLocaleLowerCase();
        for (const resourceId of succeeded) {
          const current = bookmarkById.get(resourceId)?.personalTags ?? [];
          const next =
            action.mode === "add"
              ? current.some((tag) => tag.toLocaleLowerCase() === wanted)
                ? current
                : [...current, action.tag]
              : current.filter((tag) => tag.toLocaleLowerCase() !== wanted);
          await tx
            .update(userBookmarks)
            .set({ personalTags: personalTagsSchema.parse(next) })
            .where(
              and(
                eq(userBookmarks.userId, userId),
                eq(userBookmarks.resourceId, resourceId),
              ),
            );
        }
      } else if (action.type === "move") {
        const [positionRow] = await tx
          .select({
            next: sql<number>`coalesce(max(${bookmarkCollectionItems.position}), -1)::int + 1`,
          })
          .from(bookmarkCollectionItems)
          .where(eq(bookmarkCollectionItems.collectionId, action.destinationCollectionId));
        const start = Number(positionRow?.next ?? 0);
        await tx
          .insert(bookmarkCollectionItems)
          .values(
            succeeded.map((resourceId, index) => ({
              collectionId: action.destinationCollectionId,
              userId,
              resourceId,
              position: start + index,
            })),
          )
          .onConflictDoNothing();

        if (
          action.sourceCollectionId &&
          action.sourceCollectionId !== action.destinationCollectionId
        ) {
          await tx
            .delete(bookmarkCollectionItems)
            .where(
              and(
                eq(bookmarkCollectionItems.userId, userId),
                eq(bookmarkCollectionItems.collectionId, action.sourceCollectionId),
                inArray(bookmarkCollectionItems.resourceId, succeeded),
              ),
            );
        }
      }

      return { succeeded, failed };
    });
  }

  async publishCollection(userId: string, collectionId: number): Promise<BookmarkCollection | null> {
    return db.transaction(async (tx) => {
      const [collection] = await tx
        .select()
        .from(bookmarkCollections)
        .where(
          and(
            eq(bookmarkCollections.id, collectionId),
            eq(bookmarkCollections.userId, userId),
            isNull(bookmarkCollections.archivedAt),
          ),
        )
        .limit(1);
      if (!collection) return null;

      const shareId = collection.shareId ?? crypto.randomBytes(18).toString("base64url");
      const [published] = await tx
        .update(bookmarkCollections)
        .set({ shareId, publishedAt: new Date(), updatedAt: new Date() })
        .where(
          and(
            eq(bookmarkCollections.id, collectionId),
            eq(bookmarkCollections.userId, userId),
          ),
        )
        .returning();
      return published ?? null;
    });
  }

  async unpublishCollection(userId: string, collectionId: number): Promise<BookmarkCollection | null> {
    const [updated] = await db
      .update(bookmarkCollections)
      .set({ publishedAt: null, updatedAt: new Date() })
      .where(
        and(
          eq(bookmarkCollections.id, collectionId),
          eq(bookmarkCollections.userId, userId),
        ),
      )
      .returning();
    return updated ?? null;
  }

  async getPublicCollection(shareId: string): Promise<PublicCollection | null> {
    const [collection] = await db
      .select({
        id: bookmarkCollections.id,
        name: bookmarkCollections.name,
        shareId: bookmarkCollections.shareId,
        publishedAt: bookmarkCollections.publishedAt,
      })
      .from(bookmarkCollections)
      .where(
        and(
          eq(bookmarkCollections.shareId, shareId),
          isNotNull(bookmarkCollections.publishedAt),
          isNull(bookmarkCollections.archivedAt),
        ),
      )
      .limit(1);
    if (!collection?.shareId || !collection.publishedAt) return null;

    const publicResources = await db
      .select({
        id: resources.id,
        title: resources.title,
        url: resources.url,
        description: resources.description,
        category: resources.category,
        subcategory: resources.subcategory,
        subSubcategory: resources.subSubcategory,
        resourceFormat: resources.resourceFormat,
        provider: resources.provider,
        skillLevel: resources.skillLevel,
      })
      .from(bookmarkCollectionItems)
      .innerJoin(
        userBookmarks,
        and(
          eq(userBookmarks.userId, bookmarkCollectionItems.userId),
          eq(userBookmarks.resourceId, bookmarkCollectionItems.resourceId),
          isNull(userBookmarks.archivedAt),
        ),
      )
      .innerJoin(
        resources,
        and(
          eq(resources.id, bookmarkCollectionItems.resourceId),
          eq(resources.status, "approved"),
        ),
      )
      .where(eq(bookmarkCollectionItems.collectionId, collection.id))
      .orderBy(
        asc(bookmarkCollectionItems.position),
        asc(bookmarkCollectionItems.createdAt),
        asc(bookmarkCollectionItems.resourceId),
      );

    return {
      shareId: collection.shareId,
      name: collection.name,
      publishedAt: collection.publishedAt,
      resources: publicResources,
    };
  }
}

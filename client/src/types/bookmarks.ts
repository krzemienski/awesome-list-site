import type { Resource } from "@shared/schema";
import type { BookmarkQueueStatus } from "@shared/bookmarkCollections";

export interface BookmarkedResource extends Resource {
  resourceId: number;
  notes?: string;
  bookmarkedAt: string;
  queueStatus: BookmarkQueueStatus;
  archivedAt: string | null;
  personalTags: string[];
  collectionIds: number[];
}

export interface BookmarkCollection {
  id: number;
  name: string;
  position: number;
  archivedAt: string | null;
  shareId: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
  publicUrl: string | null;
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
  publishedAt: string;
  resources: PublicCollectionResource[];
}
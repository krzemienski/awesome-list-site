import type { MouseEvent } from "react";
import { Link } from "wouter";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchEntryButton } from "@/components/search/SearchEntryButton";
import { trackRelatedCategoryOpened, trackTagInteraction } from "@/lib/analytics";
import { tagLandingPath } from "@shared/tagNormalize";

/** Analytics `surface` of every link in this panel. */
export const ONWARD_SURFACE = "resource_onward";
const SIMILAR_LIMIT = 3;
const TAG_LIMIT = 6;

export interface OnwardRelated {
  id: number;
  title: string;
  score?: number;
}

interface CollectionLink {
  name: string;
  href: string;
}

interface ResourceOnwardPathsProps {
  resourceId: number;
  related: OnwardRelated[];
  relatedLoading: boolean;
  onRelatedClick: (event: MouseEvent<HTMLAnchorElement>, related: OnwardRelated, position: number) => void;
  /** Sub-subcategory, or subcategory when there is none. */
  narrowestCollection: CollectionLink | null;
  category: CollectionLink | null;
  /** Rows to hold while the nav tree that supplies collection slugs loads. */
  pendingCollectionRows: number;
  tags: string[];
}

/**
 * Next steps for a visitor who landed on a resource from search: similar
 * resources, the rest of its collection, its tags and site search. Beside
 * the page on wide screens, under the actions otherwise; every late-loading
 * group holds its loaded height so nothing below it moves.
 */
export default function ResourceOnwardPaths({
  resourceId,
  related,
  relatedLoading,
  onRelatedClick,
  narrowestCollection,
  category,
  pendingCollectionRows,
  tags,
}: ResourceOnwardPathsProps) {
  const tagLinks = Array.from(new Map(tags.map((tag) => [tagLandingPath(tag), tag])).entries()).slice(0, TAG_LIMIT);
  const similar = related.slice(0, SIMILAR_LIMIT);
  const hasCollection = pendingCollectionRows > 0 || narrowestCollection !== null || category !== null;

  return (
    <nav className="resource-detail-onward" aria-labelledby="resource-onward-heading" data-testid="resource-onward">
      <h2 id="resource-onward-heading" className="eyebrow">Keep exploring</h2>
      <SearchEntryButton method="resource_page_button" surface={ONWARD_SURFACE} className="w-full" />

      <div className="resource-detail-onward-group resource-detail-onward-similar">
        <h3 className="resource-detail-onward-label">More like this</h3>
        <ul className="resource-detail-onward-similar-list">
          {relatedLoading &&
            Array.from({ length: SIMILAR_LIMIT }, (_, index) => (
              <li key={index} aria-hidden="true" className="resource-detail-onward-similar-item">
                <Skeleton className="inline-block w-3/4">{" "}</Skeleton>
              </li>
            ))}
          {!relatedLoading && similar.length === 0 && (
            <li className="resource-detail-onward-empty">No close matches yet.</li>
          )}
          {!relatedLoading &&
            similar.map((item, index) => (
              <li key={item.id}>
                <a
                  href={`/resource/${item.id}`}
                  className="resource-detail-onward-similar-item"
                  onClick={(event) => onRelatedClick(event, item, index + 1)}
                  data-testid={`onward-related-${item.id}`}
                >
                  <span className="truncate">{item.title}</span>
                  <ChevronRight aria-hidden="true" />
                </a>
              </li>
            ))}
        </ul>
      </div>

      {hasCollection && (
        <div className="resource-detail-onward-group">
          <h3 className="resource-detail-onward-label">In this collection</h3>
          {Array.from({ length: pendingCollectionRows }, (_, index) => (
            <div key={index} aria-hidden="true" className="min-h-[44px]" />
          ))}
          {narrowestCollection && (
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link
                href={narrowestCollection.href}
                onClick={() => trackRelatedCategoryOpened(resourceId, narrowestCollection.name, ONWARD_SURFACE)}
                data-testid="link-more-in-collection"
              >
                More in {narrowestCollection.name}
                <ChevronRight aria-hidden="true" />
              </Link>
            </Button>
          )}
          {category && (
            <Button asChild variant="ghost" size="sm" className="w-full">
              <Link
                href={category.href}
                onClick={() => trackRelatedCategoryOpened(resourceId, category.name, ONWARD_SURFACE)}
                data-testid="link-view-all-category"
              >
                View all in {category.name}
                <ChevronRight aria-hidden="true" />
              </Link>
            </Button>
          )}
        </div>
      )}

      {tagLinks.length > 0 && (
        <div className="resource-detail-onward-group">
          <h3 className="resource-detail-onward-label">Tags</h3>
          <ul className="resource-detail-onward-tags">
            {tagLinks.map(([href, tag]) => (
              <li key={href}>
                <Link
                  href={href}
                  className="resource-detail-onward-tag"
                  onClick={() => trackTagInteraction(tag, "link_click", ONWARD_SURFACE)}
                  data-testid="onward-tag-link"
                >
                  <span className="chip mono">#{tag}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </nav>
  );
}

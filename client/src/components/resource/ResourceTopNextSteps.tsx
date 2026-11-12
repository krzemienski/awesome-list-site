import type { MouseEvent } from "react";
import { ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

/** Analytics `surface` of the links in this block. */
export const TOP_SURFACE = "resource_top";
export const TOP_RELATED_LIMIT = 3;

export interface TopRelated {
  id: number;
  title: string;
}

interface ResourceTopNextStepsProps {
  related: TopRelated[];
  loading: boolean;
  onRelatedClick: (event: MouseEvent<HTMLAnchorElement>, related: TopRelated, position: number) => void;
}

/**
 * Compact "More like this" under the title. Most visitors arrive from search
 * and leave after one page, so the closest neighbours sit above the fold; the
 * rows keep their loaded height so the description below never shifts: the
 * list reserves three rows, and a resource with no close matches says so in
 * place instead of removing the block.
 */
export default function ResourceTopNextSteps({ related, loading, onRelatedClick }: ResourceTopNextStepsProps) {
  const items = related.slice(0, TOP_RELATED_LIMIT);

  return (
    <nav className="resource-detail-top-next" aria-labelledby="resource-top-next-heading" data-testid="resource-top-next">
      <h2 id="resource-top-next-heading" className="eyebrow">More like this</h2>
      <ul>
        {loading &&
          Array.from({ length: TOP_RELATED_LIMIT }, (_, index) => (
            <li key={index} aria-hidden="true" className="resource-detail-top-next-item">
              <Skeleton className="h-4 w-3/4" />
            </li>
          ))}
        {!loading && items.length === 0 && (
          <li className="resource-detail-top-next-empty" data-testid="resource-top-next-empty">
            No close matches yet.
          </li>
        )}
        {!loading &&
          items.map((item, index) => (
            <li key={item.id}>
              <a
                href={`/resource/${item.id}`}
                className="resource-detail-top-next-item"
                // One line keeps the block's reserved height; the full name
                // stays available where a long title is cut short.
                title={item.title}
                onClick={(event) => onRelatedClick(event, item, index + 1)}
                data-testid={`top-next-related-${item.id}`}
              >
                <span className="truncate">{item.title}</span>
                <ChevronRight aria-hidden="true" />
              </a>
            </li>
          ))}
      </ul>
    </nav>
  );
}

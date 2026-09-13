import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import "@/styles/components/resource-card.css";

/**
 * Layout-matched skeleton placeholders. Each mirrors the structure of the
 * real card it stands in for (TaxonomyCard, ResourceCard, journey card) so
 * the page doesn't jump when content arrives — same Card chrome, same
 * padding, same rough content heights.
 */

/** Mirrors TaxonomyCard: icon tile, two-line title reserve, count caption. */
export function TaxonomyCardSkeleton() {
  return (
    <Card className="h-full" aria-hidden="true">
      <CardHeader className="p-4 sm:p-5 space-y-1.5">
        <Skeleton className="size-8 rounded-lg" />
        <div className="pt-1 min-h-[2.5em] space-y-1.5">
          <Skeleton className="h-4 w-3/4" />
        </div>
        <Skeleton className="h-3.5 w-24" />
      </CardHeader>
    </Card>
  );
}

/** Shares ResourceCard geometry so placeholder and populated grids align. */
export function ResourceCardSkeleton() {
  return (
    <Card className="resource-card" aria-hidden="true">
      <CardHeader className="resource-card__header">
        <div className="resource-card__top">
          <Skeleton className="resource-card__mark" />
          <div className="resource-card__personal-actions">
            <Skeleton className="h-11 w-11" />
            <Skeleton className="h-11 w-11" />
          </div>
        </div>
        <div className="resource-card__title-row">
          <div className="resource-card__title space-y-2">
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-3/5" />
          </div>
        </div>
        <div className="resource-card__description space-y-2">
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-2/3" />
        </div>
      </CardHeader>
      <CardContent className="resource-card__content">
        <div className="resource-card__metadata">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-20" />
        </div>
        <div className="resource-card__actions">
          <Skeleton className="resource-card__visit-button" />
        </div>
      </CardContent>
    </Card>
  );
}

/** Mirrors a journey card: title, description, meta row, step preview. */
export function JourneyCardSkeleton() {
  return (
    <Card aria-hidden="true">
      <CardHeader className="space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
        <Skeleton className="h-6 w-3/4" />
        <div className="space-y-1.5 pt-1">
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-5/6" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-2 w-full rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-2/3" />
          <Skeleton className="h-3.5 w-1/2" />
          <Skeleton className="h-3.5 w-3/5" />
        </div>
        <Skeleton className="h-9 w-full" />
      </CardContent>
    </Card>
  );
}

/** Page-header placeholder: title + subtitle pair used above card grids. */
export function PageHeaderSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-9 w-64 max-w-full" />
      <Skeleton className="h-5 w-96 max-w-full" />
    </div>
  );
}

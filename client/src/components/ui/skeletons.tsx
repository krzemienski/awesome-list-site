import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

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

/** Mirrors ResourceCard: title, description lines, tag badges, footer row. */
export function ResourceCardSkeleton() {
  return (
    <Card aria-hidden="true">
      <CardHeader className="pb-3 space-y-2">
        <Skeleton className="h-5 w-4/5" />
        <div className="space-y-1.5 pt-1">
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-2/3" />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-2 mb-3">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <Skeleton className="h-3.5 w-28" />
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

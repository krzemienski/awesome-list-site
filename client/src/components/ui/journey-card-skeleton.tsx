import { Card, CardContent, CardHeader } from "./card";
import { Skeleton } from "./skeleton";

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
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface AnimatedResourceSkeletonProps {
  count?: number;
  showTags?: boolean;
  showMetrics?: boolean;
}

export default function AnimatedResourceSkeleton({ 
  count = 6, 
  showTags = true, 
  showMetrics = true 
}: AnimatedResourceSkeletonProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} className="animate-pulse">
          <CardHeader className="space-y-3">
            {/* Title skeleton with shimmer effect */}
            <div className="space-y-2">
              <Skeleton className="h-5 w-3/4 bg-gradient-to-r from-muted via-muted/50 to-muted animate-shimmer" />
              <Skeleton className="h-4 w-1/2 bg-gradient-to-r from-muted via-muted/50 to-muted animate-shimmer" />
            </div>
            
            {/* Category badge */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-20 rounded-full bg-gradient-to-r from-muted via-muted/50 to-muted animate-shimmer" />
              {showTags && (
                <Skeleton className="h-6 w-16 rounded-full bg-gradient-to-r from-muted via-muted/50 to-muted animate-shimmer" />
              )}
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Description skeleton */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-full bg-gradient-to-r from-muted via-muted/50 to-muted animate-shimmer" />
              <Skeleton className="h-4 w-5/6 bg-gradient-to-r from-muted via-muted/50 to-muted animate-shimmer" />
              <Skeleton className="h-4 w-4/6 bg-gradient-to-r from-muted via-muted/50 to-muted animate-shimmer" />
            </div>
            
            {/* Tags skeleton */}
            {showTags && (
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-5 w-12 rounded bg-gradient-to-r from-muted via-muted/50 to-muted animate-shimmer" />
                <Skeleton className="h-5 w-16 rounded bg-gradient-to-r from-muted via-muted/50 to-muted animate-shimmer" />
                <Skeleton className="h-5 w-10 rounded bg-gradient-to-r from-muted via-muted/50 to-muted animate-shimmer" />
              </div>
            )}
            
            {/* Metrics skeleton */}
            {showMetrics && (
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Skeleton className="h-4 w-4 rounded bg-gradient-to-r from-muted via-muted/50 to-muted animate-shimmer" />
                    <Skeleton className="h-4 w-8 bg-gradient-to-r from-muted via-muted/50 to-muted animate-shimmer" />
                  </div>
                  <div className="flex items-center gap-1">
                    <Skeleton className="h-4 w-4 rounded bg-gradient-to-r from-muted via-muted/50 to-muted animate-shimmer" />
                    <Skeleton className="h-4 w-6 bg-gradient-to-r from-muted via-muted/50 to-muted animate-shimmer" />
                  </div>
                </div>
                <Skeleton className="h-8 w-20 rounded bg-gradient-to-r from-muted via-muted/50 to-muted animate-shimmer" />
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Enhanced skeleton for list view
export function AnimatedListSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <div 
          key={index} 
          className="flex items-center gap-4 p-4 border rounded-lg animate-pulse"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          {/* Icon skeleton */}
          <Skeleton className="h-10 w-10 rounded bg-gradient-to-r from-muted via-muted/50 to-muted animate-shimmer" />
          
          {/* Content skeleton */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-48 bg-gradient-to-r from-muted via-muted/50 to-muted animate-shimmer" />
              <Skeleton className="h-5 w-16 rounded-full bg-gradient-to-r from-muted via-muted/50 to-muted animate-shimmer" />
            </div>
            <Skeleton className="h-4 w-3/4 bg-gradient-to-r from-muted via-muted/50 to-muted animate-shimmer" />
          </div>
          
          {/* Action skeleton */}
          <Skeleton className="h-8 w-20 rounded bg-gradient-to-r from-muted via-muted/50 to-muted animate-shimmer" />
        </div>
      ))}
    </div>
  );
}

// Sidebar skeleton
export function AnimatedSidebarSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {/* Header skeleton */}
      <div className="space-y-2 pb-4 border-b">
        <Skeleton className="h-6 w-32 bg-gradient-to-r from-muted via-muted/50 to-muted animate-shimmer" />
        <Skeleton className="h-4 w-24 bg-gradient-to-r from-muted via-muted/50 to-muted animate-shimmer" />
      </div>
      
      {/* Categories skeleton */}
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="space-y-2" style={{ animationDelay: `${index * 150}ms` }}>
          <div className="flex items-center gap-2 animate-pulse">
            <Skeleton className="h-4 w-4 bg-gradient-to-r from-muted via-muted/50 to-muted animate-shimmer" />
            <Skeleton className="h-5 w-28 bg-gradient-to-r from-muted via-muted/50 to-muted animate-shimmer" />
            <Skeleton className="h-4 w-8 rounded-full bg-gradient-to-r from-muted via-muted/50 to-muted animate-shimmer" />
          </div>
          
          {/* Subcategories */}
          <div className="pl-6 space-y-1">
            <Skeleton className="h-4 w-20 bg-gradient-to-r from-muted via-muted/50 to-muted animate-shimmer" />
            <Skeleton className="h-4 w-24 bg-gradient-to-r from-muted via-muted/50 to-muted animate-shimmer" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Search results skeleton
export function AnimatedSearchSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <div 
          key={index} 
          className="p-3 border rounded-lg animate-pulse"
          style={{ animationDelay: `${index * 80}ms` }}
        >
          <div className="flex items-start gap-3">
            <Skeleton className="h-8 w-8 rounded bg-gradient-to-r from-muted via-muted/50 to-muted animate-shimmer" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-40 bg-gradient-to-r from-muted via-muted/50 to-muted animate-shimmer" />
                <Skeleton className="h-4 w-16 rounded bg-gradient-to-r from-muted via-muted/50 to-muted animate-shimmer" />
              </div>
              <Skeleton className="h-4 w-3/4 bg-gradient-to-r from-muted via-muted/50 to-muted animate-shimmer" />
              <div className="flex gap-2">
                <Skeleton className="h-3 w-12 rounded bg-gradient-to-r from-muted via-muted/50 to-muted animate-shimmer" />
                <Skeleton className="h-3 w-16 rounded bg-gradient-to-r from-muted via-muted/50 to-muted animate-shimmer" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
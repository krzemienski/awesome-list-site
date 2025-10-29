import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface SkeletonCardProps {
  className?: string;
  variant?: "default" | "list" | "compact";
}

export function SkeletonCard({ className, variant = "default" }: SkeletonCardProps) {
  if (variant === "list") {
    return (
      <Card className={cn("border-0 border-b rounded-lg", className)}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between skeleton-pulse">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-4 bg-muted rounded w-3/4 skeleton-shimmer"></div>
                <div className="h-3 w-3 bg-muted rounded skeleton-shimmer" style={{ animationDelay: '0.1s' }}></div>
              </div>
              <div className="h-3 bg-muted rounded w-full mb-2 skeleton-shimmer" style={{ animationDelay: '0.2s' }}></div>
              <div className="flex items-center gap-2">
                <div className="h-5 bg-muted rounded-full w-20 skeleton-shimmer" style={{ animationDelay: '0.3s' }}></div>
                <div className="h-5 bg-muted rounded-full w-24 skeleton-shimmer" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <div className="h-8 w-8 bg-muted rounded skeleton-shimmer" style={{ animationDelay: '0.5s' }}></div>
              <div className="h-8 w-8 bg-muted rounded skeleton-shimmer" style={{ animationDelay: '0.6s' }}></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === "compact") {
    return (
      <Card className={cn("h-full transition-all", className)}>
        <CardContent className="p-3 skeleton-pulse">
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded w-full skeleton-shimmer"></div>
            <div className="h-3 bg-muted rounded w-3/4 skeleton-shimmer" style={{ animationDelay: '0.1s' }}></div>
            <div className="flex gap-1 mt-2">
              <div className="h-5 bg-muted rounded-full w-16 skeleton-shimmer" style={{ animationDelay: '0.2s' }}></div>
              <div className="h-5 bg-muted rounded-full w-20 skeleton-shimmer" style={{ animationDelay: '0.3s' }}></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Default card skeleton
  return (
    <Card className={cn("h-full", className)}>
      <CardHeader className="skeleton-pulse">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0 space-y-2">
            <div className="h-6 bg-muted rounded w-3/4 skeleton-shimmer"></div>
            <div className="h-4 bg-muted rounded w-full skeleton-shimmer" style={{ animationDelay: '0.1s' }}></div>
            <div className="h-4 bg-muted rounded w-5/6 skeleton-shimmer" style={{ animationDelay: '0.2s' }}></div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="h-4 w-4 bg-muted rounded skeleton-shimmer"></div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="skeleton-pulse">
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="h-6 bg-muted rounded-full w-24 skeleton-shimmer" style={{ animationDelay: '0.3s' }}></div>
          <div className="h-6 bg-muted rounded-full w-20 skeleton-shimmer" style={{ animationDelay: '0.4s' }}></div>
        </div>
        
        <div className="flex flex-wrap gap-1">
          <div className="h-5 bg-muted rounded-full w-16 skeleton-shimmer" style={{ animationDelay: '0.5s' }}></div>
          <div className="h-5 bg-muted rounded-full w-14 skeleton-shimmer" style={{ animationDelay: '0.6s' }}></div>
          <div className="h-5 bg-muted rounded-full w-18 skeleton-shimmer" style={{ animationDelay: '0.7s' }}></div>
        </div>
      </CardContent>
      
      <CardFooter className="pt-0 skeleton-pulse">
        <div className="flex items-center justify-end w-full gap-2">
          <div className="h-8 bg-muted rounded w-24 skeleton-shimmer" style={{ animationDelay: '0.8s' }}></div>
          <div className="h-8 bg-muted rounded w-20 skeleton-shimmer" style={{ animationDelay: '0.9s' }}></div>
        </div>
      </CardFooter>
    </Card>
  );
}

export function SkeletonGrid({ 
  count = 6, 
  variant = "default",
  className = "" 
}: { 
  count?: number; 
  variant?: "default" | "list" | "compact";
  className?: string;
}) {
  const skeletons = Array.from({ length: count }, (_, i) => i);

  if (variant === "list") {
    return (
      <div className={cn("space-y-0 border border-border overflow-hidden", className)}>
        {skeletons.map((index) => (
          <SkeletonCard key={index} variant="list" />
        ))}
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className={cn("grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3", className)}>
        {skeletons.map((index) => (
          <SkeletonCard key={index} variant="compact" />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", className)}>
      {skeletons.map((index) => (
        <SkeletonCard key={index} variant="default" />
      ))}
    </div>
  );
}
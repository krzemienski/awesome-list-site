import { useState, memo } from "react";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { useFavoriteToggle } from "@/hooks/useResourceToggle";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  resourceId: string;
  isFavorited?: boolean;
  favoriteCount?: number;
  className?: string;
  size?: "sm" | "default" | "lg";
  showCount?: boolean;
}

// All toggle behavior (latest-wins rapid clicks, auth gate, error handling,
// invalidation, cross-tab sync) lives in the shared useFavoriteToggle hook —
// this component only owns its optimistic local state and visuals.
function FavoriteButton({
  resourceId,
  isFavorited: initialFavorited = false,
  favoriteCount: initialCount = 0,
  className,
  size = "default",
  showCount = true
}: FavoriteButtonProps) {
  const [isFavorited, setIsFavorited] = useState(initialFavorited);
  const [favoriteCount, setFavoriteCount] = useState(initialCount);

  const favorite = useFavoriteToggle({
    resourceId,
    isActive: isFavorited,
    onOptimistic: (next) => {
      setIsFavorited(next);
      setFavoriteCount(prev => (next ? prev + 1 : Math.max(0, prev - 1)));
    },
    onSuccess: (data, vars, showToast) => {
      // Update with server response if available
      if (data?.isFavorited !== undefined) {
        setIsFavorited(data.isFavorited);
      }
      if (data?.favoriteCount !== undefined) {
        setFavoriteCount(data.favoriteCount);
      }
      showToast({
        description: vars.remove ? "Removed from favorites" : "Added to favorites",
        duration: 2000
      });
    },
    onErrorRevert: (vars) => {
      // Revert optimistic update to the pre-click state
      setIsFavorited(vars.remove);
      setFavoriteCount(initialCount);
    },
  });

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    favorite.toggle();
  };

  const iconSize = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-6 w-6" : "h-5 w-5";

  return (
    <Button
      variant="ghost"
      size={size}
      className={cn(
        "group relative",
        isFavorited && "text-primary hover:text-primary/90",
        className
      )}
      onClick={handleClick}
      aria-disabled={favorite.isPending}
      aria-busy={favorite.isPending}
      aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
      aria-pressed={isFavorited}
      data-testid="button-favorite"
    >
      <div className="flex items-center gap-1.5">
        <Heart
          className={cn(
            iconSize,
            "transition-all duration-200",
            isFavorited ? "fill-current" : "",
            "group-hover:scale-110"
          )}
        />
        {showCount && favoriteCount > 0 && (
          <span className="text-sm font-medium">
            {favoriteCount}
          </span>
        )}
      </div>
      
      {/* Ripple effect on click */}
      {favorite.isPending && (
        <span className="absolute inset-0 animate-ping rounded-full bg-primary opacity-20" />
      )}
    </Button>
  );
}

export default memo(FavoriteButton);

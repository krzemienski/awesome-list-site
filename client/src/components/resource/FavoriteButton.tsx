import { useState, memo } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  resourceId: string;
  isFavorited?: boolean;
  favoriteCount?: number;
  className?: string;
  size?: "sm" | "default" | "lg";
  showCount?: boolean;
}

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
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  // `remove` is captured at click time and passed as the mutation variable so
  // the POST/DELETE decision never depends on the optimistic state flip below
  // (reading the mutable `isFavorited` inside mutationFn caused removals to
  // re-add because onMutate flipped it first).
  const favoriteMutation = useMutation({
    mutationFn: async (remove: boolean) => {
      const method = remove ? "DELETE" : "POST";
      return await apiRequest(`/api/favorites/${resourceId}`, {
        method,
        credentials: 'include'
      });
    },
    onMutate: async (remove: boolean) => {
      // Optimistic update
      setIsFavorited(!remove);
      setFavoriteCount(prev => remove ? Math.max(0, prev - 1) : prev + 1);
    },
    onSuccess: (data, remove) => {
      // Update with server response if available
      if (data?.isFavorited !== undefined) {
        setIsFavorited(data.isFavorited);
      }
      if (data?.favoriteCount !== undefined) {
        setFavoriteCount(data.favoriteCount);
      }
      
      // Invalidate any queries that might need updating
      queryClient.invalidateQueries({ queryKey: ['/api/favorites'] });
      queryClient.invalidateQueries({ queryKey: [`/api/resources/${resourceId}`] });
      
      toast({
        description: remove ? "Removed from favorites" : "Added to favorites",
        duration: 2000
      });
    },
    onError: (error, remove) => {
      // Revert optimistic update to the pre-click state
      setIsFavorited(remove);
      setFavoriteCount(initialCount);
      
      toast({
        title: "Error",
        description: "Failed to update favorite status. Please try again.",
        variant: "destructive"
      });
      
      console.error("Favorite mutation error:", error);
    }
  });

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // R2-L09: anonymous users get a clear sign-in prompt instead of a
    // confusing failed request. BUG-044/026 (run14): the toast carries a
    // working "Sign in" action preserving the current page via ?next=.
    if (!isAuthenticated) {
      toast({
        title: "Sign in to favorite",
        description: "Create an account or sign in to save your favorite resources.",
        action: (
          <ToastAction
            altText="Sign in"
            onClick={() =>
              setLocation(
                `/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`,
              )
            }
          >
            Sign in
          </ToastAction>
        ),
      });
      return;
    }

    favoriteMutation.mutate(isFavorited);
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
      disabled={favoriteMutation.isPending}
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
      {favoriteMutation.isPending && (
        <span className="absolute inset-0 animate-ping rounded-full bg-primary opacity-20" />
      )}
    </Button>
  );
}

export default memo(FavoriteButton);
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  resourceId: string;
  isFavorited?: boolean;
  favoriteCount?: number;
  className?: string;
  size?: "sm" | "default" | "lg";
  showCount?: boolean;
}

export default function FavoriteButton({
  resourceId,
  isFavorited: initialFavorited = false,
  favoriteCount: initialCount = 0,
  className,
  size = "default",
  showCount = true
}: FavoriteButtonProps) {
  // UUID validation: Only allow favoriting database resources with valid UUIDs
  // Static resources from awesome-list JSON have IDs like "video-34" which aren't valid UUIDs
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const cleanId = resourceId.startsWith('db-') ? resourceId.slice(3) : resourceId;
  const isValidDatabaseResource = uuidRegex.test(cleanId);

  // Don't render favorite button for static resources (can't be favorited - PostgreSQL UUID constraint)
  if (!isValidDatabaseResource) {
    return null;
  }

  const [isFavorited, setIsFavorited] = useState(initialFavorited);
  const [favoriteCount, setFavoriteCount] = useState(initialCount);
  const { toast } = useToast();

  const favoriteMutation = useMutation({
    mutationFn: async () => {
      const method = isFavorited ? "DELETE" : "POST";
      return await apiRequest(`/api/favorites/${resourceId}`, {
        method,
        credentials: 'include'
      });
    },
    onMutate: async () => {
      // Optimistic update
      setIsFavorited(!isFavorited);
      setFavoriteCount(prev => isFavorited ? Math.max(0, prev - 1) : prev + 1);
    },
    onSuccess: (data) => {
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
        description: isFavorited ? "Removed from favorites" : "Added to favorites",
        duration: 2000
      });
    },
    onError: (error) => {
      // Revert optimistic update
      setIsFavorited(isFavorited);
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
    favoriteMutation.mutate();
  };

  const iconSize = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-6 w-6" : "h-5 w-5";

  return (
    <Button
      variant="ghost"
      size={size}
      className={cn(
        "group relative",
        isFavorited && "text-pink-500 hover:text-pink-600",
        className
      )}
      onClick={handleClick}
      disabled={favoriteMutation.isPending}
      aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
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
        <span className="absolute inset-0 animate-ping rounded-full bg-pink-500 opacity-20" />
      )}
    </Button>
  );
}
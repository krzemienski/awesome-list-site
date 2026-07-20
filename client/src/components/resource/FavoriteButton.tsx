import { useState, memo, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, ApiError } from "@/lib/queryClient";
import { humanizeApiError } from "@/lib/apiError";
import { notifyCrossTabSync } from "@/lib/crossTabSync";
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

  // NB-024 (run18): keep a handle to the previous favorite toast and dismiss it
  // before firing a new one, so rapid toggles never leave a stale toast
  // contradicting the final favorited state.
  const lastToastRef = useRef<{ dismiss: () => void } | null>(null);
  const showFavoriteToast = (opts: Parameters<typeof toast>[0]) => {
    lastToastRef.current?.dismiss();
    lastToastRef.current = toast(opts);
  };

  // NB-024/NB-059 (run24): latest-wins for rapid toggles. Clicks that land
  // while a request is in flight used to be silently dropped, leaving the UI
  // showing a state the server never received. Now an in-flight click flips
  // the UI optimistically and records the DESIRED final state here; when the
  // active request settles, onSettled fires at most ONE follow-up request to
  // converge on it — one request per final state, never a queue per click.
  const desiredRef = useRef<boolean | null>(null);

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
      // R4-081: mirror the change into other open tabs' favorites.
      notifyCrossTabSync();
      
      showFavoriteToast({
        description: remove ? "Removed from favorites" : "Added to favorites",
        duration: 2000
      });
    },
    onError: (error, remove) => {
      // Revert optimistic update to the pre-click state
      setIsFavorited(remove);
      setFavoriteCount(initialCount);

      // R4-056: favorite failures used to roll back silently with no feedback.
      // A 401 (session expired / cross-tab logout — see R4-081) prompts the user
      // to sign in again; every other failure (500/network) shows a humanized
      // destructive toast instead of the raw "STATUS: body" error.
      const status = error instanceof ApiError ? error.status : 0;
      if (status === 401) {
        showFavoriteToast({
          title: "Sign in to favorite",
          description: "Your session has expired. Please sign in again to save favorites.",
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
      } else {
        showFavoriteToast({
          title: "Couldn't update favorite",
          description: humanizeApiError(error, "Failed to update favorite status. Please try again."),
          variant: "destructive",
        });
      }

      // BUG-038 (run24): a 401 is an expected signed-out/expired-session
      // outcome already surfaced via the toast — don't log it as an error.
      if (status !== 401) {
        console.error("Favorite mutation error:", error);
      }
    },
    onSettled: (data, error, remove) => {
      // NB-024/NB-059 (run24): converge on the latest desired state with at
      // most one follow-up request.
      const desired = desiredRef.current;
      desiredRef.current = null;
      if (desired === null) return;
      const finalState = error ? remove : (data?.isFavorited ?? !remove);
      if (desired !== finalState) {
        favoriteMutation.mutate(!desired);
      }
    }
  });

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // NB-059/NB-022 (run18): guard in-flight clicks here instead of the native
    // `disabled` attribute — a disabled flip while focused drops focus to body.
    // NB-024/NB-059 (run24): instead of dropping the click, flip the UI and
    // record the desired state — onSettled converges with one request.
    if (favoriteMutation.isPending) {
      if (isAuthenticated) {
        const next = !isFavorited;
        desiredRef.current = next;
        setIsFavorited(next);
        setFavoriteCount(prev => (next ? prev + 1 : Math.max(0, prev - 1)));
      }
      return;
    }

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
      aria-disabled={favoriteMutation.isPending}
      aria-busy={favoriteMutation.isPending}
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
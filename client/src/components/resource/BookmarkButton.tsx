import { useState, memo, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Bookmark, BookmarkPlus, NotebookPen } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, ApiError } from "@/lib/queryClient";
import { humanizeApiError } from "@/lib/apiError";
import { notifyCrossTabSync } from "@/lib/crossTabSync";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface BookmarkButtonProps {
  resourceId: string;
  isBookmarked?: boolean;
  notes?: string;
  className?: string;
  size?: "sm" | "default" | "lg";
  showNotesDialog?: boolean;
}

function BookmarkButton({
  resourceId,
  isBookmarked: initialBookmarked = false,
  notes: initialNotes = "",
  className,
  size = "default",
  showNotesDialog = true
}: BookmarkButtonProps) {
  const [isBookmarked, setIsBookmarked] = useState(initialBookmarked);
  const [notes, setNotes] = useState(initialNotes);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [tempNotes, setTempNotes] = useState("");
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  // NB-024 (run18): keep a handle to the previous bookmark toast and dismiss it
  // before firing a new one, so rapid toggles never leave a stale "Removed"
  // toast contradicting the final bookmarked state.
  const lastToastRef = useRef<{ dismiss: () => void } | null>(null);
  const showBookmarkToast = (opts: Parameters<typeof toast>[0]) => {
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
  // (reading the mutable `isBookmarked` inside mutationFn caused removals to
  // re-add because onMutate flipped it first).
  const bookmarkMutation = useMutation({
    mutationFn: async (vars: { notes?: string; remove: boolean }) => {
      if (!vars.remove) {
        // Add bookmark
        return await apiRequest(`/api/bookmarks/${resourceId}`, {
          method: "POST",
          body: JSON.stringify(vars.notes !== undefined ? { notes: vars.notes } : {}),
          credentials: 'include'
        });
      } else {
        // Remove bookmark
        return await apiRequest(`/api/bookmarks/${resourceId}`, {
          method: "DELETE",
          credentials: 'include'
        });
      }
    },
    onMutate: async (vars) => {
      // Optimistic update for immediate feedback
      setIsBookmarked(!vars.remove);
    },
    onSuccess: (data, vars) => {
      // Update with server response
      if (data?.isBookmarked !== undefined) {
        setIsBookmarked(data.isBookmarked);
      }
      if (data?.notes !== undefined) {
        setNotes(data.notes);
      }
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['/api/bookmarks'] });
      queryClient.invalidateQueries({ queryKey: [`/api/resources/${resourceId}`] });
      // R4-081: mirror the change into other open tabs' bookmark lists.
      notifyCrossTabSync();
      
      if (vars.remove) {
        // Run17 BUG-013: removal is one click — give the toast a working Undo
        // so a misclick isn't permanent (notes are restored too).
        const restoredNotes = notes;
        showBookmarkToast({
          description: "Bookmark removed",
          duration: 6000,
          action: (
            <ToastAction
              altText="Undo bookmark removal"
              onClick={async () => {
                try {
                  await apiRequest(`/api/bookmarks/${resourceId}`, {
                    method: "POST",
                    body: JSON.stringify(restoredNotes ? { notes: restoredNotes } : {}),
                    credentials: "include",
                  });
                  setIsBookmarked(true);
                  queryClient.invalidateQueries({ queryKey: ["/api/bookmarks"] });
                  queryClient.invalidateQueries({ queryKey: [`/api/resources/${resourceId}`] });
                  showBookmarkToast({ description: "Bookmark restored", duration: 2000 });
                } catch {
                  toast({
                    title: "Error",
                    description: "Couldn't restore the bookmark. Please try again.",
                    variant: "destructive",
                  });
                }
              }}
            >
              Undo
            </ToastAction>
          ),
        });
      } else {
        showBookmarkToast({ description: "Bookmark added", duration: 2000 });
      }
      
      // Close notes dialog if open
      setNotesDialogOpen(false);
      setTempNotes("");
    },
    onError: (error, vars) => {
      // Revert optimistic update to the pre-click state
      setIsBookmarked(vars.remove);

      // R4-056: bookmark failures used to roll back silently with no feedback.
      // A 401 (session expired / cross-tab logout — see R4-081) prompts the user
      // to sign in again; every other failure (500/network) shows a humanized
      // destructive toast instead of the raw "STATUS: body" error.
      const status = error instanceof ApiError ? error.status : 0;
      if (status === 401) {
        showBookmarkToast({
          title: "Sign in to bookmark",
          description: "Your session has expired. Please sign in again to save resources.",
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
        showBookmarkToast({
          title: "Couldn't update bookmark",
          description: humanizeApiError(error, "Failed to update bookmark. Please try again."),
          variant: "destructive",
        });
      }

      // BUG-038 (run24): a 401 is an expected signed-out/expired-session
      // outcome already surfaced via the toast — don't log it as an error.
      if (status !== 401) {
        console.error("Bookmark mutation error:", error);
      }
    },
    onSettled: (data, error, vars) => {
      // NB-024/NB-059 (run24): converge on the latest desired state with at
      // most one follow-up request.
      const desired = desiredRef.current;
      desiredRef.current = null;
      if (desired === null) return;
      const finalState = error ? vars.remove : (data?.isBookmarked ?? !vars.remove);
      if (desired !== finalState) {
        bookmarkMutation.mutate({ remove: !desired });
      }
    }
  });

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // NB-059/NB-022 (run18): guard in-flight clicks here instead of the native
    // `disabled` attribute — a disabled flip while focused drops focus to body.
    // NB-024/NB-059 (run24): instead of dropping the click, flip the UI and
    // record the desired state — onSettled converges with one request (the
    // notes dialog is skipped for these rapid toggles; notes can be added
    // afterwards via the normal flow).
    if (bookmarkMutation.isPending) {
      if (isAuthenticated) {
        const next = !isBookmarked;
        desiredRef.current = next;
        setIsBookmarked(next);
      }
      return;
    }

    // R2-L09: anonymous users get a clear sign-in prompt instead of a
    // confusing failed request. BUG-044/026 (run14): the toast carries a
    // working "Sign in" action preserving the current page via ?next=.
    if (!isAuthenticated) {
      toast({
        title: "Sign in to bookmark",
        description: "Create an account or sign in to save resources to your bookmarks.",
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

    if (!isBookmarked && showNotesDialog) {
      // Open notes dialog for new bookmark
      setTempNotes(notes);
      setNotesDialogOpen(true);
    } else {
      // Toggle bookmark directly
      bookmarkMutation.mutate({ remove: isBookmarked });
    }
  };

  const handleSaveWithNotes = () => {
    bookmarkMutation.mutate({ notes: tempNotes, remove: false });
  };

  const handleSaveWithoutNotes = () => {
    bookmarkMutation.mutate({ remove: false });
  };

  const iconSize = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-6 w-6" : "h-5 w-5";

  return (
    <>
      <Button
        variant="ghost"
        size={size}
        className={cn(
          "group relative",
          isBookmarked && "text-primary hover:text-primary/90",
          className
        )}
        onClick={handleClick}
        aria-disabled={bookmarkMutation.isPending}
        aria-busy={bookmarkMutation.isPending}
        aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}
        aria-pressed={isBookmarked}
        data-testid="button-bookmark"
      >
        <div className="flex items-center gap-1.5">
          {isBookmarked ? (
            <Bookmark
              className={cn(
                iconSize,
                "transition-all duration-200 fill-current",
                "group-hover:scale-110"
              )}
            />
          ) : (
            <BookmarkPlus
              className={cn(
                iconSize,
                "transition-all duration-200",
                "group-hover:scale-110"
              )}
            />
          )}
          {notes && (
            <NotebookPen className="h-3 w-3 text-muted-foreground" />
          )}
        </div>
        
        {/* Ripple effect on click */}
        {bookmarkMutation.isPending && (
          <span className="absolute inset-0 animate-ping rounded-full bg-primary opacity-20" />
        )}
      </Button>

      {/* Notes Dialog */}
      <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookmarkPlus className="h-5 w-5 text-primary" />
              Add Bookmark
            </DialogTitle>
            <DialogDescription>
              Add optional notes to remember why you bookmarked this resource.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add your thoughts, reminders, or why this resource is useful..."
                className="min-h-[100px] resize-none"
                value={tempNotes}
                onChange={(e) => setTempNotes(e.target.value)}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">
                {tempNotes.length}/500 characters
              </p>
            </div>
          </div>
          
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={handleSaveWithoutNotes}
              disabled={bookmarkMutation.isPending}
              className="flex-1 sm:flex-initial"
            >
              Save without notes
            </Button>
            <Button
              onClick={handleSaveWithNotes}
              disabled={bookmarkMutation.isPending}
              className="flex-1 sm:flex-initial bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 text-white border-0"
            >
              <NotebookPen className="h-4 w-4 mr-2" />
              Save with notes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default memo(BookmarkButton);
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
import { queryClient, apiRequest } from "@/lib/queryClient";
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
      
      toast({
        title: "Error",
        description: "Failed to update bookmark. Please try again.",
        variant: "destructive"
      });
      
      console.error("Bookmark mutation error:", error);
    }
  });

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // NB-059/NB-022 (run18): guard in-flight clicks here instead of the native
    // `disabled` attribute — a disabled flip while focused drops focus to body.
    if (bookmarkMutation.isPending) return;

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
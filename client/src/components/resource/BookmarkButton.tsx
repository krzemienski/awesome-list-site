import { useState, memo } from "react";
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
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useBookmarkToggle } from "@/hooks/useResourceToggle";
import { cn } from "@/lib/utils";

interface BookmarkButtonProps {
  resourceId: string;
  isBookmarked?: boolean;
  notes?: string;
  className?: string;
  size?: "sm" | "default" | "lg";
  showNotesDialog?: boolean;
}

// All toggle behavior (latest-wins rapid clicks, auth gate, error handling,
// invalidation, cross-tab sync) lives in the shared useBookmarkToggle hook —
// this component owns its optimistic local state, notes dialog, and visuals.
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

  const bookmark = useBookmarkToggle({
    resourceId,
    isActive: isBookmarked,
    onOptimistic: (next) => {
      setIsBookmarked(next);
    },
    onSuccess: (data, vars, showToast) => {
      // Update with server response
      if (data?.isBookmarked !== undefined) {
        setIsBookmarked(data.isBookmarked);
      }
      if (data?.notes !== undefined) {
        setNotes(data.notes);
      }

      if (vars.remove) {
        // Run17 BUG-013: removal is one click — give the toast a working Undo
        // so a misclick isn't permanent (notes are restored too).
        const restoredNotes = notes;
        showToast({
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
                  showToast({ description: "Bookmark restored", duration: 2000 });
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
        showToast({ description: "Bookmark added", duration: 2000 });
      }

      // Close notes dialog if open
      setNotesDialogOpen(false);
      setTempNotes("");
    },
    onErrorRevert: (vars) => {
      // Revert optimistic update to the pre-click state
      setIsBookmarked(vars.remove);
    },
  });

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Activating with the notes dialog enabled opens the dialog instead of
    // firing the request immediately (rapid in-flight toggles skip the
    // dialog inside the hook; notes can be added afterwards).
    bookmark.toggle({
      interceptActivate: () => {
        if (!showNotesDialog) return false;
        setTempNotes(notes);
        setNotesDialogOpen(true);
        return true;
      },
    });
  };

  const handleSaveWithNotes = () => {
    bookmark.mutate({ notes: tempNotes, remove: false });
  };

  const handleSaveWithoutNotes = () => {
    bookmark.mutate({ remove: false });
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
        aria-disabled={bookmark.isPending}
        aria-busy={bookmark.isPending}
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
        {bookmark.isPending && (
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
              disabled={bookmark.isPending}
              className="flex-1 sm:flex-initial"
            >
              Save without notes
            </Button>
            <Button
              onClick={handleSaveWithNotes}
              disabled={bookmark.isPending}
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

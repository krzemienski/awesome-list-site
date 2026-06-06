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
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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

  const bookmarkMutation = useMutation({
    // The action ("add" | "remove") is decided by the caller at click time and
    // passed in explicitly. It must NOT be re-derived from `isBookmarked` here,
    // because onMutate optimistically flips that state before mutationFn runs —
    // re-reading it would fire the opposite request (a DELETE that becomes an
    // upserting POST), leaving the row in place while the icon flips.
    mutationFn: async (payload: { action: "add" | "remove"; notes?: string }) => {
      if (payload.action === "add") {
        return await apiRequest(`/api/bookmarks/${resourceId}`, {
          method: "POST",
          body: JSON.stringify({ notes: payload.notes }),
          credentials: 'include'
        });
      } else {
        return await apiRequest(`/api/bookmarks/${resourceId}`, {
          method: "DELETE",
          credentials: 'include'
        });
      }
    },
    onMutate: async (payload) => {
      // Optimistic update for immediate feedback. Set state to the explicit
      // target of the action rather than toggling the current value.
      if (!showNotesDialog || payload.action === "remove") {
        setIsBookmarked(payload.action === "add");
      }
    },
    onSuccess: (data, payload) => {
      // Reflect the action we just performed (server returns a message only).
      setIsBookmarked(payload.action === "add");
      if (data?.notes !== undefined) {
        setNotes(data.notes);
      }

      // Invalidate related queries so lists/detail refetch fresh state.
      queryClient.invalidateQueries({ queryKey: ['/api/bookmarks'] });
      queryClient.invalidateQueries({ queryKey: [`/api/resources/${resourceId}`] });

      toast({
        description: payload.action === "add" ? "Bookmark added" : "Bookmark removed",
        duration: 2000
      });

      // Close notes dialog if open
      setNotesDialogOpen(false);
      setTempNotes("");
    },
    onError: (error, payload) => {
      // Revert optimistic update to the state before the action.
      setIsBookmarked(payload.action === "remove");

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

    if (!isBookmarked && showNotesDialog) {
      // Open notes dialog for new bookmark
      setTempNotes(notes);
      setNotesDialogOpen(true);
    } else {
      // Decide the action from the CURRENT state, captured before any optimistic flip.
      bookmarkMutation.mutate({ action: isBookmarked ? "remove" : "add" });
    }
  };

  const handleSaveWithNotes = () => {
    bookmarkMutation.mutate({ action: "add", notes: tempNotes });
  };

  const handleSaveWithoutNotes = () => {
    bookmarkMutation.mutate({ action: "add" });
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
        disabled={bookmarkMutation.isPending}
        aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}
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
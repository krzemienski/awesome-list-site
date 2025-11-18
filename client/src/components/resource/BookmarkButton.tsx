import { useState } from "react";
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

export default function BookmarkButton({
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
    mutationFn: async (payload?: { notes?: string }) => {
      if (!isBookmarked) {
        // Add bookmark
        return await apiRequest(`/api/bookmarks/${resourceId}`, {
          method: "POST",
          body: JSON.stringify(payload || {}),
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
    onMutate: async () => {
      // Optimistic update for immediate feedback
      if (!showNotesDialog || isBookmarked) {
        setIsBookmarked(!isBookmarked);
      }
    },
    onSuccess: (data) => {
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
      
      toast({
        description: isBookmarked ? "Bookmark removed" : "Bookmark added",
        duration: 2000
      });
      
      // Close notes dialog if open
      setNotesDialogOpen(false);
      setTempNotes("");
    },
    onError: (error) => {
      // Revert optimistic update
      setIsBookmarked(isBookmarked);
      
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
      // Toggle bookmark directly
      bookmarkMutation.mutate();
    }
  };

  const handleSaveWithNotes = () => {
    bookmarkMutation.mutate({ notes: tempNotes });
  };

  const handleSaveWithoutNotes = () => {
    bookmarkMutation.mutate();
  };

  const iconSize = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-6 w-6" : "h-5 w-5";

  return (
    <>
      <Button
        variant="ghost"
        size={size}
        className={cn(
          "group relative",
          isBookmarked && "text-cyan-500 hover:text-cyan-600",
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
          <span className="absolute inset-0 animate-ping rounded-full bg-cyan-500 opacity-20" />
        )}
      </Button>

      {/* Notes Dialog */}
      <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookmarkPlus className="h-5 w-5 text-cyan-500" />
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
              className="flex-1 sm:flex-initial bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white border-0"
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
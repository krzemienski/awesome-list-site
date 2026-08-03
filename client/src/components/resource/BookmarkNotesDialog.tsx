import { Button } from "@/components/ui/button";
import { BookmarkPlus, NotebookPen } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface BookmarkNotesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** "add" = bookmarking now (offers "Save without notes"); "edit" = updating
   * the notes on an existing bookmark (offers Cancel). */
  mode: "add" | "edit";
  notes: string;
  onNotesChange: (value: string) => void;
  onSaveWithNotes: () => void;
  onSaveWithoutNotes: () => void;
  isPending?: boolean;
}

/**
 * BUG-021/BUG-061 (run25): the ONE bookmark-notes dialog, shared by
 * ResourceCard's BookmarkButton and the resource detail page so both entry
 * points run the identical flow (the detail page used to instant-toggle with
 * no way to attach notes).
 */
export default function BookmarkNotesDialog({
  open,
  onOpenChange,
  mode,
  notes,
  onNotesChange,
  onSaveWithNotes,
  onSaveWithoutNotes,
  isPending = false,
}: BookmarkNotesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === "add" ? (
              <>
                <BookmarkPlus className="h-5 w-5 text-primary" />
                Add Bookmark
              </>
            ) : (
              <>
                <NotebookPen className="h-5 w-5 text-primary" />
                Edit Bookmark Notes
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {mode === "add"
              ? "Add optional notes to remember why you bookmarked this resource."
              : "Update the notes saved with this bookmark."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="bookmark-notes">Notes (optional)</Label>
            <Textarea
              id="bookmark-notes"
              placeholder="Add your thoughts, reminders, or why this resource is useful..."
              className="min-h-[100px] resize-none"
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              maxLength={500}
              data-testid="textarea-bookmark-notes"
            />
            <p className="text-xs text-muted-foreground text-right">
              {notes.length}/500 characters
            </p>
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-0">
          {mode === "add" ? (
            <Button
              variant="outline"
              onClick={onSaveWithoutNotes}
              disabled={isPending}
              className="flex-1 sm:flex-initial"
              data-testid="button-save-without-notes"
            >
              Save without notes
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
              className="flex-1 sm:flex-initial"
              data-testid="button-cancel-notes"
            >
              Cancel
            </Button>
          )}
          <Button
            onClick={onSaveWithNotes}
            disabled={isPending}
            className="flex-1 sm:flex-initial bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 text-white border-0"
            data-testid="button-save-with-notes"
          >
            <NotebookPen className="h-4 w-4 mr-2" />
            {mode === "add" ? "Save with notes" : "Save notes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

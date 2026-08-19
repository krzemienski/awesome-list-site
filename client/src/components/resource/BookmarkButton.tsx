import { useState, useRef, useEffect, memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Bookmark, BookmarkPlus, NotebookPen } from "lucide-react";
import BookmarkNotesDialog from "./BookmarkNotesDialog";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useBookmarkToggle } from "@/hooks/useResourceToggle";
import { useAuth } from "@/hooks/useAuth";
import { useGuestBookmarkIds } from "@/lib/guestBookmarks";
import { cn } from "@/lib/utils";
import type { BookmarkCollection } from "@/types/bookmarks";

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
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add");
  const [tempNotes, setTempNotes] = useState("");
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<number[]>([]);
  const originalCollectionIdsRef = useRef<number[]>([]);
  const desiredCollectionIdsRef = useRef<number[]>([]);
  // BUG-021 (run25): remembers whether the in-flight save came from the edit
  // dialog so the success toast says "Notes saved", not "Bookmark added".
  const saveModeRef = useRef<"add" | "edit">("add");
  const { toast } = useToast();

  // BUG-021 review fix: not every surface can thread bookmark state through
  // props (list/compact view modes, search results, category grids receive
  // bare resources). Derive server truth from the shared /api/bookmarks
  // query — the same key every bookmark surface uses and the toggle hook
  // invalidates — so the icon state and note prefill are correct everywhere
  // and an edit can never start from a stale/empty note and overwrite the
  // saved one. Props remain the initial seed until the list loads.
  const { isAuthenticated } = useAuth();
  const { data: bookmarksList } = useQuery<Array<{
    id: number | string;
    notes?: string | null;
    collectionIds?: number[];
  }>>({
    queryKey: ["/api/bookmarks"],
    enabled: isAuthenticated,
    staleTime: 60_000,
  });
  const serverEntry = bookmarksList?.find((b) => String(b.id) === String(resourceId));
  const serverBookmarked = bookmarksList !== undefined ? !!serverEntry : initialBookmarked;
  const serverNotes = bookmarksList !== undefined ? (serverEntry?.notes ?? "") : initialNotes;
  // Task #329: signed-out surfaces derive saved state from the on-device
  // guest store (the authed list query above is disabled for guests), so
  // guest saves light up every card/list/detail surface and stay in sync
  // across tabs. Guests have plain saves — no notes.
  const guestIds = useGuestBookmarkIds();
  const effectiveBookmarked = isAuthenticated
    ? serverBookmarked
    : guestIds.has(Number(resourceId));
  const effectiveNotes = isAuthenticated ? serverNotes : "";
  useEffect(() => {
    setIsBookmarked(effectiveBookmarked);
  }, [effectiveBookmarked]);
  useEffect(() => {
    setNotes(effectiveNotes);
  }, [effectiveNotes]);
  const { data: collections = [], isLoading: collectionsLoading } = useQuery<BookmarkCollection[]>({
    queryKey: ["/api/collections?includeArchived=true"],
    enabled: isAuthenticated && notesDialogOpen,
    staleTime: 60_000,
  });

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
        setNotes(data.notes ?? "");
      } else if (!vars.remove && vars.notes !== undefined) {
        // Fallback: sync from what we submitted if the server omits notes.
        setNotes(vars.notes);
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
        showToast({
          description: saveModeRef.current === "edit" ? "Notes saved" : "Bookmark added",
          duration: 2000,
        });
      }
      if (!vars.remove && showNotesDialog) {
        const original = new Set(originalCollectionIdsRef.current);
        const desired = new Set(desiredCollectionIdsRef.current);
        const additions = Array.from(desired).filter((id) => !original.has(id));
        const removals = Array.from(original).filter((id) => !desired.has(id));
        if (additions.length || removals.length) {
          void Promise.allSettled([
            ...additions.map((collectionId) =>
              apiRequest(`/api/collections/${collectionId}/items/${resourceId}`, {
                method: "POST",
              }),
            ),
            ...removals.map((collectionId) =>
              apiRequest(`/api/collections/${collectionId}/items/${resourceId}`, {
                method: "DELETE",
              }),
            ),
          ]).then((results) => {
            queryClient.invalidateQueries({ queryKey: ["/api/bookmarks"] });
            queryClient.invalidateQueries({
              queryKey: ["/api/collections?includeArchived=true"],
            });
            if (results.some((result) => result.status === "rejected")) {
              toast({
                title: "Bookmark saved",
                description:
                  "Some collection choices couldn't be updated. Open the bookmark again to retry.",
                variant: "destructive",
              });
            }
          });
        }
      }
      saveModeRef.current = "add";

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
        setDialogMode("add");
        setTempNotes(notes);
        const current = serverEntry?.collectionIds ?? [];
        originalCollectionIdsRef.current = current;
        setSelectedCollectionIds(current);
        setNotesDialogOpen(true);
        return true;
      },
    });
  };

  // BUG-021 (run25): notes used to be write-only — visible as a dead icon,
  // never editable, and the only "way in" removed the bookmark. The pen is
  // now its own button that opens the shared dialog in edit mode.
  const handleEditNotesClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDialogMode("edit");
    setTempNotes(notes);
    const current = serverEntry?.collectionIds ?? [];
    originalCollectionIdsRef.current = current;
    setSelectedCollectionIds(current);
    setNotesDialogOpen(true);
  };

  const handleSaveWithNotes = () => {
    saveModeRef.current = dialogMode;
    desiredCollectionIdsRef.current = selectedCollectionIds;
    bookmark.mutate({ notes: tempNotes, remove: false });
  };

  const handleSaveWithoutNotes = () => {
    saveModeRef.current = dialogMode;
    desiredCollectionIdsRef.current = selectedCollectionIds;
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
        </div>

        {/* Ripple effect on click */}
        {bookmark.isPending && (
          <span className="absolute inset-0 animate-ping rounded-full bg-primary opacity-20" />
        )}
      </Button>

      {isBookmarked && showNotesDialog && notes && (
        <Button
          variant="ghost"
          size={size}
          className={cn("text-muted-foreground hover:text-foreground", className)}
          onClick={handleEditNotesClick}
          aria-label="View or edit bookmark notes"
          data-testid="button-edit-bookmark-notes"
        >
          <NotebookPen className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
        </Button>
      )}

      <BookmarkNotesDialog
        open={notesDialogOpen}
        onOpenChange={setNotesDialogOpen}
        mode={dialogMode}
        notes={tempNotes}
        onNotesChange={setTempNotes}
        onSaveWithNotes={handleSaveWithNotes}
        onSaveWithoutNotes={handleSaveWithoutNotes}
        isPending={bookmark.isPending}
        collections={collections}
        selectedCollectionIds={selectedCollectionIds}
        onCollectionToggle={(collectionId, selected) =>
          setSelectedCollectionIds((current) =>
            selected
              ? current.includes(collectionId)
                ? current
                : [...current, collectionId]
              : current.filter((id) => id !== collectionId),
          )
        }
        collectionsLoading={collectionsLoading}
      />
    </>
  );
}

export default memo(BookmarkButton);

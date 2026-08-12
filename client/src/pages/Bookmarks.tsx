import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Archive,
  ArrowDown,
  ArrowUp,
  Bookmark,
  BookmarkX,
  CheckCheck,
  Clipboard,
  Folder,
  FolderArchive,
  FolderPlus,
  Globe2,
  NotebookPen,
  Pencil,
  RotateCcw,
  Trash2,
} from "lucide-react";
import type { BookmarkQueueStatus } from "@shared/bookmarkCollections";
import {
  BOOKMARK_QUEUE_LABELS,
  BOOKMARK_QUEUE_STATUSES,
} from "@shared/bookmarkCollections";
import type {
  BookmarkCollection,
  BookmarkedResource,
} from "@/types/bookmarks";
import { ResourceCardSkeleton, PageHeaderSkeleton } from "@/components/ui/skeletons";
import ResourceCard from "@/components/resource/ResourceCard";
import BookmarkNotesDialog from "@/components/resource/BookmarkNotesDialog";
import SEOHead from "@/components/layout/SEOHead";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { writeFilterParams, usePopstateParams } from "@/lib/url-filter-state";

type StatusFilter = BookmarkQueueStatus | "all";
type ArchiveFilter = "active" | "archived";
type SortValue = "date-desc" | "date-asc" | "name-asc" | "name-desc" | "category";

const VALID_SORTS = new Set<SortValue>([
  "date-desc",
  "date-asc",
  "name-asc",
  "name-desc",
  "category",
]);

function readStatus(params: URLSearchParams): StatusFilter {
  const value = params.get("status");
  return BOOKMARK_QUEUE_STATUSES.includes(value as BookmarkQueueStatus)
    ? (value as BookmarkQueueStatus)
    : "all";
}

function readArchive(params: URLSearchParams): ArchiveFilter {
  return params.get("archived") === "archived" ? "archived" : "active";
}

function readSort(params: URLSearchParams): SortValue {
  const value = params.get("sort") as SortValue | null;
  return value && VALID_SORTS.has(value) ? value : "date-desc";
}

function readCollection(params: URLSearchParams): string {
  const value = params.get("collection");
  return value && /^\d+$/.test(value) ? value : "all";
}

type ActionRequest = {
  url: string;
  method: "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  success: string | ((data: any) => string);
  after?: (data: any) => void;
};

export default function Bookmarks() {
  const initialParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const [collectionFilter, setCollectionFilter] = useState(() => readCollection(initialParams));
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(() => readStatus(initialParams));
  const [archiveFilter, setArchiveFilter] = useState<ArchiveFilter>(() => readArchive(initialParams));
  const [sortBy, setSortBy] = useState<SortValue>(() => readSort(initialParams));
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const [collectionDialogOpen, setCollectionDialogOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<BookmarkCollection | null>(null);
  const [collectionName, setCollectionName] = useState("");
  const [deleteCollection, setDeleteCollection] = useState<BookmarkCollection | null>(null);
  const [bulkStatus, setBulkStatus] = useState<BookmarkQueueStatus>("watch-next");
  const [bulkDestination, setBulkDestination] = useState("");
  const [bulkTag, setBulkTag] = useState("");
  const [noteTarget, setNoteTarget] = useState<BookmarkedResource | null>(null);
  const [noteText, setNoteText] = useState("");
  const { toast } = useToast();

  const {
    data: bookmarks = [],
    isLoading: bookmarksLoading,
    error: bookmarksError,
  } = useQuery<BookmarkedResource[]>({
    queryKey: ["/api/bookmarks"],
    staleTime: 30_000,
  });
  const {
    data: collections = [],
    isLoading: collectionsLoading,
    error: collectionsError,
  } = useQuery<BookmarkCollection[]>({
    queryKey: ["/api/collections?includeArchived=true"],
    staleTime: 30_000,
  });

  const refreshLibrary = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["/api/bookmarks"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/collections?includeArchived=true"] }),
    ]);
  };

  const actionMutation = useMutation<any, Error, ActionRequest>({
    mutationFn: ({ url, method, body }) =>
      apiRequest(url, {
        method,
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
    onSuccess: async (data, request) => {
      await refreshLibrary();
      request.after?.(data);
      toast({
        description:
          typeof request.success === "function"
            ? request.success(data)
            : request.success,
        duration: 3000,
      });
    },
    onError: () => {
      toast({
        title: "Couldn't update your library",
        description: "Nothing was changed. Please try again.",
        variant: "destructive",
      });
    },
  });

  usePopstateParams((params) => {
    setCollectionFilter(readCollection(params));
    setStatusFilter(readStatus(params));
    setArchiveFilter(readArchive(params));
    setSortBy(readSort(params));
  });

  useEffect(() => {
    setSelected(new Set());
  }, [collectionFilter, statusFilter, archiveFilter, sortBy]);

  const counts = useMemo(() => {
    const active = bookmarks.filter((bookmark) => !bookmark.archivedAt);
    return {
      active: active.length,
      archived: bookmarks.length - active.length,
      saved: active.filter((bookmark) => bookmark.queueStatus === "saved").length,
      "watch-next": active.filter((bookmark) => bookmark.queueStatus === "watch-next").length,
      "in-progress": active.filter((bookmark) => bookmark.queueStatus === "in-progress").length,
      done: active.filter((bookmark) => bookmark.queueStatus === "done").length,
    };
  }, [bookmarks]);

  const filteredBookmarks = useMemo(() => {
    const rows = bookmarks.filter((bookmark) => {
      const archiveMatches =
        archiveFilter === "archived" ? !!bookmark.archivedAt : !bookmark.archivedAt;
      const statusMatches =
        statusFilter === "all" || bookmark.queueStatus === statusFilter;
      const collectionMatches =
        collectionFilter === "all" ||
        bookmark.collectionIds.includes(Number(collectionFilter));
      return archiveMatches && statusMatches && collectionMatches;
    });

    return [...rows].sort((a, b) => {
      if (sortBy === "name-asc") return a.title.localeCompare(b.title);
      if (sortBy === "name-desc") return b.title.localeCompare(a.title);
      if (sortBy === "category") return (a.category || "").localeCompare(b.category || "");
      const left = a.bookmarkedAt ? new Date(a.bookmarkedAt).getTime() : 0;
      const right = b.bookmarkedAt ? new Date(b.bookmarkedAt).getTime() : 0;
      return sortBy === "date-asc" ? left - right : right - left;
    });
  }, [archiveFilter, bookmarks, collectionFilter, sortBy, statusFilter]);

  useEffect(() => {
    const match = window.location.hash.match(/^#bookmark-(\d+)$/);
    if (!match || filteredBookmarks.length === 0) return;
    const target = document.getElementById(`bookmark-${match[1]}`);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.focus({ preventScroll: true });
  }, [filteredBookmarks]);

  const selectedCollection =
    collectionFilter === "all"
      ? null
      : collections.find((collection) => collection.id === Number(collectionFilter)) ?? null;
  const selectedIds = Array.from(selected);
  const allShownSelected =
    filteredBookmarks.length > 0 &&
    filteredBookmarks.every((bookmark) => selected.has(bookmark.id));

  const chooseCollection = (value: string) => {
    setCollectionFilter(value);
    writeFilterParams({ collection: value === "all" ? null : value });
  };
  const chooseStatus = (value: StatusFilter) => {
    setStatusFilter(value);
    writeFilterParams({ status: value === "all" ? null : value });
  };
  const chooseArchive = (value: ArchiveFilter) => {
    setArchiveFilter(value);
    writeFilterParams({ archived: value === "active" ? null : "archived" });
  };
  const chooseSort = (value: SortValue) => {
    setSortBy(value);
    writeFilterParams({ sort: value === "date-desc" ? null : value });
  };

  const openCreateCollection = () => {
    setEditingCollection(null);
    setCollectionName("");
    setCollectionDialogOpen(true);
  };
  const openRenameCollection = (collection: BookmarkCollection) => {
    setEditingCollection(collection);
    setCollectionName(collection.name);
    setCollectionDialogOpen(true);
  };
  const submitCollection = () => {
    const name = collectionName.trim();
    if (!name) return;
    actionMutation.mutate({
      url: editingCollection
        ? `/api/collections/${editingCollection.id}`
        : "/api/collections",
      method: editingCollection ? "PATCH" : "POST",
      body: { name },
      success: editingCollection ? "Collection renamed" : "Collection created",
      after: (data) => {
        setCollectionDialogOpen(false);
        setCollectionName("");
        setEditingCollection(null);
        if (!editingCollection && data?.id) chooseCollection(String(data.id));
      },
    });
  };

  const reorderCollection = (index: number, direction: -1 | 1) => {
    const destination = index + direction;
    if (destination < 0 || destination >= collections.length) return;
    const ordered = collections.map((collection) => collection.id);
    [ordered[index], ordered[destination]] = [ordered[destination], ordered[index]];
    actionMutation.mutate({
      url: "/api/collections/reorder",
      method: "PUT",
      body: { orderedIds: ordered },
      success: "Collection order updated",
    });
  };

  const runBulk = (action: unknown, message: string) => {
    if (!selectedIds.length) return;
    actionMutation.mutate({
      url: "/api/bookmarks/bulk",
      method: "POST",
      body: { resourceIds: selectedIds, action },
      success: (data) =>
        data.failed?.length
          ? `${data.succeeded.length} updated; ${data.failed.length} couldn't be changed`
          : message,
      after: () => setSelected(new Set()),
    });
  };

  const saveNote = () => {
    if (!noteTarget) return;
    actionMutation.mutate({
      url: `/api/bookmarks/${noteTarget.id}`,
      method: "POST",
      body: { notes: noteText },
      success: "Bookmark note saved",
      after: () => {
        setNoteTarget(null);
        setNoteText("");
      },
    });
  };

  const copyShareLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast({ description: "Public collection link copied" });
    } catch {
      toast({
        title: "Couldn't copy the link",
        description: "Select and copy the public URL manually.",
        variant: "destructive",
      });
    }
  };

  if (bookmarksLoading || collectionsLoading) {
    return (
      <div className="space-y-6" aria-busy="true" aria-live="polite">
        <SEOHead title="My Library - Loading" description="View your saved library" noindex />
        <PageHeaderSkeleton />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <ResourceCardSkeleton key={index} />
          ))}
        </div>
      </div>
    );
  }

  if (bookmarksError || collectionsError) {
    return (
      <div className="space-y-6">
        <SEOHead title="My Library - Error" description="View your saved library" noindex />
        <div className="text-center py-12" role="alert">
          <BookmarkX className="h-16 w-16 mx-auto text-destructive mb-4" />
          <h1 className="text-2xl font-bold mb-2">Your library couldn't load</h1>
          <p className="text-muted-foreground mb-5">
            Your saves are still safe. Refresh the page to try again.
          </p>
          <Button onClick={() => window.location.reload()}>Refresh</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SEOHead
        title="My Learning Library"
        description="Organize saved video development resources into collections and a learning queue"
        noindex
      />

      <header className="space-y-2">
        <div className="eyebrow" aria-hidden>// Learning library</div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <Bookmark className="h-8 w-8 text-primary" aria-hidden="true" />
              <h1 className="display-h text-3xl sm:text-4xl">
                Saved, then <em className="not-italic text-primary">finished.</em>
              </h1>
            </div>
            <p className="mt-2 text-muted-foreground">
              Turn bookmarks into a queue you can actually work through.
            </p>
          </div>
          <Button onClick={openCreateCollection} className="min-h-11">
            <FolderPlus className="h-4 w-4 mr-2" aria-hidden="true" />
            New collection
          </Button>
        </div>
      </header>

      <section
        aria-label="Library summary"
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6"
      >
        {([
          ["active", "Active", counts.active],
          ["saved", "Saved", counts.saved],
          ["watch-next", "Watch next", counts["watch-next"]],
          ["in-progress", "In progress", counts["in-progress"]],
          ["done", "Done", counts.done],
          ["archived", "Archived", counts.archived],
        ] as const).map(([key, label, count]) => (
          <button
            key={key}
            type="button"
            className="min-h-[72px] border bg-card px-4 py-3 text-left transition-colors hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => {
              if (key === "active" || key === "archived") {
                chooseArchive(key);
                chooseStatus("all");
              } else {
                chooseArchive("active");
                chooseStatus(key);
              }
            }}
          >
            <span className="block text-2xl font-semibold">{count}</span>
            <span className="text-sm text-muted-foreground">{label}</span>
          </button>
        ))}
      </section>

      <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-6">
        <aside className="hidden lg:block" aria-label="Bookmark collections">
          <div className="sticky top-24 space-y-2 border bg-card p-3">
            <button
              type="button"
              className={`flex min-h-11 w-full items-center justify-between px-3 text-left text-sm ${
                collectionFilter === "all" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
              onClick={() => chooseCollection("all")}
            >
              <span className="flex items-center gap-2">
                <Bookmark className="h-4 w-4" aria-hidden="true" />
                All saved
              </span>
              <span>{bookmarks.length}</span>
            </button>
            {collections.map((collection, index) => (
              <div key={collection.id} className="flex items-center gap-1">
                <button
                  type="button"
                  className={`min-h-11 min-w-0 flex-1 px-3 text-left text-sm ${
                    collectionFilter === String(collection.id)
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                  onClick={() => chooseCollection(String(collection.id))}
                  title={collection.name}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate">
                      {collection.archivedAt ? "Archived · " : ""}
                      {collection.name}
                    </span>
                    <span>{collection.itemCount}</span>
                  </span>
                </button>
                <div className="flex" aria-label={`Reorder ${collection.name}`}>
                  <button
                    type="button"
                    className="inline-flex min-h-11 min-w-11 items-center justify-center hover:bg-muted disabled:opacity-30"
                    aria-label={`Move ${collection.name} up`}
                    disabled={index === 0 || actionMutation.isPending}
                    onClick={() => reorderCollection(index, -1)}
                  >
                    <ArrowUp className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="inline-flex min-h-11 min-w-11 items-center justify-center hover:bg-muted disabled:opacity-30"
                    aria-label={`Move ${collection.name} down`}
                    disabled={index === collections.length - 1 || actionMutation.isPending}
                    onClick={() => reorderCollection(index, 1)}
                  >
                    <ArrowDown className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <main className="min-w-0 space-y-5">
          <div className="lg:hidden">
            <Label htmlFor="mobile-collection-filter" className="mb-2 block">
              Collection
            </Label>
            <Select value={collectionFilter} onValueChange={chooseCollection}>
              <SelectTrigger id="mobile-collection-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All saved ({bookmarks.length})</SelectItem>
                {collections.map((collection) => (
                  <SelectItem key={collection.id} value={String(collection.id)}>
                    {collection.archivedAt ? "Archived · " : ""}
                    {collection.name} ({collection.itemCount})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedCollection && (
            <section className="border bg-card p-4" aria-label="Selected collection controls">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Folder className="h-5 w-5 text-primary" aria-hidden="true" />
                    <h2 className="truncate text-lg font-semibold">{selectedCollection.name}</h2>
                    {selectedCollection.archivedAt && <Badge variant="secondary">Archived</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selectedCollection.itemCount} saved{" "}
                    {selectedCollection.itemCount === 1 ? "resource" : "resources"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-11"
                    onClick={() => openRenameCollection(selectedCollection)}
                  >
                    <Pencil className="h-4 w-4 mr-2" aria-hidden="true" />
                    Rename
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-11"
                    onClick={() =>
                      actionMutation.mutate({
                        url: `/api/collections/${selectedCollection.id}`,
                        method: "PATCH",
                        body: { archived: !selectedCollection.archivedAt },
                        success: selectedCollection.archivedAt
                          ? "Collection restored"
                          : "Collection archived and sharing revoked",
                      })
                    }
                  >
                    {selectedCollection.archivedAt ? (
                      <RotateCcw className="h-4 w-4 mr-2" aria-hidden="true" />
                    ) : (
                      <FolderArchive className="h-4 w-4 mr-2" aria-hidden="true" />
                    )}
                    {selectedCollection.archivedAt ? "Restore" : "Archive"}
                  </Button>
                  {!selectedCollection.archivedAt && !selectedCollection.publishedAt && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="min-h-11"
                      onClick={() =>
                        actionMutation.mutate({
                          url: `/api/collections/${selectedCollection.id}/publish`,
                          method: "POST",
                          success: "Read-only sharing enabled",
                        })
                      }
                    >
                      <Globe2 className="h-4 w-4 mr-2" aria-hidden="true" />
                      Publish link
                    </Button>
                  )}
                  {selectedCollection.publishedAt && selectedCollection.publicUrl && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="min-h-11"
                        onClick={() => copyShareLink(selectedCollection.publicUrl!)}
                      >
                        <Clipboard className="h-4 w-4 mr-2" aria-hidden="true" />
                        Copy link
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="min-h-11"
                        onClick={() =>
                          actionMutation.mutate({
                            url: `/api/collections/${selectedCollection.id}/publish`,
                            method: "DELETE",
                            success: "Public access revoked",
                          })
                        }
                      >
                        Unpublish
                      </Button>
                    </>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-11 text-destructive hover:text-destructive"
                    onClick={() => setDeleteCollection(selectedCollection)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" />
                    Delete
                  </Button>
                </div>
              </div>
              {selectedCollection.publicUrl && selectedCollection.publishedAt && (
                <p className="mt-3 break-all text-xs text-muted-foreground">
                  Public read-only link: {selectedCollection.publicUrl}
                </p>
              )}
            </section>
          )}

          <section className="grid gap-3 border bg-card p-4 sm:grid-cols-3" aria-label="Library filters">
            <div>
              <Label htmlFor="status-filter" className="mb-2 block">Queue status</Label>
              <Select value={statusFilter} onValueChange={(value) => chooseStatus(value as StatusFilter)}>
                <SelectTrigger id="status-filter"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {BOOKMARK_QUEUE_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>{BOOKMARK_QUEUE_LABELS[status]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="archive-filter" className="mb-2 block">Visibility</Label>
              <Select value={archiveFilter} onValueChange={(value) => chooseArchive(value as ArchiveFilter)}>
                <SelectTrigger id="archive-filter"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active bookmarks</SelectItem>
                  <SelectItem value="archived">Archived bookmarks</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="bookmark-sort" className="mb-2 block">Sort</Label>
              <Select value={sortBy} onValueChange={(value) => chooseSort(value as SortValue)}>
                <SelectTrigger id="bookmark-sort"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-desc">Newest saved</SelectItem>
                  <SelectItem value="date-asc">Oldest saved</SelectItem>
                  <SelectItem value="name-asc">Name: A–Z</SelectItem>
                  <SelectItem value="name-desc">Name: Z–A</SelectItem>
                  <SelectItem value="category">Category</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </section>

          {filteredBookmarks.length > 0 && (
            <section className="space-y-3 border bg-muted/25 p-4" aria-label="Bulk bookmark actions">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium">
                  <Checkbox
                    checked={allShownSelected}
                    onCheckedChange={(checked) =>
                      setSelected(
                        checked
                          ? new Set(filteredBookmarks.map((bookmark) => bookmark.id))
                          : new Set(),
                      )
                    }
                    aria-label="Select all visible bookmarks"
                    className="h-5 w-5"
                  />
                  Select all shown
                </label>
                <p className="text-sm font-medium" aria-live="polite">
                  {selected.size} {selected.size === 1 ? "bookmark" : "bookmarks"} selected
                </p>
              </div>

              {selected.size > 0 && (
                <div className="grid gap-3 xl:grid-cols-[1fr_1fr_1.3fr_auto]">
                  <div className="flex gap-2">
                    <Select value={bulkStatus} onValueChange={(value) => setBulkStatus(value as BookmarkQueueStatus)}>
                      <SelectTrigger aria-label="Bulk queue status"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {BOOKMARK_QUEUE_STATUSES.map((status) => (
                          <SelectItem key={status} value={status}>{BOOKMARK_QUEUE_LABELS[status]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      className="min-h-11"
                      disabled={actionMutation.isPending}
                      onClick={() => runBulk({ type: "status", status: bulkStatus }, "Queue status updated")}
                    >
                      Apply
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Select value={bulkDestination} onValueChange={setBulkDestination}>
                      <SelectTrigger aria-label="Move to collection"><SelectValue placeholder="Choose collection" /></SelectTrigger>
                      <SelectContent>
                        {collections.filter((collection) => !collection.archivedAt).map((collection) => (
                          <SelectItem key={collection.id} value={String(collection.id)}>{collection.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      className="min-h-11"
                      disabled={!bulkDestination || actionMutation.isPending}
                      onClick={() =>
                        runBulk(
                          {
                            type: "move",
                            destinationCollectionId: Number(bulkDestination),
                            sourceCollectionId:
                              collectionFilter === "all" ? null : Number(collectionFilter),
                          },
                          "Bookmarks moved",
                        )
                      }
                    >
                      Move
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={bulkTag}
                      onChange={(event) => setBulkTag(event.target.value)}
                      placeholder="Personal tag"
                      maxLength={40}
                      aria-label="Personal tag for selected bookmarks"
                      className="min-h-11"
                    />
                    <Button
                      variant="outline"
                      className="min-h-11"
                      disabled={!bulkTag.trim() || actionMutation.isPending}
                      onClick={() => runBulk({ type: "tag", tag: bulkTag.trim(), mode: "add" }, "Tag added")}
                    >
                      Add
                    </Button>
                    <Button
                      variant="outline"
                      className="min-h-11"
                      disabled={!bulkTag.trim() || actionMutation.isPending}
                      onClick={() => runBulk({ type: "tag", tag: bulkTag.trim(), mode: "remove" }, "Tag removed")}
                    >
                      Remove
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    className="min-h-11"
                    disabled={actionMutation.isPending}
                    onClick={() =>
                      runBulk(
                        { type: "archive", archived: archiveFilter === "active" },
                        archiveFilter === "active" ? "Bookmarks archived" : "Bookmarks restored",
                      )
                    }
                  >
                    {archiveFilter === "active" ? (
                      <Archive className="h-4 w-4 mr-2" aria-hidden="true" />
                    ) : (
                      <RotateCcw className="h-4 w-4 mr-2" aria-hidden="true" />
                    )}
                    {archiveFilter === "active" ? "Archive" : "Restore"}
                  </Button>
                </div>
              )}
            </section>
          )}

          {filteredBookmarks.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {filteredBookmarks.map((resource) => (
                <article
                  key={resource.id}
                  id={`bookmark-${resource.id}`}
                  tabIndex={-1}
                  className="scroll-mt-24 border bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  data-testid={`bookmark-card-${resource.id}`}
                >
                  <div className="flex flex-wrap items-center gap-2 border-b p-3">
                    <label className="flex min-h-11 cursor-pointer items-center gap-2 px-1">
                      <Checkbox
                        checked={selected.has(resource.id)}
                        onCheckedChange={(checked) =>
                          setSelected((current) => {
                            const next = new Set(current);
                            if (checked) next.add(resource.id);
                            else next.delete(resource.id);
                            return next;
                          })
                        }
                        aria-label={`Select ${resource.title}`}
                        className="h-5 w-5"
                      />
                      <span className="sr-only">Select {resource.title}</span>
                    </label>
                    <Select
                      value={resource.queueStatus}
                      onValueChange={(value) =>
                        actionMutation.mutate({
                          url: `/api/bookmarks/${resource.id}/state`,
                          method: "PATCH",
                          body: { queueStatus: value },
                          success: "Queue status updated",
                        })
                      }
                    >
                      <SelectTrigger className="w-[9.5rem]" aria-label={`Queue status for ${resource.title}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BOOKMARK_QUEUE_STATUSES.map((status) => (
                          <SelectItem key={status} value={status}>{BOOKMARK_QUEUE_LABELS[status]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex min-w-0 flex-1 flex-wrap gap-1">
                      {resource.personalTags.map((tag) => (
                        <Badge key={tag} variant="secondary">#{tag}</Badge>
                      ))}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="min-h-11"
                      onClick={() => {
                        setNoteTarget(resource);
                        setNoteText(resource.notes ?? "");
                      }}
                    >
                      <NotebookPen className="h-4 w-4 mr-2" aria-hidden="true" />
                      Note
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="min-h-11"
                      onClick={() =>
                        actionMutation.mutate({
                          url: `/api/bookmarks/${resource.id}/state`,
                          method: "PATCH",
                          body: { archived: !resource.archivedAt },
                          success: resource.archivedAt ? "Bookmark restored" : "Bookmark archived",
                        })
                      }
                    >
                      {resource.archivedAt ? (
                        <RotateCcw className="h-4 w-4 mr-2" aria-hidden="true" />
                      ) : (
                        <Archive className="h-4 w-4 mr-2" aria-hidden="true" />
                      )}
                      {resource.archivedAt ? "Restore" : "Archive"}
                    </Button>
                  </div>
                  <ResourceCard
                    resource={{
                      id: String(resource.id),
                      name: resource.title,
                      url: resource.url,
                      description: resource.description,
                      category: resource.category,
                      tags: resource.personalTags,
                      isBookmarked: true,
                      bookmarkNotes: resource.notes,
                    }}
                    fullResource={resource}
                    className="border-0 shadow-none"
                  />
                </article>
              ))}
            </div>
          ) : bookmarks.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="rounded-full bg-primary/10 p-6 mb-6">
                  <BookmarkX className="h-12 w-12 text-primary" aria-hidden="true" />
                </div>
                <h2 className="font-display text-2xl font-medium tracking-tight mb-3">
                  Your learning library is empty
                </h2>
                <p className="max-w-md mb-6 text-muted-foreground">
                  Bookmark resources as you browse. They will land here ready to organize.
                </p>
                <Button asChild><Link href="/">Explore resources</Link></Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCheck className="h-10 w-10 text-primary mb-4" aria-hidden="true" />
                <h2 className="text-xl font-semibold mb-2">Nothing matches this view</h2>
                <p className="text-muted-foreground mb-5">
                  Try another collection, status, or archive filter.
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    chooseCollection("all");
                    chooseStatus("all");
                    chooseArchive("active");
                  }}
                >
                  Clear filters
                </Button>
              </CardContent>
            </Card>
          )}
        </main>
      </div>

      <Dialog open={collectionDialogOpen} onOpenChange={setCollectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCollection ? "Rename collection" : "Create a collection"}</DialogTitle>
            <DialogDescription>
              Collections organize bookmarks without duplicating or moving your saved notes.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              submitCollection();
            }}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="collection-name" className="mb-2 block">Name</Label>
              <Input
                id="collection-name"
                value={collectionName}
                onChange={(event) => setCollectionName(event.target.value)}
                maxLength={80}
                autoFocus
                placeholder="e.g. Streaming fundamentals"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCollectionDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!collectionName.trim() || actionMutation.isPending}>
                {editingCollection ? "Save name" : "Create collection"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteCollection} onOpenChange={(open) => !open && setDeleteCollection(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deleteCollection?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              The collection and its public link will be removed. Your bookmarks and notes will stay saved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!deleteCollection) return;
                actionMutation.mutate({
                  url: `/api/collections/${deleteCollection.id}`,
                  method: "DELETE",
                  success: "Collection deleted; bookmarks preserved",
                  after: () => {
                    chooseCollection("all");
                    setDeleteCollection(null);
                  },
                });
              }}
            >
              Delete collection
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BookmarkNotesDialog
        open={!!noteTarget}
        onOpenChange={(open) => {
          if (!open) setNoteTarget(null);
        }}
        mode="edit"
        notes={noteText}
        onNotesChange={setNoteText}
        onSaveWithNotes={saveNote}
        onSaveWithoutNotes={saveNote}
        isPending={actionMutation.isPending}
      />
    </div>
  );
}
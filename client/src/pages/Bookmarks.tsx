import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bookmark, BookmarkX } from "lucide-react";
import ResourceCard from "@/components/resource/ResourceCard";
import { Skeleton } from "@/components/ui/skeleton";
import SEOHead from "@/components/layout/SEOHead";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

interface BookmarkedResource {
  id: string;
  title: string;
  url: string;
  description?: string;
  category?: string;
  tags?: string[];
  notes?: string;
  createdAt?: string;
  bookmarkedAt?: string;
}

const VALID_SORTS = ["date-desc", "date-asc", "name-asc", "name-desc", "category"];

export default function Bookmarks() {
  // NB-025 (run18): two-way sync the sort with ?sort= so the ordering survives a
  // reload/back-forward and is shareable. wouter's useLocation is path-only, so
  // read window.location.search directly.
  const [sortBy, setSortBy] = useState(() => {
    const s = new URLSearchParams(window.location.search).get("sort");
    return s && VALID_SORTS.includes(s) ? s : "date-desc";
  });

  const handleSortChange = (value: string) => {
    setSortBy(value);
    const params = new URLSearchParams(window.location.search);
    params.set("sort", value);
    window.history.replaceState(
      {},
      "",
      `${window.location.pathname}?${params.toString()}`,
    );
  };

  const { data: bookmarks, isLoading, error } = useQuery<BookmarkedResource[]>({
    queryKey: ['/api/bookmarks'],
    staleTime: 30000,
  });

  const sortedBookmarks = useMemo(() => {
    if (!bookmarks) return [];

    const results = [...bookmarks];

    if (sortBy === "name-asc") {
      results.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    } else if (sortBy === "name-desc") {
      results.sort((a, b) => (b.title || "").localeCompare(a.title || ""));
    } else if (sortBy === "category") {
      results.sort((a, b) => {
        const catA = a.category || "";
        const catB = b.category || "";
        return catA.localeCompare(catB);
      });
    } else if (sortBy === "date-desc") {
      results.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
    } else if (sortBy === "date-asc") {
      results.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateA - dateB;
      });
    }

    return results;
  }, [bookmarks, sortBy]);

  if (isLoading) {
    return (
      <div className="space-y-6" aria-busy={true} aria-live="polite">
        <SEOHead
          title="My Bookmarks - Loading"
          description="View your saved bookmarks"
          noindex
        />
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-6 w-96" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <SEOHead
          title="My Bookmarks - Error"
          description="View your saved bookmarks"
          noindex
        />
        <div className="text-center py-12">
          <BookmarkX className="h-16 w-16 mx-auto text-destructive mb-4" />
          <h2 className="text-2xl font-bold mb-2">Error Loading Bookmarks</h2>
          <p className="text-muted-foreground">
            There was an error loading your bookmarks. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  const hasBookmarks = sortedBookmarks && sortedBookmarks.length > 0;

  return (
    <div className="space-y-6">
      <SEOHead 
        title="My Bookmarks - Awesome Video Resources"
        description="View and manage your saved video development resource bookmarks"
        noindex
      />
      
      <div className="space-y-2">
        <div className="eyebrow" aria-hidden>// Saved</div>
        <div className="flex items-center gap-3">
          <Bookmark className="h-8 w-8" style={{ color: 'var(--accent)' }} />
          <h1 className="font-display text-3xl sm:text-4xl font-medium tracking-tight">
            My <em className="not-italic" style={{ fontStyle: 'italic', color: 'var(--accent)' }}>Bookmarks</em>
          </h1>
        </div>
        <p style={{ color: 'var(--text-2)' }}>
          {hasBookmarks
            ? `You have ${sortedBookmarks.length} saved ${sortedBookmarks.length === 1 ? 'resource' : 'resources'}`
            : 'Start bookmarking resources to build your personal collection'
          }
        </p>
      </div>

      {hasBookmarks && (
        <div className="flex items-center gap-4">
          <Select value={sortBy} onValueChange={handleSortChange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date-desc">Date: Newest First</SelectItem>
              <SelectItem value="date-asc">Date: Oldest First</SelectItem>
              <SelectItem value="name-asc">Name: A-Z</SelectItem>
              <SelectItem value="name-desc">Name: Z-A</SelectItem>
              <SelectItem value="category">Category</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {hasBookmarks ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedBookmarks.map((resource) => (
            <ResourceCard
              key={resource.id}
              resource={{
                ...resource,
                name: resource.title,
                isBookmarked: true,
                bookmarkNotes: resource.notes,
              }}
              data-testid={`bookmark-card-${resource.id}`}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div
              className="rounded-full p-6 mb-6"
              style={{ background: 'color-mix(in srgb, var(--accent) 12%, transparent)' }}
            >
              <BookmarkX className="h-12 w-12" style={{ color: 'var(--accent)' }} />
            </div>
            <h2 className="font-display text-2xl font-medium tracking-tight mb-3">
              No <em className="not-italic" style={{ fontStyle: 'italic', color: 'var(--accent)' }}>Bookmarks</em> Yet
            </h2>
            <p className="max-w-md mb-6" style={{ color: 'var(--text-2)' }}>
              Start exploring resources and bookmark the ones you want to save for later.
              Click the bookmark icon on any resource card to add it to your collection.
            </p>
            <Button data-testid="link-explore-resources" asChild>
              <Link href="/">
                Explore Resources
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

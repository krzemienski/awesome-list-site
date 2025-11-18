import { useQuery } from "@tanstack/react-query";
import { Bookmark, BookmarkX } from "lucide-react";
import ResourceCard from "@/components/resource/ResourceCard";
import { Skeleton } from "@/components/ui/skeleton";
import SEOHead from "@/components/layout/SEOHead";
import { Card, CardContent } from "@/components/ui/card";

interface BookmarkedResource {
  id: string;
  name: string;
  url: string;
  description?: string;
  category?: string;
  tags?: string[];
  notes?: string;
}

export default function Bookmarks() {
  const { data: bookmarks, isLoading, error } = useQuery<BookmarkedResource[]>({
    queryKey: ['/api/bookmarks'],
    staleTime: 30000,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SEOHead 
          title="My Bookmarks - Loading"
          description="View your saved bookmarks"
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

  const hasBookmarks = bookmarks && bookmarks.length > 0;

  return (
    <div className="space-y-6">
      <SEOHead 
        title="My Bookmarks - Awesome Video Resources"
        description="View and manage your saved video development resource bookmarks"
      />
      
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Bookmark className="h-8 w-8 text-pink-500" />
          <h1 className="text-3xl font-bold tracking-tight">
            My Bookmarks
          </h1>
        </div>
        <p className="text-muted-foreground">
          {hasBookmarks 
            ? `You have ${bookmarks.length} saved ${bookmarks.length === 1 ? 'resource' : 'resources'}`
            : 'Start bookmarking resources to build your personal collection'
          }
        </p>
      </div>

      {hasBookmarks ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bookmarks.map((resource) => (
            <ResourceCard
              key={resource.id}
              resource={{
                ...resource,
                isBookmarked: true,
                bookmarkNotes: resource.notes,
              }}
              data-testid={`bookmark-card-${resource.id}`}
            />
          ))}
        </div>
      ) : (
        <Card className="border-2 border-dashed border-pink-500/30 bg-pink-500/5">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-pink-500/10 p-6 mb-6">
              <BookmarkX className="h-12 w-12 text-pink-500" />
            </div>
            <h2 className="text-2xl font-bold mb-3 text-pink-500">No Bookmarks Yet</h2>
            <p className="text-muted-foreground max-w-md mb-6">
              Start exploring resources and bookmark the ones you want to save for later. 
              Click the bookmark icon on any resource card to add it to your collection.
            </p>
            <a 
              href="/"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-pink-500 text-white hover:bg-pink-600 h-10 px-6 py-2"
              data-testid="link-explore-resources"
            >
              Explore Resources
            </a>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { BookOpen, FolderOpen } from "lucide-react";
import SEOHead from "@/components/layout/SEOHead";
import ResourceCard from "@/components/resource/ResourceCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ResourceCardSkeleton, PageHeaderSkeleton } from "@/components/ui/skeletons";
import type { PublicCollection as PublicCollectionData } from "@/types/bookmarks";

const CANONICAL_BASE = (import.meta.env.VITE_SITE_URL || "https://awesome.video").replace(
  /\/+$/,
  "",
);

function collectionDescription(count: number): string {
  return `A read-only collection of ${count} curated video development ${
    count === 1 ? "resource" : "resources"
  } shared on Awesome Video.`;
}

export default function PublicCollection({ shareId }: { shareId: string }) {
  const url = `/api/public/collections/${encodeURIComponent(shareId)}`;
  const { data, isLoading, error } = useQuery<PublicCollectionData>({
    queryKey: [url],
    staleTime: 0,
    retry: false,
  });
  const publicUrl = `${CANONICAL_BASE}/collection/${encodeURIComponent(shareId)}`;

  if (isLoading) {
    return (
      <div className="space-y-6" aria-busy="true" aria-live="polite">
        <SEOHead
          title="Loading shared collection"
          description="Loading a shared Awesome Video collection"
          noindex
          ogUrl={publicUrl}
        />
        <PageHeaderSkeleton />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <ResourceCardSkeleton key={index} />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <SEOHead
          title="Collection Not Found"
          description="This shared collection is unavailable or no longer published."
          noindex
          ogUrl={`${CANONICAL_BASE}/`}
        />
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" aria-hidden="true" />
            <h1 className="text-2xl font-semibold mb-2">Collection not found</h1>
            <p className="max-w-md text-muted-foreground">
              This link may be invalid, deleted, or no longer shared by its owner.
            </p>
            {/* F013: dead-end recovery — give the visitor somewhere to go. */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button asChild data-testid="button-collection-browse">
                <Link href="/">Browse resources</Link>
              </Button>
              <Button asChild variant="outline" data-testid="button-collection-journeys">
                <Link href="/journeys">Explore journeys</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const description = collectionDescription(data.resources.length);

  return (
    <div className="space-y-6">
      <SEOHead
        title={`${data.name} — Shared collection`}
        description={description}
        noindex
        follow
        ogUrl={publicUrl}
      />
      <header className="border-b pb-6">
        <div className="eyebrow" aria-hidden>// Shared collection</div>
        <div className="mt-2 flex items-start gap-3">
          <BookOpen className="h-8 w-8 shrink-0 text-primary" aria-hidden="true" />
          <div className="min-w-0">
            <h1 className="display-h break-words text-3xl sm:text-4xl">{data.name}</h1>
            <p className="mt-2 text-muted-foreground">{description}</p>
          </div>
        </div>
      </header>

      {data.resources.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.resources.map((resource) => (
            <ResourceCard
              key={resource.id}
              resource={{
                id: String(resource.id),
                name: resource.title,
                url: resource.url,
                description: resource.description,
                category: resource.category,
              }}
              showPersonalActions={false}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-14 text-center">
            <FolderOpen className="h-10 w-10 text-muted-foreground mb-4" aria-hidden="true" />
            <h2 className="text-xl font-semibold mb-2">No public resources yet</h2>
            <p className="max-w-md text-muted-foreground">
              The owner may still be organizing this collection. Only approved, active resources appear here.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
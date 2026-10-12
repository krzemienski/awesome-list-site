import { useQuery } from "@tanstack/react-query";
import "@/styles/pages/discovery.css";
import { BookOpen } from "lucide-react";
import SEOHead from "@/components/layout/SEOHead";
import ResourceCard from "@/components/resource/ResourceCard";
import StatePanel, { RetryButton } from "@/components/layout/StatePanel";
import { ResourceCardSkeleton, PageHeaderSkeleton } from "@/components/ui/skeletons";
import OfflinePageState from "@/components/layout/OfflinePageState";
import NotFound from "@/pages/not-found";
import { ApiError } from "@/lib/queryClient";
import { queryUnavailableReason } from "@/lib/query-availability";
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
  const collectionQuery = useQuery<PublicCollectionData>({
    queryKey: [url],
    staleTime: 0,
    retry: false,
  });
  const { data, isLoading, error, refetch } = collectionQuery;
  const publicUrl = `${CANONICAL_BASE}/collection/${encodeURIComponent(shareId)}`;

  if (isLoading) {
    return (
      <div className="discovery-page space-y-6" aria-busy="true" aria-live="polite">
        <SEOHead
          title="Loading shared collection"
          description="Loading a shared Awesome Video collection"
          noindex
          ogUrl={publicUrl}
        />
        <PageHeaderSkeleton />
        <div className="discovery-grid">
          {Array.from({ length: 3 }).map((_, index) => (
            <ResourceCardSkeleton key={index} />
          ))}
        </div>
      </div>
    );
  }

  // Malformed, unknown, unpublished and deleted links all answer 404: the
  // shared not-found page (same head the server sends for these URLs).
  if (error instanceof ApiError && error.status === 404) {
    return <NotFound suggestion={{ label: "Explore learning journeys", href: "/journeys" }} />;
  }

  if (queryUnavailableReason(collectionQuery) === "offline") {
    return <OfflinePageState onRetry={() => void refetch()} testId="collection-offline" />;
  }

  if (error || !data) {
    return (
      <div className="discovery-page space-y-6">
        <SEOHead
          title="Collection unavailable"
          description="This shared collection could not be loaded."
          noindex
          ogUrl={`${CANONICAL_BASE}/`}
        />
        <StatePanel tone="error" label="Error · unavailable" title="Couldn’t load this collection" headingLevel={1}
          testId="collection-unavailable"
          actions={<RetryButton onRetry={() => void refetch()} testId="button-collection-retry" />}>
          Something went wrong while fetching it. Please try again.
        </StatePanel>
      </div>
    );
  }

  const description = collectionDescription(data.resources.length);

  return (
    <div className="discovery-page space-y-6">
      <SEOHead
        title={`${data.name} — Shared collection`}
        description={description}
        noindex
        follow
        ogUrl={publicUrl}
      />
      <header className="discovery-header">
        <div className="eyebrow" aria-hidden>{"// Shared collection"}</div>
        <div className="mt-2 flex items-start gap-3">
          <BookOpen className="h-8 w-8 shrink-0 text-primary" aria-hidden="true" />
          <div className="min-w-0">
            <h1 className="display-h discovery-title">{data.name}</h1>
            {/* Task #379 (uxv1-06): unbounded prose ran the full page width on wide
                desktop screens; max-w-prose holds it to a readable measure. */}
            <p className="mt-2 max-w-prose text-muted-foreground">{description}</p>
          </div>
        </div>
      </header>

      {data.resources.length > 0 ? (
        <div className="discovery-grid">
          {data.resources.map((resource) => (
            <ResourceCard
              key={resource.id}
              resource={{
                id: String(resource.id),
                name: resource.title,
                url: resource.url,
                description: resource.description,
                category: resource.category,
                 // The public collection projection intentionally omits
                 // metadata, but it still carries the stored and resolved kind
                 // fields used by ResourceCard's public badges.
                 kind: resource.kind,
                 resolvedKind: resource.resolvedKind,
              }}
              showPersonalActions={false}
            />
          ))}
        </div>
      ) : (
        <StatePanel tone="empty" label="No resources" title="No public resources yet" inline>
          The owner may still be organizing this collection. Only approved, active resources appear here.
        </StatePanel>
      )}
    </div>
  );
}
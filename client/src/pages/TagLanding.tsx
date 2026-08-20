import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Link, Redirect, useLocation, useParams, useSearch } from "wouter";
import SEOHead from "@/components/layout/SEOHead";
import ResourceCard from "@/components/resource/ResourceCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Paginator } from "@/components/ui/paginator";
import { PageHeaderSkeleton, ResourceCardSkeleton } from "@/components/ui/skeletons";
import { apiRequest } from "@/lib/queryClient";
import { parsePageParamStrict, pageNoticeFor } from "@/lib/page-param";
import { slugify } from "@/lib/utils";
import NotFound from "@/pages/not-found";
import { tagScopeIntro } from "@shared/seo-content-templates";
import {
  pagedSeoDescription,
  pagedSeoTitleCore,
  tagDisplayNameBranded,
  tagSeoDescription,
  tagTitleCoreDeduped,
} from "@shared/seo-templates";
import {
  normalizeTagFilter,
  normalizeTagPathSegment,
  TAG_LANDING_MIN_RESOURCES,
  tagDisplayName,
  tagLandingPath,
} from "@shared/tagNormalize";

const PAGE_SIZE = 24;

interface TagListingResponse {
  resources: any[];
  total: number;
  facets?: {
    categories?: Array<{ value: string; count: number }>;
  };
}

// P-05 (same class): pluralize the noun to match the count.
function resourceNoun(count: number): string {
  return count === 1 ? "resource" : "resources";
}

function resourceTags(resource: any): string[] {
  const tags = resource?.tags ?? resource?.metadata?.tags;
  return Array.isArray(tags) ? tags.filter((tag): tag is string => typeof tag === "string") : [];
}

export default function TagLanding() {
  const [, navigate] = useLocation();
  const { slug: rawSlug = "" } = useParams<{ slug: string }>();
  const slug = normalizeTagPathSegment(rawSlug);
  const parsedPage = parsePageParamStrict(new URLSearchParams(useSearch()).get("page"));
  const page = parsedPage.page;
  const offset = (page - 1) * PAGE_SIZE;
  const url = `/api/resources?tags=${encodeURIComponent(slug)}&limit=${PAGE_SIZE}&offset=${offset}&facets=true`;
  const listing = useQuery<TagListingResponse>({
    queryKey: [url],
    queryFn: async () => {
      const early = (window as any).__tagListingEarlyFetch;
      if (early?.url === url && early.promise) {
        (window as any).__tagListingEarlyFetch = undefined;
        const response = await early.promise;
        if (!response.ok) throw new Error(`HTTP ${response.status} from ${url}`);
        return response.json();
      }
      return apiRequest(url, { method: "GET" });
    },
    enabled: Boolean(slug),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });

  const canonicalPath = tagLandingPath(slug);
  if (slug && window.location.pathname !== canonicalPath) {
    return <Redirect to={`${canonicalPath}${page > 1 ? `?page=${page}` : ""}`} replace />;
  }

  if (!slug) return <NotFound />;
  if (listing.isLoading && !listing.data) {
    return (
      <div className="space-y-6" aria-busy="true">
        <PageHeaderSkeleton />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, index) => <ResourceCardSkeleton key={index} />)}
        </div>
      </div>
    );
  }
  if (listing.error) {
    return <div className="py-12 text-center"><h2 className="text-xl font-semibold">Error Loading Tag</h2><p className="text-muted-foreground">Please try again.</p></div>;
  }

  const data = listing.data;
  if (!data || data.total === 0) return <NotFound />;
  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
  if (page > totalPages) return <NotFound />;

  const name = tagDisplayNameBranded(slug);
  const titleCore = tagTitleCoreDeduped(name);
  const description = tagSeoDescription(name, data.total);
  const categories = (data.facets?.categories ?? []).filter((item) => item.value).slice(0, 6);
  const relatedTags = (() => {
    const counts = new Map<string, number>();
    for (const resource of data.resources) {
      for (const value of resourceTags(resource)) {
        const related = normalizeTagFilter(value);
        if (!related || related === slug) continue;
        counts.set(related, (counts.get(related) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 8);
  })();
  const intro = tagScopeIntro({
    name,
    totalResources: data.total,
    categoryNames: categories.map((item) => item.value),
    formats: data.resources.map((resource) => resource.resourceFormat),
  });
  const noindex = data.total < TAG_LANDING_MIN_RESOURCES;
  const makeHref = (nextPage: number) =>
    nextPage > 1 ? `${canonicalPath}?page=${nextPage}` : canonicalPath;

  return (
    <div className="space-y-4 sm:space-y-6 overflow-x-hidden max-w-full">
      <SEOHead
        title={pagedSeoTitleCore(titleCore, page)}
        description={pagedSeoDescription(description, page, totalPages)}
        category={name}
        resourceCount={data.total}
        pageParam={page}
        noindex={noindex}
        follow={noindex}
      />
      <Button asChild variant="ghost" size="sm" className="gap-2 min-h-[44px]">
        <Link href="/"><ArrowLeft className="h-4 w-4" />Back to Home</Link>
      </Button>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="display-h text-2xl sm:text-3xl">{name}</h1>
          <p className="text-sm text-muted-foreground">{data.total} {resourceNoun(data.total)} available</p>
        </div>
        <Badge variant="secondary" data-testid="badge-count">{data.total}</Badge>
      </div>
      <section aria-labelledby="tag-scope-heading" data-seo-section="tag-intro">
        <h2 id="tag-scope-heading" className="text-base font-semibold">About this collection</h2>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">{intro}</p>
      </section>
      {(categories.length > 0 || relatedTags.length > 0) && (
        <section className="space-y-3" aria-labelledby="related-topics-heading" data-seo-section="related-topics">
          <h2 id="related-topics-heading" className="text-base font-semibold">Explore related topics</h2>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Link key={category.value} href={`/category/${slugify(category.value)}`}>
                <Badge variant="secondary">{category.value} ({category.count})</Badge>
              </Link>
            ))}
            {relatedTags.map(([related, count]) => (
              <Link key={related} href={tagLandingPath(related)}>
                <Badge variant="outline">#{tagDisplayName(related)} ({count})</Badge>
              </Link>
            ))}
          </div>
        </section>
      )}
      {pageNoticeFor(parsedPage) && (
        <div role="status" data-testid="notice-page-adjusted" className="rounded border p-3 text-sm">
          {pageNoticeFor(parsedPage)}
        </div>
      )}
      <p className="text-sm text-muted-foreground" data-testid="text-results-count">
        Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, data.total)} of {data.total} {resourceNoun(data.total)}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {data.resources.map((resource, index) => (
          <ResourceCard
            key={`${resource.id}-${index}`}
            resource={{
              id: String(resource.id),
              name: resource.title,
              url: resource.url,
              description: resource.description ?? "",
              category: resource.category,
              tags: Array.from(new Set([slug, ...resourceTags(resource).map(normalizeTagFilter)])),
            }}
          />
        ))}
      </div>
      <Paginator
        currentPage={page}
        totalPages={totalPages}
        makeHref={makeHref}
        onNavigate={(nextPage) => {
          navigate(makeHref(nextPage));
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />
    </div>
  );
}
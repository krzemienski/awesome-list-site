import StatePanel, { RetryButton } from "@/components/layout/StatePanel";
import { Fragment, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import "@/styles/pages/taxonomy.css";
import { ArrowLeft } from "lucide-react";
import { Link, Redirect, useLocation, useParams, useSearch } from "wouter";
import SEOHead from "@/components/layout/SEOHead";
import ResourceCard from "@/components/resource/ResourceCard";
import { Button } from "@/components/ui/button";
import { SearchEntryButton } from "@/components/search/SearchEntryButton";
import { Paginator } from "@/components/ui/paginator";
import { PageHeaderSkeleton, ResourceCardSkeleton } from "@/components/ui/skeletons";
import { apiRequest } from "@/lib/queryClient";
import { trackTagInteraction } from "@/lib/analytics";
import { strictUrlPage } from "@/lib/page-param";
import { slugify } from "@/lib/utils";
import NotFound from "@/pages/not-found";
import type { Resource } from "@shared/schema";
import { tagScopeIntro } from "@shared/seo-content-templates";
import { MAX_PAGE } from "@shared/page-param";
import {
  pagedSeoDescription,
  pagedSeoTitleCore,
  tagDisplayNameBranded,
  tagSeoDescription,
  tagTitleCoreDeduped,
} from "@shared/seo-templates";
import OfflinePageState from "@/components/layout/OfflinePageState";
import { queryUnavailableReason } from "@/lib/query-availability";
import { scrollBehavior } from "@/lib/scroll-behavior";
import { TAG_MAX_LENGTH } from "@shared/validation";
import {
  normalizeTagFilter,
  normalizeTagPathSegment,
  TAG_LANDING_MIN_RESOURCES,
  tagDisplayName,
  tagLandingPath,
} from "@shared/tagNormalize";

const PAGE_SIZE = 24;

interface TagListingResponse {
  resources: Resource[];
  total: number;
  facets?: {
    categories?: Array<{ value: string; count: number }>;
  };
}

function listingTag(queryKeyUrl: unknown): string | null {
  if (typeof queryKeyUrl !== "string") return null;
  return new URLSearchParams(queryKeyUrl.split("?")[1] ?? "").get("tags");
}

function resourceTags(resource: any): string[] {
  const tags = resource?.tags ?? resource?.metadata?.tags;
  return Array.isArray(tags) ? tags.filter((tag): tag is string => typeof tag === "string") : [];
}

export default function TagLanding() {
  const [, navigate] = useLocation();
  const { slug: rawSlug = "" } = useParams<{ slug: string }>();
  const slug = normalizeTagPathSegment(rawSlug);
  // A ?page= the server 404s (malformed, below 1, or past the end) renders
  // the same not-found page here.
  const search = useSearch();
  const urlPage = strictUrlPage(new URLSearchParams(search).get("page"));
  const page = urlPage ?? 1;
  const offset = (page - 1) * PAGE_SIZE;
  // The API 400s an offset past int4; no tag has that many pages, so such a
  // page is past the end like any other and 404s on both passes.
  const pageReachable = urlPage !== null && offset <= MAX_PAGE;
  // The API rejects over-length tags with a 400 that no retry can fix; the
  // server already answers such URLs 404, so the page must agree.
  const tagIsQueryable = Boolean(slug) && slug.length <= TAG_MAX_LENGTH;
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
    enabled: tagIsQueryable && pageReachable,
    staleTime: 60_000,
    // Hold the current page only while paging within this tag; another tag's
    // cards and total must never render under the new tag's heading.
    placeholderData: (previous, previousQuery) =>
      previousQuery && listingTag(previousQuery.queryKey[0]) === slug ? previous : undefined,
  });

  const listedTotal = listing.data?.total;
  const pastLastPage = listedTotal !== undefined && !listing.isPlaceholderData
    && page > Math.max(1, Math.ceil(listedTotal / PAGE_SIZE));
  // A rejected ?page= disables the query but still reads page 1 from the
  // cache, so the listing data alone can't tell a 404 from a real view.
  const notFound = !tagIsQueryable || !pageReachable || pastLastPage;

  // One view event per tag visit, once the real (non-placeholder) total is in,
  // matching category_viewed on the taxonomy pages.
  const viewedTagRef = useRef<string | null>(null);
  useEffect(() => {
    if (notFound || listedTotal === undefined || listing.isPlaceholderData) return;
    if (viewedTagRef.current === slug) return;
    viewedTagRef.current = slug;
    trackTagInteraction(slug, "landing_viewed", "tag_page", listedTotal);
  }, [listedTotal, listing.isPlaceholderData, notFound, slug]);

  // After a page change, wait for the new page: the intro above the count is
  // built from its resources and can change height. Then bring the count to
  // the top and focus it so a screen reader announces the new range.
  const resultsCountRef = useRef<HTMLHeadingElement>(null);
  const pendingResultsFocusRef = useRef(false);
  useEffect(() => {
    if (!pendingResultsFocusRef.current || !listing.data || listing.isPlaceholderData) return;
    pendingResultsFocusRef.current = false;
    resultsCountRef.current?.scrollIntoView({ block: "start", behavior: scrollBehavior() });
    resultsCountRef.current?.focus({ preventScroll: true });
  }, [listing.data, listing.isPlaceholderData]);

  const canonicalPath = tagLandingPath(slug);
  if (slug && window.location.pathname !== canonicalPath) {
    return <Redirect to={`${canonicalPath}${search ? `?${search}` : ""}`} replace />;
  }

  if (notFound) return <NotFound />;
  if (queryUnavailableReason(listing) === "offline") {
    return <OfflinePageState onRetry={() => void listing.refetch()} testId="tag-offline" />;
  }
  // isPending, not isLoading: offline the fetch is paused (isLoading false),
  // which fell through to the no-data 404 below.
  if (listing.isPending) {
    return (
      <div className="taxonomy-page taxonomy-page--tag" aria-busy="true">
        <div className="taxonomy-loading-header"><PageHeaderSkeleton /></div>
        <div className="taxonomy-grid">
          {Array.from({ length: 9 }).map((_, index) => <ResourceCardSkeleton key={index} />)}
        </div>
      </div>
    );
  }
  if (listing.error) {
    return (
      <StatePanel tone="error" label="Error · unavailable" title="Couldn't load this tag" headingLevel={1}
        testId="tag-error"
        actions={<>
          <RetryButton onRetry={() => void listing.refetch()} testId="button-retry-tag" />
          <Button asChild variant="outline">
            <Link href="/categories" data-testid="link-tag-error-categories">Browse categories</Link>
          </Button>
        </>}>
        Something went wrong while fetching resources with this tag. Please try again.
      </StatePanel>
    );
  }

  const data = listing.data;
  if (!data || data.total === 0) return <NotFound />;
  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

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
    <div className="taxonomy-page taxonomy-page--tag">
      <SEOHead
        title={pagedSeoTitleCore(titleCore, page)}
        description={pagedSeoDescription(description, page, totalPages)}
        category={name}
        resourceCount={data.total}
        pageParam={page}
        noindex={noindex}
        follow={noindex}
      />
      <div className="flex flex-wrap items-start justify-between gap-2">
        <Button asChild variant="ghost" size="sm" className="taxonomy-back">
          <Link href="/"><ArrowLeft size={12} aria-hidden="true" />Browse</Link>
        </Button>
        {/* Tag landers rarely continue; site search is the most common next
            page from a landing, and the header's phone control is icon-only. */}
        <SearchEntryButton method="listing_page_button" surface="tag_page" />
      </div>
      {/* Task #379 (uxv2-14): the tag total is stated once, in the results
          heading below. */}
      <header className="taxonomy-header">
        <div className="eyebrow taxonomy-eyebrow"><span aria-hidden="true">#</span>TAG · {name.toUpperCase()}</div>
        <h1 className="taxonomy-title page-title">{name}</h1>
        <section aria-labelledby="tag-scope-heading" data-seo-section="tag-intro">
          <h2 id="tag-scope-heading" className="sr-only">About this collection</h2>
          <p className="taxonomy-description">{intro}</p>
          {/* The full related-topics section sits under the list; nearly every
              tag lander left before reaching it, so name the closest few here. */}
          {(categories.length > 0 || relatedTags.length > 0) && (
            <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground" data-testid="tag-related-shortcut">
              Related:{" "}
              {[
                ...relatedTags.slice(0, 3).map(([related]) => ({ href: tagLandingPath(related), label: `#${tagDisplayName(related)}` })),
                ...categories.slice(0, 1).map((category) => ({ href: `/category/${slugify(category.value)}`, label: category.value })),
              ].map((item, index) => (
                <Fragment key={item.href}>
                  {index > 0 && ", "}
                  <Link href={item.href} className="text-foreground underline underline-offset-4 hover:opacity-80">{item.label}</Link>
                </Fragment>
              ))}
              {" · "}
              <a href="#related-topics-heading" className="text-foreground underline underline-offset-4 hover:opacity-80">All related topics</a>
            </p>
          )}
        </section>
      </header>
      <div className="taxonomy-results-layout">
        <div className="taxonomy-results-heading-row">
          <h2 ref={resultsCountRef} tabIndex={-1} id="tag-results-heading" data-testid="text-results-count" data-total={data.total}>
            Resources ({data.total})
          </h2>
        </div>
        <div className="taxonomy-grid">
          {data.resources.map((resource, index) => (
            <ResourceCard
              key={`${resource.id}-${index}`}
              variant="taxonomy"
              showPersonalActions={false}
              resource={{
                id: String(resource.id),
                name: resource.title,
                url: resource.url,
                description: resource.description ?? "",
                category: resource.category,
                tags: Array.from(new Set([slug, ...resourceTags(resource).map(normalizeTagFilter)])),
              }}
              fullResource={resource}
            />
          ))}
        </div>
        {totalPages > 1 && (
          <div className="taxonomy-pagination">
            <Paginator
              currentPage={page}
              totalPages={totalPages}
              makeHref={makeHref}
              onNavigate={(nextPage) => {
                pendingResultsFocusRef.current = true;
                navigate(makeHref(nextPage));
              }}
            />
          </div>
        )}
      </div>
      {/* Task #379 (uxv2-13): this chip wall used to sit between the intro and
          the results, so on a 375px viewport the first screen was topics rather
          than resources. Related topics are a "where next" affordance, so they
          belong after the list the visitor came for. The crawler HTML in
          server/seo-content.ts emits the same section in the same position. */}
      {(categories.length > 0 || relatedTags.length > 0) && (
        <section className="taxonomy-children" aria-labelledby="related-topics-heading" data-seo-section="related-topics">
          <h2 id="related-topics-heading">Explore related topics</h2>
          <div className="taxonomy-child-grid">
            {categories.map((category) => (
              <Link key={category.value} href={`/category/${slugify(category.value)}`} className="taxonomy-child card hoverable">
                <span>{category.value}</span><span className="chip mono">{category.count}</span>
              </Link>
            ))}
            {relatedTags.map(([related, count]) => (
              <Link key={related} href={tagLandingPath(related)} className="taxonomy-child card hoverable">
                <span>#{tagDisplayName(related)}</span><span className="chip mono">{count}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
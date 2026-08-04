import { ResourceCardSkeleton, PageHeaderSkeleton } from "@/components/ui/skeletons";
import { useEffect, useState, useMemo, useRef } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import SEOHead from "@/components/layout/SEOHead";
import AdvancedFilter from "@/components/ui/advanced-filter";
import ResourceCard from "@/components/resource/ResourceCard";
import { ResourceListRow, ResourceCompactCard } from "@/components/resource/resource-view-modes";
import { ViewModeToggle, ViewMode, isLayoutViewMode } from "@/components/ui/view-mode-toggle";
import { Paginator } from "@/components/ui/paginator";
import { parsePageParamStrict, pageNoticeFor } from "@/lib/page-param";
import { safeGetItem, safeSetItem } from "@/lib/safeStorage";
import { ArrowLeft, Search } from "lucide-react";
import { deslugify } from "@/lib/utils";
import { normalizeTag, parseTagsParam } from "@/lib/tags";
import { subSubcategorySeoTitleCore } from "@shared/seo-templates";
import { Resource } from "@/types/awesome-list";
import NotFound from "@/pages/not-found";
import { processAwesomeListData } from "@/lib/parser";
import { fetchStaticAwesomeList } from "@/lib/static-data";
import { trackCategoryView } from "@/lib/analytics";

// Run16 BUG-051: same page size as Category so sub-subcategory lists paginate
// instead of rendering hundreds of cards at once.
const PAGE_SIZE = 24;

export default function SubSubcategory() {
  const { slug } = useParams<{ slug: string }>();
  const [location] = useLocation();

  const getSearchParams = () => new URLSearchParams(window.location.search);

  // BUG-064 (run27): shared parser — canonical ?tags=, the ?tag= alias,
  // repeated params, comma lists, whitespace chunks all parse identically on
  // every page that accepts a tag filter (?tags=+++ used to keep a " "
  // chunk here and filter everything out).
  const [selectedTags, setSelectedTags] = useState<string[]>(() =>
    parseTagsParam(getSearchParams()),
  );
  // BUG-064 (run27, parity with Home): a present-but-empty tag filter
  // (?tags=+++ or ?tags=) is ignored — surface a small dismissible note so
  // the visitor knows their link's filter didn't apply.
  const [emptyTagParamNotice, setEmptyTagParamNotice] = useState(() => {
    const params = getSearchParams();
    return (
      (params.has("tags") || params.has("tag")) &&
      parseTagsParam(params).length === 0
    );
  });
  const [sortBy, setSortBy] = useState(() => getSearchParams().get("sortBy") || "default");
  const [searchTerm, setSearchTerm] = useState(() => getSearchParams().get("search") || "");
  // audit2 BUG-022/BUG-023/BUG-027: the shared STRICT taxonomy URL rule
  // (shared/page-param.ts) — the same verdict og-middleware soft-404s on, so
  // non-canonical spellings ("1e3", "007", "abc") and underflow ("0") fall
  // back to page 1 WITH a visible notice instead of a silent rewrite (or,
  // worse, rendering content the crawler pass denies with a 404).
  const [pageInit] = useState(() => parsePageParamStrict(getSearchParams().get("page")));
  const [page, setPage] = useState(pageInit.page);
  const [pageNotice, setPageNotice] = useState<string | null>(() => pageNoticeFor(pageInit));
  // True while a URL-supplied in-range page still awaits the data-loaded
  // over-range check; user-driven page changes never re-arm it.
  const urlPagePendingRef = useRef(pageInit.kind === "valid");

  // Any user-driven filter change resets to page 1 and retires a stale
  // page-correction notice.
  const resetPage = () => {
    setPage(1);
    setPageNotice(null);
    urlPagePendingRef.current = false;
  };

  // audit2 BUG-030: ?filter=general (and the legacy ?view=general alias) has
  // no bucket to select at this LEAF level — every resource here belongs to
  // this sub-subcategory. Instead of a silent no-op, keep the param and
  // explain via a notice; its Remove button drops it.
  const [generalFilterNotice, setGeneralFilterNotice] = useState<boolean>(() => {
    const p = getSearchParams();
    return p.get("filter") === "general" || p.get("view") === "general";
  });
  // Run16 BUG-050: grid/list/compact toggle, shared preference key with
  // Category so the choice follows the user across taxonomy levels.
  // Run22 BUG-026: an explicit ?view=grid|list|compact wins over the saved
  // preference and is persisted back to the URL (also once the user toggles).
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const fromUrl = getSearchParams().get('view');
    if (isLayoutViewMode(fromUrl)) return fromUrl;
    const saved = safeGetItem('awesome-list-view-mode');
    return saved === 'grid' || saved === 'list' || saved === 'compact' ? saved : 'grid';
  });
  const viewParamExplicitRef = useRef(isLayoutViewMode(getSearchParams().get('view')));
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    safeSetItem('awesome-list-view-mode', mode);
    viewParamExplicitRef.current = true;
  };
  
  const { data: rawData, isLoading, error } = useQuery({
    queryKey: ["awesome-list-data"],
    queryFn: fetchStaticAwesomeList,
    staleTime: 1000 * 60 * 60,
  });
  
  const awesomeList = rawData ? processAwesomeListData(rawData) : undefined;
  
  let currentSubSubcategory = null;
  let parentCategory = null;
  let parentSubcategory = null;
  let staticResources: Resource[] = [];
  
  if (awesomeList && slug) {
    for (const category of awesomeList.categories) {
      for (const subcategory of category.subcategories || []) {
        if (subcategory.subSubcategories) {
          for (const subSubcat of subcategory.subSubcategories) {
            if (subSubcat.slug === slug) {
              currentSubSubcategory = subSubcat;
              parentCategory = category;
              parentSubcategory = subcategory;
              staticResources = subSubcat.resources;
              break;
            }
          }
        }
        if (currentSubSubcategory) break;
      }
      if (currentSubSubcategory) break;
    }
  }
  
  const subSubcategoryName = currentSubSubcategory ? currentSubSubcategory.name : deslugify(slug || "");
  const categoryName = parentCategory ? parentCategory.name : "";
  const subcategoryName = parentSubcategory ? parentSubcategory.name : "";
  
  const allResources: Resource[] = useMemo(() => {
    const seen = new Set<string>();
    const normalized: Resource[] = [];
    for (const r of staticResources) {
      const key = `${r.id ?? ""}|${r.url ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      normalized.push({
        ...r,
        tags: (r.tags && r.tags.length > 0)
          ? r.tags
          : (Array.isArray(r.metadata?.tags) ? (r.metadata.tags as string[]) : []),
      });
    }
    return normalized;
  }, [staticResources]);

  const availableTags = useMemo(() => {
    const tagCounts: Record<string, number> = {};
    allResources.forEach((r) => {
      const tags = r.tags || [];
      tags.forEach((tag: string) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });
    return Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }, [allResources]);

  const filteredResources = useMemo(() => {
    let results = [...allResources];

    // BUG-060 (run27): whitespace-only input is NO search — "   " used to
    // match literally and hide every resource ("Showing 0 of 0").
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      results = results.filter(r =>
        r.title.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q)
      );
    }

    if (selectedTags.length > 0) {
      // NB-011 (run23): case-insensitive tag matching — parity with
      // Home/Category, so ?tags=av1 and ?tags=AV1 return identical results.
      const wanted = selectedTags.map(normalizeTag);
      results = results.filter(r =>
        r.tags && r.tags.some(tag => wanted.includes(normalizeTag(tag)))
      );
    }

    if (sortBy === "name-asc") {
      results.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === "name-desc") {
      results.sort((a, b) => b.title.localeCompare(a.title));
    }

    return results;
  }, [allResources, searchTerm, selectedTags, sortBy]);

  // ----- Client-side pagination (Run16 BUG-051, mirrors Category BUG-007) -----
  const totalPages = Math.max(1, Math.ceil(filteredResources.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const pagedResources = useMemo(
    () => filteredResources.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filteredResources, currentPage],
  );

  // Guarded on loaded + node found (NOT non-empty results): a zero-match
  // filter has exactly one empty page, and ?page=2 on it must still correct
  // visibly instead of lingering in the URL.
  useEffect(() => {
    if (!isLoading && currentSubSubcategory) {
      if (page > totalPages) {
        // audit2 BUG-023: when the out-of-range page came from the URL, say so
        // instead of silently rewriting; user-driven shrinks stay silent.
        if (urlPagePendingRef.current) {
          setPageNotice(pageNoticeFor({ page, kind: "valid", raw: String(page) }, totalPages));
        }
        setPage(totalPages);
      }
      urlPagePendingRef.current = false;
    }
  }, [isLoading, currentSubSubcategory, page, totalPages]);

  // audit2 BUG-032: numbered paginator helpers — real hrefs merge ?page=N into
  // the current query (filters survive open-in-new-tab); plain SPA clicks go
  // through goToPage so history semantics stay with the URL-sync effect.
  const makePageHref = (n: number) => {
    const params = new URLSearchParams(window.location.search);
    if (n > 1) params.set("page", String(n));
    else params.delete("page");
    const qs = params.toString();
    return `/sub-subcategory/${slug}${qs ? `?${qs}` : ""}`;
  };
  const goToPage = (n: number) => {
    setPage(n);
    setPageNotice(null);
    urlPagePendingRef.current = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Run16 BUG-005: tag/sort changes PUSH history entries so Back restores the
  // previous list state; search keystrokes, initial normalization, and the
  // post-popstate re-sync still replace.
  const urlSyncInitializedRef = useRef(false);
  const popNavigationRef = useRef(false);
  const pushSnapshotRef = useRef("");

  useEffect(() => {
    // Run23 NB-033: bail when Back/Forward has already moved the browser URL
    // off this page — otherwise this effect's final run (location dep) writes
    // this page's path over the destination history entry.
    if (window.location.pathname !== `/sub-subcategory/${slug}`) return;
    const params = new URLSearchParams();

    // BUG-060 (run27): drop ?search= when the box holds only whitespace.
    if (searchTerm.trim()) params.set("search", searchTerm);
    if (selectedTags.length > 0) params.set("tags", selectedTags.join(","));
    if (sortBy && sortBy !== "default") params.set("sortBy", sortBy);
    if (page > 1) params.set("page", String(page));
    // audit2 BUG-030: keep the (ignored) general-filter param while its
    // notice is up so the URL stays honest; dismissing the notice drops it.
    if (generalFilterNotice) params.set("filter", "general");
    // Run22 BUG-026: persist an explicitly chosen layout view.
    if (viewParamExplicitRef.current) params.set("view", viewMode);

    const newSearch = params.toString();
    const newPath = `/sub-subcategory/${slug}${newSearch ? `?${newSearch}` : ""}`;
    const currentPath = `${window.location.pathname}${window.location.search}`;

    const pushSnapshot = JSON.stringify([page, selectedTags, sortBy, viewMode]);
    if (currentPath !== newPath) {
      const shouldPush =
        urlSyncInitializedRef.current &&
        !popNavigationRef.current &&
        pushSnapshotRef.current !== pushSnapshot;
      if (shouldPush) {
        window.history.pushState({}, "", newPath);
      } else {
        window.history.replaceState({}, "", newPath);
      }
    }
    urlSyncInitializedRef.current = true;
    popNavigationRef.current = false;
    pushSnapshotRef.current = pushSnapshot;
  }, [searchTerm, selectedTags, sortBy, page, slug, location, viewMode, generalFilterNotice]);

  useEffect(() => {
    const handlePopState = () => {
      popNavigationRef.current = true;
      const params = getSearchParams();
      setSearchTerm(params.get("search") || "");
      // BUG-064 (run27): same shared parser as the initializer.
      setSelectedTags(parseTagsParam(params));
      setSortBy(params.get("sortBy") || "default");
      // audit2 BUG-022/023: same shared page rule as the initializer, with the
      // same visible feedback when this history entry carries a bad value.
      const parsed = parsePageParamStrict(params.get("page"));
      setPage(parsed.page);
      setPageNotice(pageNoticeFor(parsed));
      urlPagePendingRef.current = parsed.kind === "valid";
      // audit2 BUG-030: restore the leaf-level general-filter notice.
      setGeneralFilterNotice(
        params.get("filter") === "general" || params.get("view") === "general",
      );
      // Run22 BUG-026: restore the layout view carried by this history entry.
      const v = params.get("view");
      if (isLayoutViewMode(v)) {
        setViewMode(v);
        viewParamExplicitRef.current = true;
      } else {
        viewParamExplicitRef.current = false;
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (subSubcategoryName && !isLoading) {
      trackCategoryView(`${categoryName} > ${subcategoryName} > ${subSubcategoryName}`);
    }
  }, [subSubcategoryName, categoryName, subcategoryName, isLoading]);
  
  if (isLoading) {
    return (
      <div className="space-y-6" aria-busy={true} aria-live="polite">
        {/* BUG-031 (run22): head swaps with the route immediately. */}
        <SEOHead title="Loading sub-subcategory" description="Loading sub-subcategory resources on Awesome Video." />
        <h1 className="sr-only">Loading sub-subcategory…</h1>
        <div className="space-y-4">
          <PageHeaderSkeleton />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <ResourceCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">Error Loading Sub-Subcategory</h2>
          <p className="text-muted-foreground">There was an error loading the sub-subcategory data.</p>
          <Link href="/">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }
  
  if (!currentSubSubcategory && !isLoading) {
    return <NotFound />;
  }
  
  return (
    <div className="space-y-4 sm:space-y-6 overflow-x-hidden max-w-full">
      <SEOHead
        // BUG-010 (run14): mirror og-middleware's "<name> – <parent>" template
        // exactly (two-pass parity) so same-named nodes get unique titles.
        // R5-049: routed through the SAME shared builder the server uses so
        // identical child/parent names dedupe on both passes.
        title={subSubcategorySeoTitleCore(subSubcategoryName, subcategoryName)}
        description={`Browse ${allResources.length} curated ${subSubcategoryName.toLowerCase()} resources in the ${subcategoryName} category on Awesome Video.`}
        category={subSubcategoryName}
        resourceCount={allResources.length}
        // BUG-012 (audit 2): page 2+ self-canonicalizes (?page=N), mirroring
        // og-middleware's paginated canonical (two-pass parity).
        pageParam={currentPage}
      />
      
      <div className="space-y-3 sm:space-y-4">
        {/* Run16 BUG-049: asChild so the anchor IS the ≥44px button. */}
        <Button asChild variant="ghost" size="sm" className="gap-2 min-h-[44px]">
          <Link
            href={parentSubcategory?.slug ? `/subcategory/${parentSubcategory.slug}` : "/"}
            data-testid="button-back-subcategory"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to {subcategoryName || "Home"}
          </Link>
        </Button>
        
        {/* BUG-030 (run13): the app header already renders this exact crumb
            chain on md+ screens — page-level breadcrumbs are now mobile-only
            so desktop doesn't show the trail twice. */}
        <div className="md:hidden">
          <Breadcrumbs
            items={[
              {
                label: categoryName,
                href: parentCategory?.slug ? `/category/${parentCategory.slug}` : undefined,
              },
              {
                label: subcategoryName,
                href: parentSubcategory?.slug ? `/subcategory/${parentSubcategory.slug}` : undefined,
              },
              {
                label: subSubcategoryName,
              },
            ]}
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="display-h text-xl sm:text-2xl md:text-3xl break-words" data-testid="heading-subsubcategory">
              {subSubcategoryName}
            </h1>
          </div>
          {/* Run22 BUG-025: badge tracks the active filter result count. */}
          <Badge variant="secondary" className="no-print text-sm sm:text-lg px-3 sm:px-4 py-1 sm:py-2 shrink-0" data-testid="badge-count">
            {filteredResources.length}
          </Badge>
        </div>
      </div>
      
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); resetPage(); }}
          placeholder="Search resources..."
          className="pl-9 min-h-[44px]"
          data-testid="input-search"
        />
      </div>

      <AdvancedFilter
        selectedTags={selectedTags}
        sortBy={sortBy}
        availableTags={availableTags}
        onTagsChange={(tags) => { setSelectedTags(tags); resetPage(); }}
        onSortChange={(value) => { setSortBy(value); resetPage(); }}
        showCountSorts={false}
      />
      
      {/* BUG-064 (run27, parity with Home): honest feedback when the link
          carried a tag param that parsed to nothing (?tags=+++ / ?tags=). */}
      {emptyTagParamNotice && selectedTags.length === 0 && (
        <div
          className="flex flex-wrap items-center justify-between gap-2 border border-[var(--border)] rounded-[var(--radius)] bg-[var(--surface)] px-4 py-2 text-sm text-[color:var(--text-2)]"
          role="status"
          data-testid="notice-empty-tag-param"
        >
          <span>The tag filter in the link you followed was empty, so it was ignored.</span>
          <button
            type="button"
            className="underline underline-offset-2 min-h-8"
            onClick={() => setEmptyTagParamNotice(false)}
            data-testid="button-dismiss-empty-tag-param"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* audit2 BUG-023: visible feedback whenever a URL-supplied page value
          was corrected — never a silent rewrite. */}
      {pageNotice && (
        <div
          className="flex flex-wrap items-center justify-between gap-2 border border-[var(--border)] rounded-[var(--radius)] bg-[var(--surface)] px-4 py-2 text-sm text-muted-foreground"
          role="status"
          data-testid="notice-page-adjusted"
        >
          <span>{pageNotice}</span>
          <button
            type="button"
            className="underline underline-offset-2 min-h-8"
            onClick={() => setPageNotice(null)}
            data-testid="button-dismiss-page-notice"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* audit2 BUG-030: the general/uncategorized filter can't apply at this
          leaf level — explain instead of silently ignoring the param. */}
      {generalFilterNotice && (
        <div
          className="flex flex-wrap items-center justify-between gap-2 border border-[var(--border)] rounded-[var(--radius)] bg-[var(--surface)] px-4 py-2 text-sm text-muted-foreground"
          role="status"
          data-testid="notice-general-leaf"
        >
          <span>
            “Uncategorized” filtering applies to categories and subcategories — {subSubcategoryName} is a single sub-subcategory, so all {filteredResources.length} resources are shown.
          </span>
          <button
            type="button"
            className="underline underline-offset-2 min-h-8"
            onClick={() => setGeneralFilterNotice(false)}
            data-testid="button-clear-general-filter"
          >
            Remove it
          </button>
        </div>
      )}

      {allResources.length > 0 && (
        <div className="flex items-center justify-between gap-2">
          {/* NB-051 (run18): let the position label wrap at narrow widths instead
              of truncating to "…of 11 resou…"; keep it readable at 375px. */}
          <p className="text-sm text-muted-foreground min-w-0 whitespace-normal break-words" data-testid="text-results-count">
            {/* Run16 BUG-051: show the page range like Category does. */}
            Showing {filteredResources.length === 0
              ? "0"
              : `${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, filteredResources.length)}`} of {filteredResources.length} resource{filteredResources.length === 1 ? '' : 's'}
            {selectedTags.length > 0 && ' (filtered)'}
          </p>
          {/* Run16 BUG-050: view mode toggle, matching Category. */}
          <ViewModeToggle value={viewMode} onChange={handleViewModeChange} />
        </div>
      )}
      
      {allResources.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold mb-2">No resources found</h3>
          <p className="text-muted-foreground">
            There are no resources in this sub-subcategory yet.
          </p>
        </div>
      ) : filteredResources.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold mb-2">No resources found</h3>
          {/* BUG-042 (run14): copy matches the control that actually caused
              the empty state (search vs tag filter). */}
          <p className="text-muted-foreground">
            {searchTerm.trim() && selectedTags.length > 0
              ? "Try a different search term or adjust your tag filters."
              : searchTerm.trim()
                ? `No resources match "${searchTerm.trim()}". Try a different search term.`
                : "Try adjusting your tag filters to see more results."}
          </p>
        </div>
      ) : (
        /* BUG-016 (run14): md (768px) drops back to 1 col — sidebar returns
           at md and 2 cols truncated card titles to 3-5 chars. */
        <div className={
          viewMode === "grid"
            // BUG-003 (run22): 3 cols only from xl — same lg squeeze as /category.
            ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4"
            : viewMode === "list"
            ? "flex flex-col gap-2 min-w-0"
            : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 min-w-0"
        }>
          {pagedResources.map((resource, index) => {
            const normalized = {
              id: resource.id != null ? String(resource.id) : "",
              title: resource.title,
              url: resource.url,
              description: resource.description,
            };
            if (viewMode === "list") {
              return <ResourceListRow key={`${resource.id ?? resource.url}-${index}`} resource={normalized} />;
            }
            if (viewMode === "compact") {
              return <ResourceCompactCard key={`${resource.id ?? resource.url}-${index}`} resource={normalized} />;
            }
            return (
              <ResourceCard
                key={`${resource.id ?? resource.url}-${index}`}
                resource={{
                  id: normalized.id,
                  name: resource.title,
                  url: resource.url,
                  description: resource.description,
                  tags: resource.tags,
                }}
                onTagClick={(tag) => {
                  setSelectedTags((prev) => (prev.includes(tag) ? prev : [...prev, tag]));
                  resetPage();
                }}
              />
            );
          })}
        </div>
      )}

      {/* audit2 BUG-032: numbered pages + jump box — any page in ≤2 interactions. */}
      <Paginator
        currentPage={currentPage}
        totalPages={totalPages}
        makeHref={makePageHref}
        onNavigate={goToPage}
      />
    </div>
  );
}

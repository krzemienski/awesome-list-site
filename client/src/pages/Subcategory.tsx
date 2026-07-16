import { useEffect, useState, useMemo } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SEOHead from "@/components/layout/SEOHead";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ArrowLeft, Search } from "lucide-react";
import AdvancedFilter from "@/components/ui/advanced-filter";
import ResourceCard from "@/components/resource/ResourceCard";
import { deslugify, getCategorySlug } from "@/lib/utils";
import { Resource } from "@/types/awesome-list";
import NotFound from "@/pages/not-found";
import { processAwesomeListData } from "@/lib/parser";
import { fetchStaticAwesomeList } from "@/lib/static-data";
import { trackCategoryView } from "@/lib/analytics";

export default function Subcategory() {
  const { slug } = useParams<{ slug: string }>();
  const [location] = useLocation();

  const getSearchParams = () => new URLSearchParams(window.location.search);

  const [selectedTags, setSelectedTags] = useState<string[]>(() => {
    const tags = getSearchParams().get("tags");
    return tags ? tags.split(",") : [];
  });
  const [sortBy, setSortBy] = useState(() => getSearchParams().get("sortBy") || "default");
  const [searchTerm, setSearchTerm] = useState(() => getSearchParams().get("search") || "");
  
  const { data: rawData, isLoading, error } = useQuery({
    queryKey: ["awesome-list-data"],
    queryFn: fetchStaticAwesomeList,
    staleTime: 1000 * 60 * 60,
  });
  
  const awesomeList = rawData ? processAwesomeListData(rawData) : undefined;
  
  let currentSubcategory = null;
  let parentCategory = null;
  let staticResources: Resource[] = [];
  
  if (awesomeList && slug) {
    for (const category of awesomeList.categories) {
      const subcategory = category.subcategories.find(sub => 
        sub.slug === slug
      );
      if (subcategory) {
        currentSubcategory = subcategory;
        parentCategory = category;
        staticResources = [
          ...subcategory.resources,
          ...(subcategory.subSubcategories || []).flatMap((ss) => ss.resources),
        ];
        break;
      }
    }
  }
  
  const subcategoryName = currentSubcategory ? currentSubcategory.name : deslugify(slug || "");
  const categoryName = parentCategory ? parentCategory.name : "";
  
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

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      results = results.filter(r =>
        r.title.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q)
      );
    }

    if (selectedTags.length > 0) {
      results = results.filter(r =>
        r.tags && r.tags.some(tag => selectedTags.includes(tag))
      );
    }

    if (sortBy === "name-asc") {
      results.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === "name-desc") {
      results.sort((a, b) => b.title.localeCompare(a.title));
    }

    return results;
  }, [allResources, searchTerm, selectedTags, sortBy]);
  
  useEffect(() => {
    const params = new URLSearchParams();

    if (searchTerm) params.set("search", searchTerm);
    if (selectedTags.length > 0) params.set("tags", selectedTags.join(","));
    if (sortBy && sortBy !== "default") params.set("sortBy", sortBy);

    const newSearch = params.toString();
    const newPath = `/subcategory/${slug}${newSearch ? `?${newSearch}` : ""}`;
    const currentPath = `${window.location.pathname}${window.location.search}`;

    if (currentPath !== newPath) {
      window.history.replaceState({}, "", newPath);
    }
  }, [searchTerm, selectedTags, sortBy, slug, location]);

  useEffect(() => {
    const handlePopState = () => {
      const params = getSearchParams();
      setSearchTerm(params.get("search") || "");
      const tags = params.get("tags");
      setSelectedTags(tags ? tags.split(",") : []);
      setSortBy(params.get("sortBy") || "default");
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (subcategoryName && !isLoading) {
      trackCategoryView(`${categoryName} > ${subcategoryName}`);
    }
  }, [subcategoryName, categoryName, isLoading]);
  
  if (isLoading) {
    return (
      <div className="space-y-6" aria-busy={true} aria-live="polite">
        <h1 className="sr-only">Loading subcategory…</h1>
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-6 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="sr-only">Subcategory error</h1>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">Error Loading Subcategory</h2>
          <p className="text-muted-foreground">There was an error loading the subcategory data.</p>
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
  
  if (!currentSubcategory && !isLoading) {
    return <NotFound />;
  }
  
  return (
    <div className="space-y-4 sm:space-y-6 overflow-x-hidden max-w-full">
      <SEOHead
        title={subcategoryName}
        description={`Browse ${allResources.length} curated ${subcategoryName.toLowerCase()} resources in the ${categoryName} category on Awesome Video.`}
        category={subcategoryName}
        resourceCount={allResources.length}
      />

      {/* BUG-030 (run13): the app header already renders this exact crumb
          chain on md+ screens — page-level breadcrumbs are now mobile-only so
          desktop doesn't show the trail twice. */}
      <div className="md:hidden">
        <Breadcrumbs
          items={[
            {
              label: categoryName,
              href: `/category/${getCategorySlug(categoryName)}`,
            },
            {
              label: subcategoryName,
            },
          ]}
        />
      </div>

      <div className="space-y-3 sm:space-y-4">
        <Link href={`/category/${getCategorySlug(categoryName)}`}>
          <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back-category">
            <ArrowLeft className="h-4 w-4" />
            Back to {categoryName}
          </Button>
        </Link>
        
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight break-words">
              {subcategoryName}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
              Category: {categoryName}
            </p>
          </div>
          <Badge variant="secondary" className="text-sm sm:text-lg px-3 sm:px-4 py-1 sm:py-2 shrink-0" data-testid="badge-count">
            {allResources.length}
          </Badge>
        </div>
      </div>
      
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search resources..."
          className="pl-9 min-h-[44px]"
          data-testid="input-search"
        />
      </div>

      <AdvancedFilter
        selectedTags={selectedTags}
        sortBy={sortBy}
        availableTags={availableTags}
        onTagsChange={setSelectedTags}
        onSortChange={setSortBy}
        showCountSorts={false}
      />
      
      {allResources.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground" data-testid="text-results-count">
            {/* BUG-054 (run14): singular agreement for one-resource pages */}
            Showing {filteredResources.length} of {allResources.length} resource{allResources.length === 1 ? '' : 's'}
            {selectedTags.length > 0 && ` (filtered by ${selectedTags.length} tag${selectedTags.length > 1 ? 's' : ''})`}
          </p>
        </div>
      )}
      
      {allResources.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold mb-2">No resources found</h3>
          <p className="text-muted-foreground">
            There are no resources in this subcategory yet.
          </p>
        </div>
      ) : filteredResources.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold mb-2">No resources found</h3>
          {/* BUG-042 (run14): copy matches the control that actually caused
              the empty state (search vs tag filter). */}
          <p className="text-muted-foreground">
            {searchTerm && selectedTags.length > 0
              ? "Try a different search term or adjust your tag filters."
              : searchTerm
                ? `No resources match "${searchTerm}". Try a different search term.`
                : "Try adjusting your tag filters to see more results."}
          </p>
        </div>
      ) : (
        /* BUG-016 (run14): md (768px) drops back to 1 col — the sidebar
           reappears at md and a 2-col grid left ~60px titles ("Adv…"). */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
          {filteredResources.map((resource, index) => (
            <ResourceCard
              key={`${resource.id ?? resource.url}-${index}`}
              resource={{
                id: resource.id != null ? String(resource.id) : "",
                name: resource.title,
                url: resource.url,
                description: resource.description,
                category: resource.subSubcategory || undefined,
                tags: resource.tags,
              }}
              onTagClick={(tag) =>
                setSelectedTags((prev) => (prev.includes(tag) ? prev : [...prev, tag]))
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

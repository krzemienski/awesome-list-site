import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link, useLocation, useSearch } from "wouter";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Paginator } from "@/components/ui/paginator";
import AdvancedFilter from "@/components/ui/advanced-filter";
import ResourceCard from "@/components/resource/ResourceCard";
import { ResourceListRow, ResourceCompactCard } from "@/components/resource/resource-view-modes";
import { ViewModeToggle, isLayoutViewMode, type ViewMode } from "@/components/ui/view-mode-toggle";
import { PageHeaderSkeleton, ResourceCardSkeleton } from "@/components/ui/skeletons";
import SEOHead from "@/components/layout/SEOHead";
import {
  categorySeoDescription,
  categorySeoTitleCore,
  pagedSeoDescription,
  pagedSeoTitleCore,
  subcategorySeoDescription,
  subcategorySeoTitleCore,
  subSubcategorySeoDescription,
  subSubcategorySeoTitleCore,
} from "@shared/seo-templates";
import NotFound from "@/pages/not-found";
import { parsePageParamStrict, pageNoticeFor } from "@/lib/page-param";
import { safeGetItem, safeSetItem } from "@/lib/safeStorage";
import { normalizeTag, parseTagsParam } from "@/lib/tags";
import {
  fetchListingPage,
  fetchStaticAwesomeList,
  type ListingLevel,
} from "@/lib/static-data";
import { processAwesomeListData } from "@/lib/parser";

const PAGE_SIZE = 24;
type Props = { level: ListingLevel };

function routeFor(level: ListingLevel, slug: string) {
  return `/${level === "category" ? "category" : level === "subcategory" ? "subcategory" : "sub-subcategory"}/${slug}`;
}

function allForLevel(raw: any, level: ListingLevel, slug: string) {
  const tree = processAwesomeListData(raw);
  for (const category of tree.categories) {
    if (level === "category" && category.slug === slug) {
      return { node: category, category, resources: [
        ...(category.resources ?? []),
        ...(category.subcategories ?? []).flatMap((sub: any) => [
          ...(sub.resources ?? []), ...((sub.subSubcategories ?? []).flatMap((ss: any) => ss.resources ?? [])),
        ]),
      ] };
    }
    for (const subcategory of category.subcategories ?? []) {
      if (level === "subcategory" && subcategory.slug === slug) {
        return { node: subcategory, category, subcategory, resources: [
          ...(subcategory.resources ?? []), ...((subcategory.subSubcategories ?? []).flatMap((ss: any) => ss.resources ?? [])),
        ] };
      }
      for (const subSubcategory of subcategory.subSubcategories ?? []) {
        if (level === "sub-subcategory" && subSubcategory.slug === slug) {
          return { node: subSubcategory, category, subcategory, resources: subSubcategory.resources ?? [] };
        }
      }
    }
  }
  return undefined;
}

export default function TaxonomyListing({ level }: Props) {
  const { slug = "" } = useParams<{ slug: string }>();
  const [location] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const initialPage = parsePageParamStrict(params.get("page"));
  const [page, setPage] = useState(initialPage.page);
  const [searchTerm, setSearchTerm] = useState(params.get("search") ?? "");
  const [tags, setTags] = useState(() => parseTagsParam(params));
  const [sort, setSort] = useState(params.get("sortBy") ?? "default");
  const [view, setView] = useState<ViewMode>(() => {
    const fromUrl = params.get("view");
    if (isLayoutViewMode(fromUrl)) return fromUrl;
    const saved = safeGetItem("awesome-list-view-mode");
    return isLayoutViewMode(saved) ? saved : "grid";
  });
  const [notice, setNotice] = useState<string | null>(pageNoticeFor(initialPage));
  const [selection, setSelection] = useState(params.get("subcategory") ?? "all");
  const general = params.get("filter") === "general" || params.get("view") === "general" || selection === "__general__";
  const corpusMode = Boolean(searchTerm.trim() || tags.length || sort !== "default");
  const pageOptions = useMemo(() => {
    if (level === "category") {
      const [subcategory, subSubcategory] = selection.split(" › ");
      return {
        // A child name is only unique within its parent. Send both identities
        // so the server can validate and scope “Parent › Child” deep links.
        subcategory: selection !== "all" && selection !== "__general__" ? subcategory : undefined,
        subSubcategory: subSubcategory || undefined,
        general,
      };
    }
    return { subcategory: level === "subcategory" && selection !== "all" ? selection : undefined, general };
  }, [general, level, selection]);

  const listing = useQuery({
    queryKey: ["awesome-list-listing", level, slug, page, pageOptions],
    queryFn: () => fetchListingPage(level, slug, page, pageOptions),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
  const corpus = useQuery({
    queryKey: ["awesome-list-data"],
    queryFn: fetchStaticAwesomeList,
    staleTime: 60 * 60_000,
    enabled: corpusMode,
  });
  const corpusNode = useMemo(
    () => corpus.data ? allForLevel(corpus.data, level, slug) : undefined,
    [corpus.data, level, slug],
  );
  const listingData = listing.data;
  const fullResources = useMemo(() => {
    if (!corpusNode) return [];
    let result = [...corpusNode.resources];
    const direct = new Set((corpusNode.node.resources ?? []).map((r: any) => `${r.id}|${r.url}`));
    if (general && direct.size) result = result.filter((r: any) => direct.has(`${r.id}|${r.url}`));
    else if (selection !== "all" && selection !== "__general__") {
      const [sub, subSub] = selection.split(" › ");
      result = level === "subcategory"
        ? result.filter((r: any) => r.subSubcategory === sub)
        : result.filter((r: any) => r.subcategory === sub && (!subSub || r.subSubcategory === subSub));
    }
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      result = result.filter((r: any) => r.title.toLowerCase().includes(q) || String(r.description ?? "").toLowerCase().includes(q));
    }
    if (tags.length) {
      const wanted = tags.map(normalizeTag);
      result = result.filter((r: any) => (r.tags ?? r.metadata?.tags ?? []).some((tag: string) => wanted.includes(normalizeTag(tag))));
    }
    if (sort === "name-asc") result.sort((a: any, b: any) => a.title.localeCompare(b.title));
    if (sort === "name-desc") result.sort((a: any, b: any) => b.title.localeCompare(a.title));
    return result;
  }, [corpusNode, general, searchTerm, selection, sort, tags]);
  const total = corpusMode ? fullResources.length : listingData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const resources = corpusMode
    ? fullResources.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
    : listingData?.resources ?? [];
  const name = corpusMode ? corpusNode?.node.name : listingData?.node.name;
  const parentCategory = corpusMode ? corpusNode?.category : listingData?.parents.category;
  const parentSubcategory = corpusMode ? corpusNode?.subcategory : listingData?.parents.subcategory;
  const loading = (listing.isLoading && !listingData) || (corpusMode && corpus.isLoading);

  const urlSyncInitialized = useRef(false);
  const popNavigation = useRef(false);
  const pushSnapshot = useRef("");
  useEffect(() => {
    if (page > totalPages && !loading) {
      setNotice(`Page ${page} is not available; showing page ${totalPages} instead.`);
      setPage(totalPages);
    }
  }, [loading, page, totalPages]);
  useEffect(() => {
    const next = new URLSearchParams();
    if (searchTerm.trim()) next.set("search", searchTerm);
    if (selection !== "all" && !general) next.set("subcategory", selection);
    if (tags.length) next.set("tags", tags.join(","));
    if (sort !== "default") next.set("sortBy", sort);
    if (page > 1) next.set("page", String(page));
    if (general) next.set("filter", "general");
    if (view !== "grid") next.set("view", view);
    const href = `${routeFor(level, slug)}${next.size ? `?${next}` : ""}`;
    const current = `${window.location.pathname}${window.location.search}`;
    const snapshot = JSON.stringify([page, selection, tags, sort, general, view]);
    if (current !== href) {
      const shouldPush = urlSyncInitialized.current && !popNavigation.current && pushSnapshot.current !== snapshot;
      window.history[shouldPush ? "pushState" : "replaceState"]({}, "", href);
    }
    urlSyncInitialized.current = true;
    popNavigation.current = false;
    pushSnapshot.current = snapshot;
  }, [general, level, location, page, searchTerm, selection, slug, sort, tags, view]);
  useEffect(() => {
    const onPopState = () => {
      popNavigation.current = true;
      const next = new URLSearchParams(window.location.search);
      setSearchTerm(next.get("search") ?? "");
      setSelection(next.get("subcategory") ?? "all");
      setTags(parseTagsParam(next));
      setSort(next.get("sortBy") ?? "default");
      const parsed = parsePageParamStrict(next.get("page"));
      setPage(parsed.page);
      setNotice(pageNoticeFor(parsed));
      const nextView = next.get("view");
      setView(isLayoutViewMode(nextView) ? nextView : "grid");
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  if (loading) return <div className="space-y-6" aria-busy="true"><SEOHead title="Loading resources" description="Loading Awesome Video resources." /><PageHeaderSkeleton /><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({ length: 9 }).map((_, i) => <ResourceCardSkeleton key={i} />)}</div></div>;
  if (listing.error || corpus.error) return <div className="py-12 text-center"><h2 className="text-xl font-semibold">Error Loading Resources</h2><p className="text-muted-foreground">Please try again.</p></div>;
  if (!listingData || !name) return <NotFound />;

  const optionChildren = listingData.children.flatMap((child: any) => [
    { value: child.name, count: child.count },
    ...((child.subSubcategories ?? []).map((subSub: any) => ({ value: `${child.name} › ${subSub.name}`, count: subSub.count }))),
  ]);
  const backSlug = level === "subcategory" ? parentCategory?.slug : parentSubcategory?.slug;
  const back = level === "category" || !backSlug
    ? "/"
    : routeFor(level === "subcategory" ? "category" : "subcategory", backSlug);
  const onPage = (nextPage: number) => { setPage(nextPage); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const makeHref = (nextPage: number) => {
    const next = new URLSearchParams(window.location.search);
    if (nextPage > 1) next.set("page", String(nextPage)); else next.delete("page");
    return `${routeFor(level, slug)}${next.size ? `?${next}` : ""}`;
  };

  const seoCore = level === "category"
    ? categorySeoTitleCore(name, slug)
    : level === "subcategory"
      ? subcategorySeoTitleCore(name, parentCategory?.name ?? "", parentCategory?.slug)
      : subSubcategorySeoTitleCore(name, parentSubcategory?.name);
  const seoDescription = level === "category"
    ? categorySeoDescription(name, slug, listingData.totalAll)
    : level === "subcategory"
      ? subcategorySeoDescription(name, parentCategory?.name ?? "", listingData.totalAll)
      : subSubcategorySeoDescription(name, parentSubcategory?.name ?? "", listingData.totalAll);

  return <div className="space-y-4 sm:space-y-6 overflow-x-hidden max-w-full">
    <SEOHead title={pagedSeoTitleCore(seoCore, currentPage)} description={pagedSeoDescription(seoDescription, currentPage, totalPages)} category={name} resourceCount={listingData.totalAll} pageParam={currentPage} />
    <Button asChild variant="ghost" size="sm" className="gap-2 min-h-[44px]"><Link href={back}><ArrowLeft className="h-4 w-4" />Back to {level === "category" ? "Home" : parentCategory?.name ?? "Category"}</Link></Button>
    <div className="flex items-start justify-between gap-3"><div><h1 className="display-h text-2xl sm:text-3xl">{name}</h1><p className="text-sm text-muted-foreground">{total === listingData.totalAll ? `${total} resources available` : `${total} of ${listingData.totalAll} resources shown`}</p></div><Badge variant="secondary" className="no-print" data-testid="badge-count">{total}</Badge></div>
    <div className="flex flex-col gap-4"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-10" value={searchTerm} onChange={(event) => { setSearchTerm(event.target.value); setPage(1); }} placeholder={`Search in ${name}...`} data-testid="input-search-resources" /></div>
      {level !== "sub-subcategory" && optionChildren.length > 0 && <select className="h-10 rounded-md border bg-background px-3" value={selection} onChange={(event) => { setSelection(event.target.value); setPage(1); }} data-testid="select-subcategory-filter"><option value="all">All subcategories</option>{listingData.generalCount > 0 && <option value="__general__">Uncategorized ({listingData.generalCount})</option>}{optionChildren.map((item) => <option key={item.value} value={item.value}>{item.value} ({item.count})</option>)}</select>}
      <AdvancedFilter selectedTags={tags} sortBy={sort} availableTags={listingData.tags} onTagsChange={(value) => { setTags(value); setPage(1); }} onSortChange={(value) => { setSort(value); setPage(1); }} showCountSorts={false} />
    </div>
    <div className="flex items-center justify-between gap-2"><p className="text-sm text-muted-foreground" data-testid="text-results-count">Showing {total === 0 ? "0" : `${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, total)}`} of {total} resources</p><ViewModeToggle value={view} onChange={(mode) => { setView(mode); safeSetItem("awesome-list-view-mode", mode); }} /></div>
    {notice && <div role="status" data-testid="notice-page-adjusted" className="rounded border p-3 text-sm">{notice}<button className="ml-2 underline" onClick={() => setNotice(null)}>Dismiss</button></div>}
    {(listingData.scope.ignoredSubcategory || listingData.scope.ignoredSubSubcategory) && <div role="status" data-testid="notice-unknown-subcategory" className="rounded border p-3 text-sm">“{selection}” isn't a subcategory of {name}, so that filter was ignored.<button className="ml-2 underline" onClick={() => { setSelection("all"); setPage(1); }}>Remove it</button></div>}
    {resources.length === 0 ? <div className="py-12 text-center" data-testid="empty-resources"><h3 className="text-lg font-semibold">No resources found</h3><p className="text-muted-foreground">Try adjusting your filters to see more results.</p></div> :
      <div className={view === "grid" ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4" : view === "list" ? "flex flex-col gap-2" : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3"}>{resources.map((resource: any, index: number) => {
        const normalized = { id: String(resource.id ?? ""), title: resource.title, url: resource.url, description: resource.description ?? "" };
        if (view === "list") return <ResourceListRow key={`${normalized.id}-${index}`} resource={normalized} />;
        if (view === "compact") return <ResourceCompactCard key={`${normalized.id}-${index}`} resource={normalized} />;
        return <ResourceCard key={`${normalized.id}-${index}`} resource={{ id: normalized.id, name: normalized.title, url: normalized.url, description: normalized.description, tags: resource.tags ?? resource.metadata?.tags ?? [] }} onTagClick={(tag) => { setTags((old) => old.includes(tag) ? old : [...old, tag]); setPage(1); }} />;
      })}</div>}
    <Paginator currentPage={currentPage} totalPages={totalPages} makeHref={makeHref} onNavigate={onPage} />
  </div>;
}
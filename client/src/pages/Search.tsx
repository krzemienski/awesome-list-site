import { ResourceCardSkeleton } from "@/components/ui/skeletons";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, ApiError } from "@/lib/queryClient";
import { writeFilterParams } from "@/lib/url-filter-state";
import { parseTagsParam, normalizeTag } from "@/lib/tags";
import { normalizeSearchQuery } from "@shared/searchNormalize";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search as SearchIcon, AlertCircle } from "lucide-react";
import SEOHead from "@/components/layout/SEOHead";
import ResourceCard from "@/components/resource/ResourceCard";
import type { Resource as DbResource } from "@shared/schema";
import type { ResourceSearchFacets } from "@shared/resourceFacets";
import { Paginator } from "@/components/ui/paginator";
import SearchFilters, { ActiveFilters, sortLabels } from "@/components/search/SearchFilters";
import { parsePageFromSearch, pageNoticeFor } from "@/lib/page-param";
import { trackSearch } from "@/lib/analytics";

type State = { q: string; category: string; subcategory: string; subSubcategory: string; tags: string[]; provider: string; format: string; skillLevel: string; sort: string; page: number };
const PAGE_SIZE = 24;
const readState = (search: string): State => {
  const p = new URLSearchParams(search);
  // `q` is the canonical public URL key, but older/external entry points may
  // still use `search`. When both are present, explicit canonical `q` wins.
  const query = p.has("q") ? p.get("q") ?? "" : p.get("search") ?? "";
  return { q: query, category: p.get("category") ?? "", subcategory: p.get("subcategory") ?? "", subSubcategory: p.get("subSubcategory") ?? "", tags: parseTagsParam(p).map(normalizeTag), provider: p.get("provider") ?? "", format: p.get("format") ?? "", skillLevel: p.get("skillLevel") ?? "", sort: p.get("sort") ?? "relevance", page: parsePageFromSearch(search).page };
};
const facetState = (s: State) => [s.category, s.subcategory, s.subSubcategory, s.provider, s.format, s.skillLevel].some(Boolean) || s.tags.length > 0;

export default function Search() {
  const searchString = useSearch();
  const [state, setState] = useState(() => readState(searchString));
  const [input, setInput] = useState(state.q);
  const [pageNotice, setPageNotice] = useState<string | null>(() => pageNoticeFor(parsePageFromSearch(searchString)));
  const inputRef = useRef<HTMLInputElement>(null);
  const pristine = useRef(true);
  const preservePageNoticeRef = useRef(false);
  const lastTrackedSearchIntentRef = useRef("");
  useEffect(() => inputRef.current?.focus(), []);
  // The URL is the source of truth for reloads, router links, and Back/Forward.
  // Wouter's useSearch reacts to both its own navigation and patched History
  // API writes, so every query-string navigation rehydrates the whole filter
  // state rather than relying only on the native popstate event.
  useEffect(() => {
    const next = readState(searchString);
    setState(next);
    setInput(next.q);
    const params = new URLSearchParams(searchString);
    if (params.has("search")) {
      if (!params.has("q") && next.q) params.set("q", next.q);
      params.delete("search");
      const canonical = params.toString();
      window.history.replaceState(null, "", `/search${canonical ? `?${canonical}` : ""}`);
    }
    const notice = pageNoticeFor(parsePageFromSearch(searchString));
    if (notice) setPageNotice(notice);
    else if (!preservePageNoticeRef.current) setPageNotice(null);
    preservePageNoticeRef.current = false;
  }, [searchString]);

  const update = (key: keyof State, value: string | string[]) => {
    // A discrete filter action commits any pending debounced search draft so
    // the URL and visible input cannot diverge.
    const committedQuery = key === "q" && typeof value === "string" ? value : input;
    const next = { ...state, q: committedQuery, [key]: value, page: 1 } as State;
    const updates: Record<string, string | null> = {
      [key]: Array.isArray(value) ? value.join(",") : value,
      q: committedQuery || null,
      search: null,
      page: null,
    };
    // Taxonomy filters form a hierarchy. A parent change invalidates any
    // child selection instead of leaving an invisible stale combination.
    if (key === "category") {
      next.subcategory = "";
      next.subSubcategory = "";
      updates.subcategory = null;
      updates.subSubcategory = null;
    } else if (key === "subcategory") {
      next.subSubcategory = "";
      updates.subSubcategory = null;
    }
    setState(next);
    if (key === "sort" && value === "relevance") updates.sort = null;
    writeFilterParams(updates, "push");
    setPageNotice(null);
  };
  useEffect(() => {
    const timer = setTimeout(() => { if (input === state.q) return; setState(s => ({ ...s, q: input, page: 1 })); writeFilterParams({ q: input || null, search: null, page: null }, "push"); }, 300);
    return () => clearTimeout(timer);
  }, [input, state.q]);
  const clearFilters = (includeSort = false) => {
    const next = {
      ...state,
      q: input,
      category: "",
      subcategory: "",
      subSubcategory: "",
      tags: [],
      provider: "",
      format: "",
      skillLevel: "",
      sort: includeSort ? "relevance" : state.sort,
      page: 1,
    };
    setState(next);
    writeFilterParams({
      q: input || null,
      search: null,
      category: null,
      subcategory: null,
      subSubcategory: null,
      tags: null,
      provider: null,
      format: null,
      skillLevel: null,
      sort: includeSort ? null : state.sort === "relevance" ? null : state.sort,
      page: null,
    }, "push");
  };
  const clearInvalidRequest = () => {
    const next = readState("");
    setState(next);
    setInput("");
    setPageNotice(null);
    // Remove every parameter used to construct the failed request, including
    // unsupported values and any unrelated unknown query keys.
    window.history.replaceState(null, "", "/search");
  };
  const clearSearch = () => { setInput(""); setState(s => ({ ...s, q: "", page: 1 })); writeFilterParams({ q: null, search: null, page: null }, "push"); inputRef.current?.focus(); };
  const normalized = normalizeSearchQuery(state.q);
  const canBrowse = facetState(state) || state.sort !== "relevance";
  const shouldShowResults = normalized.length >= 2 || canBrowse;
  const queryUrl = useMemo(() => { const p = new URLSearchParams({ page: String(state.page), limit: String(PAGE_SIZE), facets: "true" }); if (normalized && (normalized.length >= 2 || canBrowse)) p.set("search", normalized); if (state.category) p.set("category", state.category); if (state.subcategory) p.set("subcategory", state.subcategory); if (state.subSubcategory) p.set("subSubcategory", state.subSubcategory); if (state.tags.length) p.set("tags", state.tags.join(",")); if (state.provider) p.set("provider", state.provider); if (state.format) p.set("format", state.format); if (state.skillLevel) p.set("skillLevel", state.skillLevel); if (state.sort !== "relevance") p.set("sort", state.sort); return `/api/resources?${p.toString()}`; }, [normalized, canBrowse, state]);
  // Fetch the unfiltered first page even while the prompt is visible. Its rows
  // stay hidden, but its facet metadata makes filter-only browsing possible.
  const query = useQuery<{ resources: DbResource[]; total: number; facets: ResourceSearchFacets; search?: { mode: "fts" | "fuzzy"; suggestion?: string } }>({ queryKey: [queryUrl], queryFn: () => apiRequest(queryUrl, { method: "GET" }), staleTime: 60_000 });
  const data = query.data; const results = data?.resources ?? []; const total = data?.total ?? 0; const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE)); const safePage = Math.min(state.page, totalPages);
  useEffect(() => {
    if (normalized.length < 2 || !data) return;
    const intent = JSON.stringify([
      normalized,
      state.category,
      state.subcategory,
      state.subSubcategory,
      state.tags,
      state.provider,
      state.format,
      state.skillLevel,
      state.sort,
    ]);
    if (lastTrackedSearchIntentRef.current === intent) return;
    lastTrackedSearchIntentRef.current = intent;
    trackSearch(normalized, data.total, "search_page");
  }, [data, normalized, state.category, state.format, state.provider, state.skillLevel, state.sort, state.subSubcategory, state.subcategory, state.tags]);
  const lastFacets = useRef<ResourceSearchFacets>();
  if (data?.facets) lastFacets.current = data.facets;
  useEffect(() => { if (data && state.page > totalPages) { preservePageNoticeRef.current = true; setState(s => ({ ...s, page: totalPages })); writeFilterParams({ page: totalPages > 1 ? String(totalPages) : null }, "replace"); setPageNotice(`Page ${state.page} is beyond the available results. Showing page ${totalPages}.`); } }, [data, state.page, totalPages]);
  const gotoPage = (n: number) => { setState(s => ({ ...s, page: n })); writeFilterParams({ page: n > 1 ? String(n) : null }, "push"); setPageNotice(null); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const makePageHref = (n: number) => { const p = new URLSearchParams(window.location.search); n > 1 ? p.set("page", String(n)) : p.delete("page"); return `/search?${p.toString()}`; };
  const invalid = query.error instanceof ApiError && query.error.status === 400;
  return <div className="space-y-6">
    <SEOHead title={normalized ? `Search: ${normalized} — Awesome Video` : "Search — Awesome Video"} description="Search curated video development tools, libraries, players, codecs, and learning resources." noindex />
    <header className="space-y-4"><div className="flex items-center gap-3"><SearchIcon className="h-6 w-6 text-[var(--accent)]" /><div><h1 className="display-h text-2xl sm:text-3xl">Search</h1><p className="text-sm text-muted-foreground">A precise index of tools, standards, and ideas for video developers.</p></div></div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center"><div className="relative min-w-0 flex-1"><SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input ref={inputRef} value={input} onChange={e => { pristine.current = false; setInput(e.target.value); }} onMouseDown={() => { pristine.current = false; }} onKeyDown={e => { if (e.key === "/" && pristine.current && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); window.dispatchEvent(new Event("awesome:open-search-palette")); } pristine.current = false; }} placeholder="Search resources..." className="min-h-11 pl-10" aria-label="Search resources" data-testid="input-search-page" /></div>
        <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">Sort</span><Select value={state.sort} onValueChange={v => update("sort", v)}><SelectTrigger className="min-h-11 w-36" aria-label="Sort results" data-testid="select-search-sort"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(sortLabels).map(([v, text]) => <SelectItem key={v} value={v}>{text}</SelectItem>)}</SelectContent></Select></div></div>
    </header>
    <ActiveFilters state={state} onChange={update} onClear={() => clearFilters()} />
    {pageNotice && <div className="flex items-center justify-between rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm" role="status" data-testid="notice-page-adjusted"><span>{pageNotice}</span><button className="min-h-8 underline" onClick={() => setPageNotice(null)} data-testid="button-dismiss-page-notice">Dismiss</button></div>}
    <div className="flex flex-col items-stretch gap-4 lg:flex-row lg:items-start lg:gap-6"><SearchFilters state={state} facets={data?.facets ?? lastFacets.current} onChange={update} onClear={() => clearFilters()} /><main className="min-w-0 flex-1">
      {!shouldShowResults ? <Card data-testid="text-search-prompt"><CardContent className="flex flex-col items-center gap-3 py-12 text-center"><SearchIcon className="h-8 w-8 text-muted-foreground" /><h2 className="text-sm font-semibold">{normalized.length === 1 ? "Keep typing to search" : "Enter a query or choose filters"}</h2><p className="text-xs text-muted-foreground">{normalized.length === 1 ? "Type at least 2 characters, or choose a filter to browse." : "Narrow the catalog by category, provider, format, skill level, or tag."}</p><Button asChild variant="outline"><Link href="/categories">Browse categories</Link></Button></CardContent></Card>
      : query.isLoading ? <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr))]">{Array.from({ length: 6 }).map((_, i) => <ResourceCardSkeleton key={i} />)}</div>
      : query.isError ? <Card><CardContent className="flex flex-col items-center gap-3 py-10 text-center"><AlertCircle className="h-8 w-8 text-[var(--accent)]" /><p className="text-sm text-muted-foreground">{invalid ? query.error.message : "Search failed. Please try again."}</p><Button variant="outline" onClick={invalid ? clearInvalidRequest : () => query.refetch()} data-testid={invalid ? "button-clear-invalid-filters" : "button-retry-search"}>{invalid ? "Clear invalid filters" : "Try again"}</Button></CardContent></Card>
       : results.length === 0 ? <Card><CardContent className="flex flex-col items-center gap-3 py-12 text-center"><SearchIcon className="h-8 w-8 text-muted-foreground" /><h2 className="text-sm font-semibold" data-testid="text-no-results">{normalized || canBrowse ? "No resources match this combination" : "Enter a query or choose filters"}</h2><p className="text-xs text-muted-foreground">Try broadening your filters or search terms.</p><div className="flex gap-2"><Button variant="outline" onClick={() => clearFilters()}>Clear filters</Button><Button variant="ghost" onClick={clearSearch}>Clear search</Button></div></CardContent></Card>
       : <>{data?.search?.mode === "fuzzy" && data.search.suggestion && <div className="mb-4 flex flex-wrap items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm" role="status" data-testid="notice-search-suggestion"><span>No exact matches. Did you mean</span><Button variant="link" className="h-auto p-0" onClick={() => { setInput(data.search!.suggestion!); update("q", data.search!.suggestion!); }}>{data.search.suggestion}</Button><span>?</span></div>}<p className="mb-4 text-sm text-muted-foreground" data-testid="text-result-count">{totalPages > 1 ? `Page ${safePage} of ${totalPages} · showing ${(safePage - 1) * PAGE_SIZE + 1}–${(safePage - 1) * PAGE_SIZE + results.length} of ${total} results` : `${total} result${total === 1 ? "" : "s"}`}{normalized ? ` for “${normalized}”` : ""}</p><div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr))]">{results.map(r => <ResourceCard key={r.id} resource={{ id: String(r.id), name: r.title, url: r.url, description: r.description ?? undefined, category: r.category ?? undefined }} fullResource={r} />)}</div><Paginator currentPage={safePage} totalPages={totalPages} makeHref={makePageHref} onNavigate={gotoPage} className="pt-4" testIds={{ container: "search-pagination", prev: "button-search-prev", next: "button-search-next", jump: "input-search-page-jump" }} /></>}
    </main></div>
  </div>;
}
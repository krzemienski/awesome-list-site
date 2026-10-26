import StatePanel, { RetryButton } from "@/components/layout/StatePanel";
import { ResourceCardSkeleton } from "@/components/ui/skeletons";
import "@/styles/pages/discovery.css";
import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { Link, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, ApiError } from "@/lib/queryClient";
import { writeFilterParams } from "@/lib/url-filter-state";
import { normalizeTag } from "@/lib/tags";
import { isSearchableQuery, normalizeSearchQuery, SEARCH_QUERY_MAX_LENGTH } from "@shared/searchNormalize";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search as SearchIcon } from "lucide-react";
import { queryUnavailableReason } from "@/lib/query-availability";
import SEOHead from "@/components/layout/SEOHead";
import ResourceCard from "@/components/resource/ResourceCard";
import type { Resource as DbResource } from "@shared/schema";
import type { ResourceSearchFacets } from "@shared/resourceFacets";
import { Paginator } from "@/components/ui/paginator";
import SearchFilters, { ActiveFilters, sortLabels } from "@/components/search/SearchFilters";
import { parsePageFromSearch, pageNoticeFor } from "@/lib/page-param";
import { trackFilterUsage, trackSearch, trackSortChange, trackTagInteraction } from "@/lib/analytics";
import { readSearchState, searchApiParams, searchCanBrowse } from "@shared/discovery-params";
import { searchPageSeo } from "@shared/seo-templates";
import { fetchAwesomeListNav, navTotalCount, visibleNavCategories, type AwesomeListNav } from "@/lib/static-data";

type State = { q: string; category: string; subcategory: string; subSubcategory: string; tags: string[]; provider: string; format: string; skillLevel: string; sort: string; page: number };
const PAGE_SIZE = 24;
const readState = (search: string): State => {
  return readSearchState(search);
};
const facetState = (s: State) => [s.category, s.subcategory, s.subSubcategory, s.provider, s.format, s.skillLevel].some(Boolean) || s.tags.length > 0;
const searchFilterSignature = (s: State) => JSON.stringify([
  s.category,
  s.subcategory,
  s.subSubcategory,
  s.tags.map(normalizeTag).sort(),
  s.provider,
  s.format,
  s.skillLevel,
  s.sort,
]);

export default function Search() {
  const searchString = useSearch();
  const [state, setState] = useState(() => readState(searchString));
  const [input, setInput] = useState(state.q);
  const [pageNotice, setPageNotice] = useState<string | null>(() => pageNoticeFor(parsePageFromSearch(searchString)));
  const inputRef = useRef<HTMLInputElement>(null);
  const pristine = useRef(true);
  const preservePageNoticeRef = useRef(false);
  const lastTrackedSearchIntentRef = useRef("");
  const resultsRef = useRef<HTMLElement>(null);
  const pendingResultsFocusRef = useRef(false);
  const pendingAnalyticsRef = useRef<{
    signature: string;
    type: string;
    value: string;
    kind: "filter" | "sort" | "tag";
    tagAction?: "apply" | "remove";
  } | null>(null);
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
    if (key !== "q" && key !== "page") {
      if (key === "sort" && typeof value === "string") {
        pendingAnalyticsRef.current = { signature: searchFilterSignature(next), type: "sort", value, kind: "sort" };
      } else if (key === "tags" && Array.isArray(value)) {
        const previous = new Set(state.tags.map(normalizeTag));
        const incoming = new Set(value.map(normalizeTag));
        const added = value.find(tag => !previous.has(normalizeTag(tag)));
        const removed = state.tags.find(tag => !incoming.has(normalizeTag(tag)));
        pendingAnalyticsRef.current = {
          signature: searchFilterSignature(next),
          type: "tag",
          value: added ?? removed ?? "multiple",
          kind: "tag",
          tagAction: added ? "apply" : "remove",
        };
      } else if (typeof value === "string") {
        pendingAnalyticsRef.current = {
          signature: searchFilterSignature(next),
          type: key,
          value: value || "cleared",
          kind: "filter",
        };
      }
      pendingResultsFocusRef.current = true;
    }
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
    pendingAnalyticsRef.current = {
      signature: searchFilterSignature(next),
      type: "all",
      value: "cleared",
      kind: "filter",
    };
    pendingResultsFocusRef.current = true;
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
    // C6-SWEEP-05: "Clear invalid filters" unmounts with the error card.
    inputRef.current?.focus();
  };
  const clearSearch = () => { setInput(""); setState(s => ({ ...s, q: "", page: 1 })); writeFilterParams({ q: null, search: null, page: null }, "push"); inputRef.current?.focus(); };
  const normalized = normalizeSearchQuery(state.q);
  const queryTooLong = normalized.length > SEARCH_QUERY_MAX_LENGTH;
  const hasActiveFilters = facetState(state);
  const canBrowse = searchCanBrowse(state);
  const queryReady = isSearchableQuery(normalized);
  const shouldShowResults = queryReady || canBrowse;
  const queryUrl = useMemo(() => `/api/resources?${searchApiParams(state, PAGE_SIZE).toString()}`, [state]);
  // Fetch the unfiltered first page even while the prompt is visible. Its rows
  // stay hidden, but its facet metadata makes filter-only browsing possible.
  // A zero-result search used to offer only "Clear"; name a few real
  // destinations instead. Shares the sidebar's cached nav tree.
  const { data: nav } = useQuery<AwesomeListNav>({ queryKey: ["awesome-list-nav"], queryFn: fetchAwesomeListNav, staleTime: 1000 * 60 * 60 });
  const suggestedCategories = useMemo(
    () => visibleNavCategories(nav?.categories).filter(category => category.slug).sort((a, b) => navTotalCount(b) - navTotalCount(a)).slice(0, 6),
    [nav],
  );
  const query = useQuery<{ resources: DbResource[]; total: number; facets: ResourceSearchFacets; search?: { mode: "fts" | "fuzzy"; suggestion?: string }; resolvedFilters?: ResolvedFilters }>({ queryKey: [queryUrl], queryFn: () => apiRequest(queryUrl, { method: "GET" }), enabled: !queryTooLong, staleTime: 60_000 });
  const data = query.data; const results = data?.resources ?? []; const total = data?.total ?? 0; const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE)); const safePage = Math.min(state.page, totalPages);
  useEffect(() => {
    if (!queryReady || !data) return;
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
  }, [data, normalized, queryReady, state.category, state.format, state.provider, state.skillLevel, state.sort, state.subSubcategory, state.subcategory, state.tags]);
  useEffect(() => {
    const pending = pendingAnalyticsRef.current;
    if (!pending || !data || pending.signature !== searchFilterSignature(state)) return;
    if (pending.kind === "sort") trackSortChange(pending.value, "search_page", data.total);
    else if (pending.kind === "tag") trackTagInteraction(pending.value, pending.tagAction ?? "apply", "search_page", data.total);
    else trackFilterUsage(pending.type, pending.value, data.total, "search_page");
    pendingAnalyticsRef.current = null;
  }, [data, state]);
  useEffect(() => {
    if (!pendingResultsFocusRef.current || query.isLoading || !data) return;
    pendingResultsFocusRef.current = false;
    const timer = window.setTimeout(() => resultsRef.current?.focus({ preventScroll: true }), 250);
    return () => window.clearTimeout(timer);
  }, [data, query.isLoading]);
  const lastFacets = useRef<ResourceSearchFacets>();
  if (data?.facets) lastFacets.current = data.facets;
  // A link can name the category/subcategory by slug (?category=encoding-codecs,
  // also the /explore redirect target). The API filters by the resolved
  // canonical name and echoes it; the sidebar and chips must use that name so
  // the real facet row is ticked instead of a phantom zero-count slug row. The
  // URL keeps the slug. Resolutions are remembered so later loads don't flash
  // the raw slug.
  const resolvedNames = useRef<{ category: Map<string, string>; subcategory: Map<string, string> }>({ category: new Map(), subcategory: new Map() });
  if (data?.resolvedFilters?.category) resolvedNames.current.category.set(data.resolvedFilters.category.requested, data.resolvedFilters.category.name);
  if (data?.resolvedFilters?.subcategory) resolvedNames.current.subcategory.set(data.resolvedFilters.subcategory.requested, data.resolvedFilters.subcategory.name);
  const filterState = {
    ...state,
    category: resolvedNames.current.category.get(state.category) ?? state.category,
    subcategory: resolvedNames.current.subcategory.get(state.subcategory) ?? state.subcategory,
  };
  useEffect(() => { if (data && state.page > totalPages) { preservePageNoticeRef.current = true; setState(s => ({ ...s, page: totalPages })); writeFilterParams({ page: totalPages > 1 ? String(totalPages) : null }, "replace"); setPageNotice(`Page ${state.page} is beyond the available results. Showing page ${totalPages}.`); } }, [data, state.page, totalPages]);
  const gotoPage = (n: number) => { setState(s => ({ ...s, page: n })); writeFilterParams({ page: n > 1 ? String(n) : null }, "push"); setPageNotice(null); pendingResultsFocusRef.current = true; window.scrollTo({ top: 0, behavior: "smooth" }); };
  const makePageHref = (n: number) => { const p = new URLSearchParams(window.location.search); if (n > 1) p.set("page", String(n)); else p.delete("page"); return `/search?${p.toString()}`; };
  const invalid = query.error instanceof ApiError && query.error.status === 400;
  // A search started offline is paused, not failed: isLoading and isError are
  // both false and there is no data, so without this branch the page fell
  // through to "No resources match" for a request that never reached the
  // catalog. The paused query resumes by itself on reconnect.
  const offline = queryUnavailableReason(query) === "offline";
  // A request that failed in transport (no HTTP response) is a connection
  // problem, not a server verdict — say so instead of a generic failure.
  const connectionFailed = query.isError && !(query.error instanceof ApiError);
  const [stillOffline, setStillOffline] = useState(false);
  useEffect(() => { if (!offline) setStillOffline(false); }, [offline]);
  const retrySearch = (e: MouseEvent<HTMLButtonElement>) => {
    if (navigator.onLine === false) { setStillOffline(true); return; }
    /* C6-SWEEP-06: the card unmounts once the refetch succeeds */
    if (document.activeElement === e.currentTarget) pendingResultsFocusRef.current = true;
    void query.refetch();
  };
  return <div className="discovery-page space-y-6">
    <SEOHead title={`${searchPageSeo.titleCore(normalized)} — Awesome Video`} description={searchPageSeo.description} noindex />
    <header className="discovery-header space-y-4"><div className="flex items-center gap-3"><SearchIcon className="h-6 w-6 text-[var(--accent-ink)]" /><div><h1 className="page-title discovery-title">{searchPageSeo.heading}</h1><p className="discovery-lede text-sm">A precise index of tools, standards, and ideas for video developers.</p></div></div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center"><div className="relative min-w-0 flex-1"><SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input ref={inputRef} value={input} onChange={e => { pristine.current = false; setInput(e.target.value); }} onMouseDown={() => { pristine.current = false; }} onKeyDown={e => { if (e.key === "/" && pristine.current && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); window.dispatchEvent(new Event("awesome:open-search-palette")); } if (e.key === "Escape" && input) { e.preventDefault(); setInput(""); } pristine.current = false; }} placeholder="Search resources..." className="min-h-11 pl-10" aria-label="Search resources" data-testid="input-search-page" /></div>
        <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">Sort</span><Select value={state.sort} onValueChange={v => update("sort", v)}><SelectTrigger className="min-h-11 w-36" aria-label="Sort results" data-testid="select-search-sort"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(sortLabels).map(([v, text]) => <SelectItem key={v} value={v}>{text}</SelectItem>)}</SelectContent></Select></div></div>
    </header>
    <ActiveFilters state={filterState} onChange={update} onClear={() => clearFilters()} />
    {pageNotice && <div className="flex items-center justify-between rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm" role="status" data-testid="notice-page-adjusted"><span>{pageNotice}</span><button className="min-h-8 underline" onClick={() => { setPageNotice(null); /* C6-SWEEP-04: the notice unmounts; focus the results region */ resultsRef.current?.focus({ preventScroll: true }); }} data-testid="button-dismiss-page-notice">Dismiss</button></div>}
    <div className="flex flex-col items-stretch gap-4 lg:flex-row lg:items-start lg:gap-6"><SearchFilters state={filterState} facets={data?.facets ?? lastFacets.current} onChange={update} onClear={() => clearFilters()} /><section ref={resultsRef} tabIndex={-1} aria-label="Search results" className="min-w-0 flex-1 outline-none">
      {!shouldShowResults ? <StatePanel tone="empty" label={normalized ? "Query too short" : "No query"} title={normalized ? "Keep typing to search" : "Enter a query or choose filters"} inline testId="text-search-prompt" actions={<Button asChild variant="outline"><Link href="/categories">Browse categories</Link></Button>}>{normalized ? "Type a word of at least 2 letters or digits (common words like “and” or “the” are skipped), or choose a filter to browse." : "Narrow the catalog by category, provider, format, skill level, or tag."}</StatePanel>
       : queryTooLong ? <StatePanel tone="empty" label="Query too long" title="Shorten your search" inline testId="search-query-too-long" actions={<Button variant="outline" onClick={clearSearch} data-testid="button-clear-long-query">Clear search</Button>}><span role="alert">Search is limited to {SEARCH_QUERY_MAX_LENGTH} characters. This query has {normalized.length.toLocaleString()} — shorten it to search.</span></StatePanel>
       : offline ? <StatePanel tone="error" label="Offline" title="You’re offline" inline testId="search-results-offline" actions={<RetryButton onRetry={retrySearch} handoffFocus={false} testId="button-retry-offline-search" />}>Search couldn’t reach the catalog because your device has no connection. Results will load on their own when you reconnect.{stillOffline && <p className="system-state-note" data-testid="text-search-still-offline">Still offline — reconnect and try again.</p>}</StatePanel>
       : query.isLoading || (!data && !query.isError) ? <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr))]" data-testid="search-results-loading" aria-busy="true">{Array.from({ length: 6 }).map((_, i) => <ResourceCardSkeleton key={i} />)}</div>
       : query.isError ? <StatePanel tone="error" label={invalid ? "Invalid filters" : "Error · unavailable"} title={invalid ? "These filters can’t be applied" : "Search failed"} inline testId="search-results-error" actions={invalid ? <Button variant="outline" onClick={clearInvalidRequest} data-testid="button-clear-invalid-filters">Clear invalid filters</Button> : <RetryButton onRetry={retrySearch} handoffFocus={false} testId="button-retry-search" />}>{invalid ? query.error.message : connectionFailed ? "Search couldn't reach the catalog. Check your connection and try again." : "Something went wrong while searching. Please try again."}</StatePanel>
        : results.length === 0 ? <StatePanel tone="empty" label="No results" title={normalized || canBrowse ? "No resources match this combination" : "Enter a query or choose filters"} inline testId="text-no-results" actions={<>{hasActiveFilters && <Button variant="outline" onClick={() => clearFilters()} data-testid="button-clear-search-filters">Clear filters</Button>}{normalized && <Button variant="ghost" onClick={clearSearch} data-testid="button-clear-search-query">Clear search</Button>}<Button asChild variant="secondary"><Link href="/categories" data-testid="link-empty-browse-categories">Browse categories</Link></Button><Button asChild variant="secondary"><Link href="/advanced" data-testid="link-empty-advanced-discovery">Advanced discovery</Link></Button></>}>Try broadening your filters or search terms.{suggestedCategories.length > 0 && <nav aria-label="Popular categories" className="mt-3" data-testid="search-empty-categories"><p className="text-xs text-muted-foreground">Or start from a popular category:</p><ul className="mt-2 flex flex-wrap justify-center gap-2">{suggestedCategories.map(category => <li key={category.slug}><Link href={`/category/${category.slug}`} className="chip inline-flex min-h-11 items-center gap-2 hover:border-[var(--accent)]">{category.name}<span className="mono text-muted-foreground">{navTotalCount(category)}</span></Link></li>)}</ul></nav>}</StatePanel>
       : <>{data?.search?.mode === "fuzzy" && data.search.suggestion && <div className="mb-4 flex flex-wrap items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm" role="status" data-testid="notice-search-suggestion"><span>No exact matches. Did you mean</span><Button variant="link" className="h-auto p-0" onClick={() => { setInput(data.search!.suggestion!); update("q", data.search!.suggestion!); inputRef.current?.focus(); /* C6-V2-01: the notice unmounts with this button */ }}>{data.search.suggestion}</Button><span>?</span></div>}<p className="mb-4 text-sm text-muted-foreground" data-testid="text-result-count">{totalPages > 1 ? `Page ${safePage} of ${totalPages} · showing ${(safePage - 1) * PAGE_SIZE + 1}–${(safePage - 1) * PAGE_SIZE + results.length} of ${total} results` : `${total} result${total === 1 ? "" : "s"}`}{queryReady ? ` for “${normalized}”` : ""}</p><div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr))]" data-testid="search-results-grid">{results.map(r => <ResourceCard key={r.id} resource={{ id: String(r.id), name: r.title, url: r.url, description: r.description ?? undefined, category: r.category ?? undefined }} fullResource={r} />)}</div><Paginator currentPage={safePage} totalPages={totalPages} makeHref={makePageHref} onNavigate={gotoPage} className="pt-4" testIds={{ container: "search-pagination", prev: "button-search-prev", next: "button-search-next", jump: "input-search-page-jump" }} /></>}
    </section></div>
  </div>;
}


interface ResolvedFilter { requested: string; name: string }

interface ResolvedFilters { category?: ResolvedFilter; subcategory?: ResolvedFilter }

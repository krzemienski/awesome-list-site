import { ResourceCardSkeleton } from "@/components/ui/skeletons";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search as SearchIcon, AlertCircle } from "lucide-react";
import SEOHead from "@/components/layout/SEOHead";
import ResourceCard from "@/components/resource/ResourceCard";
import type { Resource as DbResource } from "@shared/schema";
import { normalizeSearchQuery } from "@shared/searchNormalize";
import { Paginator } from "@/components/ui/paginator";
import { parsePageFromSearch, pageNoticeFor } from "@/lib/page-param";

export default function Search() {
  const searchString = useSearch();
  const [, setLocation] = useLocation();
  // audit2 BUG-010: ONE source of truth for the query — the URL. The input
  // box, the fetch, the title, and every empty/results state below all
  // derive from urlQuery/normalizedQuery, so the URL, the input, and the
  // results can never show three different queries.
  const urlQuery = new URLSearchParams(searchString).get("q") ?? "";
  // audit2 BUG-011/019/020/021: the SAME normalization the server matcher
  // applies (collapse whitespace, treat control chars as spaces, strip edge
  // quotes) decides emptiness, display strings, and the fetch key.
  const normalizedQuery = normalizeSearchQuery(urlQuery);

  // BUG-038 (run14): pagination state serializes to ?page= so reload/share
  // restores the same page instead of silently resetting to page 1.
  // R5-043 (run24): clamp to int32 max — values like ?page=1e20 used to reach
  // the API, get a 400 invalid_page, and render a dead-end "Search failed"
  // card whose Try again replayed the same invalid request forever. Clamped
  // pages fetch a valid (possibly empty) page, then the existing snap-back
  // effect normalizes to the real last page and rewrites the URL.
  // audit2 BUG-022/BUG-023: shared page rule (lib/page-param.ts) — Number()-
  // based like the server, so ?page=1e3 means page 1000 on BOTH passes
  // (parseInt used to stop at the "e" and read 1); invalid values fall back
  // to page 1 WITH a visible notice; the int32 clamp (R5-043) lives in the
  // shared parser now.
  const parsePage = (search: string) => parsePageFromSearch(search).page;

  const [input, setInput] = useState(urlQuery);
  // R2-M11: client-side pagination over the fetched result set.
  const [page, setPage] = useState(() => parsePage(searchString));
  // audit2 BUG-023: visible notice whenever a URL-supplied ?page= was
  // corrected (invalid → 1, out-of-range → snapped to the last page).
  const [pageNotice, setPageNotice] = useState<string | null>(() =>
    pageNoticeFor(parsePageFromSearch(searchString)),
  );
  // True while a URL-supplied in-range page still awaits the over-range check
  // against the fetched total; user-driven page changes never re-arm it.
  const urlPagePendingRef = useRef(parsePageFromSearch(searchString).kind === "valid");
  const PAGE_SIZE = 24;
  const inputRef = useRef<HTMLInputElement>(null);

  // BUG-034 (run27): this input auto-focuses on mount, so a visitor who lands
  // on /search?q=hls and presses the site-wide "/" shortcut got a literal
  // slash typed into the pre-filled query instead of the palette ("hls" +
  // "/" + "hls" → q=hls/hls). Track whether the visitor has actually
  // interacted with the input yet — while it's still pristine, "/" behaves
  // as the advertised shortcut (opens the palette); after any edit/click,
  // "/" types normally so queries like "24/7" stay possible.
  const inputPristineRef = useRef(true);

  // Auto-focus on mount.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounce input → debounced query + URL sync (300ms).
  useEffect(() => {
    const t = setTimeout(() => {
      // BUG-038 (run14): if the URL's q already matches the input (e.g. on
      // mount with /search?q=x&page=2), leave the URL alone — rewriting the
      // target here would strip a restored ?page=. Only rewrite when the
      // query actually changed (then dropping ?page= = reset to page 1).
      const currentQ = new URLSearchParams(window.location.search).get("q") ?? "";
      if (input === currentQ) return;
      const target = input
        ? `/search?q=${encodeURIComponent(input)}`
        : "/search";
      if (window.location.pathname + window.location.search !== target) {
        // R5-017 (run24): a committed (debounced) query change is a discrete
        // state the user expects Back to reverse — PUSH it. Only URL
        // normalization (page clamping below) may replace.
        setLocation(target);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [input, setLocation]);

  // Back/forward navigation: adopt the URL's q and page.
  useEffect(() => {
    setInput(urlQuery);
    const parsed = parsePageFromSearch(searchString);
    setPage(parsed.page);
    // audit2 BUG-023: surface (but never silently clear) URL-page feedback —
    // this effect also runs after our own normalizing replaceState, which
    // must not wipe the notice the user is reading. Clearing happens on user
    // page navigation, a query change, or explicit dismissal.
    const notice = pageNoticeFor(parsed);
    if (notice) setPageNotice(notice);
    urlPagePendingRef.current = parsed.kind === "valid";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchString]);

  // Canonical query derived straight from the URL (single source of truth).
  const trimmed = normalizedQuery;
  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useQuery<{ resources: DbResource[]; total: number }>({
    // Run15: server-side pagination — fetch one 24-row page instead of a
    // 1000-row payload sliced client-side. Page is part of the cache key.
    queryKey: ["/api/resources", "search", trimmed, page],
    // audit2 BUG-019: an empty/whitespace/control-only query no longer
    // browses the full catalog as fake "results" — it renders the explicit
    // prompt below (same copy as the server-rendered fallback) and fetches
    // nothing. (BUG-011 run19's "Browse All Resources" entry point links to
    // /categories now.)
    queryFn: async () =>
      apiRequest(
        `/api/resources?search=${encodeURIComponent(trimmed)}&page=${page}&limit=${PAGE_SIZE}`,
        { method: "GET" },
      ),
    enabled: trimmed.length >= 2,
    staleTime: 60 * 1000,
    // Keep the previous page's rows on screen while the next page of the
    // SAME query loads — but never show query A's rows under query B
    // (audit2 BUG-010).
    placeholderData: (prev, prevQ) =>
      prevQ && (prevQ.queryKey as unknown[])[2] === trimmed ? prev : undefined,
  });

  const results = data?.resources ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageResults = results;
  // NB-048 (run18): surface the item range on the current page so users know
  // where they are in the result set, not just a running page counter.
  const rangeStart = total === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = (safePage - 1) * PAGE_SIZE + results.length;

  // A URL-restored ?page= beyond the last page fetches an empty page —
  // snap back to the real last page once the total is known, and SAY so
  // (audit2 BUG-023) when the value came from the URL.
  useEffect(() => {
    if (data) {
      if (page > totalPages) {
        if (urlPagePendingRef.current) {
          setPageNotice(pageNoticeFor({ page, kind: "valid", raw: String(page) }, totalPages));
        }
        setPage(totalPages);
      }
      urlPagePendingRef.current = false;
    }
  }, [data, page, totalPages]);

  // audit2 BUG-032: the numbered Paginator owns the jump input now, applying
  // the shared parse rule with inline validation (BUG-022/BUG-033: "1e3" ≡
  // "1000", 0/999 clamp into range, junk shows feedback — never a silent
  // reset).
  // R5-017 (run24): user-initiated page changes PUSH a history entry so Back
  // steps page 3 → 2 → 1 instead of exiting the site. wouter patches
  // pushState, so the adoption effect above picks the change up; the
  // replaceState effect below stays no-op because URL and state already agree.
  const gotoPage = (n: number) => {
    const params = new URLSearchParams(window.location.search);
    if (n > 1) params.set("page", String(n));
    else params.delete("page");
    const qs = params.toString();
    window.history.pushState(null, "", `/search${qs ? `?${qs}` : ""}`);
    setPage(n);
    setPageNotice(null);
    urlPagePendingRef.current = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // audit2 BUG-032: real hrefs for page links — ?page=N merged into the
  // current query so open-in-new-tab keeps the search.
  const makePageHref = (n: number) => {
    const params = new URLSearchParams(window.location.search);
    if (n > 1) params.set("page", String(n));
    else params.delete("page");
    const qs = params.toString();
    return `/search${qs ? `?${qs}` : ""}`;
  };

  // New query → back to page 1. Ref-guarded so the mount run doesn't clobber
  // a ?page= restored from the URL (BUG-038).
  const prevTrimmed = useRef(trimmed);
  useEffect(() => {
    if (prevTrimmed.current !== trimmed) {
      prevTrimmed.current = trimmed;
      setPage(1);
      // A page notice about the previous query's range is stale now.
      setPageNotice(null);
      urlPagePendingRef.current = false;
    }
  }, [trimmed]);

  // BUG-038 (run14): write the current page into the URL (replaceState — no
  // navigation, no og-middleware impact; wouter's useSearch stays untouched so
  // this can't loop with the adoption effect above).
  useEffect(() => {
    // While results are still loading, totalPages is a placeholder 1 and
    // safePage would clamp a URL-restored ?page= down to 1 — and because
    // wouter patches replaceState, that write loops back through the
    // adoption effect and permanently resets the page. Wait for data.
    if (!data) return;
    // Run23 NB-033 class: never stamp /search over a history entry the user
    // has already navigated away from (late data arrival after Back).
    if (window.location.pathname !== "/search") return;
    const params = new URLSearchParams(window.location.search);
    const current = params.get("page") ?? "1";
    if (current !== String(safePage)) {
      if (safePage > 1) params.set("page", String(safePage));
      else params.delete("page");
      const qs = params.toString();
      window.history.replaceState(null, "", `/search${qs ? `?${qs}` : ""}`);
    }
  }, [safePage, data]);

  return (
    <div className="space-y-6">
      <SEOHead
        title={trimmed ? `Search: ${trimmed} — Awesome Video` : "Search — Awesome Video"}
        description="Search 2,000+ curated video development tools, libraries, players, codecs, and learning resources."
        noindex
      />

      <div className="space-y-2">
        <div className="flex items-center gap-2 sm:gap-3">
          <SearchIcon className="h-6 w-6 text-[var(--accent)] shrink-0" />
          <h1 className="display-h text-2xl sm:text-3xl">Search</h1>
        </div>
      </div>

      <div className="relative max-w-2xl">
        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => {
            inputPristineRef.current = false;
            setInput(e.target.value);
          }}
          onMouseDown={() => {
            inputPristineRef.current = false;
          }}
          onKeyDown={(e) => {
            // BUG-034 (run27): first keystroke into the auto-focused input
            // being "/" means the visitor wanted the search palette — open it
            // instead of corrupting the pre-filled query with a slash.
            if (
              e.key === "/" &&
              inputPristineRef.current &&
              !e.ctrlKey && !e.metaKey && !e.altKey
            ) {
              e.preventDefault();
              window.dispatchEvent(new Event("awesome:open-search-palette"));
            }
            inputPristineRef.current = false;
          }}
          placeholder="Search resources..."
          className="pl-10"
          aria-label="Search resources"
          data-testid="input-search-page"
        />
      </div>

      {/* audit2 BUG-023: visible feedback whenever a URL-supplied page value
          was corrected — never a silent rewrite. */}
      {pageNotice && trimmed.length >= 2 && (
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

      {trimmed.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center bg-muted rounded-lg">
              <SearchIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            {/* audit2 BUG-019: explicit empty-state prompt (same copy as the
                server-rendered fallback) instead of dumping the full catalog
                as "results". */}
            <h2 className="text-sm font-semibold max-w-md px-4" data-testid="text-search-prompt">
              Enter a search term to find curated video development resources.
            </h2>
            <p className="text-xs text-muted-foreground">
              Try “ffmpeg”, “hls”, or “av1” — or browse instead:
            </p>
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <Button asChild variant="outline" data-testid="link-search-browse-categories">
                <Link href="/categories">Browse all categories</Link>
              </Button>
              <Button asChild variant="ghost" data-testid="link-search-browse-journeys">
                <Link href="/journeys">Learning journeys</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : trimmed.length === 1 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center bg-muted rounded-lg">
              <SearchIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-sm font-semibold">Keep typing to search</h2>
            <p className="text-xs text-muted-foreground">Type at least 2 characters</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr))]">
          {Array.from({ length: 6 }).map((_, i) => (
            <ResourceCardSkeleton key={i} />
          ))}
        </div>
      ) : isError ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <AlertCircle className="h-8 w-8 text-[var(--accent)]" />
            <p className="text-sm text-muted-foreground">Search failed. Please try again.</p>
            <Button variant="outline" onClick={() => refetch()} data-testid="button-retry-search">
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : results.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center bg-muted rounded-lg">
              <SearchIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-sm font-semibold break-words max-w-full px-4" data-testid="text-no-results">
              No results for “{trimmed}”
            </h2>
            <p className="text-xs text-muted-foreground">Try different keywords</p>
            {/* BUG-053 (run26): recovery actions — the no-results state was a
                dead end (the tag empty state offers "Clear filters"; search
                offered nothing). */}
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <Button
                variant="outline"
                onClick={() => {
                  setInput("");
                  inputRef.current?.focus();
                }}
                data-testid="button-clear-search"
              >
                Clear search
              </Button>
              <Button asChild variant="ghost" data-testid="link-browse-categories">
                <Link href="/categories">Browse all categories</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-sm text-muted-foreground break-words" data-testid="text-result-count">
            {/* NB-048 (run18): "Page X of Y · showing N–M of T results" so the
                indicator states position + range, not just a total. */}
            {totalPages > 1 ? (
              <>
                Page {safePage} of {totalPages} · showing {rangeStart}–{rangeEnd} of {total}{" "}
                result{total === 1 ? "" : "s"} for “{trimmed}”
              </>
            ) : (
              <>
                {total} result{total === 1 ? "" : "s"} for “{trimmed}”
              </>
            )}
          </p>
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr))]">
            {pageResults.map((r) => (
              <ResourceCard
                key={r.id}
                resource={{
                  id: String(r.id),
                  name: r.title,
                  url: r.url,
                  description: r.description ?? undefined,
                  category: r.category ?? undefined,
                }}
                fullResource={r}
              />
            ))}
          </div>
          {/* audit2 BUG-032: numbered pages + jump box — any page in ≤2
              interactions (page 30 used to take 29 Next clicks, tripping the
              rate limiter). Legacy testids preserved for existing harnesses. */}
          <Paginator
            currentPage={safePage}
            totalPages={totalPages}
            makeHref={makePageHref}
            onNavigate={gotoPage}
            className="pt-2"
            testIds={{
              container: "search-pagination",
              prev: "button-search-prev",
              next: "button-search-next",
              jump: "input-search-page-jump",
            }}
          />
        </>
      )}
    </div>
  );
}

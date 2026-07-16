import { useEffect, useRef, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search as SearchIcon, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import SEOHead from "@/components/layout/SEOHead";
import ResourceCard from "@/components/resource/ResourceCard";
import type { Resource as DbResource } from "@shared/schema";

export default function Search() {
  const searchString = useSearch();
  const [, setLocation] = useLocation();
  const urlQuery = new URLSearchParams(searchString).get("q") ?? "";

  // BUG-038 (run14): pagination state serializes to ?page= so reload/share
  // restores the same page instead of silently resetting to page 1.
  const parsePage = (search: string) => {
    const raw = new URLSearchParams(search).get("page");
    const n = raw ? parseInt(raw, 10) : 1;
    return Number.isFinite(n) && n > 0 ? n : 1;
  };

  const [input, setInput] = useState(urlQuery);
  const [debounced, setDebounced] = useState(urlQuery);
  // R2-M11: client-side pagination over the fetched result set.
  const [page, setPage] = useState(() => parsePage(searchString));
  const PAGE_SIZE = 24;
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on mount.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounce input → debounced query + URL sync (300ms).
  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(input);
      const target = input
        ? `/search?q=${encodeURIComponent(input)}`
        : "/search";
      if (window.location.pathname + window.location.search !== target) {
        setLocation(target, { replace: true });
      }
    }, 300);
    return () => clearTimeout(t);
  }, [input, setLocation]);

  // Back/forward navigation: adopt the URL's q and page.
  useEffect(() => {
    setInput(urlQuery);
    setDebounced(urlQuery);
    setPage(parsePage(searchString));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchString]);

  const trimmed = debounced.trim();
  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useQuery<{ resources: DbResource[]; total: number }>({
    queryKey: ["/api/resources", "search", trimmed],
    queryFn: async () =>
      // R2-M11: limit bumped 200→1000 so pagination covers broad queries.
      apiRequest(`/api/resources?search=${encodeURIComponent(trimmed)}&limit=1000`, {
        method: "GET",
      }),
    enabled: trimmed.length >= 2,
    staleTime: 60 * 1000,
  });

  const results = data?.resources ?? [];
  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageResults = results.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // New query → back to page 1. Ref-guarded so the mount run doesn't clobber
  // a ?page= restored from the URL (BUG-038).
  const prevTrimmed = useRef(trimmed);
  useEffect(() => {
    if (prevTrimmed.current !== trimmed) {
      prevTrimmed.current = trimmed;
      setPage(1);
    }
  }, [trimmed]);

  // BUG-038 (run14): write the current page into the URL (replaceState — no
  // navigation, no og-middleware impact; wouter's useSearch stays untouched so
  // this can't loop with the adoption effect above).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const current = params.get("page") ?? "1";
    if (current !== String(safePage)) {
      if (safePage > 1) params.set("page", String(safePage));
      else params.delete("page");
      const qs = params.toString();
      window.history.replaceState(null, "", `/search${qs ? `?${qs}` : ""}`);
    }
  }, [safePage]);

  return (
    <div className="space-y-6">
      <SEOHead
        title={trimmed ? `Search: ${trimmed} — Awesome Video` : "Search — Awesome Video"}
        description="Search 1,800+ curated video development tools, libraries, players, codecs, and learning resources."
        noindex
      />

      <div className="space-y-2">
        <div className="flex items-center gap-2 sm:gap-3">
          <SearchIcon className="h-6 w-6 text-[var(--accent)] shrink-0" />
          <h1 className="font-sans font-bold text-2xl sm:text-3xl tracking-tight">Search</h1>
        </div>
      </div>

      <div className="relative max-w-2xl">
        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Search resources..."
          className="pl-10"
          data-testid="input-search-page"
        />
      </div>

      {trimmed.length < 2 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center bg-muted rounded-lg">
              <SearchIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-sm font-semibold">Start typing to search</h2>
            <p className="text-xs text-muted-foreground">Type at least 2 characters</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
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
            <h2 className="text-sm font-semibold" data-testid="text-no-results">
              No results for “{trimmed}”
            </h2>
            <p className="text-xs text-muted-foreground">Try different keywords</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-sm text-muted-foreground" data-testid="text-result-count">
            {data?.total ?? results.length} result{(data?.total ?? results.length) === 1 ? "" : "s"} for “{trimmed}”
            {(data?.total ?? 0) > results.length ? ` · showing first ${results.length}` : ""}
            {totalPages > 1 ? ` · page ${safePage} of ${totalPages}` : ""}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2" data-testid="search-pagination">
              <Button
                variant="outline"
                size="sm"
                disabled={safePage <= 1}
                onClick={() => {
                  setPage(safePage - 1);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                data-testid="button-search-prev"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground tabular-nums">
                {safePage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={safePage >= totalPages}
                onClick={() => {
                  setPage(safePage + 1);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                data-testid="button-search-next"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

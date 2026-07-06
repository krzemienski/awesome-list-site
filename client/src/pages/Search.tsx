import { useEffect, useRef, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search as SearchIcon, AlertCircle } from "lucide-react";
import SEOHead from "@/components/layout/SEOHead";
import ResourceCard from "@/components/resource/ResourceCard";
import type { Resource as DbResource } from "@shared/schema";

export default function Search() {
  const searchString = useSearch();
  const [, setLocation] = useLocation();
  const urlQuery = new URLSearchParams(searchString).get("q") ?? "";

  const [input, setInput] = useState(urlQuery);
  const [debounced, setDebounced] = useState(urlQuery);
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

  // Back/forward navigation: adopt the URL's q.
  useEffect(() => {
    setInput(urlQuery);
    setDebounced(urlQuery);
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
      apiRequest(`/api/resources?search=${encodeURIComponent(trimmed)}&limit=200`, {
        method: "GET",
      }),
    enabled: trimmed.length >= 2,
    staleTime: 60 * 1000,
  });

  const results = data?.resources ?? [];

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
          placeholder="Search packages, libraries, and tools…"
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
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((r) => (
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
        </>
      )}
    </div>
  );
}

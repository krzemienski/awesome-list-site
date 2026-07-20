import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Search, Clock, X, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { trackSearch, trackResourceClick } from "@/lib/analytics";
import { useDebounce } from "@/hooks/useDebounce";

interface SearchDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

// BUG-003/BUG-007 (run13): the palette used to run its own client-side Fuse
// index over the static tree — different matcher, different counts than the
// /search page, and result clicks opened external URLs instead of in-app
// resource pages. It now runs the SAME server search as the /search page
// (identical queryKey → shared React Query cache entry), so counts always
// agree, and selecting a result navigates in-app to /resource/:id.

interface DbSearchResource {
  id: number;
  title: string;
  url: string;
  description: string | null;
  category: string | null;
  subcategory: string | null;
}

// R2-L10: recent searches persisted in localStorage (max 5, most recent first).
const RECENT_SEARCHES_KEY = "recent-searches";
const RECENT_SEARCHES_MAX = 5;

function readRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s === "string").slice(0, RECENT_SEARCHES_MAX) : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(query: string): string[] {
  const trimmed = query.trim();
  if (trimmed.length < 2) return readRecentSearches();
  const next = [trimmed, ...readRecentSearches().filter((s) => s.toLowerCase() !== trimmed.toLowerCase())].slice(
    0,
    RECENT_SEARCHES_MAX,
  );
  try {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
  } catch {
    // storage full/unavailable — non-fatal
  }
  return next;
}

export default function SearchDialog({ isOpen, setIsOpen }: SearchDialogProps) {
  const [query, setQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const debouncedQuery = useDebounce(query, 300);
  const [, navigate] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);

  const trimmed = debouncedQuery.trim();

  // Same queryKey + fetch as the /search page, so both surfaces share one
  // cached result set and always report the same match count.
  // NB-031 (run23): the palette used to fetch limit=1000 to render 15 rows,
  // under a key /search never used — 1000-row payload per keystroke-settle
  // AND a cold cache when the user landed on /search. It now fetches exactly
  // the /search page's FIRST PAGE (same key ["/api/resources","search",q,1],
  // same limit=24 URL), so the dropdown's fetch is dropdown-sized and "View
  // all" lands on /search with the page-1 cache already warm (zero refetch).
  const { data, isFetching } = useQuery<{ resources: DbSearchResource[]; total: number }>({
    queryKey: ["/api/resources", "search", trimmed, 1],
    queryFn: async () =>
      apiRequest(`/api/resources?search=${encodeURIComponent(trimmed)}&page=1&limit=24`, {
        method: "GET",
      }),
    enabled: isOpen && trimmed.length >= 2,
    staleTime: 60 * 1000,
  });

  const queryTrimmed = query.trim();
  const allMatches = trimmed.length >= 2 ? data?.resources ?? [] : [];
  // NB-044 (run18): show the TRUE match count from the server (data.total),
  // not the length of the (limit-capped) result page — the palette only renders
  // the top 15 rows but the count must reflect the full match set (e.g. 255).
  const totalMatches = trimmed.length >= 2 ? data?.total ?? allMatches.length : 0;
  const results = allMatches.slice(0, 15);
  // NB-045 (run18): gate every result surface on the TRIMMED query so a
  // whitespace-only input ("   ") never shows results, a "View all" row, or
  // routes to /search — it falls back to the recent/min-length empty states.
  const showResults = queryTrimmed.length >= 2;
  const isPending =
    showResults && results.length === 0 && (isFetching || queryTrimmed !== trimmed);

  // Track the search once the debounced query settles and results arrive —
  // one `search` event per settled query, not one per keystroke.
  // NB-029 (run23): recent-searches are NO LONGER saved here — every settled
  // debounce (including junk keystroke prefixes like "asdf") used to pollute
  // the list. Saving now happens only on an explicit commit: selecting a
  // result, choosing "View all", or Enter-fallback to /search.
  useEffect(() => {
    if (!trimmed || trimmed.length < 2 || !data) return;
    trackSearch(trimmed, data.resources.length);
  }, [trimmed, data]);

  // R2-L10: load persisted recent searches whenever the dialog opens.
  useEffect(() => {
    if (isOpen) {
      setRecentSearches(readRecentSearches());
    }
  }, [isOpen]);

  // Global keyboard shortcut listener (Cmd+K, Ctrl+K, and `/`)
  // MR-DS-03 — `/` branch added (dead listener in App.tsx deleted) so the
  // header's advertised `/` kbd hint actually opens this dialog.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as Element | null;
      const inField =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable);

      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        return;
      }
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // NB-028 (run23): while the palette is already open, '/' is a spent
        // shortcut, not input — swallow it so it never types a literal slash
        // into the query field.
        if (isOpen) {
          if (inField) e.preventDefault();
          return;
        }
        if (!inField) {
          e.preventDefault();
          setIsOpen(true);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [setIsOpen, isOpen]);

  // Focus input when dialog opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Clear search when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setQuery("");
    }
  }, [isOpen]);

  const openResource = (resource: DbSearchResource) => {
    trackResourceClick(resource.title, resource.url, resource.category || "");
    // NB-029 (run23): an explicit selection is a real search — save it now.
    if (queryTrimmed.length >= 2) setRecentSearches(saveRecentSearch(queryTrimmed));
    setIsOpen(false);
    navigate(`/resource/${resource.id}`);
  };

  // NB-029/NB-030 (run23): committing the query to the full /search page —
  // via the "View all" row or the Enter fallback — is the other real-search
  // signal that records a recent search.
  const commitToSearchPage = (q: string) => {
    if (q.length >= 2) setRecentSearches(saveRecentSearch(q));
    setIsOpen(false);
    navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent
        className="sm:max-w-lg max-h-[min(85svh,520px)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden"
        onCloseAutoFocus={(e) => {
          // NB-026 (run18): both the header trigger click AND the "/"/⌘K
          // shortcut opens must return focus to a real, visible control — never
          // to <body>. Redirect to the header search chip (the palette's
          // canonical trigger) so keyboard users land somewhere sensible.
          const chip = document.querySelector<HTMLElement>(
            'button[aria-label="Open search"]',
          );
          if (chip) {
            e.preventDefault();
            chip.focus();
          }
        }}
      >
        {/* NB-004 (run18): in short viewports (e.g. 812×375 landscape) the
            header chrome squeezed the result list below one row's height, so
            the keyboard-active item could never be fully visible. Under
            max-height:480px the decorative eyebrow hides, the title shrinks,
            and the description collapses to sr-only (kept for a11y). */}
        <DialogHeader>
          <div className="eyebrow [@media(max-height:480px)]:hidden" aria-hidden>// Search</div>
          <DialogTitle className="font-display text-2xl font-medium tracking-tight [@media(max-height:480px)]:text-base">
            Find <em className="not-italic" style={{ fontStyle: 'italic', color: 'var(--accent)' }}>resources</em>
          </DialogTitle>
          <DialogDescription className="[@media(max-height:480px)]:sr-only">
            Find video development resources in the awesome list.
          </DialogDescription>
        </DialogHeader>
        
        <Command className="min-h-0" shouldFilter={false}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none z-10" />
            <CommandInput
              ref={inputRef}
              placeholder="Search resources..."
              value={query}
              onValueChange={setQuery}
              onKeyDown={(e) => {
                // NB-030 (run23): before results render (debounce + fetch in
                // flight) cmdk has no active item, so Enter used to be a dead
                // no-op. Fall back to the full /search page for the typed
                // query whenever nothing is keyboard-selected.
                if (e.key !== "Enter" || queryTrimmed.length < 2) return;
                const active = document.querySelector(
                  '[cmdk-item][data-selected="true"], [cmdk-item][aria-selected="true"]',
                );
                if (!active) {
                  e.preventDefault();
                  commitToSearchPage(queryTrimmed);
                }
              }}
              className="w-full pl-10 pr-4 py-2"
            />
          </div>
          
          <CommandList className="flex-1 min-h-0 overflow-y-auto">
            {showResults ? (
              <>
                {isPending ? (
                  <div className="flex items-center justify-center gap-2 h-[120px] text-sm text-muted-foreground" data-testid="search-loading">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Searching…
                  </div>
                ) : (
                  <>
                    {totalMatches > 0 && (
                      <div
                        className="px-3 pt-2 pb-1 text-xs text-muted-foreground"
                        data-testid="search-result-count"
                        aria-live="polite"
                      >
                        {totalMatches.toLocaleString()} match{totalMatches === 1 ? "" : "es"}
                        {totalMatches > results.length ? ` — showing top ${results.length}` : ""}
                      </div>
                    )}
                    <CommandGroup>
                      {/* Pinned first so plain Enter goes to the full search page. */}
                      <CommandItem
                        key="view-all-results"
                        value={`view-all-${queryTrimmed}`}
                        onSelect={() => commitToSearchPage(queryTrimmed)}
                        className="flex items-center gap-2 p-3 cursor-pointer"
                        data-testid="search-view-all"
                      >
                        <Search className="h-4 w-4 shrink-0 text-[var(--accent)]" />
                        <span className="text-sm font-medium">
                          View all results for “{queryTrimmed}”
                        </span>
                      </CommandItem>
                      {results.map((resource, index) => (
                        <CommandItem
                          key={`resource-${resource.id}`}
                          value={`resource-${resource.id}`}
                          onSelect={() => openResource(resource)}
                          className="flex flex-col items-start gap-1 p-3 cursor-pointer"
                          data-testid={`search-result-${index}`}
                        >
                          <div className="font-medium text-sm">{resource.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {resource.category} {resource.subcategory ? `→ ${resource.subcategory}` : ''}
                          </div>
                          {resource.description && (
                            <div className="text-xs text-muted-foreground line-clamp-2">
                              {resource.description}
                            </div>
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                    {!isFetching && results.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-[160px] text-center p-4">
                        <div className="flex h-16 w-16 items-center justify-center bg-muted rounded-lg">
                          <Search className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="mt-4 text-sm font-semibold">No results found</h3>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Try different keywords or check the spelling
                        </p>
                      </div>
                    )}
                  </>
                )}
              </>
            ) : recentSearches.length > 0 ? (
              /* R2-L10: recent searches shown while the input is empty. */
              <CommandGroup>
                <div className="flex items-center justify-between px-3 pt-2 pb-1">
                  <span className="text-xs text-muted-foreground uppercase tracking-[0.14em]">Recent searches</span>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-[color:var(--text)] flex items-center gap-1"
                    onClick={() => {
                      try {
                        localStorage.removeItem(RECENT_SEARCHES_KEY);
                      } catch {
                        // ignore
                      }
                      setRecentSearches([]);
                    }}
                    data-testid="button-clear-recent-searches"
                  >
                    <X className="h-3 w-3" />
                    Clear
                  </button>
                </div>
                {recentSearches.map((recent, index) => (
                  <CommandItem
                    key={`recent-${recent}`}
                    value={`recent-${recent}`}
                    onSelect={() => setQuery(recent)}
                    className="flex items-center gap-2 p-3 cursor-pointer"
                    data-testid={`recent-search-${index}`}
                  >
                    <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="text-sm">{recent}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : (
              <div className="flex flex-col items-center justify-center h-[200px] text-center p-4">
                <div className="flex h-16 w-16 items-center justify-center bg-muted rounded-lg">
                  <Search className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-sm font-semibold">Start typing to search</h3>
                <p className="mt-2 text-xs text-muted-foreground">Type at least 2 characters</p>
              </div>
            )}
          </CommandList>
        </Command>
        
        <DialogFooter className="flex items-center justify-between sm:justify-between gap-2">
          <div
            className="hidden sm:flex items-center gap-2 text-[10px] uppercase tracking-[0.18em]"
            style={{ color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}
          >
            <kbd
              className="px-1.5 py-0.5 rounded border"
              style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
            >
              esc
            </kbd>
            <span>to close</span>
          </div>
          <Button variant="secondary" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

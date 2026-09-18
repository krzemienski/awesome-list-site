import { lazy, Suspense, useEffect, useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useQuery } from "@tanstack/react-query";
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Clock, Folder, Grid2X2, Info, Loader2, Plus, Search, X } from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { trackSearch, trackResourceClick } from "@/lib/analytics";
import { useDebounce } from "@/hooks/useDebounce";
import { normalizeSearchQuery } from "@shared/searchNormalize";
import type { Category } from "@shared/schema";
import "./../../styles/shell/palette.css";

const ContactPaletteItem =
  import.meta.env.VITE_CONTACT_VARIANT === "b" || import.meta.env.VITE_CONTACT_VARIANT === "e"
    ? lazy(() => import("@/components/contact/contact-palette-item").then((module) => ({ default: module.ContactPaletteItem })))
    : null;

interface SearchDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

interface DbSearchResource {
  id: number;
  title: string;
  url: string;
  description: string | null;
  category: string | null;
  subcategory: string | null;
}

interface HomeFeedResponse {
  featured: DbSearchResource[];
}

type PaletteCategory = Category & { resourceCount: number };

const PAGES = [
  { label: "Browse categories", detail: "Explore the full catalog", href: "/categories", icon: Grid2X2 },
  { label: "Advanced discovery", detail: "Filter resources in detail", href: "/advanced", icon: Search },
  { label: "Submit a resource", detail: "Suggest something useful", href: "/submit", icon: Plus },
  { label: "About", detail: "Learn about this collection", href: "/about", icon: Info },
] as const;

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
  const [recentSearches, setRecentSearches] = useState<string[]>(readRecentSearches);
  const [selectedValue, setSelectedValue] = useState("");
  const selectionInteracted = useRef(false);
  const debouncedQuery = useDebounce(query, 300);
  const [, navigate] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  // The palette is mounted by MainLayout only after its trigger opens it, so
  // activeElement here is the real opener (header button or shortcut target).
  const openerRef = useRef<HTMLElement | null>(
    document.activeElement instanceof HTMLElement ? document.activeElement : null,
  );

  // Normalize exactly like the /search page + server matcher so the palette
  // and /search share one cache entry per canonical query.
  const trimmed = normalizeSearchQuery(debouncedQuery);
  const queryTrimmed = normalizeSearchQuery(query);
  const showResults = queryTrimmed.length >= 2;

  // Keep this query and cache key in lockstep with /search. Selecting a
  // palette result still warms the first page that the destination will read.
  const resourceQuery = useQuery<{ resources: DbSearchResource[]; total: number }>({
    queryKey: ["/api/resources", "search", trimmed, 1],
    queryFn: async () =>
      apiRequest(`/api/resources?search=${encodeURIComponent(trimmed)}&page=1&limit=24`, {
        method: "GET",
      }),
    enabled: isOpen && trimmed.length >= 2,
    staleTime: 60 * 1000,
  });

  // Taxonomy is deliberately live rather than copied from the shell's nav
  // data: it can change independently while the palette is open.
  const categoriesQuery = useQuery<PaletteCategory[]>({
    queryKey: ["/api/categories"],
    queryFn: () => apiRequest("/api/categories", { method: "GET" }),
    enabled: isOpen,
    staleTime: 60 * 1000,
  });

  // Keep the palette's featured jump targets in step with the curated home
  // feed. The feed, rather than a copied metadata flag, is authoritative.
  const featuredQuery = useQuery<HomeFeedResponse>({
    queryKey: ["/api/home"],
    queryFn: () => apiRequest("/api/home", { method: "GET" }),
    enabled: isOpen,
    staleTime: 60 * 1000,
  });

  const allMatches = trimmed.length >= 2 ? resourceQuery.data?.resources ?? [] : [];
  const totalMatches = trimmed.length >= 2 ? resourceQuery.data?.total ?? allMatches.length : 0;
  const results = allMatches.slice(0, 15);
  const defaultCategories = (categoriesQuery.data ?? []).slice(0, 5);
  const featuredResources = (featuredQuery.data?.featured ?? []).slice(0, 4);
  const defaultSuggestionCount = defaultCategories.length + featuredResources.length;
  const firstCategoryValue = defaultCategories[0]
    ? `category-${defaultCategories[0].name}`
    : undefined;
  const isPending =
    showResults && results.length === 0 && (resourceQuery.isFetching || queryTrimmed !== trimmed);
  const categoryMatches = showResults
    ? (categoriesQuery.data ?? []).filter((category) =>
        category.name.toLocaleLowerCase().includes(queryTrimmed.toLocaleLowerCase()),
      )
    : (categoriesQuery.data ?? []).slice(0, 6);
  const pageMatches = showResults
    ? PAGES.filter((page) =>
        `${page.label} ${page.detail}`.toLocaleLowerCase().includes(queryTrimmed.toLocaleLowerCase()),
      )
    : PAGES;
  const hasNonResourceMatches = pageMatches.length > 0 || categoryMatches.length > 0;

  // Track the search once the debounced query settles and results arrive —
  // one `search` event per settled query, not one per keystroke.
  useEffect(() => {
    if (!trimmed || trimmed.length < 2 || !resourceQuery.data) return;
    trackSearch(trimmed, resourceQuery.data.total, "search_palette");
  }, [trimmed, resourceQuery.data]);

  // R2-L10: load persisted recent searches whenever the dialog opens.
  useEffect(() => {
    if (isOpen) setRecentSearches(readRecentSearches());
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setSelectedValue("");
      selectionInteracted.current = false;
    }
  }, [isOpen]);

  // Cached featured items can register before the live categories. Keep the
  // untouched initial selection in displayed order, without overriding a
  // person's keyboard/pointer choice or their recent-search shortcuts.
  useEffect(() => {
    if (isOpen && !query && recentSearches.length === 0 &&
        !selectionInteracted.current && firstCategoryValue) {
      setSelectedValue(firstCategoryValue);
    }
  }, [isOpen, query, recentSearches.length, firstCategoryValue]);

  const openResource = (resource: DbSearchResource) => {
    trackResourceClick(resource.title, resource.url, resource.category || "");
    if (queryTrimmed.length >= 2) setRecentSearches(saveRecentSearch(queryTrimmed));
    setIsOpen(false);
    navigate(`/resource/${resource.id}`);
  };

  const commitToSearchPage = (q: string) => {
    if (q.length >= 2) setRecentSearches(saveRecentSearch(q));
    setIsOpen(false);
    navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  const openPage = (href: string) => {
    setIsOpen(false);
    navigate(href);
  };

  const openCategory = (category: PaletteCategory) => {
    setIsOpen(false);
    navigate(`/category/${category.slug}`);
  };

  const restoreOpenerFocus = (event: Event) => {
    const opener = openerRef.current && openerRef.current !== document.body
      ? openerRef.current
      : Array.from(document.querySelectorAll<HTMLElement>('button[aria-label="Open search"], button[aria-label="Search resources"], button[aria-label="Search"]'))
          .find((element) => element.getClientRects().length > 0);
    if (opener?.isConnected) {
      event.preventDefault();
      opener.focus();
    }
  };

  const renderPages = () => (
    <CommandGroup heading="Pages" className="search-palette-group">
      {pageMatches.map((page) => {
        const Icon = page.icon;
        return (
          <CommandItem
            key={page.href}
            value={`page-${page.label}`}
            onSelect={() => openPage(page.href)}
            className="search-palette-row"
          >
            <span className="search-palette-kind"><Icon aria-hidden="true" />page</span>
            <span className="search-palette-copy">
              <span>{page.label}</span>
              <small>{page.detail}</small>
            </span>
            <span className="search-palette-arrow" aria-hidden="true">→</span>
          </CommandItem>
        );
      })}
      {ContactPaletteItem ? (
        <Suspense fallback={null}><ContactPaletteItem closePalette={() => setIsOpen(false)} /></Suspense>
      ) : null}
    </CommandGroup>
  );

  const renderRecentSearches = (filterByQuery = false) => {
    const visibleRecentSearches = filterByQuery
      ? recentSearches.filter((recent) =>
          recent.toLocaleLowerCase().includes(queryTrimmed.toLocaleLowerCase()),
        )
      : recentSearches;

    if (visibleRecentSearches.length === 0) return null;

    return (
      <CommandGroup heading="Recent searches" className="search-palette-group">
        <button
          type="button"
          className="btn-link search-palette-clear"
          onClick={() => {
            try {
              localStorage.removeItem(RECENT_SEARCHES_KEY);
            } catch {
              // storage may be unavailable — clearing the UI is still useful
            }
            setRecentSearches([]);
          }}
          data-testid="button-clear-recent-searches"
        >
          <X aria-hidden="true" />
          Clear
        </button>
        {visibleRecentSearches.map((recent, index) => (
          <CommandItem
            key={`recent-${recent}`}
            value={`recent-${recent}`}
            onSelect={() => setQuery(recent)}
            className="search-palette-row"
            data-testid={`recent-search-${index}`}
          >
            <span className="search-palette-kind"><Clock aria-hidden="true" />recent</span>
            <span className="search-palette-copy"><span>{recent}</span></span>
            <span className="search-palette-arrow" aria-hidden="true">→</span>
          </CommandItem>
        ))}
      </CommandGroup>
    );
  };

  const renderDefaultJumps = () => (
    <CommandGroup heading="Jump to" className="search-palette-group search-palette-default-jump-group">
      {defaultCategories.map((category) => (
        <CommandItem
          key={`jump-category-${category.id}`}
          value={`category-${category.name}`}
          onSelect={() => openCategory(category)}
          className="search-palette-row search-palette-default-jump"
        >
          <span className="search-palette-kind search-palette-kind-category">cat</span>
          <span className="search-palette-copy">
            <span>{category.name}</span>
            <small>category · {category.resourceCount}</small>
          </span>
          <span className="search-palette-arrow" aria-hidden="true">→</span>
        </CommandItem>
      ))}
      {featuredResources.map((resource) => (
        <CommandItem
          key={`jump-featured-${resource.id}`}
          value={`featured-${resource.id}`}
          onSelect={() => openResource(resource)}
          className="search-palette-row search-palette-default-jump"
        >
          <span className="search-palette-kind">item</span>
          <span className="search-palette-copy">
            <span>{resource.title}</span>
            {resource.description ? <small>{resource.description.slice(0, 60)}</small> : null}
          </span>
          <span className="search-palette-arrow" aria-hidden="true">→</span>
        </CommandItem>
      ))}
    </CommandGroup>
  );

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={setIsOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="search-palette-overlay" />
        <DialogPrimitive.Content
          className="search-palette"
          aria-label="Search resources, categories, and pages"
          onKeyDownCapture={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
              event.preventDefault();
              event.stopPropagation();
              setIsOpen(false);
            }
          }}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            inputRef.current?.focus();
          }}
          onCloseAutoFocus={restoreOpenerFocus}
        >
          <DialogPrimitive.Title className="sr-only">Search Resources</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Search resources, categories, and pages in the awesome video collection.
          </DialogPrimitive.Description>

          <Command
            className="search-palette-command"
            shouldFilter={false}
            value={selectedValue}
            onValueChange={setSelectedValue}
            onKeyDownCapture={() => { selectionInteracted.current = true; }}
            onPointerMove={() => { selectionInteracted.current = true; }}
          >
            <CommandInput
              ref={inputRef}
              aria-label="Search resources, categories, and pages"
              placeholder="Find resources, categories, or pages…"
              trailing={
                <DialogPrimitive.Close className="icon-btn search-palette-close" aria-label="Close search">
                  <kbd className="kbd">esc</kbd>
                  <span className="sr-only">Close search</span>
                </DialogPrimitive.Close>
              }
              value={query}
              onValueChange={setQuery}
              onKeyDown={(event) => {
                // Before a debounced result has an active cmdk row, commit to
                // /search rather than making Enter a no-op.
                if (event.key !== "Enter" || queryTrimmed.length < 2) return;
                const active = document.querySelector(
                  '[cmdk-item][data-selected="true"], [cmdk-item][aria-selected="true"]',
                );
                if (!active) {
                  event.preventDefault();
                  commitToSearchPage(queryTrimmed);
                }
              }}
            />

            <CommandList className="search-palette-list">
              {showResults ? (
                isPending ? (
                  <div className="search-palette-status" data-testid="search-loading" role="status">
                    <Loader2 className="animate-spin" />
                    Searching…
                  </div>
                ) : resourceQuery.isError ? (
                  <div className="search-palette-status search-palette-status-error" data-testid="search-error" role="alert">
                    <span>Search failed. Please try again.</span>
                    <button type="button" className="btn ghost" onClick={() => resourceQuery.refetch()}>Try again</button>
                  </div>
                ) : (
                  <>
                    {renderRecentSearches(true)}
                    {results.length > 0 && (
                      <CommandGroup heading="Resources" className="search-palette-group">
                        {results.map((resource, index) => (
                          <CommandItem
                            key={`resource-${resource.id}`}
                            value={`resource-${resource.id}`}
                            onSelect={() => openResource(resource)}
                            className="search-palette-row"
                            data-testid={`search-result-${index}`}
                          >
                            <span className="search-palette-kind"><Grid2X2 aria-hidden="true" />item</span>
                            <span className="search-palette-copy">
                              <span>{resource.title}</span>
                              <small>
                                {resource.category}{resource.subcategory ? ` → ${resource.subcategory}` : ""}
                              </small>
                            </span>
                            <span className="search-palette-arrow" aria-hidden="true">→</span>
                          </CommandItem>
                        ))}
                        <CommandItem
                          value={`view-all-${queryTrimmed}`}
                          onSelect={() => commitToSearchPage(queryTrimmed)}
                          className="search-palette-row search-palette-view-all"
                          data-testid="search-view-all"
                        >
                          <span className="search-palette-kind"><Search aria-hidden="true" />all</span>
                          <span className="search-palette-copy"><span>View all results for “{queryTrimmed}”</span></span>
                          <span className="search-palette-arrow" aria-hidden="true">→</span>
                        </CommandItem>
                      </CommandGroup>
                    )}
                    {pageMatches.length > 0 && renderPages()}
                    {categoryMatches.length > 0 && (
                      <CommandGroup heading="Categories" className="search-palette-group">
                        {categoryMatches.map((category) => (
                          <CommandItem
                            key={`category-${category.id}`}
                            value={`category-${category.name}`}
                            onSelect={() => openCategory(category)}
                            className="search-palette-row"
                          >
                            <span className="search-palette-kind search-palette-kind-category"><Folder aria-hidden="true" />cat</span>
                            <span className="search-palette-copy">
                              <span>{category.name}</span>
                              <small>{category.resourceCount} resource{category.resourceCount === 1 ? "" : "s"}</small>
                            </span>
                            <span className="search-palette-arrow" aria-hidden="true">→</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                    {!hasNonResourceMatches && results.length === 0 && (
                      <div className="search-palette-status" data-testid="search-no-results">
                        <Search aria-hidden="true" />
                        <strong>No results for “{queryTrimmed}”</strong>
                        <span>Try different keywords or check the spelling.</span>
                      </div>
                    )}
                    {categoriesQuery.isError && (
                      <div className="search-palette-inline-error" role="status">
                        Categories are unavailable right now.
                      </div>
                    )}
                  </>
                )
              ) : (
                <>
                  {renderDefaultJumps()}
                  {renderPages()}
                  {renderRecentSearches()}
                  {categoriesQuery.isLoading && defaultCategories.length === 0 && (
                    <div className="search-palette-inline-error" role="status">Loading categories…</div>
                  )}
                  {categoriesQuery.isError && defaultCategories.length === 0 && (
                    <div className="search-palette-inline-error" role="status">Categories are unavailable right now.</div>
                  )}
                  {featuredQuery.isError && (
                    <div className="search-palette-inline-error" role="status">Featured resources are unavailable right now.</div>
                  )}
                </>
              )}
            </CommandList>
          </Command>

          <footer className="search-palette-footer">
            <span><kbd className="kbd">↑↓</kbd> navigate</span>
            <span><kbd className="kbd">↵</kbd> open</span>
            <span><kbd className="kbd">esc</kbd> close</span>
            <span className="search-palette-footer-spacer" aria-hidden="true" />
            {(showResults && results.length > 0) || (!showResults && defaultSuggestionCount > 0) ? (
              <span className="search-palette-result-count" data-testid="search-result-count" aria-live="polite">
                {showResults ? (
                  <>
                    {totalMatches.toLocaleString()} match{totalMatches === 1 ? "" : "es"}
                    {totalMatches > results.length ? ` — showing top ${results.length}` : ""}
                  </>
                ) : (
                  <>{defaultSuggestionCount} result{defaultSuggestionCount === 1 ? "" : "s"}</>
                )}
              </span>
            ) : null}
          </footer>

        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
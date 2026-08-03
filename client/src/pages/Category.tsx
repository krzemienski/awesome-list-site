import { ResourceCardSkeleton, PageHeaderSkeleton } from "@/components/ui/skeletons";
import { useEffect, useState, useMemo, useRef } from "react";
import { useParams, Link, useLocation, useSearch, Redirect } from "wouter";
import { safeGetItem, safeSetItem } from "@/lib/safeStorage";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SEOHead from "@/components/layout/SEOHead";
import { categorySeoTitleCore, categorySeoDescription } from "@shared/seo-templates";
import AdvancedFilter from "@/components/ui/advanced-filter";
import { ViewModeToggle, ViewMode, isLayoutViewMode } from "@/components/ui/view-mode-toggle";
import ResourceCard from "@/components/resource/ResourceCard";
import { ResourceListRow, ResourceCompactCard } from "@/components/resource/resource-view-modes";
import { Paginator } from "@/components/ui/paginator";
import { parsePageParamStrict, pageNoticeFor } from "@/lib/page-param";
import { ArrowLeft, Search } from "lucide-react";
import { deslugify } from "@/lib/utils";
import { normalizeTag, parseTagsParam } from "@/lib/tags";
import { Resource } from "@/types/awesome-list";
import NotFound from "@/pages/not-found";
import { processAwesomeListData } from "@/lib/parser";
import { fetchStaticAwesomeList } from "@/lib/static-data";
import { trackCategoryView } from "@/lib/analytics";
import { useAuth } from "@/hooks/useAuth";

/** Classic Levenshtein edit distance (small inputs only — slugs/tokens). */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = curr;
  }
  return prev[b.length];
}

/**
 * "Did you mean …?" — fuzzy-match a bad category slug against the real
 * category slugs (full slug AND each hyphen token, so "comunity" still
 * finds "community-events") with edit distance ≤ 2.
 */
function findCategorySuggestion(
  slug: string | undefined,
  categories: Array<{ name: string; slug: string }>,
): { label: string; href: string } | undefined {
  if (!slug) return undefined;
  const needle = slug.toLowerCase();
  let best: { name: string; slug: string; dist: number } | undefined;
  for (const cat of categories) {
    const candidates = [cat.slug, ...cat.slug.split("-")];
    const dist = Math.min(...candidates.map((c) => levenshtein(needle, c)));
    if (dist <= 2 && (!best || dist < best.dist)) {
      best = { name: cat.name, slug: cat.slug, dist };
    }
  }
  return best
    ? { label: `Did you mean ${best.name}?`, href: `/category/${best.slug}` }
    : undefined;
}

/** How many resource cards render per page (BUG-007 client-side pagination). */
const PAGE_SIZE = 24;

/**
 * Normalize the sort URL param. The canonical AdvancedFilter values
 * ("default", "name-asc", "name-desc") pass through unchanged so a
 * reload/back-button restores the select; the ?sort= alias plus the bare
 * shorthand "name"/"asc"/"desc" map onto name ordering (BUG-006).
 * BUG-003 (run14): count-asc/count-desc are no longer offered on resource
 * lists (they only sort category grids) — legacy URLs fold to "default".
 */
const CANONICAL_SORTS = new Set(["default", "name-asc", "name-desc"]);
function normalizeSort(value: string | null): string {
  if (!value) return "default";
  const v = value.toLowerCase();
  if (CANONICAL_SORTS.has(v)) return v;
  if (v === "name" || v === "asc") return "name-asc";
  if (v === "desc") return "name-desc";
  return "default";
}

export default function Category() {
  const { slug } = useParams<{ slug: string }>();
  const { isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();
  const searchString = useSearch();

  const getSearchParams = () => new URLSearchParams(window.location.search);

  // "General"/Uncategorized view = resources sitting directly on this category
  // node (no subcategory). audit2 BUG-030: the content filter now lives under
  // its own reactive key, ?filter=general — ?view= is layout-only
  // (grid|list|compact). ?view=general (old sidebar links, bookmarks) is
  // accepted as a legacy alias on arrival and normalized to ?filter=general by
  // the URL-sync effect below, so layout and content filter no longer fight
  // over one param key.
  const arrivalParams = new URLSearchParams(searchString);
  const isGeneralView =
    arrivalParams.get("filter") === "general" ||
    arrivalParams.get("view") === "general";

  const [searchTerm, setSearchTerm] = useState(() => getSearchParams().get("search") || "");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>(() => getSearchParams().get("subcategory") || "all");
  // BUG-064 (run27): shared parser — canonical ?tags=, the ?tag= alias,
  // repeated params, comma lists, whitespace chunks all parse identically on
  // every page that accepts a tag filter.
  const [selectedTags, setSelectedTags] = useState<string[]>(() =>
    parseTagsParam(getSearchParams()),
  );
  // Canonical ?sortBy= OR the ?sort= alias / bare "name" (BUG-006), normalized.
  const [sortBy, setSortBy] = useState(() => normalizeSort(getSearchParams().get("sortBy") || getSearchParams().get("sort")));
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
  
  // Run22 BUG-026: an explicit ?view=grid|list|compact wins over the saved
  // preference, and once the user toggles (or arrived with ?view=) we keep
  // writing the choice back to the URL so reload/Back/Forward preserve it.
  // ?view=general (Category's no-subcategory bucket) keeps precedence.
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      const fromUrl = getSearchParams().get('view');
      if (isLayoutViewMode(fromUrl)) return fromUrl;
      const saved = safeGetItem('awesome-list-view-mode');
      if (saved === 'grid' || saved === 'list' || saved === 'compact') {
        return saved;
      }
    }
    return 'grid';
  });
  const viewParamExplicitRef = useRef(
    typeof window !== 'undefined' && isLayoutViewMode(getSearchParams().get('view')),
  );

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
  
  const currentCategory = awesomeList?.categories.find(cat =>
    cat.slug === slug
  );

  const categoryName = currentCategory ? currentCategory.name : deslugify(slug || "");

  // Source of truth: the single deduplicated tree (GET /api/awesome-list), the
  // same source the sidebar, header, home cards, and SSR use. Flatten every
  // approved resource under this category (direct + subcategory + sub-sub) so the
  // count and the rendered list match everywhere and no near-duplicate URL rows
  // (which the raw resources table still carries) render as duplicate cards.
  const treeResources = useMemo(() => {
    if (!currentCategory) return [] as any[];
    const flat = [
      ...(((currentCategory as any).resources as any[]) || []),
      ...((((currentCategory as any).subcategories as any[]) || []).flatMap((sub: any) => [
        ...((sub.resources as any[]) || []),
        ...(((sub.subSubcategories as any[]) || []).flatMap(
          (ss: any) => (ss.resources as any[]) || [],
        )),
      ])),
    ];
    const seen = new Set<string>();
    const out: any[] = [];
    for (const r of flat) {
      const key = `${r.id ?? ""}|${r.url ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(r);
    }
    return out;
  }, [currentCategory]);

  const allResources: Resource[] = useMemo(() => {
    return treeResources.map((r: any) => ({
      id: r.id,
      title: r.title,
      description: r.description || '',
      url: r.url,
      tags: Array.isArray(r.metadata?.tags) ? (r.metadata.tags as string[]) : [],
      category: r.category,
      subcategory: r.subcategory || undefined,
      subSubcategory: r.subSubcategory || undefined,
    }));
  }, [treeResources]);
  
  // BUG-005/BUG-010 (run26): filter options come from the taxonomy TREE (the
  // same nodes the sidebar renders), not from unique resource strings, so
  // every level — including sub-subcategories like Codecs › HEVC — is
  // selectable. Each option carries the exact node identity (subcategory name
  // + optional sub-subcategory name); filtering compares those fields with
  // strict equality, never name substrings. Counts use the same identity
  // match so the option label always equals the result-set size.
  const subcategoryOptions = useMemo(() => {
    const opts: Array<{ value: string; sub: string; subSub?: string; count: number }> = [];
    if (!currentCategory) return opts;
    const subs = [...((((currentCategory as any).subcategories as any[]) || []))].sort(
      (a: any, b: any) => String(a.name).localeCompare(String(b.name)),
    );
    for (const sub of subs) {
      // Identity count: every resource whose subcategory field IS this node
      // (includes rows nested under its sub-subcategories — they carry the
      // parent subcategory too), matching the sidebar's recursive badge.
      const subCount = allResources.filter((r) => r.subcategory === sub.name).length;
      if (subCount > 0) {
        opts.push({ value: sub.name, sub: sub.name, count: subCount });
      }
      const subSubs = [...(((sub.subSubcategories as any[]) || []))].sort(
        (a: any, b: any) => String(a.name).localeCompare(String(b.name)),
      );
      for (const ss of subSubs) {
        const ssCount = allResources.filter(
          (r) => r.subcategory === sub.name && r.subSubcategory === ss.name,
        ).length;
        if (ssCount > 0) {
          opts.push({ value: `${sub.name} › ${ss.name}`, sub: sub.name, subSub: ss.name, count: ssCount });
        }
      }
    }
    return opts;
  }, [currentCategory, allResources]);

  // value → exact taxonomy identity, for resolving the Select state (and any
  // deep-linked ?subcategory= value, including the "Sub › SubSub" form).
  const optionByValue = useMemo(() => {
    const m = new Map<string, { sub: string; subSub?: string }>();
    subcategoryOptions.forEach((o) => m.set(o.value, { sub: o.sub, subSub: o.subSub }));
    return m;
  }, [subcategoryOptions]);

  // audit2 BUG-031: the "Uncategorized" bucket is defined by IDENTITY — the
  // rows sitting directly on this category node in the tree, the exact set the
  // sidebar's Uncategorized badge counts (including folded-back orphans whose
  // subcategory string maps to no real node) — never by `!r.subcategory`.
  const generalIdentitySet = useMemo(() => {
    const s = new Set<string>();
    for (const r of (((currentCategory as any)?.resources as any[]) || [])) {
      s.add(`${r.id ?? ""}|${r.url ?? ""}`);
    }
    return s;
  }, [currentCategory]);

  const availableTags = useMemo(() => {
    // Canonicalize tag variants (space/underscore/case → hyphenated lowercase)
    // so "open-source" and "open source" collapse into one chip with a summed
    // count. Mirrors the /api/tags SQL normalization — keep in lockstep.
    const tagCounts: Record<string, number> = {};
    allResources.forEach((r) => {
      const tags = r.tags || [];
      const seen = new Set<string>();
      tags.forEach((tag: string) => {
        const canonical = normalizeTag(tag);
        if (!canonical || seen.has(canonical)) return;
        seen.add(canonical);
        tagCounts[canonical] = (tagCounts[canonical] || 0) + 1;
      });
    });
    return Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }, [allResources]);
  
  // BUG-060 (run27): whitespace-only search input must behave as NO search —
  // "   " used to be matched literally against titles/descriptions and hid
  // every resource ("Showing 0 of 0").
  const effectiveSearch = searchTerm.trim();

  // BUG-059 (run27): a deep-linked ?subcategory= value that names no real
  // subcategory (e.g. ?subcategory=nonexistent-subcategory) used to filter to
  // a false "No resources found" empty state. Once options are loaded, an
  // unknown value is IGNORED (full category shown) and an explicit notice
  // renders instead. While loading, options are empty — treat as known so
  // nothing flashes.
  const subcategoryUnknown =
    !isGeneralView &&
    selectedSubcategory !== "all" &&
    selectedSubcategory !== "__general__" &&
    subcategoryOptions.length > 0 &&
    !optionByValue.has(selectedSubcategory);

  // audit2 BUG-031: URL forced ?filter=general but this category has no
  // uncategorized resources — the filter is ignored (see filteredResources)
  // and an explicit notice renders instead of a "0 of 0" dead-end.
  const generalFilterEmpty = isGeneralView && !isLoading && generalIdentitySet.size === 0;

  const filteredResources = useMemo(() => {
    let results = [...allResources];

    if (effectiveSearch) {
      const searchLower = effectiveSearch.toLowerCase();
      results = results.filter(r =>
        r.title.toLowerCase().includes(searchLower) ||
        r.description?.toLowerCase().includes(searchLower)
      );
    }

    if (isGeneralView) {
      // audit2 BUG-031: membership in the category node's DIRECT resource set
      // (by id|url identity) — the exact rows the sidebar's Uncategorized badge
      // counts, including folded-back orphans — replaces `!r.subcategory`,
      // which missed orphans and could show "0 of 0" while the sidebar
      // advertised items. When the direct set is EMPTY, the filter is ignored
      // (full category shown) and notice-general-empty explains, so this view
      // can never dead-end.
      if (generalIdentitySet.size > 0) {
        results = results.filter((r) => generalIdentitySet.has(`${r.id ?? ""}|${r.url ?? ""}`));
      }
    } else if (selectedSubcategory !== "all" && !subcategoryUnknown) {
      // BUG-005 (run26): resolve the selection to its taxonomy node and match
      // by identity. A "Sub › SubSub" selection matches BOTH fields exactly; a
      // subcategory selection matches its whole subtree (rows under its
      // sub-subcategories carry the same subcategory field).
      // BUG-059 (run27): unknown deep-linked values no longer fall through to
      // an exact-field comparison (which produced a false empty state) — they
      // are skipped here and surfaced via the "unknown subcategory" notice.
      const sel = optionByValue.get(selectedSubcategory);
      if (sel?.subSub) {
        results = results.filter(
          (r) => r.subcategory === sel.sub && r.subSubcategory === sel.subSub,
        );
      } else if (sel) {
        results = results.filter((r) => r.subcategory === sel.sub);
      } else {
        results = results.filter((r) => r.subcategory === selectedSubcategory);
      }
    }

    if (selectedTags.length > 0) {
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
  }, [allResources, effectiveSearch, selectedSubcategory, subcategoryUnknown, selectedTags, sortBy, isGeneralView, optionByValue, generalIdentitySet]);

  // ----- Client-side pagination (BUG-007) -----
  const totalPages = Math.max(1, Math.ceil(filteredResources.length / PAGE_SIZE));
  // Clamp for RENDERING only; the raw `page` state (which may briefly exceed the
  // range while data loads or filters shrink) is preserved so deep-linked ?page=
  // survives the initial empty render.
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const pagedResources = useMemo(
    () => filteredResources.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filteredResources, currentPage],
  );

  // Once real data is present, pull an out-of-range page back into bounds so the
  // URL/controls never reference a page that no longer exists. Guarded on loaded
  // + node found so it never clobbers a deep link during the loading render —
  // but NOT on non-empty results: a zero-match filter has exactly one (empty)
  // page, and ?page=2 on it must still correct visibly instead of lingering.
  useEffect(() => {
    // filteredResources derives from the deduplicated tree (isLoading covers it).
    if (!isLoading && currentCategory) {
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
  }, [isLoading, currentCategory, page, totalPages]);

  // audit2 BUG-032: numbered paginator helpers — real hrefs merge ?page=N into
  // the current query (filters survive open-in-new-tab); plain SPA clicks go
  // through goToPage so history semantics stay with the URL-sync effect.
  const makePageHref = (n: number) => {
    const params = new URLSearchParams(window.location.search);
    if (n > 1) params.set("page", String(n));
    else params.delete("page");
    const qs = params.toString();
    return `/category/${slug}${qs ? `?${qs}` : ""}`;
  };
  const goToPage = (n: number) => {
    setPage(n);
    setPageNotice(null);
    urlPagePendingRef.current = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // The subcategory dropdown must also be the way OUT of "General" view (which is
  // URL-driven via ?view=general). Navigating without the flag makes the reactive
  // isGeneralView recompute to false. The sentinel "__general__" is the currently
  // selected value while in General view, so picking "All Subcategories" or any
  // real subcategory is always a genuine change that fires onValueChange.
  const handleSubcategoryChange = (value: string) => {
    // BUG-055 (run14): "General (no subcategory)" is now a first-class,
    // always-listed option — selecting it navigates INTO ?view=general
    // (previously the sentinel was display-only and the bucket was reachable
    // only via the sidebar link).
    if (value === "__general__") {
      if (isGeneralView) return; // already in General view
      setSelectedSubcategory("all");
      resetPage();
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.set("search", searchTerm);
      if (selectedTags.length > 0) params.set("tags", selectedTags.join(","));
      if (sortBy && sortBy !== "default") params.set("sortBy", sortBy);
      // audit2 BUG-030: content filter key, decoupled from layout ?view=.
      params.set("filter", "general");
      if (viewParamExplicitRef.current) params.set("view", viewMode);
      setLocation(`/category/${slug}?${params.toString()}`);
      return;
    }
    setSelectedSubcategory(value);
    resetPage();
    if (isGeneralView) {
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.set("search", searchTerm);
      if (value && value !== "all") params.set("subcategory", value);
      if (selectedTags.length > 0) params.set("tags", selectedTags.join(","));
      if (sortBy && sortBy !== "default") params.set("sortBy", sortBy);
      if (viewParamExplicitRef.current) params.set("view", viewMode);
      const qs = params.toString();
      setLocation(`/category/${slug}${qs ? `?${qs}` : ""}`);
    }
  };

  // Run16 BUG-005: list-state changes (page, subcategory, tags, sort) must
  // PUSH history entries so browser Back returns to the previous in-app state
  // instead of leaving the page. Search keystrokes still replace (a push per
  // keystroke would spam history), as do the initial-mount URL normalization
  // and the re-sync that follows a popstate restore.
  const urlSyncInitializedRef = useRef(false);
  const popNavigationRef = useRef(false);
  const pushSnapshotRef = useRef("");

  useEffect(() => {
    // Run23 NB-033: when Back/Forward leaves this page entirely, wouter's
    // location change re-fires this effect ONE more time while the component
    // is still mounted — and the write below would stamp this category's path
    // over the DESTINATION history entry (Back looked dead; scroll restore
    // never ran). Bail unless the browser URL still points at this page.
    if (window.location.pathname !== `/category/${slug}`) return;
    const params = new URLSearchParams();

    // BUG-060 (run27): drop the ?search= param when the box holds only
    // whitespace so reload/share links don't carry a no-op "+++" query.
    if (searchTerm.trim()) params.set("search", searchTerm);
    if (!isGeneralView && selectedSubcategory && selectedSubcategory !== "all") params.set("subcategory", selectedSubcategory);
    if (selectedTags.length > 0) params.set("tags", selectedTags.join(","));
    if (sortBy && sortBy !== "default") params.set("sortBy", sortBy);
    // Only the canonical ?tags=/?sortBy= params are written, so a ?tag=/?sort=
    // alias used on arrival is normalized away after the first sync.
    if (page > 1) params.set("page", String(page));
    // Preserve the reactive general-filter flag so it survives history writes
    // triggered by other filter changes (audit2 BUG-030: canonical key is
    // ?filter=general — a legacy ?view=general arrival is normalized here).
    // Independently (Run22 BUG-026), persist an explicitly chosen layout view;
    // the two params coexist now that layout and content filter are split.
    if (isGeneralView) params.set("filter", "general");
    if (viewParamExplicitRef.current) params.set("view", viewMode);

    const newSearch = params.toString();
    const newPath = `/category/${slug}${newSearch ? `?${newSearch}` : ""}`;
    const currentPath = `${window.location.pathname}${window.location.search}`;

    const pushSnapshot = JSON.stringify([page, selectedSubcategory, selectedTags, sortBy, isGeneralView, viewMode]);
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
  }, [searchTerm, selectedSubcategory, selectedTags, sortBy, page, slug, location, isGeneralView, viewMode]);

  useEffect(() => {
    const handlePopState = () => {
      popNavigationRef.current = true;
      const params = getSearchParams();
      setSearchTerm(params.get("search") || "");
      setSelectedSubcategory(params.get("subcategory") || "all");
      // BUG-064 (run27): same shared parser as the initializer.
      setSelectedTags(parseTagsParam(params));
      setSortBy(normalizeSort(params.get("sortBy") || params.get("sort")));
      // audit2 BUG-022/023: same shared page rule as the initializer, with the
      // same visible feedback when this history entry carries a bad value.
      const parsed = parsePageParamStrict(params.get("page"));
      setPage(parsed.page);
      setPageNotice(pageNoticeFor(parsed));
      urlPagePendingRef.current = parsed.kind === "valid";
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
    if (categoryName && !isLoading) {
      trackCategoryView(categoryName);
    }
  }, [categoryName, isLoading]);
  
  const isDbResource = (resource: Resource) => {
    const idStr = String(resource.id);
    return typeof resource.id === 'number' || /^\d+$/.test(idStr) || idStr.startsWith('db-');
  };
  
  const getDbId = (resource: Resource) => {
    const idStr = String(resource.id);
    if (typeof resource.id === 'number') return resource.id;
    if (idStr.startsWith('db-')) return parseInt(idStr.substring(3), 10);
    return parseInt(idStr, 10);
  };
  
  if (isLoading) {
    return (
      <div className="space-y-6" aria-busy={true} aria-live="polite">
        {/* BUG-031 (run22): head swaps with the route immediately — a soft nav
            must never leave the previous page's title/canonical up mid-load. */}
        <SEOHead title="Loading category" description="Loading category resources on Awesome Video." />
        <div className="space-y-4">
          <PageHeaderSkeleton />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => (
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
          <h2 className="text-xl font-semibold mb-2">Error Loading Category</h2>
          <p className="text-muted-foreground">There was an error loading the category data.</p>
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
  
  if (!currentCategory && !isLoading) {
    // Slug tolerance: the slug may belong to a subcategory or sub-subcategory
    // (e.g. someone hand-edited /category/intro-learning → a sub slug).
    // Redirect to the canonical page instead of 404ing.
    if (awesomeList && slug) {
      for (const cat of awesomeList.categories) {
        for (const sub of cat.subcategories ?? []) {
          if (sub.slug === slug) {
            return <Redirect to={`/subcategory/${slug}`} replace />;
          }
          for (const subSub of sub.subSubcategories ?? []) {
            if (subSub.slug === slug) {
              return <Redirect to={`/sub-subcategory/${slug}`} replace />;
            }
          }
        }
      }
    }
    return (
      <NotFound
        heading="This page doesn't exist."
        suggestion={findCategorySuggestion(slug, awesomeList?.categories ?? [])}
      />
    );
  }
  
  return (
    <div className="space-y-4 sm:space-y-6 overflow-x-hidden max-w-full">
      <SEOHead
        title={categorySeoTitleCore(categoryName, slug)}
        description={categorySeoDescription(categoryName, slug, allResources.length)}
        category={categoryName}
        resourceCount={allResources.length}
        // BUG-012 (audit 2): page 2+ self-canonicalizes (?page=N), mirroring
        // og-middleware's paginated canonical (two-pass parity).
        pageParam={currentPage}
      />
      
      <div className="space-y-3 sm:space-y-4">
        {/* Run16 BUG-049: asChild so the anchor IS the ≥44px button (the
            wrapping-Link pattern produced a 20px-tall anchor box). */}
        <Button asChild variant="ghost" size="sm" className="gap-2 min-h-[44px]">
          <Link href="/" data-testid="button-back-home">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </Button>
        
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
          <div className="min-w-0 lg:flex-1">
            <h1 className="display-h text-2xl sm:text-3xl md:text-4xl break-words">
              {categoryName}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5 sm:mt-1">
              {/* Run17 BUG-059: header count follows the active filter instead of
                  contradicting the "Showing 1-N of M" line below. */}
              {filteredResources.length === allResources.length
                ? `${allResources.length} resources available`
                : `${filteredResources.length} of ${allResources.length} resources shown`}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {subcategoryOptions.length > 0 && (
              <Select value={isGeneralView ? "__general__" : selectedSubcategory} onValueChange={handleSubcategoryChange}>
                <SelectTrigger aria-label="Filter by subcategory" className="w-full md:w-[200px]" data-testid="select-subcategory-filter">
                  <SelectValue placeholder="Filter by subcategory" />
                </SelectTrigger>
                <SelectContent>
                  {/* BUG-055 (run14): first-class option — but only when the
                      bucket is non-empty (audit2 BUG-031: an always-listed
                      "Uncategorized" was itself a dead-end source on categories
                      with no direct resources). While a URL forces the filter,
                      keep it listed (count 0) so the trigger stays honest. */}
                  {(generalIdentitySet.size > 0 || isGeneralView) && (
                    <SelectItem value="__general__">Uncategorized ({generalIdentitySet.size})</SelectItem>
                  )}
                  <SelectItem value="all">All Subcategories</SelectItem>
                  {/* BUG-010 (run26): sub-subcategories are listed (indented
                      under their parent) with identity-derived counts. */}
                  {subcategoryOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.subSub ? `${opt.sub} › ${opt.subSub}` : opt.sub} ({opt.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {/* Run22 BUG-025: badge tracks the ACTIVE filter result count, not
                the unfiltered total (which the header line already shows). */}
            <Badge
              variant="secondary"
              className="no-print rounded-full text-sm sm:text-base px-3 sm:px-4 py-1 tabular-nums"
              data-testid="badge-count"
            >
              {filteredResources.length}
            </Badge>
          </div>
        </div>
      </div>
      
      <div className="flex flex-col gap-4 min-w-0">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          {/* BUG-035 (run19): scope the in-page search explicitly — a bare
              "Search resources..." box under the global ⌘K reads as site-wide. */}
          <Input
            placeholder={`Search in ${categoryName}...`}
            aria-label={`Search resources in ${categoryName}`}
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); resetPage(); }}
            className="pl-10"
            data-testid="input-search-resources"
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
      </div>
      
      <div className="flex items-center justify-between gap-2">
        {/* NB-051 (run18): let the position label wrap at narrow widths instead
            of truncating to "…of 11 resou…"; keep it readable at 375px. */}
        <p className="text-xs sm:text-sm text-muted-foreground min-w-0 whitespace-normal break-words" data-testid="text-results-count">
          {/* BUG-v3-M33 (run12): show the actual page range, not page-size-as-subset */}
          Showing {filteredResources.length === 0
            ? "0"
            : `${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, filteredResources.length)}`} of {filteredResources.length} resource{filteredResources.length === 1 ? "" : "s"}
          {selectedTags.length > 0 && ` (${selectedTags.length} tag${selectedTags.length > 1 ? 's' : ''})`}
        </p>
        <ViewModeToggle value={viewMode} onChange={handleViewModeChange} />
      </div>
      
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

      {/* audit2 BUG-031: never dead-end the Uncategorized view. */}
      {generalFilterEmpty && (
        <div
          className="flex flex-wrap items-center justify-between gap-2 border border-[var(--border)] rounded-[var(--radius)] bg-[var(--surface)] px-4 py-2 text-sm text-muted-foreground"
          role="status"
          data-testid="notice-general-empty"
        >
          <span>
            {categoryName} has no uncategorized resources, so the filter was ignored and all {filteredResources.length} are shown.
          </span>
          <button
            type="button"
            className="underline underline-offset-2 min-h-8"
            onClick={() => handleSubcategoryChange("all")}
            data-testid="button-clear-general-filter"
          >
            Remove filter
          </button>
        </div>
      )}

      {/* BUG-059 (run27): explicit feedback instead of a false empty state
          when the URL named a subcategory that doesn't exist here. */}
      {subcategoryUnknown && (
        <div
          className="flex flex-wrap items-center justify-between gap-2 border border-[var(--border)] rounded-[var(--radius)] bg-[var(--surface)] px-4 py-2 text-sm text-muted-foreground"
          role="status"
          data-testid="notice-unknown-subcategory"
        >
          <span>
            “{selectedSubcategory}” isn't a subcategory of {categoryName}, so that filter was ignored.
          </span>
          <button
            type="button"
            className="underline underline-offset-2 min-h-8"
            onClick={() => setSelectedSubcategory("all")}
            data-testid="button-clear-unknown-subcategory"
          >
            Remove it
          </button>
        </div>
      )}

      {filteredResources.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold mb-2">No resources found</h3>
          <p className="text-muted-foreground mb-4">
            {effectiveSearch || (selectedSubcategory !== "all" && !subcategoryUnknown) || selectedTags.length > 0
              ? "Try adjusting your filters to see more results."
              : "There are no resources in this category yet."}
          </p>
          {(effectiveSearch || selectedSubcategory !== "all" || selectedTags.length > 0) && (
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm("");
                setSelectedSubcategory("all");
                setSelectedTags([]);
                resetPage();
              }}
            >
              Clear all filters
            </Button>
          )}
        </div>
      ) : (
        <div className={
          viewMode === "grid"
            // BUG-016 (run14): md drops to 1 col — sidebar returns at 768px.
            // BUG-003 (run22): 3 cols only from xl — at lg (1024–1279) three
            // columns beside the pinned 256px sidebar left headings ~65px
            // wide, clipping titles mid-word inside the line-clamp.
            ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 min-w-0"
            : viewMode === "list"
            ? "flex flex-col gap-2 min-w-0"
            : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 min-w-0"
        }>
          {/* R-08 (run23): category pages render the SAME shared card trio as
              /subcategory and /sub-subcategory — ResourceCard (grid, with
              favorite/bookmark/Open Link/Suggest Edit), ResourceListRow and
              ResourceCompactCard — instead of a bespoke inline card set, so
              one card design exists everywhere. */}
          {pagedResources.map((resource, index) => {
            const normalized = {
              id: isDbResource(resource) ? String(getDbId(resource)) : "",
              title: resource.title,
              url: resource.url,
              description: resource.description,
            };
            if (viewMode === "list") {
              return <ResourceListRow key={`${resource.url}-${index}`} resource={normalized} />;
            }
            if (viewMode === "compact") {
              return <ResourceCompactCard key={`${resource.url}-${index}`} resource={normalized} />;
            }
            return (
              <ResourceCard
                key={`${resource.url}-${index}`}
                resource={{
                  id: normalized.id,
                  name: resource.title,
                  url: resource.url,
                  description: resource.description,
                  category: resource.subcategory || resource.subSubcategory || undefined,
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

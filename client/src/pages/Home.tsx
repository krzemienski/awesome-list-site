import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TaxonomyCard } from "@/components/ui/taxonomy-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Category, Resource } from "@/types/awesome-list";
import { processAwesomeListData } from "@/lib/parser";
import {
  fetchStaticAwesomeList,
  type AwesomeListNav,
  type AwesomeListNavNode,
} from "@/lib/static-data";
import SEOHead from "@/components/layout/SEOHead";
import { useToast } from "@/hooks/use-toast";
import { homeSeoTitle, homeSeoDescription } from "@shared/seo-templates";
import AIRecommendationsPanel from "@/components/ui/ai-recommendations-panel";
import AdvancedFilter from "@/components/ui/advanced-filter";
import { useAuth } from "@/hooks/useAuth";
import { normalizeTag } from "@/lib/tags";
import { writeFilterParams, usePopstateParams } from "@/lib/url-filter-state";
import {
  FileText,
  Video,
  Code,
  Play,
  Settings,
  Package,
  Server,
  Layers,
  Users,
  Sparkles,
  LogIn,
  Clapperboard,
} from "lucide-react";

// Run23 R-06: Home renders from the ~few-KB nav tree (+ /api/tags for the
// filter panel). The 3.1MB corpus is fetched lazily ONLY when a tag filter is
// active (per-category match counts need per-resource tags).
interface HomeProps {
  nav?: AwesomeListNav;
  navLoading: boolean;
}

// Unified card shape whether the grid renders from the nav tree (default) or
// the corpus (tag-filter mode).
interface DisplayCategory {
  name: string;
  slug: string;
  displayCount: number;
  teaser?: { title: string; description: string };
}

const EXCLUDED_CATEGORY_NAMES = ["Contributing", "License", "External Links", "Anti-features"];

function isRealCategory(name: string): boolean {
  return (
    name !== "Table of contents" &&
    !name.startsWith("List of") &&
    !EXCLUDED_CATEGORY_NAMES.includes(name)
  );
}

function navTotalCount(node: AwesomeListNavNode): number {
  let total = node.resourceCount || 0;
  for (const sub of node.subcategories || []) total += navTotalCount(sub);
  for (const ss of node.subSubcategories || []) total += navTotalCount(ss);
  return total;
}

const categoryIcons: { [key: string]: any } = {
  "Intro & Learning": FileText,
  "Protocols & Transport": Server,
  "Encoding & Codecs": Code,
  "Players & Clients": Play,
  "Media Tools": Clapperboard,
  "Standards & Industry": Package,
  "Infrastructure & Delivery": Layers,
  "General Tools": Settings,
  "Community & Events": Users,
};

function getTotalResourceCount(item: any): number {
  let total = item.resources?.length || 0;
  if (item.subcategories) {
    total += item.subcategories.reduce((sum: number, sub: any) => sum + getTotalResourceCount(sub), 0);
  }
  if (item.subSubcategories) {
    total += item.subSubcategories.reduce((sum: number, subSub: any) => sum + getTotalResourceCount(subSub), 0);
  }
  return total;
}

function getAllResources(category: Category): Resource[] {
  let all = [...(category.resources || [])];
  if (category.subcategories) {
    for (const sub of category.subcategories) {
      all = all.concat(sub.resources || []);
      if (sub.subSubcategories) {
        for (const ss of sub.subSubcategories) {
          all = all.concat(ss.resources || []);
        }
      }
    }
  }
  return all;
}

export default function Home({ nav, navLoading }: HomeProps) {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  // BUG-047 (run13): the register flow lands here with ?welcome=1 after its
  // full-page nav (which drops any in-flight toast). Greet once, then strip
  // the param so refreshes don't re-fire.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("welcome") === "1") {
      toast({
        title: "Welcome to Awesome Video!",
        description:
          "Your account is ready. Bookmark resources, track journeys, and submit your own finds.",
      });
      params.delete("welcome");
      const qs = params.toString();
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${qs ? `?${qs}` : ""}`,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // BUG-017 (run13): tag filters survive refresh + are deep-linkable via
  // ?tags=a,b (same replaceState pattern as ?sort= below). ResourceDetail tag
  // badges link here as /?tags=<tag>.
  const [selectedTags, setSelectedTagsState] = useState<string[]>(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("tags");
    return fromUrl
      ? fromUrl.split(",").map((t) => t.trim()).filter(Boolean)
      : [];
  });

  const setSelectedTags = (next: string[]) => {
    setSelectedTagsState(next);
    // Run22 BUG-016: push (not replace) so Back steps through filter changes.
    writeFilterParams({ tags: next.length === 0 ? null : next.join(",") });
  };
  // R2-M25: sort survives refresh via ?sort= URL param. wouter's useLocation()
  // is path-only, so read/write window.location.search directly (no
  // navigation, no og-middleware impact — the server only keys off ?page=).
  const VALID_SORTS = ["default", "name-asc", "name-desc", "count-desc", "count-asc"];
  const [sortBy, setSortBy] = useState(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("sort");
    return fromUrl && VALID_SORTS.includes(fromUrl) ? fromUrl : "default";
  });

  const handleSortChange = (next: string) => {
    setSortBy(next);
    // Run22 BUG-016: push (not replace) so Back steps through sort changes.
    writeFilterParams({ sort: next === "default" ? null : next });
  };

  // Run22 BUG-016: Back/Forward re-read the query into state so each history
  // step visibly reverses/restores one tag/sort change.
  usePopstateParams((params) => {
    const t = params.get("tags");
    setSelectedTagsState(t ? t.split(",").map((x) => x.trim()).filter(Boolean) : []);
    const s = params.get("sort");
    setSortBy(s && VALID_SORTS.includes(s) ? s : "default");
  });

  // Run23 R-06: corpus is a lazy dependency — only fetched once a tag filter
  // activates (deep-link ?tags= or a chip click). Same query key as the
  // listing routes, so navigating here from a category page reuses the cache.
  const tagFilterActive = selectedTags.length > 0;
  const {
    data: rawCorpus,
    isLoading: corpusLoading,
    error: corpusError,
  } = useQuery({
    queryKey: ["awesome-list-data"],
    queryFn: fetchStaticAwesomeList,
    staleTime: 1000 * 60 * 60,
    enabled: tagFilterActive,
  });
  const awesomeList = rawCorpus ? processAwesomeListData(rawCorpus) : undefined;

  // Filter-panel tag list comes from /api/tags (same SQL normalization the
  // old client-side fold mirrored) — no corpus needed to SHOW the panel.
  const { data: tagsData } = useQuery<{ total: number; tags: { tag: string; count: number }[] }>({
    queryKey: ["/api/tags"],
    staleTime: 1000 * 60 * 5,
  });
  const availableTags = tagsData?.tags ?? [];

  // Nav-derived categories (default, no-filter render path). Counts come from
  // the single deduplicated tree (same source as the sidebar, category pages,
  // and SSR) so every surface agrees.
  const navCategories = useMemo<DisplayCategory[]>(() => {
    if (!nav?.categories) return [];
    return nav.categories
      .filter((cat) => isRealCategory(cat.name) && navTotalCount(cat) > 0)
      .map((cat) => ({
        name: cat.name,
        slug: cat.slug || "",
        displayCount: navTotalCount(cat),
        teaser: cat.teaser,
      }));
  }, [nav?.categories]);

  // Corpus-derived categories (tag-filter render path only).
  const corpusBaseCategories = useMemo(() => {
    if (!awesomeList?.categories) return [] as Category[];
    return awesomeList.categories.filter(
      (cat) => getTotalResourceCount(cat) > 0 && isRealCategory(cat.name)
    );
  }, [awesomeList?.categories]);

  const filteredCategories = useMemo<DisplayCategory[]>(() => {
    let cats: DisplayCategory[];
    if (!tagFilterActive) {
      cats = [...navCategories];
    } else {
      cats = corpusBaseCategories
        .map((cat) => {
          const allRes = getAllResources(cat);
          const matchCount = allRes.filter((r: any) => {
            const tags = (r.tags || r.metadata?.tags || []).map(normalizeTag);
            return selectedTags.some((t) => tags.includes(normalizeTag(t)));
          }).length;
          const firstResource = cat.resources[0];
          return {
            name: cat.name,
            slug: cat.slug || "",
            displayCount: matchCount,
            teaser: firstResource
              ? { title: firstResource.title, description: firstResource.description || "" }
              : undefined,
          };
        })
        .filter((c) => c.displayCount > 0);
    }

    switch (sortBy) {
      case "name-asc":
        cats.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name-desc":
        cats.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "count-desc":
        cats.sort((a, b) => b.displayCount - a.displayCount);
        break;
      case "count-asc":
        cats.sort((a, b) => a.displayCount - b.displayCount);
        break;
    }

    return cats;
  }, [tagFilterActive, navCategories, corpusBaseCategories, selectedTags, sortBy]);

  // Total comes from the same deduplicated tree as the per-category counts, the
  // sidebar, and SSR — one source of truth, so the sum of the cards equals the
  // headline total (the raw resources table double-counts near-duplicate URLs).
  const totalResourceCount = useMemo(() => {
    return navCategories.reduce((sum, cat) => sum + cat.displayCount, 0);
  }, [navCategories]);

  // Grid busy-state: nav still loading, or a tag filter is waiting on the
  // lazily-fetched corpus.
  const isLoading = navLoading || (tagFilterActive && !awesomeList && corpusLoading);

  if (isLoading) {
    return (
      <div className="space-y-6" aria-busy={true} aria-live="polite">
        {/* BUG-031 (run22): head swaps with the route immediately — default
            brand head while the catalog loads. */}
        <SEOHead />
        <div className="space-y-4">
          <Skeleton className="h-10 w-80" />
          <Skeleton className="h-6 w-96" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!nav || (tagFilterActive && !awesomeList && corpusError)) {
    // NB-055 (run18): the catalog error card previously surfaced raw internals
    // (the "/api/awesome-list (attempt 2/2)" fetch string). Show friendly,
    // non-technical copy plus a Retry action instead — no endpoint paths or
    // attempt counters leak into user-visible UI here.
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="display-h text-2xl mb-4">We couldn't load the catalog</h1>
          <p className="text-muted-foreground mb-6">
            We couldn't load the catalog. Please try again.
          </p>
          <Button onClick={() => window.location.reload()} data-testid="button-retry-catalog">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Home title/description counts MUST read the same flat tree arrays the
          server reads (data.resources.length / data.categories.length in
          og-middleware), NOT the filtered per-category sum (totalResourceCount) —
          otherwise the crawl-pass and render-pass <title> could disagree.
          Run23 R-06: nav.totalResources IS data.resources.length and
          nav.categories is the same unfiltered array, so parity holds. */}
      <SEOHead
        title={homeSeoTitle(nav.totalResources)}
        description={homeSeoDescription(nav.totalResources, nav.categories.length)}
      />

      <div className="space-y-3 pt-2 sm:pt-4">
        <h1 className="display-h text-[var(--text)] text-3xl sm:text-4xl">
          Awesome Video Resources
        </h1>
        <p className="text-sm sm:text-base text-[color:var(--text-2)] max-w-3xl">
          {/* BUG-027 (run14): with a tag filter active BOTH numbers reflect the
              filter — mixing a filtered category count with the global resource
              total read as nonsense ("7 categories with 2,140 resources"). */}
          {selectedTags.length > 0
            ? `Showing ${filteredCategories.reduce((sum, c) => sum + c.displayCount, 0).toLocaleString()} matching resource${filteredCategories.reduce((sum, c) => sum + c.displayCount, 0) === 1 ? "" : "s"} across ${filteredCategories.length} categor${filteredCategories.length === 1 ? "y" : "ies"}.`
            : `Explore ${filteredCategories.length} categories with ${totalResourceCount.toLocaleString()} curated resources.`}
        </p>
      </div>

      <AdvancedFilter
        selectedTags={selectedTags}
        sortBy={sortBy}
        availableTags={availableTags}
        onTagsChange={setSelectedTags}
        onSortChange={handleSortChange}
      />

      {filteredCategories.length === 0 ? (
        <div
          className="border border-[var(--border)] rounded-[var(--radius)] bg-[var(--surface)] p-8 text-center"
          data-testid="empty-categories"
        >
          <p className="text-sm text-[color:var(--text-2)] mb-3">
            No categories match the selected tags.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedTags([])}
            data-testid="button-clear-filters"
          >
            Clear filters
          </Button>
        </div>
      ) : (
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
        data-testid="list-categories"
      >
        {filteredCategories.map((category) => {
          const Icon = categoryIcons[category.name] || FileText;
          const totalCount = category.displayCount;
          // Run23 R-06: teaser comes from the nav payload (default path) or
          // the corpus (tag-filter path) — same {title, description} shape.
          const teaser = category.teaser;
          // R2-M23: truncate on a word boundary so cards never end mid-word
          // like "faster tha...".
          const truncateAtWord = (text: string, max: number) => {
            if (text.length <= max) return text;
            const cut = text.substring(0, max);
            const lastSpace = cut.lastIndexOf(" ");
            return `${(lastSpace > max * 0.5 ? cut.substring(0, lastSpace) : cut).replace(/[\s.,;:!?]+$/, "")}…`;
          };
          const description = teaser?.description
            ? truncateAtWord(teaser.description, 90)
            : "";

          return (
            <TaxonomyCard
              key={category.slug}
              // BUG-025 (run14): active tag filter survives the drill-down —
              // Category reads ?tags= on mount, so the chip journey ends on a
              // tag-filtered resource list instead of silently unfiltering.
              href={`/category/${category.slug}${selectedTags.length > 0 ? `?tags=${encodeURIComponent(selectedTags.join(","))}` : ""}`}
              name={category.name}
              count={totalCount}
              icon={Icon}
              ariaLabel={`View ${category.name} category with ${totalCount} resources`}
              linkTestId={`link-category-${category.slug}`}
              countTestId={`badge-count-${category.slug}`}
              extra={
                // Run19 BUG-016: the teaser is one resource's blurb, not a
                // category description — label it so it can't read as
                // category copy.
                description && teaser ? (
                  <CardDescription
                    className="line-clamp-2 text-xs"
                    data-testid={`text-category-teaser-${category.slug}`}
                  >
                    <span className="font-medium text-foreground/70">
                      Featured: {teaser.title} —
                    </span>{" "}
                    {description}
                  </CardDescription>
                ) : undefined
              }
            />
          );
        })}
      </div>
      )}

      <div className="mt-8 sm:mt-12">
        <div className="mb-4 sm:mb-6 space-y-2">
          <Link
            href="/recommendations"
            className="flex items-center gap-2 sm:gap-3 no-underline text-inherit hover:text-[var(--accent)] transition-colors w-fit"
            data-testid="link-recommendations-heading"
          >
            <Sparkles className="h-6 w-6 text-[var(--accent)] shrink-0" />
            <h2 className="font-sans font-bold text-2xl sm:text-3xl tracking-tight">
              Personalized Recommendations
            </h2>
          </Link>
          <p className="text-sm sm:text-base text-[color:var(--text-2)]">
            Get personalized resource recommendations based on your interests and learning goals.
          </p>
        </div>

        {isAuthenticated ? (
          // Run23 R-06: no corpus prop — the panel renders each card from the
          // full Resource object already embedded in the /api/recommendations
          // response (rec.resource), so Home never needs the 3.1MB corpus
          // for recommendations.
          <AIRecommendationsPanel showHeader={false} />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LogIn className="h-5 w-5" />
                Login to See Personalized Recommendations
              </CardTitle>
              {/* Run17 BUG-045: honest copy — quick recommendations work without
                  an account, so say so instead of implying a hard login gate. */}
              <CardDescription>
                Sign in for AI-powered recommendations tailored to your skill level and interests — or browse quick recommendations below, no account needed
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <Link href="/login">
                <Button className="w-full sm:w-auto">
                  <LogIn className="mr-2 h-4 w-4" />
                  Login to Get Started
                </Button>
              </Link>
              <Link href="/recommendations">
                <Button variant="outline" className="w-full sm:w-auto" data-testid="button-browse-recommendations">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Browse recommendations
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

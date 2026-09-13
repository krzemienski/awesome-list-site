import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Link, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Category, Resource, Subcategory } from "@/types/awesome-list";
import {
  fetchKindCounts,
  STRIP_KINDS,
  type AwesomeListNav,
  type AwesomeListNavNode,
  type ResourceKindCounts,
} from "@/lib/static-data";
import {
  resolveResourceKindFrom,
  type ResourceKind,
} from "@shared/resourceKinds";
import SEOHead from "@/components/layout/SEOHead";
import { useToast } from "@/hooks/use-toast";
import { homeSeoTitle, homeSeoDescription } from "@shared/seo-templates";
import { useAuth } from "@/hooks/useAuth";
import { normalizeTag, parseTagsParam } from "@/lib/tags";
import { writeFilterParams, usePopstateParams } from "@/lib/url-filter-state";
import { processAwesomeListData } from "@/lib/parser";
import { fetchStaticAwesomeList } from "@/lib/static-data";
import { useLearningPreferences } from "@/hooks/use-learning-preferences";
import { DEFAULT_LEARNING_PREFERENCES } from "@shared/onboarding-values";
import { useHomeLayout } from "@/components/home/use-home-layout";
import HomePresentation, {
  type HomeCategoryView,
  type HomeStats,
} from "@/components/home/HomePresentation";
import "@/styles/pages/home.css";

// Account-only home features remain available in an explicit account context
// (?context=account or ?account=1). Keeping these chunks and their UI out of the
// default index preserves the canonical reference-book geometry for anonymous
// and signed-in visitors alike.
const AIRecommendationsPanel = lazy(
  () => import("@/components/ui/ai-recommendations-panel"),
);
const ContinueLearningPreview = lazy(
  () => import("@/components/learning/ContinueLearningPreview"),
);
const AdvancedFilter = lazy(() => import("@/components/ui/advanced-filter"));

function AccountFeatureFallback({ label }: { label: string }) {
  return (
    <div
      className="h-28 animate-pulse border border-[var(--border)] bg-[var(--surface)]"
      aria-busy="true"
      aria-label={label}
      data-testid="home-account-feature-skeleton"
    />
  );
}

function FilterControlsFallback() {
  return (
    <div
      className="flex w-full flex-wrap gap-2"
      aria-busy="true"
      aria-label="Loading filter controls"
      data-testid="filter-controls-skeleton"
    >
      <div className="h-11 w-36 animate-pulse bg-muted" />
      <div className="h-11 w-full animate-pulse bg-muted sm:w-[180px]" />
    </div>
  );
}

interface HomeProps {
  nav?: AwesomeListNav;
  navLoading: boolean;
}

interface HomeApiResource extends Resource {
  // Public /api/home currently exposes this additive convenience flag. The
  // featured list itself remains authoritative, so this is optional here.
  featured?: boolean;
}

interface HomeApiResponse {
  total: number;
  approvedThisWeek: number;
  featuredCount: number;
  recent: HomeApiResource[];
  featured: HomeApiResource[];
}

interface DisplayCategory {
  name: string;
  slug: string;
  count: number;
  teaser?: { title: string; description: string };
  subcategories: AwesomeListNavNode[];
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
  let total = node.resourceCount ?? 0;
  for (const sub of node.subcategories ?? []) total += navTotalCount(sub);
  for (const nested of node.subSubcategories ?? []) total += navTotalCount(nested);
  return total;
}

function countSubcategories(categories: AwesomeListNavNode[]): number {
  return categories.reduce(
    (total, category) => total + (category.subcategories?.length ?? 0),
    0,
  );
}

function countNestedGroups(categories: AwesomeListNavNode[]): number {
  return categories.reduce((total, category) => {
    const direct = category.subSubcategories?.length ?? 0;
    const nested = (category.subcategories ?? []).reduce(
      (subtotal, subcategory) => subtotal + (subcategory.subSubcategories?.length ?? 0),
      0,
    );
    return total + direct + nested;
  }, 0);
}

const categoryMarks: Record<string, string> = {
  "community-events": "◈",
  "encoding-codecs": "◇",
  "general-tools": "◆",
  "infrastructure-delivery": "▣",
  "intro-learning": "▤",
  "media-tools": "▥",
  "players-clients": "▶",
  "protocols-transport": "⟁",
  "standards-industry": "◉",
};

function categoryIcon(name: string, slug: string): string {
  return categoryMarks[slug] ?? name.slice(0, 1).toUpperCase() ?? "◆";
}

function getAllResources(category: Category): Resource[] {
  let all = [...(category.resources ?? [])];
  for (const subcategory of category.subcategories ?? []) {
    all = all.concat(subcategory.resources ?? []);
    for (const nested of subcategory.subSubcategories ?? []) {
      all = all.concat(nested.resources ?? []);
    }
  }
  return all;
}

function getAllSubcategoryResources(subcategory: Subcategory): Resource[] {
  let all = [...(subcategory.resources ?? [])];
  for (const nested of subcategory.subSubcategories ?? []) {
    all = all.concat(nested.resources ?? []);
  }
  return all;
}

function resourceMatchesTags(resource: Resource, selectedTags: string[]): boolean {
  const tags = (Array.isArray(resource.tags)
    ? resource.tags
    : Array.isArray(resource.metadata?.tags)
      ? resource.metadata.tags
      : []
  ).filter((tag): tag is string => typeof tag === "string").map(normalizeTag);
  const normalizedSelectedTags = selectedTags.map(normalizeTag);
  return normalizedSelectedTags.some((tag) => tags.includes(tag));
}

function resourceMatchesFilters(
  resource: Resource,
  selectedTags: string[],
  selectedKind: ResourceKind | null,
): boolean {
  const matchesTags =
    selectedTags.length === 0 || resourceMatchesTags(resource, selectedTags);
  const resolvedKind =
    resource.resolvedKind ??
    resolveResourceKindFrom({
      storedKind: resource.kind,
      tags: resource.tags ?? resource.metadata?.tags,
      taxonomy: [
        resource.category,
        resource.subcategory,
        resource.subSubcategory,
        ...(resource.metadata?.sourceCategories ?? []),
      ],
    }).kind;
  const matchesKind = selectedKind === null || resolvedKind === selectedKind;
  return matchesTags && matchesKind;
}

function truncateAtWord(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.substring(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.5 ? cut.substring(0, lastSpace) : cut).replace(/[\s.,;:!?]+$/, "")}…`;
}

function HomeSkeleton({
  layout,
  nav,
}: {
  layout: "index" | "curated";
  nav?: AwesomeListNav;
}) {
  const knownCategories = (nav?.categories ?? []).filter((category) =>
    isRealCategory(category.name),
  );
  const categorySkeletons =
    knownCategories.length > 0
      ? knownCategories
      : Array.from({ length: 9 }, () => undefined);

  return (
    <div className="home-page" aria-busy="true" aria-live="polite" data-testid="home-skeleton">
      <div className="home-meta-row">
        <div className="home-skeleton-line home-skeleton-eyebrow" />
        <div className="home-skeleton-kinds">
          {Array.from({ length: 5 }).map((_, index) => (
            <div className="home-skeleton-chip" key={index} />
          ))}
        </div>
      </div>
      <div className="home-stat-strip home-stat-strip-skeleton">
        {Array.from({ length: 4 }).map((_, index) => (
          <div className="home-stat-cell" key={index}>
            <div className="home-skeleton-line home-skeleton-stat-label" />
            <div className="home-skeleton-line home-skeleton-stat-value" />
            <div className="home-skeleton-line home-skeleton-stat-sub" />
          </div>
        ))}
      </div>
      {layout === "index" ? (
        <div className="home-index-grid home-index-grid-skeleton">
          <div className="home-category-grid">
            {categorySkeletons.map((category, index) => (
              <div className="home-category-section" key={category?.slug ?? index}>
                <div className="home-skeleton-line home-skeleton-category" />
                {(category?.subcategories ?? Array.from({ length: 3 }, () => undefined)).map(
                  (_, row) => (
                    <div className="home-skeleton-line home-skeleton-row" key={row} />
                  ),
                )}
              </div>
            ))}
          </div>
          <div className="home-skeleton-rail">
            <div className="home-skeleton-line home-skeleton-rail-heading" />
            {Array.from({ length: 5 }).map((_, index) => (
              <div className="home-skeleton-line home-skeleton-recent" key={index} />
            ))}
            <div className="home-skeleton-contribute" />
          </div>
        </div>
      ) : (
        <div className="home-curated-skeleton">
          <div className="home-skeleton-line home-skeleton-section-heading" />
          <div className="home-resource-grid">
            {Array.from({ length: 6 }).map((_, index) => (
              <div className="home-skeleton-resource-card" key={index}>
                <div className="home-skeleton-line home-skeleton-card-title" />
                <div className="home-skeleton-line home-skeleton-card-copy" />
                <div className="home-skeleton-line home-skeleton-card-copy short" />
              </div>
            ))}
          </div>
          <div className="home-skeleton-line home-skeleton-section-heading" />
          <div className="home-skeleton-recent-table">
            {Array.from({ length: 5 }).map((_, index) => (
              <div className="home-skeleton-line home-skeleton-recent" key={index} />
            ))}
          </div>
          <div className="home-skeleton-line home-skeleton-section-heading" />
          <div className="home-curated-category-grid">
            {categorySkeletons.map((category, index) => (
              <div className="home-skeleton-resource-card" key={category?.slug ?? index}>
                <div className="home-skeleton-line home-skeleton-card-title" />
                <div className="home-skeleton-line home-skeleton-card-copy short" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CatalogError({ onRetry, message }: { onRetry: () => void; message: string }) {
  return (
    <div className="home-error" role="alert">
      <h1 className="display-h">We couldn&apos;t load the catalog</h1>
      <p>{message}</p>
      <Button onClick={onRetry} data-testid="button-retry-catalog">
        Retry
      </Button>
    </div>
  );
}

function AccountFeatures({
  isAuthenticated,
  showOnboardingInvitation,
  preferences,
  saveLearningPreferences,
  dismissingPreferences,
}: {
  isAuthenticated: boolean;
  showOnboardingInvitation: boolean;
  preferences: ReturnType<typeof useLearningPreferences>["preferences"];
  saveLearningPreferences: ReturnType<typeof useLearningPreferences>["savePreferences"];
  dismissingPreferences: boolean;
}) {
  return (
    <div className="home-account-context" data-testid="home-account-context">
      {isAuthenticated ? (
        <Suspense
          fallback={<AccountFeatureFallback label="Loading your learning progress" />}
        >
          <ContinueLearningPreview />
        </Suspense>
      ) : null}

      {showOnboardingInvitation ? (
        <Card
          className="border-[var(--accent)] bg-[var(--surface-2)]"
          data-testid="card-onboarding-invitation"
        >
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="min-w-0">
              <p className="eyebrow">Optional · about two minutes</p>
              <h2 className="mt-1 font-sans text-lg font-semibold">
                Make personalized recommendations more relevant
              </h2>
              <p className="mt-1 text-sm text-[color:var(--text-2)]">
                Tell us what you want to learn. Browsing and public search stay
                available—and unchanged—whether you finish this or not.
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
              <Button asChild size="sm">
                <Link
                  href={`/onboarding?step=${preferences?.onboardingStep ?? 1}`}
                  data-testid="link-continue-onboarding"
                >
                  {preferences?.onboardingStatus === "in_progress"
                    ? "Continue setup"
                    : "Choose preferences"}
                </Link>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={dismissingPreferences}
                onClick={() =>
                  saveLearningPreferences({
                    preferredCategories:
                      preferences?.preferredCategories ??
                      DEFAULT_LEARNING_PREFERENCES.preferredCategories,
                    skillLevel:
                      preferences?.skillLevel ?? DEFAULT_LEARNING_PREFERENCES.skillLevel,
                    learningGoals:
                      preferences?.learningGoals ?? DEFAULT_LEARNING_PREFERENCES.learningGoals,
                    preferredResourceTypes:
                      preferences?.preferredResourceTypes ??
                      DEFAULT_LEARNING_PREFERENCES.preferredResourceTypes,
                    timeCommitment:
                      preferences?.timeCommitment ??
                      DEFAULT_LEARNING_PREFERENCES.timeCommitment,
                    onboardingStatus: "dismissed",
                    onboardingStep: preferences?.onboardingStep ?? 1,
                  })
                }
                data-testid="button-dismiss-onboarding-invitation"
              >
                Not now
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="home-account-recommendations">
        <div className="mb-4 space-y-2">
          <Link
            href="/recommendations"
            className="flex w-fit items-center gap-2 text-inherit no-underline transition-colors hover:text-[var(--accent)] sm:gap-3"
            data-testid="link-recommendations-heading"
          >
            <h2 className="font-sans text-2xl font-bold tracking-tight sm:text-3xl">
              Personalized Recommendations
            </h2>
          </Link>
          <p className="text-sm text-[color:var(--text-2)] sm:text-base">
            Get personalized resource recommendations based on your interests and learning goals.
          </p>
        </div>
        {isAuthenticated ? (
          <Suspense
            fallback={<AccountFeatureFallback label="Loading personalized recommendations" />}
          >
            <AIRecommendationsPanel showHeader={false} />
          </Suspense>
        ) : (
          <Card>
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-center">
              <Button asChild className="w-full sm:w-auto">
                <Link href="/sign-in">Login to Get Started</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full sm:w-auto"
                data-testid="button-browse-recommendations"
              >
                <Link href="/recommendations">Browse recommendations</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function Home({ nav, navLoading }: HomeProps) {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const { layout, isLoading: layoutLoading } = useHomeLayout();
  const {
    preferences,
    isLoading: preferencesLoading,
    savePreferences: saveLearningPreferences,
    isSaving: dismissingPreferences,
  } = useLearningPreferences();

  const search = useSearch();
  const currentParams = useMemo(() => new URLSearchParams(search), [search]);
  const accountContext =
    currentParams.get("context") === "account" || currentParams.get("account") === "1";
  const showOnboardingInvitation =
    accountContext &&
    isAuthenticated &&
    !preferencesLoading &&
    (!preferences ||
      preferences.onboardingStatus === "not_started" ||
      preferences.onboardingStatus === "in_progress");

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
      window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
    }
    // The welcome marker is intentionally consumed once, not on every state
    // update. This mirrors the established register-flow behavior.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [selectedTags, setSelectedTagsState] = useState<string[]>(() =>
    parseTagsParam(new URLSearchParams(window.location.search)),
  );
  const [emptyTagParamNotice, setEmptyTagParamNotice] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return (
      (params.has("tags") || params.has("tag")) &&
      parseTagsParam(params).length === 0
    );
  });
  const [selectedKind, setSelectedKindState] = useState<ResourceKind | null>(() => {
    if (typeof window === "undefined") return null;
    const rawKind = new URLSearchParams(window.location.search).get("kind");
    return rawKind && (STRIP_KINDS as readonly string[]).includes(rawKind)
      ? (rawKind as ResourceKind)
      : null;
  });

  const setSelectedTags = (next: string[]) => {
    setSelectedTagsState(next);
    writeFilterParams({ tags: next.length === 0 ? null : next.join(",") });
  };

  const VALID_SORTS = ["default", "name-asc", "name-desc", "count-desc", "count-asc"] as const;
  type HomeSort = (typeof VALID_SORTS)[number];
  const [sortBy, setSortBy] = useState<HomeSort>(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("sort");
    return fromUrl && (VALID_SORTS as readonly string[]).includes(fromUrl)
      ? (fromUrl as HomeSort)
      : "default";
  });

  const handleSortChange = (next: string) => {
    const safeNext = (VALID_SORTS as readonly string[]).includes(next)
      ? (next as HomeSort)
      : "default";
    setSortBy(safeNext);
    writeFilterParams({ sort: safeNext === "default" ? null : safeNext });
  };

  const handleKindChange = (next: ResourceKind | null) => {
    setSelectedKindState(next);
    writeFilterParams({ kind: next });
  };

  usePopstateParams((params) => {
    setSelectedTagsState(parseTagsParam(params));
    const kind = params.get("kind");
    setSelectedKindState(
      kind && (STRIP_KINDS as readonly string[]).includes(kind)
        ? (kind as ResourceKind)
        : null,
    );
    const sort = params.get("sort");
    setSortBy(
      sort && (VALID_SORTS as readonly string[]).includes(sort)
        ? (sort as HomeSort)
        : "default",
    );
  });

  const corpusFilterActive = selectedTags.length > 0 || selectedKind !== null;
  const {
    data: rawCorpus,
    isLoading: corpusLoading,
    error: corpusError,
  } = useQuery<unknown>({
    queryKey: ["awesome-list-data"],
    queryFn: fetchStaticAwesomeList,
    staleTime: 1000 * 60 * 60,
    enabled: corpusFilterActive,
  });
  const awesomeList = rawCorpus ? processAwesomeListData(rawCorpus) : undefined;

  const { data: tagsData } = useQuery<{
    total: number;
    tags: { tag: string; count: number }[];
  }>({
    queryKey: ["/api/tags"],
    staleTime: 1000 * 60 * 5,
  });

  const {
    data: homeData,
    isLoading: homeLoading,
    error: homeError,
    refetch: refetchHome,
  } = useQuery<HomeApiResponse>({
    queryKey: ["/api/home"],
    staleTime: 1000 * 60,
  });

  const {
    data: kindCounts,
    isLoading: kindCountsLoading,
    isError: kindCountsError,
  } = useQuery<ResourceKindCounts>({
    queryKey: ["/api/resources/kinds/counts"],
    queryFn: () => fetchKindCounts(),
    staleTime: 1000 * 60,
  });

  const navCategories = useMemo<DisplayCategory[]>(() => {
    if (!nav?.categories) return [];
    return nav.categories
      .filter((category) => isRealCategory(category.name) && navTotalCount(category) > 0)
      .map((category) => ({
        name: category.name,
        slug: category.slug ?? "",
        count: navTotalCount(category),
        teaser: category.teaser,
        subcategories: category.subcategories ?? [],
      }));
  }, [nav?.categories]);

  const corpusBaseCategories = useMemo(() => {
    if (!awesomeList?.categories) return [] as Category[];
    return awesomeList.categories.filter(
      (category) => isRealCategory(category.name) && getAllResources(category).length > 0,
    );
  }, [awesomeList?.categories]);

  const filteredCategories = useMemo<DisplayCategory[]>(() => {
    let categories: DisplayCategory[];
    if (!corpusFilterActive) {
      categories = [...navCategories];
    } else {
      categories = navCategories
        .map((navCategory) => {
          const corpusCategory = corpusBaseCategories.find(
            (category) =>
              category.slug === navCategory.slug || category.name === navCategory.name,
          );
          const count = corpusCategory
            ? getAllResources(corpusCategory).filter((resource) =>
                resourceMatchesFilters(resource, selectedTags, selectedKind),
              ).length
            : 0;
          return { ...navCategory, count };
        })
        .filter((category) => category.count > 0);
    }

    switch (sortBy) {
      case "name-asc":
        categories.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name-desc":
        categories.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "count-desc":
        categories.sort((a, b) => b.count - a.count);
        break;
      case "count-asc":
        categories.sort((a, b) => a.count - b.count);
        break;
    }
    return categories;
  }, [corpusFilterActive, navCategories, corpusBaseCategories, selectedTags, selectedKind, sortBy]);

  const categoriesForPresentation = useMemo<HomeCategoryView[]>(
    () =>
      filteredCategories.map((category) => {
        const corpusCategory = corpusBaseCategories.find(
          (candidate) =>
            candidate.slug === category.slug || candidate.name === category.name,
        );

        return {
          name: category.name,
          slug: category.slug,
          count: category.count,
          icon: categoryIcon(category.name, category.slug),
          description: category.teaser?.description,
          teaserTitle: category.teaser?.title,
          teaserDescription: category.teaser
            ? truncateAtWord(category.teaser.description, 110)
            : undefined,
          subcategories: category.subcategories.map((subcategory) => {
            const corpusSubcategory = corpusCategory?.subcategories.find(
              (candidate) =>
                candidate.slug === subcategory.slug || candidate.name === subcategory.name,
            );
            const matchingResources = corpusSubcategory
              ? getAllSubcategoryResources(corpusSubcategory).filter((resource) =>
                  resourceMatchesFilters(resource, selectedTags, selectedKind),
                )
              : [];
            const filteredNestedCount = corpusSubcategory
              ? (corpusSubcategory.subSubcategories ?? []).filter((nested) =>
                  (nested.resources ?? []).some((resource) =>
                    resourceMatchesFilters(resource, selectedTags, selectedKind),
                  ),
                ).length
              : 0;

            return {
              name: subcategory.name,
              slug: subcategory.slug ?? "",
              count: corpusFilterActive ? matchingResources.length : navTotalCount(subcategory),
              nestedCount: corpusFilterActive
                ? filteredNestedCount
                : (subcategory.subSubcategories?.length ?? 0) +
                  (subcategory.subcategories?.length ?? 0),
            };
          }),
        };
      }),
    [
      corpusBaseCategories,
      corpusFilterActive,
      filteredCategories,
      selectedKind,
      selectedTags,
    ],
  );

  const stats = useMemo<HomeStats>(() => {
    const realCategories = navCategories.length;
    const rawCategories = nav?.categories ?? [];
    return {
      total: homeData?.total ?? nav?.totalResources ?? 0,
      categories: realCategories,
      subcategories: countSubcategories(rawCategories),
      nestedGroups: countNestedGroups(rawCategories),
      featured: homeData?.featuredCount ?? homeData?.featured?.length ?? 0,
      approvedThisWeek: homeData?.approvedThisWeek ?? 0,
    };
  }, [homeData, nav?.categories, nav?.totalResources, navCategories.length]);

  const showFilters =
    selectedTags.length > 0 || sortBy !== "default" || currentParams.get("filters") === "1";
  const filters = showFilters ? (
    <Suspense fallback={<FilterControlsFallback />}>
      <AdvancedFilter
        selectedTags={selectedTags}
        sortBy={sortBy}
        availableTags={tagsData?.tags ?? []}
        onTagsChange={setSelectedTags}
        onSortChange={handleSortChange}
      />
    </Suspense>
  ) : null;

  const accountFeatures =
    accountContext ? (
      <AccountFeatures
        isAuthenticated={isAuthenticated}
        showOnboardingInvitation={showOnboardingInvitation}
        preferences={preferences}
        saveLearningPreferences={saveLearningPreferences}
        dismissingPreferences={dismissingPreferences}
      />
    ) : null;

  const isLoading =
    navLoading ||
    layoutLoading ||
    homeLoading ||
    (corpusFilterActive && !awesomeList && corpusLoading);

  if (isLoading) {
    return (
      <>
        <SEOHead />
        <HomeSkeleton layout={layout === "curated" ? "curated" : "index"} nav={nav} />
      </>
    );
  }

  if (!nav || homeError || (corpusFilterActive && !awesomeList && corpusError)) {
    const message = homeError
      ? "The home index is temporarily unavailable. Please try again."
      : "We couldn't load the catalog. Please try again.";
    return (
      <>
        <SEOHead />
        <CatalogError
          onRetry={() => {
            if (homeError) {
              void refetchHome();
            } else {
              window.location.reload();
            }
          }}
          message={message}
        />
      </>
    );
  }

  return (
    <>
      <SEOHead
        title={homeSeoTitle(nav.totalResources)}
        description={homeSeoDescription(nav.totalResources, nav.categories.length)}
      />
      <HomePresentation
        layout={layout === "curated" ? "curated" : "index"}
        categories={categoriesForPresentation}
        recent={homeData?.recent ?? []}
        featured={homeData?.featured ?? []}
        stats={stats}
        kindCounts={kindCounts}
        kindCountsLoading={kindCountsLoading}
        kindCountsError={kindCountsError}
        selectedKind={selectedKind}
        onKindChange={handleKindChange}
        selectedTags={selectedTags}
        onClearFilters={() => {
          setSelectedTags([]);
          setSelectedKindState(null);
          writeFilterParams({ kind: null });
        }}
        filters={filters}
        emptyTagParamNotice={
          emptyTagParamNotice && selectedTags.length === 0 ? (
            <div className="home-empty-tag-notice" role="status" data-testid="notice-empty-tag-param">
              <span>The tag filter in the link you followed was empty, so it was ignored.</span>
              <button
                type="button"
                className="underline underline-offset-2"
                onClick={() => setEmptyTagParamNotice(false)}
                data-testid="button-dismiss-empty-tag-param"
              >
                Dismiss
              </button>
            </div>
          ) : null
        }
        accountFeatures={accountFeatures}
      />
    </>
  );
}

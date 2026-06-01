import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { AwesomeList, Category, Resource } from "@/types/awesome-list";
import SEOHead from "@/components/layout/SEOHead";
import AIRecommendationsPanel from "@/components/ui/ai-recommendations-panel";
import AdvancedFilter from "@/components/ui/advanced-filter";
import { useAuth } from "@/hooks/useAuth";
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
} from "lucide-react";

interface HomeProps {
  awesomeList?: AwesomeList;
  isLoading: boolean;
}

const categoryIcons: { [key: string]: any } = {
  "Intro & Learning": FileText,
  "Protocols & Transport": Server,
  "Encoding & Codecs": Code,
  "Players & Clients": Play,
  "Media Tools": Settings,
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

export default function Home({ awesomeList, isLoading }: HomeProps) {
  const { user, isAuthenticated } = useAuth();

  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("default");

  const baseCategories = useMemo(() => {
    if (!awesomeList?.categories) return [];
    return awesomeList.categories.filter(
      (cat) =>
        getTotalResourceCount(cat) > 0 &&
        cat.name !== "Table of contents" &&
        !cat.name.startsWith("List of") &&
        !["Contributing", "License", "External Links", "Anti-features"].includes(cat.name)
    );
  }, [awesomeList?.categories]);

  const availableTags = useMemo(() => {
    const tagCounts: Record<string, number> = {};
    baseCategories.forEach((cat) => {
      const allRes = getAllResources(cat);
      allRes.forEach((r: any) => {
        const tags = r.tags || r.metadata?.tags || [];
        tags.forEach((tag: string) => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      });
    });
    return Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }, [baseCategories]);

  // Authoritative per-category approved-resource counts from the database,
  // keyed by category name. Used for the resting (no-tag-filter) card counts so
  // the landing page agrees with the category pages and the sidebar.
  const { data: dbCategories } = useQuery<Array<{ name: string; resourceCount: number }>>({
    queryKey: ["/api/categories"],
    staleTime: 1000 * 60 * 60,
  });

  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = {};
    (dbCategories || []).forEach((c) => { map[c.name] = c.resourceCount; });
    return map;
  }, [dbCategories]);

  const filteredCategories = useMemo(() => {
    let cats = baseCategories.map((cat) => {
      if (selectedTags.length === 0) {
        // Prefer the DB count; fall back to the client tree sum until it loads.
        const displayCount = categoryCounts[cat.name] ?? getTotalResourceCount(cat);
        return { ...cat, displayCount };
      }
      const allRes = getAllResources(cat);
      const matchCount = allRes.filter((r: any) => {
        const tags = r.tags || r.metadata?.tags || [];
        return selectedTags.some((t) => tags.includes(t));
      }).length;
      return { ...cat, displayCount: matchCount };
    });

    if (selectedTags.length > 0) {
      cats = cats.filter((c) => c.displayCount > 0);
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
  }, [baseCategories, selectedTags, sortBy]);

  // Authoritative resource total from the database (single source of truth).
  // The client-side tree sum under-counts because the static awesome-list tree
  // does not carry every approved DB resource; the resources table does.
  const { data: resourceMeta } = useQuery<{ total: number }>({
    queryKey: ["/api/resources?limit=1"],
    staleTime: 1000 * 60 * 60,
  });

  const clientTreeCount = useMemo(() => {
    return baseCategories.reduce((sum, cat) => sum + getTotalResourceCount(cat), 0);
  }, [baseCategories]);

  // Prefer the DB total; fall back to the client tree sum until it loads.
  const totalResourceCount = resourceMeta?.total ?? clientTreeCount;

  if (isLoading) {
    return (
      <div className="space-y-6" aria-busy={true} aria-live="polite">
        <SEOHead title="Loading - Awesome Video Resources" />
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

  if (!awesomeList) {
    return (
      <div className="space-y-6">
        <SEOHead title="Error - Awesome Video Resources" />
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Error Loading Resources</h1>
          <p className="text-muted-foreground">Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SEOHead
        title="Awesome Video Resources - 2,000+ Curated Development Tools"
        description="Discover 2,000+ curated video development resources including codecs, players, tools, and libraries. Find the perfect solution for your video project."
      />

      <div className="space-y-3 pt-2 sm:pt-4">
        <h1 className="font-sans font-bold tracking-tight text-[var(--text)] text-3xl sm:text-4xl">
          Awesome Video Resources
        </h1>
        <p className="text-sm sm:text-base text-[color:var(--text-2)] max-w-3xl">
          Explore {filteredCategories.length} categories with {totalResourceCount} curated resources.
        </p>
      </div>

      <AdvancedFilter
        selectedTags={selectedTags}
        sortBy={sortBy}
        availableTags={availableTags}
        onTagsChange={setSelectedTags}
        onSortChange={setSortBy}
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
          const firstResource = category.resources[0];
          const description = firstResource?.description
            ? firstResource.description.length > 90
              ? `${firstResource.description.substring(0, 90)}...`
              : firstResource.description
            : "";

          return (
            <Link
              key={category.slug}
              href={`/category/${category.slug}`}
              aria-label={`View ${category.name} category with ${totalCount} resources`}
              data-testid={`link-category-${category.slug}`}
              className="block outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] rounded-[var(--radius)]"
            >
              <Card className="h-full cursor-pointer">
                <CardHeader className="p-4 space-y-1.5">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <Icon className="h-5 w-5 text-[var(--accent)] shrink-0" />
                    <Badge
                      variant="secondary"
                      className="tabular-nums shrink-0"
                      data-testid={`badge-count-${category.slug}`}
                    >
                      {totalCount}
                    </Badge>
                  </div>
                  <CardTitle className="font-sans font-semibold text-base tracking-tight">
                    {category.name}
                  </CardTitle>
                  {description && (
                    <CardDescription className="line-clamp-2 text-xs">
                      {description}
                    </CardDescription>
                  )}
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>
      )}

      <div className="mt-8 sm:mt-12">
        <div className="mb-4 sm:mb-6 space-y-2">
          <div className="flex items-center gap-2 sm:gap-3">
            <Sparkles className="h-6 w-6 text-[var(--accent)] shrink-0" />
            <h2 className="font-sans font-bold text-2xl sm:text-3xl tracking-tight">
              AI-Powered Recommendations
            </h2>
          </div>
          <p className="text-sm sm:text-base text-[color:var(--text-2)]">
            Get personalized resource recommendations based on your interests and learning goals.
          </p>
        </div>

        {isAuthenticated ? (
          <AIRecommendationsPanel resources={awesomeList.resources} />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LogIn className="h-5 w-5" />
                Login to See Personalized Recommendations
              </CardTitle>
              <CardDescription>
                Sign in to unlock AI-powered recommendations tailored to your skill level and interests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/login">
                <Button className="w-full sm:w-auto">
                  <LogIn className="mr-2 h-4 w-4" />
                  Login to Get Started
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

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

  const filteredCategories = useMemo(() => {
    let cats = baseCategories.map((cat) => {
      if (selectedTags.length === 0) {
        return { ...cat, displayCount: getTotalResourceCount(cat) };
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

  const totalResourceCount = useMemo(() => {
    return baseCategories.reduce((sum, cat) => sum + getTotalResourceCount(cat), 0);
  }, [baseCategories]);

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

      <div className="space-y-4 sm:space-y-6 pt-2 sm:pt-6">
        <div className="eyebrow flex items-center gap-3">
          <span aria-hidden="true" className="text-[var(--accent)]">──</span>
          <span>Indexed</span>
          <span aria-hidden="true" className="text-[var(--text-2)]">·</span>
          <span>Atlas</span>
        </div>
        <h1 className="font-display italic font-medium tracking-tight text-[var(--text)] text-[clamp(3rem,11vw,8rem)] leading-[0.92]">
          <span className="block">awesome</span>
          <span className="block">.video</span>
        </h1>
        <p className="text-sm sm:text-base text-[color:var(--text-2)] max-w-2xl pt-1">
          Explore {filteredCategories.length} categories with {totalResourceCount} curated resources for engineers building the modern video stack.
        </p>
      </div>

      <AdvancedFilter
        selectedTags={selectedTags}
        sortBy={sortBy}
        availableTags={availableTags}
        onTagsChange={setSelectedTags}
        onSortChange={setSortBy}
      />

      <ol
        className="border-t border-[var(--border)] mt-2"
        data-testid="list-categories"
      >
        {filteredCategories.map((category, idx) => {
          const Icon = categoryIcons[category.name] || FileText;
          const totalCount = category.displayCount;
          const firstResource = category.resources[0];
          const description = firstResource?.description
            ? firstResource.description.length > 110
              ? `${firstResource.description.substring(0, 110)}...`
              : firstResource.description
            : "";
          const isHot = idx === 0;

          return (
            <li
              key={category.slug}
              className="border-b border-[var(--border)] group"
            >
              <Link
                href={`/category/${category.slug}`}
                aria-label={`View ${category.name} category with ${totalCount} resources`}
                data-testid={`link-category-${category.slug}`}
                className="flex items-baseline gap-4 sm:gap-6 py-5 sm:py-6 px-1 sm:px-2 transition-colors duration-[var(--motion-base)] ease-[var(--motion-ease)] hover:bg-[var(--surface)] rounded-[var(--radius-sm)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] focus-visible:bg-[var(--surface)]"
              >
                <span
                  aria-hidden="true"
                  className="font-mono text-xs sm:text-sm tabular-nums text-[var(--text-2)] tracking-wider shrink-0 w-8 sm:w-10"
                >
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <Icon className="hidden sm:block h-5 w-5 shrink-0 text-[var(--text-2)] self-center transition-colors group-hover:text-[var(--accent)]" />
                <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-baseline sm:gap-6">
                  <span className="font-display font-medium tracking-tight text-xl sm:text-2xl text-[var(--text)] truncate">
                    {category.name}
                  </span>
                  {description && (
                    <span className="text-xs sm:text-sm text-[var(--text-2)] line-clamp-1 sm:flex-1 mt-1 sm:mt-0">
                      {description}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                  <span
                    className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-2)] tabular-nums"
                    data-testid={`badge-count-${category.slug}`}
                  >
                    {totalCount}
                  </span>
                  {isHot && (
                    <span
                      aria-hidden="true"
                      className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] shrink-0"
                    />
                  )}
                </div>
              </Link>
            </li>
          );
        })}
      </ol>

      <div className="mt-8 sm:mt-12">
        <div className="mb-4 sm:mb-6 space-y-2">
          <div className="eyebrow">// Personalized</div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-[var(--accent)] shrink-0" />
            <h2 className="font-display font-medium text-2xl sm:text-3xl tracking-tight">
              <em className="not-italic font-display italic text-[var(--accent)]">AI</em>-Powered Recommendations
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

import { useMemo } from "react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AwesomeList, Category } from "@/types/awesome-list";
import SEOHead from "@/components/layout/SEOHead";
import { getCategoryIcon } from "@/config/navigation-icons";
import { getCategorySlug } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

interface CategoriesProps {
  awesomeList?: AwesomeList;
  isLoading: boolean;
}

function getTotalResourceCount(item: any): number {
  let total = item.resources?.length || 0;
  if (item.subcategories) {
    total += item.subcategories.reduce(
      (sum: number, sub: any) => sum + getTotalResourceCount(sub),
      0,
    );
  }
  if (item.subSubcategories) {
    total += item.subSubcategories.reduce(
      (sum: number, ss: any) => sum + getTotalResourceCount(ss),
      0,
    );
  }
  return total;
}

export default function Categories({ awesomeList, isLoading }: CategoriesProps) {
  const baseCategories = useMemo(() => {
    if (!awesomeList?.categories) return [] as Category[];
    return awesomeList.categories.filter(
      (cat) =>
        getTotalResourceCount(cat) > 0 &&
        cat.name !== "Table of contents" &&
        !cat.name.startsWith("List of") &&
        !["Contributing", "License", "External Links", "Anti-features"].includes(
          cat.name,
        ),
    );
  }, [awesomeList?.categories]);

  // Counts come from the single deduplicated tree (same source as the sidebar,
  // header, category pages, and SSR) so every surface agrees.
  const categories = useMemo(
    () =>
      baseCategories
        .map((cat) => ({
          ...cat,
          displayCount: getTotalResourceCount(cat),
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [baseCategories],
  );

  return (
    <div className="max-w-6xl mx-auto px-0 sm:px-4 space-y-6">
      <SEOHead
        title="All Categories"
        description="Browse all categories of curated video development resources on Awesome Video — players, encoders, codecs, streaming, AI, tools, and more."
      />

      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">All Categories</h1>
        <p className="text-muted-foreground">
          Browse every category of curated video development resources.
        </p>
      </header>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full bg-[var(--surface-3)]" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <p className="text-muted-foreground">No categories available yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => {
            const Icon = getCategoryIcon(cat.name);
            const slug = cat.slug || getCategorySlug(cat.name);
            return (
              <Link
                key={cat.name}
                href={`/category/${slug}`}
                data-testid={`category-card-${slug}`}
              >
                <Card className="h-full hover:border-[var(--accent)] transition-colors cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="flex items-center justify-center shrink-0"
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background:
                            "color-mix(in srgb, var(--accent) 12%, transparent)",
                          color: "var(--accent)",
                        }}
                      >
                        <Icon className="size-4" />
                      </span>
                      <span className="text-xs font-mono tabular-nums text-muted-foreground">
                        {cat.displayCount.toLocaleString()}
                      </span>
                    </div>
                    <CardTitle className="text-base flex items-center justify-between gap-2 mt-2">
                      <span className="truncate">{cat.name}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </CardTitle>
                    <CardDescription>
                      {cat.displayCount.toLocaleString()} resources
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AwesomeList, Category } from "@/types/awesome-list";
import SEOHead from "@/components/layout/SEOHead";
import { getCategoryIcon } from "@/config/navigation-icons";
import { getCategorySlug } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

interface CategoriesProps {
  awesomeList?: AwesomeList;
  isLoading: boolean;
}

// BUG-015 (run18): the sort control now writes the exact slug it reads back on
// load (symmetric round-trip), so a fresh /categories?sort=<value> restores the
// matching option instead of silently falling back to Default. We also accept
// the human "most-resources"/"fewest-resources" aliases the audit linked to.
const SORT_OPTIONS = [
  { value: "name-asc", label: "Name (A–Z)" },
  { value: "name-desc", label: "Name (Z–A)" },
  { value: "count-desc", label: "Most resources" },
  { value: "count-asc", label: "Fewest resources" },
] as const;

type SortValue = (typeof SORT_OPTIONS)[number]["value"];

const SORT_ALIASES: Record<string, SortValue> = {
  "most-resources": "count-desc",
  "most": "count-desc",
  "fewest-resources": "count-asc",
  "fewest": "count-asc",
  "a-z": "name-asc",
  "z-a": "name-desc",
};

function normalizeSort(raw: string | null): SortValue {
  if (!raw) return "name-asc";
  const lower = raw.toLowerCase();
  if (SORT_OPTIONS.some((o) => o.value === lower)) return lower as SortValue;
  return SORT_ALIASES[lower] ?? "name-asc";
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

  // BUG-015 (run18): seed sort from the URL (with alias support) so a fresh
  // deep-link restores the chosen option.
  const [sort, setSort] = useState<SortValue>(() =>
    normalizeSort(
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("sort")
        : null,
    ),
  );

  const handleSortChange = (next: string) => {
    const value = normalizeSort(next);
    setSort(value);
    // BUG-015 (run18): write back the exact canonical slug we read, so the
    // Select stays symmetric across reloads. Default (name-asc) drops the param.
    const params = new URLSearchParams(window.location.search);
    if (value === "name-asc") params.delete("sort");
    else params.set("sort", value);
    const qs = params.toString();
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${qs ? `?${qs}` : ""}`,
    );
  };

  // Counts come from the single deduplicated tree (same source as the sidebar,
  // header, category pages, and SSR) so every surface agrees.
  const categories = useMemo(() => {
    const withCounts = baseCategories.map((cat) => ({
      ...cat,
      displayCount: getTotalResourceCount(cat),
    }));
    const sorted = [...withCounts];
    switch (sort) {
      case "name-desc":
        sorted.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "count-desc":
        sorted.sort(
          (a, b) => b.displayCount - a.displayCount || a.name.localeCompare(b.name),
        );
        break;
      case "count-asc":
        sorted.sort(
          (a, b) => a.displayCount - b.displayCount || a.name.localeCompare(b.name),
        );
        break;
      case "name-asc":
      default:
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }
    return sorted;
  }, [baseCategories, sort]);

  return (
    <div className="max-w-6xl mx-auto px-0 sm:px-4 space-y-6">
      <SEOHead
        title="All Categories"
        description="Browse all categories of curated video development resources on Awesome Video — players, encoders, codecs, streaming, AI, tools, and more."
      />

      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">All Categories</h1>
          <p className="text-muted-foreground">
            Browse every category of curated video development resources.
          </p>
        </div>
        {/* BUG-015 (run18): sort control — value is the same canonical slug that
            handleSortChange writes to ?sort=, so the round-trip is symmetric. */}
        <div className="flex items-center gap-2 shrink-0">
          <label
            htmlFor="categories-sort"
            className="text-sm text-muted-foreground whitespace-nowrap"
          >
            Sort by
          </label>
          <Select value={sort} onValueChange={handleSortChange}>
            <SelectTrigger
              id="categories-sort"
              className="w-[180px]"
              data-testid="select-sort"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  data-testid={`select-sort-${option.value}`}
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
                      {/* NB-037 (run18): the bare count badge here duplicated the
                          labelled "N resources" caption below — dropped it and
                          kept the clearer captioned count. */}
                    </div>
                    {/* NB-017 (run18): allow long category names to wrap to two
                        lines instead of truncating mid-word at tablet widths;
                        reserve two lines so cards stay aligned in the grid. */}
                    <CardTitle className="text-base flex items-start justify-between gap-2 mt-2">
                      <span className="line-clamp-2 min-h-[2.5em] leading-tight">{cat.name}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
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

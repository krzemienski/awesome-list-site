import { useState, useMemo } from "react";
import { Search, Filter, Tag, Folder, ExternalLink, Star, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useLocation } from "wouter";
import { Category, Resource } from "@/types/awesome-list";
import { cn } from "@/lib/utils";

interface CategoryExplorerProps {
  categories: Category[];
  resources: Resource[];
  className?: string;
}

// BUG-001 (July 2026 audit): the tree nests most resources under
// category.subcategories[].resources (and their subSubcategories), so
// `category.resources.length` is the DIRECT-only count and wildly understates
// totals. Same recursive helper as Home.tsx / AppSidebar.tsx / Categories.tsx —
// card counts here must agree with the sidebar and home cards.
function getTotalResourceCount(item: {
  resources?: Resource[];
  subcategories?: unknown[];
  subSubcategories?: unknown[];
}): number {
  let total = item.resources?.length || 0;
  if (item.subcategories) {
    total += (item.subcategories as any[]).reduce(
      (sum: number, sub: any) => sum + getTotalResourceCount(sub),
      0,
    );
  }
  if (item.subSubcategories) {
    total += (item.subSubcategories as any[]).reduce(
      (sum: number, ss: any) => sum + getTotalResourceCount(ss),
      0,
    );
  }
  return total;
}

// Flatten every resource in a category (direct + subcategories + sub-subs) so
// tag stats reflect the whole category, not just direct resources.
function getAllCategoryResources(category: Category): Resource[] {
  const all: Resource[] = [...(category.resources || [])];
  for (const sub of category.subcategories || []) {
    all.push(...(sub.resources || []));
    for (const ss of sub.subSubcategories || []) {
      all.push(...(ss.resources || []));
    }
  }
  return all;
}

// Run16 BUG-023: "Activity" used to alias Resource Count (identical order).
// Real activity = the most recent createdAt/updatedAt across ALL nested
// resources, so recently-touched categories rank first regardless of size.
function getLatestActivityTs(category: Category): number {
  let latest = 0;
  for (const r of getAllCategoryResources(category)) {
    const raw = r.updatedAt || r.createdAt;
    if (!raw) continue;
    const ts = Date.parse(raw);
    if (!Number.isNaN(ts) && ts > latest) latest = ts;
  }
  return latest;
}

const VALID_EXPLORER_SORTS = ["name", "count", "activity"];

// Run16 BUG-060: /advanced explorer search + sort deep-link via ?q= & ?sort=
// (alongside the existing ?tab= sync in Advanced.tsx). replaceState is used
// directly because wouter's useLocation() is path-only; other params (tab=)
// are preserved.
function syncExplorerParam(key: string, value: string | null) {
  const params = new URLSearchParams(window.location.search);
  if (value) params.set(key, value);
  else params.delete(key);
  const qs = params.toString();
  window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
}

export default function CategoryExplorer({ categories, resources, className }: CategoryExplorerProps) {
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState(
    () => new URLSearchParams(window.location.search).get("q") || "",
  );
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState(() => {
    const s = new URLSearchParams(window.location.search).get("sort");
    return s && VALID_EXPLORER_SORTS.includes(s) ? s : "name";
  });
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    syncExplorerParam("q", value || null);
  };
  const handleSortChange = (value: string) => {
    setSortBy(value);
    syncExplorerParam("sort", value === "name" ? null : value);
  };
  const [showSubcategories, setShowSubcategories] = useState(true);
  // Run16 BUG-024: the toggle used to gate only a per-card chevron whose
  // content ALSO required manual expansion, so checking/unchecking produced
  // zero visible change. Now the toggle shows subcategory lists on every card
  // by default; the per-card chevron collapses individual cards.
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  // Extract all unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    resources.forEach(resource => {
      resource.tags?.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [resources]);

  // Filter and sort categories
  const filteredCategories = useMemo(() => {
    let filtered = categories.filter(category => {
      // BUG-001 follow-through: filter across ALL nested resources, not just
      // direct ones, so categories whose resources live in subcategories still
      // match search terms and tag filters.
      const allResources = getAllCategoryResources(category);
      const matchesSearch = searchTerm === "" || 
        category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        allResources.some(resource => 
          resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          resource.description.toLowerCase().includes(searchTerm.toLowerCase())
        );

      const matchesTags = selectedTags.length === 0 ||
        allResources.some(resource =>
          resource.tags?.some(tag => selectedTags.includes(tag))
        );

      return matchesSearch && matchesTags;
    });

    // Sort categories
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "count":
          return getTotalResourceCount(b) - getTotalResourceCount(a);
        case "activity": {
          // Run16 BUG-023: most recently updated/added first; ties fall back
          // to name so the order is stable and visibly distinct from count.
          const diff = getLatestActivityTs(b) - getLatestActivityTs(a);
          return diff !== 0 ? diff : a.name.localeCompare(b.name);
        }
        default:
          return 0;
      }
    });

    return filtered;
  }, [categories, searchTerm, selectedTags, sortBy]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const toggleCategoryExpansion = (categoryName: string) => {
    setCollapsedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryName)) {
        newSet.delete(categoryName);
      } else {
        newSet.add(categoryName);
      }
      return newSet;
    });
  };

  const getCategoryStats = (category: Category) => {
    const totalResources = getTotalResourceCount(category);
    const subcategoryCount = category.subcategories?.length || 0;
    const uniqueTags = new Set(
      getAllCategoryResources(category).flatMap((r) => ((r as any).metadata?.tags as string[] | undefined) ?? r.tags ?? [])
    ).size;

    return { totalResources, subcategoryCount, uniqueTags };
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Search and Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Folder className="h-5 w-5" />
            Category Explorer
          </CardTitle>
          <CardDescription>
            Discover and explore {categories.length} categories with {resources.length} total resources
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search categories and resources..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Controls Row */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Sort:</span>
              <Select value={sortBy} onValueChange={handleSortChange}>
                <SelectTrigger className="w-32" aria-label="Sort categories">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="count">Resource Count</SelectItem>
                  <SelectItem value="activity">Activity</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="subcategories"
                aria-label="Show subcategories"
                checked={showSubcategories}
                onCheckedChange={(checked) => setShowSubcategories(checked === true)}
              />
              <label htmlFor="subcategories" className="text-sm text-muted-foreground">
                Show subcategories
              </label>
            </div>
          </div>

          {/* Tag Filter */}
          {allTags.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Filter by tags:</span>
              </div>
              <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                {allTags.slice(0, 20).map(tag => (
                  <Badge
                    key={tag}
                    variant={selectedTags.includes(tag) ? "default" : "outline"}
                    className="cursor-pointer hover:bg-accent transition-colors text-xs"
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
                {allTags.length > 20 && (
                  <span className="text-xs text-muted-foreground px-2 py-1">
                    +{allTags.length - 20} more tags
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Active Filters */}
          {(searchTerm || selectedTags.length > 0) && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Active filters:</span>
              {searchTerm && (
                <Badge variant="secondary" className="text-xs">
                  Search: "{searchTerm}"
                </Badge>
              )}
              {selectedTags.map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  Tag: {tag}
                </Badge>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  handleSearchChange("");
                  setSelectedTags([]);
                }}
                className="h-6 px-2 text-xs"
              >
                Clear all
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCategories.map(category => {
          const stats = getCategoryStats(category);
          // Run16 BUG-024: expanded by default while the toggle is on.
          const isExpanded = showSubcategories && !collapsedCategories.has(category.name);

          return (
            <Card key={category.name} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  {/* BUG-015 (run14): min-w-0 + flex-wrap + nowrap spans — at
                      768px the unwrappable stat row overflowed the card edge
                      and bled into the neighbor ("202"+"371" → "20371"). */}
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg flex items-center gap-2 min-w-0">
                      {/* BUG-015 (run14): whitespace-normal + min-w-0 — the
                          Button primitive defaults to nowrap, so long category
                          names pushed the trailing icon past the card edge at
                          narrow widths instead of wrapping. */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/category/${category.slug}`)}
                        // BUG-048 (run18): min-h keeps the inline title link a ≥24px tap target.
                        className="p-0 h-auto min-h-[24px] font-semibold text-left hover:text-primary whitespace-normal break-words min-w-0"
                      >
                        {category.name}
                      </Button>
                      <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                    </CardTitle>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                      <span className="text-sm text-muted-foreground whitespace-nowrap">
                        {stats.totalResources} resources
                      </span>
                      {stats.subcategoryCount > 0 && (
                        <span className="text-sm text-muted-foreground whitespace-nowrap">
                          {stats.subcategoryCount} subcategories
                        </span>
                      )}
                      <span className="text-sm text-muted-foreground whitespace-nowrap">
                        {stats.uniqueTags} tags
                      </span>
                    </div>
                  </div>
                  
                  {/* Run16 BUG-024: plain button — the old CollapsibleTrigger
                      lived in a Collapsible DISCONNECTED from the content one,
                      so it never drove anything but component-local state. */}
                  {showSubcategories && category.subcategories?.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleCategoryExpansion(category.name)}
                      aria-label={isExpanded ? `Collapse ${category.name}` : `Expand ${category.name}`}
                      aria-expanded={isExpanded}
                      className="h-8 w-8 p-0 min-h-[44px] min-w-[44px]"
                    >
                      <ChevronRight className={cn(
                        "h-4 w-4 transform transition-transform",
                        isExpanded ? "rotate-90" : "rotate-0"
                      )} />
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                {/* Quick preview of top resources — pulled from the WHOLE
                    category (direct + nested) so the "+N more" figure agrees
                    with the corrected card total (BUG-001). */}
                <div className="space-y-2 mb-3">
                  {getAllCategoryResources(category).slice(0, 3).map(resource => (
                    <div key={resource.id} className="text-sm">
                      <a
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-foreground hover:text-primary transition-colors font-medium"
                      >
                        {resource.title}
                      </a>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {resource.description}
                      </p>
                    </div>
                  ))}
                  {stats.totalResources > 3 && (
                    <p className="text-xs text-muted-foreground">
                      +{stats.totalResources - 3} more resources
                    </p>
                  )}
                </div>

                {/* Subcategories */}
                {showSubcategories && category.subcategories?.length > 0 && (
                  <Collapsible open={isExpanded}>
                    <CollapsibleContent>
                      <div className="space-y-2 pt-3 border-t">
                        <h4 className="text-sm font-medium text-muted-foreground">Subcategories:</h4>
                        <div className="flex flex-wrap gap-1">
                          {category.subcategories.map(subcategory => (
                            <Button
                              key={subcategory.name}
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/subcategory/${subcategory.slug}`)}
                              className="h-6 px-2 text-xs"
                            >
                              {subcategory.name} ({getTotalResourceCount(subcategory)})
                            </Button>
                          ))}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/category/${category.slug}`)}
                    className="flex-1"
                  >
                    Explore Category
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* No Results */}
      {filteredCategories.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Folder className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No categories found</h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your search terms or filters
            </p>
            <Button
              variant="outline"
              onClick={() => {
                handleSearchChange("");
                setSelectedTags([]);
              }}
            >
              Clear filters
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
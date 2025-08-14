import { useState, useMemo } from "react";
import { Search, Filter, Tag, Folder, ExternalLink, Star } from "lucide-react";
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

export default function CategoryExplorer({ categories, resources, className }: CategoryExplorerProps) {
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("name");
  const [showSubcategories, setShowSubcategories] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

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
      const matchesSearch = searchTerm === "" || 
        category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        category.resources.some(resource => 
          resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          resource.description.toLowerCase().includes(searchTerm.toLowerCase())
        );

      const matchesTags = selectedTags.length === 0 ||
        category.resources.some(resource =>
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
          return b.resources.length - a.resources.length;
        case "activity":
          // Sort by most recent or most popular (using resource count as proxy)
          return b.resources.length - a.resources.length;
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
    setExpandedCategories(prev => {
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
    const totalResources = category.resources.length;
    const subcategoryCount = category.subcategories?.length || 0;
    const uniqueTags = new Set(
      category.resources.flatMap(r => r.tags || [])
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
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Controls Row */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Sort:</span>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-32">
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
                checked={showSubcategories}
                onCheckedChange={setShowSubcategories}
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
                  setSearchTerm("");
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
          const isExpanded = expandedCategories.has(category.name);

          return (
            <Card key={category.name} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/category/${category.slug}`)}
                        className="p-0 h-auto font-semibold text-left hover:text-primary"
                      >
                        {category.name}
                      </Button>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </CardTitle>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-sm text-muted-foreground">
                        {stats.totalResources} resources
                      </span>
                      {stats.subcategoryCount > 0 && (
                        <span className="text-sm text-muted-foreground">
                          {stats.subcategoryCount} subcategories
                        </span>
                      )}
                      <span className="text-sm text-muted-foreground">
                        {stats.uniqueTags} tags
                      </span>
                    </div>
                  </div>
                  
                  {showSubcategories && category.subcategories?.length > 0 && (
                    <Collapsible>
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleCategoryExpansion(category.name)}
                          className="h-8 w-8 p-0"
                        >
                          <span className={cn(
                            "transform transition-transform",
                            isExpanded ? "rotate-90" : "rotate-0"
                          )}>
                            ▶
                          </span>
                        </Button>
                      </CollapsibleTrigger>
                    </Collapsible>
                  )}
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                {/* Quick preview of top resources */}
                <div className="space-y-2 mb-3">
                  {category.resources.slice(0, 3).map(resource => (
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
                  {category.resources.length > 3 && (
                    <p className="text-xs text-muted-foreground">
                      +{category.resources.length - 3} more resources
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
                              onClick={() => navigate(`/category/${category.slug}/${subcategory.slug}`)}
                              className="h-6 px-2 text-xs"
                            >
                              {subcategory.name} ({subcategory.resources?.length || 0})
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
                setSearchTerm("");
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
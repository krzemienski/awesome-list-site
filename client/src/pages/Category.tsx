import { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SEOHead from "@/components/layout/SEOHead";
import TagFilter from "@/components/ui/tag-filter";
import { ArrowLeft, Search, ExternalLink } from "lucide-react";
import { deslugify } from "@/lib/utils";
import { Resource } from "@/types/awesome-list";
import NotFound from "@/pages/not-found";
import { processAwesomeListData } from "@/lib/parser";
import { fetchStaticAwesomeList } from "@/lib/static-data";
import { trackCategoryView } from "@/lib/analytics";
import { useToast } from "@/hooks/use-toast";

export default function Category() {
  const { slug } = useParams<{ slug: string }>();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("all");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("category");
  const { toast } = useToast();
  
  // Fetch awesome list data - use same query as homepage
  const { data: rawData, isLoading, error } = useQuery({
    queryKey: ["awesome-list-data"],
    queryFn: fetchStaticAwesomeList,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
  
  const awesomeList = rawData ? processAwesomeListData(rawData) : undefined;
  
  // Find the current category and its resources
  const currentCategory = awesomeList?.categories.find(cat => 
    cat.slug === slug
  );
  
  const categoryName = currentCategory ? currentCategory.name : deslugify(slug || "");
  
  // Collect all resources from this category and its subcategories
  const allResources: Resource[] = [];
  if (currentCategory) {
    // Add category-level resources
    allResources.push(...currentCategory.resources);
    
    // Add subcategory resources
    currentCategory.subcategories?.forEach(sub => {
      allResources.push(...sub.resources);
      
      // Add sub-subcategory resources
      sub.subSubcategories?.forEach(subSub => {
        allResources.push(...subSub.resources);
      });
    });
  }
  
  // Extract unique subcategories for filter
  const subcategories = useMemo(() => {
    const uniqueSubcategories = new Set<string>();
    allResources.forEach(resource => {
      if (resource.subcategory) {
        uniqueSubcategories.add(resource.subcategory);
      }
    });
    return Array.from(uniqueSubcategories).sort();
  }, [allResources]);
  
  // Filter and sort resources
  const filteredResources = useMemo(() => {
    let results = [...allResources];
    
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      results = results.filter(r => 
        r.title.toLowerCase().includes(searchLower) ||
        r.description?.toLowerCase().includes(searchLower)
      );
    }
    
    // Subcategory filter
    if (selectedSubcategory !== "all") {
      results = results.filter(r => r.subcategory === selectedSubcategory);
    }
    
    // Tag filter
    if (selectedTags.length > 0) {
      results = results.filter(r => 
        r.tags && r.tags.some(tag => selectedTags.includes(tag))
      );
    }
    
    // Sort
    if (sortBy === "name-asc") {
      results.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === "name-desc") {
      results.sort((a, b) => b.title.localeCompare(a.title));
    }
    
    return results;
  }, [allResources, searchTerm, selectedSubcategory, selectedTags, sortBy]);
  
  // Track category view
  useEffect(() => {
    if (categoryName && !isLoading) {
      trackCategoryView(categoryName);
    }
  }, [categoryName, isLoading]);
  
  if (isLoading) {
    return (
      <div className="space-y-6">
        <SEOHead title="Loading..." />
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-6 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="space-y-6">
        <SEOHead title="Error" />
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
    return <NotFound />;
  }
  
  return (
    <div className="space-y-6">
      {/* SEO Head */}
      <SEOHead 
        title={`${categoryName} Resources - Awesome Video`}
        description={`Browse ${allResources.length} video development resources in the ${categoryName} category.`}
      />
      
      {/* Header */}
      <div className="space-y-4">
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back-home">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
        </Link>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {categoryName}
            </h1>
            <p className="text-muted-foreground mt-1">
              {allResources.length} resources available
            </p>
          </div>
          <Badge variant="secondary" className="text-lg px-4 py-2">
            {allResources.length}
          </Badge>
        </div>
      </div>
      
      {/* Filters Bar */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search resources..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-resources"
            />
          </div>
          
          {/* Subcategory Filter */}
          {subcategories.length > 0 && (
            <Select value={selectedSubcategory} onValueChange={setSelectedSubcategory}>
              <SelectTrigger className="w-full md:w-[200px]" data-testid="select-subcategory-filter">
                <SelectValue placeholder="Filter by subcategory" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subcategories</SelectItem>
                {subcategories.map(sub => (
                  <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          {/* Sort */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full md:w-[180px]" data-testid="select-sort">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="category">By Category</SelectItem>
              <SelectItem value="name-asc">Name A-Z</SelectItem>
              <SelectItem value="name-desc">Name Z-A</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Tag Filter */}
        <TagFilter 
          resources={allResources}
          selectedTags={selectedTags}
          onTagsChange={setSelectedTags}
        />
      </div>
      
      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground" data-testid="text-results-count">
          Showing {filteredResources.length} of {allResources.length} resources
          {selectedTags.length > 0 && ` (filtered by ${selectedTags.length} tag${selectedTags.length > 1 ? 's' : ''})`}
        </p>
      </div>
      
      {/* Resources Grid */}
      {filteredResources.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold mb-2">No resources found</h3>
          <p className="text-muted-foreground">
            {searchTerm || selectedSubcategory !== "all" 
              ? "Try adjusting your filters to see more results."
              : "There are no resources in this category yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredResources.map((resource, index) => {
            const handleResourceClick = () => {
              window.open(resource.url, '_blank', 'noopener,noreferrer');
              toast({
                title: "Opening Resource",
                description: resource.title,
              });
            };
            
            return (
              <Card 
                key={`${resource.url}-${index}`}
                className="cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors border border-border bg-card text-card-foreground"
                onClick={handleResourceClick}
                data-testid={`card-resource-${index}`}
              >
                <CardHeader>
                  <CardTitle className="text-lg flex items-start gap-2">
                    <span className="flex-1">{resource.title}</span>
                    <ExternalLink className="h-4 w-4 flex-shrink-0 mt-1" />
                  </CardTitle>
                  {resource.description && (
                    <CardDescription className="line-clamp-2">
                      {resource.description}
                    </CardDescription>
                  )}
                </CardHeader>
                {(resource.subcategory || resource.subSubcategory || (resource.tags && resource.tags.length > 0)) && (
                  <CardContent>
                    <div className="flex gap-2 flex-wrap">
                      {resource.subcategory && (
                        <Badge variant="outline">{resource.subcategory}</Badge>
                      )}
                      {resource.subSubcategory && (
                        <Badge variant="outline">{resource.subSubcategory}</Badge>
                      )}
                      {resource.tags && resource.tags.slice(0, 3).map((tag, tagIndex) => (
                        <Badge key={tagIndex} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {resource.tags && resource.tags.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{resource.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

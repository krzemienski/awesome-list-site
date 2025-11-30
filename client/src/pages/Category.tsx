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
import ResourceCard from "@/components/resource/ResourceCard";
import { ArrowLeft, Search, ExternalLink } from "lucide-react";
import { deslugify, slugify } from "@/lib/utils";
import { Resource } from "@/types/awesome-list";
import NotFound from "@/pages/not-found";
import { trackCategoryView } from "@/lib/analytics";
import { useToast } from "@/hooks/use-toast";

export default function Category() {
  const { slug } = useParams<{ slug: string }>();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("all");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("category");
  const { toast } = useToast();
  
  // Fetch category name from database categories
  const { data: categories } = useQuery<any[]>({
    queryKey: ['/api/categories'],
    staleTime: 1000 * 60 * 60,
  });

  const currentCategory = categories?.find(cat => cat.slug === slug);
  const categoryName = currentCategory?.name || deslugify(slug || "");

  // Fetch approved database resources for this category
  const { data: dbData, isLoading, error } = useQuery<{resources: any[], total: number}>({
    queryKey: ['/api/resources', { category: categoryName, status: 'approved' }],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const dbResources = dbData?.resources || [];

  // Use ONLY database resources (no static JSON merging)
  // Database has all 2,646 resources - no need for static JSON
  const allResources: Resource[] = useMemo(() => {
    return dbResources.map(r => ({
      id: r.id, // Use actual UUID (no "db-" prefix needed)
      title: r.title,
      description: r.description || '',
      url: r.url,
      tags: r.metadata?.tags || [],
      category: r.category,
      subcategory: r.subcategory || undefined,
      subSubcategory: r.subSubcategory || undefined,
      isBookmarked: r.isBookmarked,
      isFavorited: r.isFavorited,
    }));
  }, [dbResources]);

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
  
  if (!currentCategory && !isLoading && categories) {
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
          <Badge variant="secondary" className="text-lg px-4 py-2" data-testid="badge-count">
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
            // Extract actual resource ID from the db- prefix if present
            const actualId = resource.id?.startsWith('db-')
              ? resource.id.substring(3)
              : resource.id || `${slugify(resource.title)}-${index}`;

            return (
              <ResourceCard
                key={`${resource.url}-${index}`}
                resource={{
                  id: actualId,
                  name: resource.title,
                  url: resource.url,
                  description: resource.description,
                  category: resource.category,
                  tags: resource.tags || [],
                  isFavorited: false, // TODO: Fetch from API
                  isBookmarked: false, // TODO: Fetch from API
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

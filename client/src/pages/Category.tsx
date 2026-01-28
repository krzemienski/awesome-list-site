import { useEffect, useState, useMemo } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SEOHead from "@/components/layout/SEOHead";
import TagFilter from "@/components/ui/tag-filter";
import { ViewModeToggle, ViewMode } from "@/components/ui/view-mode-toggle";
import { SuggestEditDialog } from "@/components/ui/suggest-edit-dialog";
import { ArrowLeft, Search, ExternalLink, Edit } from "lucide-react";
import { deslugify, slugify } from "@/lib/utils";
import { Resource } from "@/types/awesome-list";
import type { Resource as DbResource } from "@shared/schema";
import NotFound from "@/pages/not-found";
import { processAwesomeListData } from "@/lib/parser";
import { fetchStaticAwesomeList } from "@/lib/static-data";
import { trackCategoryView } from "@/lib/analytics";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export default function Category() {
  const { slug } = useParams<{ slug: string }>();
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("all");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("category");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [resourceToEdit, setResourceToEdit] = useState<DbResource | null>(null);
  
  // View mode with localStorage persistence
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('awesome-list-view-mode');
      if (saved === 'grid' || saved === 'list' || saved === 'compact') {
        return saved;
      }
    }
    return 'grid';
  });
  
  // Persist view mode to localStorage
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('awesome-list-view-mode', mode);
  };
  
  const { toast } = useToast();
  
  // Fetch awesome list data - use same query as homepage
  const { data: rawData, isLoading, error } = useQuery({
    queryKey: ["awesome-list-data"],
    queryFn: fetchStaticAwesomeList,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
  
  const awesomeList = rawData ? processAwesomeListData(rawData) : undefined;
  
  // Fetch approved database resources
  const { data: dbData } = useQuery<{resources: any[], total: number}>({
    queryKey: ['/api/resources', { status: 'approved' }],
    enabled: !!awesomeList,
  });
  
  const dbResources = dbData?.resources || [];
  
  // Find the current category and its resources
  const currentCategory = awesomeList?.categories.find(cat => 
    cat.slug === slug
  );
  
  const categoryName = currentCategory ? currentCategory.name : deslugify(slug || "");
  
  // Merge static and database resources for this category
  const allResources: Resource[] = useMemo(() => {
    if (!currentCategory) return [];
    
    // Start with static resources
    const staticResources = currentCategory.resources;
    
    // Filter database resources for this category and map to Resource type (defensive: match by name OR slug)
    const categoryDbResources = dbResources
      .filter(r => {
        // Match by display name OR slug
        const matchesName = r.category === categoryName;
        const matchesSlug = r.category?.toLowerCase().replace(/\s+&\s+/g, '-').replace(/\s+/g, '-') === slug;
        return matchesName || matchesSlug;
      })
      .map(r => ({
        id: `db-${r.id}`,
        title: r.title,
        description: r.description || '',
        url: r.url,
        tags: r.metadata?.tags || [],
        category: r.category,
        subcategory: r.subcategory || undefined,
        subSubcategory: r.subSubcategory || undefined,
      }));
    
    // Merge and return
    return [...staticResources, ...categoryDbResources];
  }, [currentCategory, dbResources, categoryName]);
  
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
  
  // Helper to check if resource is from database (has numeric ID)
  const isDbResource = (resource: Resource) => typeof resource.id === 'number' || /^\d+$/.test(String(resource.id));
  
  // Helper to get database ID from resource
  const getDbId = (resource: Resource) => typeof resource.id === 'number' ? resource.id : parseInt(String(resource.id));
  
  // Helper to convert category resource to DbResource for edit dialog
  const toDbResource = (resource: Resource, dbResource: any): DbResource => ({
    id: getDbId(resource),
    title: resource.title,
    url: resource.url,
    description: resource.description || "",
    category: resource.category || categoryName,
    subcategory: resource.subcategory || null,
    subSubcategory: resource.subSubcategory || null,
    status: "approved",
    submittedBy: dbResource?.submittedBy || null,
    approvedBy: dbResource?.approvedBy || null,
    approvedAt: dbResource?.approvedAt || null,
    githubSynced: dbResource?.githubSynced || false,
    lastSyncedAt: dbResource?.lastSyncedAt || null,
    metadata: dbResource?.metadata || {},
    createdAt: dbResource?.createdAt || new Date(),
    updatedAt: dbResource?.updatedAt || new Date(),
  });
  
  // Handle suggest edit button click
  const handleSuggestEdit = (e: React.MouseEvent, resource: Resource) => {
    e.stopPropagation();
    if (!isDbResource(resource)) return;
    
    const dbId = getDbId(resource);
    const dbResource = dbResources.find(r => r.id === dbId);
    setResourceToEdit(toDbResource(resource, dbResource));
    setEditDialogOpen(true);
  };
  
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
      
      {/* Results Count and View Mode */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground" data-testid="text-results-count">
          Showing {filteredResources.length} of {allResources.length} resources
          {selectedTags.length > 0 && ` (filtered by ${selectedTags.length} tag${selectedTags.length > 1 ? 's' : ''})`}
        </p>
        <ViewModeToggle value={viewMode} onChange={handleViewModeChange} />
      </div>
      
      {/* Resources Display */}
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
        <div className={
          viewMode === "grid" 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" 
            : viewMode === "list"
            ? "flex flex-col gap-2"
            : "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3"
        }>
          {filteredResources.map((resource, index) => {
            const resourceId = `${slugify(resource.title)}-${index}`;
            
            const handleResourceClick = () => {
              if (isDbResource(resource)) {
                const dbId = getDbId(resource);
                setLocation(`/resource/${dbId}`);
              } else {
                window.open(resource.url, '_blank', 'noopener,noreferrer');
                toast({
                  title: resource.title,
                  description: 'Opening resource in new tab',
                });
              }
            };
            
            const handleExternalLink = (e: React.MouseEvent) => {
              e.stopPropagation();
              window.open(resource.url, '_blank', 'noopener,noreferrer');
              toast({
                title: resource.title,
                description: 'Opening resource in new tab',
              });
            };
            
            if (viewMode === "list") {
              return (
                <div 
                  key={`${resource.url}-${index}`}
                  className="flex items-center gap-4 p-3 rounded-lg border border-border bg-card hover:bg-accent cursor-pointer transition-colors"
                  onClick={handleResourceClick}
                  data-testid={`card-resource-${resourceId}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{resource.title}</span>
                      {isDbResource(resource) && (
                        <Badge variant="outline" className="text-xs border-pink-500/30 text-pink-400">
                          Details
                        </Badge>
                      )}
                    </div>
                    {resource.description && (
                      <p className="text-sm text-muted-foreground truncate mt-0.5">
                        {resource.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {resource.subcategory && (
                      <Badge variant="outline" className="text-xs hidden md:inline-flex">{resource.subcategory}</Badge>
                    )}
                    {resource.tags && resource.tags.slice(0, 2).map((tag, tagIndex) => (
                      <Badge key={tagIndex} variant="secondary" className="text-xs hidden lg:inline-flex">
                        {tag}
                      </Badge>
                    ))}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 min-w-[32px] touch-manipulation"
                      onClick={handleExternalLink}
                      data-testid={`button-external-${resourceId}`}
                      title="Open in new tab"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    {isDbResource(resource) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 min-w-[32px] touch-manipulation"
                        onClick={(e) => handleSuggestEdit(e, resource)}
                        data-testid={`button-suggest-edit-${resourceId}`}
                        title="Suggest an edit"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            }
            
            if (viewMode === "compact") {
              return (
                <Card 
                  key={`${resource.url}-${index}`}
                  className="cursor-pointer hover:bg-accent transition-colors border border-border bg-card p-3"
                  onClick={handleResourceClick}
                  data-testid={`card-resource-${resourceId}`}
                >
                  <div className="flex items-start gap-2">
                    <span className="font-medium text-sm line-clamp-2 flex-1">{resource.title}</span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 min-w-[28px] touch-manipulation"
                        onClick={handleExternalLink}
                        data-testid={`button-external-${resourceId}`}
                        title="Open in new tab"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                      {isDbResource(resource) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 min-w-[28px] touch-manipulation"
                          onClick={(e) => handleSuggestEdit(e, resource)}
                          data-testid={`button-suggest-edit-${resourceId}`}
                          title="Suggest an edit"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {resource.subcategory && (
                    <Badge variant="outline" className="text-xs mt-2">{resource.subcategory}</Badge>
                  )}
                </Card>
              );
            }
            
            return (
              <Card 
                key={`${resource.url}-${index}`}
                className="cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors border border-border bg-card text-card-foreground"
                onClick={handleResourceClick}
                data-testid={`card-resource-${resourceId}`}
              >
                <CardHeader>
                  <CardTitle className="text-lg flex items-start gap-2">
                    <span className="flex-1">{resource.title}</span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 min-h-[44px] min-w-[44px]"
                        onClick={handleExternalLink}
                        data-testid={`button-external-${resourceId}`}
                        title="Open in new tab"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      {isDbResource(resource) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 min-h-[44px] min-w-[44px]"
                          onClick={(e) => handleSuggestEdit(e, resource)}
                          data-testid={`button-suggest-edit-${resourceId}`}
                          title="Suggest an edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardTitle>
                  {resource.description && (
                    <CardDescription className="line-clamp-2">
                      {resource.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 flex-wrap">
                    {isDbResource(resource) && (
                      <Badge variant="outline" className="text-xs border-pink-500/30 text-pink-400">
                        View Details
                      </Badge>
                    )}
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
              </Card>
            );
          })}
        </div>
      )}
      
      {resourceToEdit && (
        <SuggestEditDialog
          resource={resourceToEdit}
          open={editDialogOpen}
          onOpenChange={(open) => {
            setEditDialogOpen(open);
            if (!open) setResourceToEdit(null);
          }}
        />
      )}
    </div>
  );
}

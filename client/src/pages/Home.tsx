import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import ResourceCard from "@/components/ui/resource-card";
import ResourceListItem from "@/components/ui/resource-list-item";
import ResourceCompactItem from "@/components/ui/resource-compact-item";
import MobileResourcePopover from "@/components/ui/mobile-resource-popover";
import LayoutSwitcher from "@/components/ui/layout-switcher";
import Pagination from "@/components/ui/pagination";
import RecommendationPanel from "@/components/ui/recommendation-panel";
import UserPreferences from "@/components/ui/user-preferences";
import AnimatedResourceSkeleton from "@/components/ui/animated-resource-skeleton";
import { useBatchLazyLoading } from "@/hooks/use-lazy-loading";


import { AwesomeList } from "@/types/awesome-list";
import SEOHead from "@/components/layout/SEOHead";
import { Filter, Search, Brain } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trackCategoryView, trackFilterUsage, trackSortChange } from "@/lib/analytics";
import { useUserProfile } from "@/hooks/use-user-profile";
import { cn } from "@/lib/utils";

import { GridMorphing } from "@/components/animations/card-morphing";

interface HomeProps {
  awesomeList?: AwesomeList;
  isLoading: boolean;
}

type LayoutType = "cards" | "list" | "compact";

export default function Home({ awesomeList, isLoading }: HomeProps) {
  const [layout, setLayout] = useState<LayoutType>(() => {
    // Persist layout preference in sessionStorage
    const saved = sessionStorage.getItem('awesome-layout');
    return (saved as LayoutType) || "cards";
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(24);
  const [sortBy, setSortBy] = useState("category");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("all");
  const [selectedSubSubcategory, setSelectedSubSubcategory] = useState<string>("all");
  const [showRecommendations, setShowRecommendations] = useState(() => {
    // Persist recommendations state to prevent disappearing on scroll
    const saved = sessionStorage.getItem('awesome-show-recommendations');
    return saved === 'true';
  });
  // Manage loading states for smooth transitions
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Effect to handle initial loading state
  useEffect(() => {
    if (!isLoading && awesomeList) {
      setIsInitialLoading(false);
    }
  }, [isLoading, awesomeList]);



  // User profile management
  const { 
    userProfile, 
    isLoaded, 
    updateProfile, 
    addToViewHistory, 
    toggleBookmark,
    markCompleted,
    rateResource
  } = useUserProfile();

  // Handle category change with analytics
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setSelectedSubcategory("all");
    setSelectedSubSubcategory("all");
    setCurrentPage(1);
    if (category !== "all") {
      trackCategoryView(category);
    }
  };

  // Handle subcategory change
  const handleSubcategoryChange = (subcategory: string) => {
    setSelectedSubcategory(subcategory);
    setSelectedSubSubcategory("all");
    setCurrentPage(1);
    if (subcategory !== "all") {
      trackFilterUsage("subcategory", subcategory, 1);
    }
  };

  // Handle sub-subcategory change
  const handleSubSubcategoryChange = (subSubcategory: string) => {
    setSelectedSubSubcategory(subSubcategory);
    setCurrentPage(1);
    if (subSubcategory !== "all") {
      trackFilterUsage("sub-subcategory", subSubcategory, 1);
    }
  };

  // Handle sort change with analytics
  const handleSortChange = (value: string) => {
    setSortBy(value);
    setCurrentPage(1);
    trackSortChange(value);
  };

  // Handle search with debounce
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  // Handle resource click for user profile
  const handleResourceClick = (resource: any) => {
    if (userProfile) {
      addToViewHistory(resource);
    }
  };

  // Handle learning path start
  const handleLearningPathStart = (path: any) => {
    console.log("Starting learning path:", path);
  };

  // Handle layout change with persistence
  const handleLayoutChange = (newLayout: LayoutType) => {
    setLayout(newLayout);
    sessionStorage.setItem('awesome-layout', newLayout);
    
    // Adjust items per page based on layout
    if (newLayout === 'cards') {
      setItemsPerPage(24);
    } else if (newLayout === 'list') {
      setItemsPerPage(50);
    } else {
      setItemsPerPage(40);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <SEOHead title="Loading - Awesome Video Resources" />
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!awesomeList) {
    return (
      <div className="p-6">
        <SEOHead title="Error - Awesome Video Resources" />
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Error Loading Resources</h1>
          <p className="text-muted-foreground">Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

  // Extract data from awesome list
  const { resources = [], categories = [] } = awesomeList;

  // Filter resources based on search and filters
  const filteredResources = resources.filter(resource => {
    const matchesSearch = !searchTerm || 
      resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.category?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = selectedCategory === "all" || resource.category === selectedCategory;
    const matchesSubcategory = selectedSubcategory === "all" || resource.subcategory === selectedSubcategory;
    const matchesSubSubcategory = selectedSubSubcategory === "all" || resource.subSubcategory === selectedSubSubcategory;

    return matchesSearch && matchesCategory && matchesSubcategory && matchesSubSubcategory;
  });

  // Get available subcategories and sub-subcategories based on selected category/subcategory
  const availableSubcategories = selectedCategory === "all" 
    ? [] 
    : Array.from(new Set(resources
        .filter(r => r.category === selectedCategory)
        .map(r => r.subcategory)
        .filter(Boolean)
      ));

  const availableSubSubcategories = selectedSubcategory === "all" 
    ? [] 
    : Array.from(new Set(resources
        .filter(r => r.category === selectedCategory && r.subcategory === selectedSubcategory)
        .map(r => r.subSubcategory)
        .filter(Boolean)
      ));

  // Sort resources
  const sortedResources = [...filteredResources].sort((a, b) => {
    switch (sortBy) {
      case "name-asc":
        return a.title.localeCompare(b.title);
      case "name-desc":
        return b.title.localeCompare(a.title);
      case "category":
      default:
        return (a.category || "").localeCompare(b.category || "");
    }
  });

  // Generate stable resource IDs for tracking
  const generateResourceId = (resource: any) => {
    return resource.url;
  };

  // Pagination
  const totalPages = Math.ceil(sortedResources.length / itemsPerPage);
  const paginatedResources = sortedResources.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Lazy loading for resource cards using stable IDs
  const { visibleIds, registerItem } = useBatchLazyLoading(paginatedResources.length);



  return (
    <div className="space-y-6">
      <SEOHead 
        title="Awesome Video Resources - 2,000+ Curated Development Tools"
        description="Discover 2,000+ curated video development resources including codecs, players, tools, and libraries. Find the perfect solution for your video project."
      />
      
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Awesome Video Resources
          </h1>
          <p className="text-muted-foreground">
            Discover {resources.length} curated video development resources
            {filteredResources.length !== resources.length && (
              <span> - Showing {filteredResources.length} filtered results</span>
            )}
          </p>
        </div>
        
        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search resources..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
        
        <div className="space-y-4">
          <div className="mobile-controls flex-col sm:flex-row gap-3 items-start sm:items-center">
            {/* AI Recommendations Toggle */}
            {isLoaded && (
              <div className="flex gap-2 items-center flex-wrap">
                <Button
                  variant={showRecommendations ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    const newState = !showRecommendations;
                    setShowRecommendations(newState);
                    sessionStorage.setItem('awesome-show-recommendations', newState.toString());
                  }}
                  className="flex items-center gap-2 touch-optimized min-h-[44px] sm:min-h-auto"
                >
                  <Brain className="h-4 w-4" />
                  AI Recommendations
                </Button>
                {userProfile && (
                  <UserPreferences
                    userProfile={userProfile}
                    onProfileUpdate={updateProfile}
                    availableCategories={categories.map(cat => cat.name)}
                  />
                )}
              </div>
            )}

            {/* Hierarchical Filters */}
            {!showRecommendations && (
              <div className="flex gap-4 items-center flex-wrap">
                <Filter className="h-4 w-4 text-muted-foreground" />
                
                {/* Category Filter */}
                <div className="flex gap-2 items-center">
                  <span className="text-sm text-muted-foreground">Category:</span>
                  <Select
                    value={selectedCategory}
                    onValueChange={handleCategoryChange}
                  >
                    <SelectTrigger className="w-40 min-h-[44px] sm:min-h-auto touch-optimized" data-testid="category-select-trigger">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="touch-optimized" data-testid="category-select-content">
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map(category => (
                        <SelectItem key={category.name} value={category.name}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Subcategory Filter */}
                {availableSubcategories.length > 0 && (
                  <div className="flex gap-2 items-center">
                    <span className="text-sm text-muted-foreground">Subcategory:</span>
                    <Select
                      value={selectedSubcategory}
                      onValueChange={handleSubcategoryChange}
                    >
                      <SelectTrigger className="w-44 min-h-[44px] sm:min-h-auto touch-optimized" data-testid="subcategory-select-trigger">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="touch-optimized" data-testid="subcategory-select-content">
                        <SelectItem value="all">All Subcategories</SelectItem>
                        {availableSubcategories.map(subcategory => (
                          <SelectItem key={subcategory} value={subcategory || ""}>
                            {subcategory}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Sub-subcategory Filter */}
                {availableSubSubcategories.length > 0 && (
                  <div className="flex gap-2 items-center">
                    <span className="text-sm text-muted-foreground">Sub-subcategory:</span>
                    <Select
                      value={selectedSubSubcategory}
                      onValueChange={handleSubSubcategoryChange}
                    >
                      <SelectTrigger className="w-48 min-h-[44px] sm:min-h-auto touch-optimized" data-testid="sub-subcategory-select-trigger">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="touch-optimized" data-testid="sub-subcategory-select-content">
                        <SelectItem value="all">All Sub-subcategories</SelectItem>
                        {availableSubSubcategories.map(subSubcategory => (
                          <SelectItem key={subSubcategory} value={subSubcategory || ""}>
                            {subSubcategory}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            {/* Layout Switcher */}
            <LayoutSwitcher
              currentLayout={layout}
              onLayoutChange={handleLayoutChange}
            />
            

            {/* Sort */}
            <div className="flex gap-2 items-center flex-wrap">
              <span className="text-sm text-muted-foreground">Sort:</span>
              <Select
                value={sortBy}
                onValueChange={handleSortChange}
              >
                <SelectTrigger className="w-32 min-h-[44px] sm:min-h-auto touch-optimized" data-testid="sort-select-trigger">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="touch-optimized" data-testid="sort-select-content">
                  <SelectItem value="category" data-testid="sort-option-category">Category</SelectItem>
                  <SelectItem value="name-asc" data-testid="sort-option-name-asc">Name (A-Z)</SelectItem>
                  <SelectItem value="name-desc" data-testid="sort-option-name-desc">Name (Z-A)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        {/* AI Recommendations or Regular Resources */}
        {showRecommendations && userProfile ? (
          <RecommendationPanel
            userProfile={userProfile}
            onResourceClick={handleResourceClick}
            onStartLearningPath={handleLearningPathStart}
          />
        ) : (
          <>
            {/* Regular Resources Display with Loading States */}
            {isInitialLoading ? (
              <AnimatedResourceSkeleton
                count={Math.min(itemsPerPage, paginatedResources.length || itemsPerPage)}
                showTags={true}
                showMetrics={true}
              />
            ) : (
              layout === 'cards' && (
                <GridMorphing 
                  categoryId={`${selectedCategory}-${selectedSubcategory}-${selectedSubSubcategory}`}
                  className="mb-8"
                >
                  <div 
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-visible"
                  >
                    {paginatedResources.map((resource, index) => {
                      const resourceId = generateResourceId(resource);
                      return (
                        <div
                          key={resourceId}
                          ref={(el) => registerItem(resourceId, el)}
                          className={cn(
                            "transition-opacity duration-300",
                            visibleIds.has(resourceId) ? "opacity-100" : "opacity-0"
                          )}
                        >
                          {visibleIds.has(resourceId) ? (
                            <ResourceCard
                              resource={resource}
                              index={index}
                            />
                          ) : (
                            <div className="h-48 bg-muted rounded-lg animate-pulse" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </GridMorphing>
              )
            )}

            {!isInitialLoading && layout === 'list' && (
              <GridMorphing 
                categoryId={`list-${selectedCategory}-${selectedSubcategory}-${selectedSubSubcategory}`}
                className="mb-8"
              >
                <div 
                  className="space-y-0 border border-border rounded-lg overflow-visible"
                >
                  {paginatedResources.map((resource, index) => {
                    const resourceId = generateResourceId(resource);
                    return (
                      <div
                        key={resourceId}
                        ref={(el) => registerItem(resourceId, el)}
                        className={cn(
                          "transition-opacity duration-300",
                          visibleIds.has(resourceId) ? "opacity-100" : "opacity-0"
                        )}
                      >
                        {visibleIds.has(resourceId) ? (
                          <ResourceListItem
                            resource={resource}
                            index={index}
                          />
                        ) : (
                          <div className="h-16 bg-muted rounded-lg animate-pulse" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </GridMorphing>
            )}

            {!isInitialLoading && layout === 'compact' && (
              <GridMorphing 
                categoryId={`compact-${selectedCategory}-${selectedSubcategory}-${selectedSubSubcategory}`}
                className="mb-8"
              >
                <div 
                  className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 overflow-visible"
                >
                  {paginatedResources.map((resource, index) => {
                    const resourceId = generateResourceId(resource);
                    return (
                      <div
                        key={resourceId}
                        ref={(el) => registerItem(resourceId, el)}
                        className={cn(
                          "transition-opacity duration-300",
                          visibleIds.has(resourceId) ? "opacity-100" : "opacity-0"
                        )}
                      >
                        {visibleIds.has(resourceId) ? (
                          <ResourceCompactItem
                            resource={resource}
                            index={index}
                          />
                        ) : (
                          <div className="h-24 bg-muted rounded-lg animate-pulse" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </GridMorphing>
            )}
            
            {/* Pagination */}
            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                itemsPerPage={itemsPerPage}
                onPageChange={(page) => {
                  setCurrentPage(page);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onPageSizeChange={(size) => {
                  setItemsPerPage(size);
                  setCurrentPage(1);
                }}
                totalItems={sortedResources.length}
                pageSizeOptions={[12, 24, 48, 96]}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
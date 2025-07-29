import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import ResourceCard from "@/components/ui/resource-card";
import MobileResourcePopover from "@/components/ui/mobile-resource-popover";
import LayoutSwitcher from "@/components/ui/layout-switcher";
import Pagination from "@/components/ui/pagination";
import RecommendationPanel from "@/components/ui/recommendation-panel";
import UserPreferences from "@/components/ui/user-preferences";
import { AwesomeList } from "@/types/awesome-list";
import { Helmet } from "react-helmet";
import { Filter, Search, Brain } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trackCategoryView, trackFilterUsage, trackSortChange } from "@/lib/analytics";
import { useUserProfile } from "@/hooks/use-user-profile";

interface HomeProps {
  awesomeList?: AwesomeList;
  isLoading: boolean;
}

type LayoutType = "cards" | "list" | "compact";

export default function Home({ awesomeList, isLoading }: HomeProps) {
  const [layout, setLayout] = useState<LayoutType>("list");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(24);
  const [sortBy, setSortBy] = useState("category");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showRecommendations, setShowRecommendations] = useState(false);

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
    if (category !== "all") {
      trackCategoryView(category);
      trackFilterUsage("category", category, filteredResources.length);
    }
  };

  // Handle sort change with analytics
  const handleSortChange = (sort: string) => {
    setSortBy(sort);
    trackSortChange(sort);
  };

  // Handle search with analytics
  const handleSearchChange = (search: string) => {
    setSearchTerm(search);
    if (search.length >= 2) {
      trackFilterUsage("search", search, filteredResources.length);
    }
  };
  
  // Use all resources for home page display
  const allResources = awesomeList?.resources || [];
  
  // Filter resources by search and category
  const filteredResources = allResources.filter(resource => {
    const matchesSearch = searchTerm === "" || 
      resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resource.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === "all" || resource.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });
  
  // Sort resources
  const sortedResources = [...filteredResources].sort((a, b) => {
    switch (sortBy) {
      case "name-asc":
        return a.title.localeCompare(b.title);
      case "name-desc":
        return b.title.localeCompare(a.title);
      case "category":
        return a.category.localeCompare(b.category);
      default:
        return 0;
    }
  });
  
  // Pagination
  const totalPages = Math.ceil(sortedResources.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedResources = sortedResources.slice(startIndex, endIndex);
  
  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage, searchTerm, selectedCategory]);
  
  // Get unique categories for filter
  const categories = awesomeList?.categories?.map(cat => cat.name).sort() || [];

  // Handle resource interactions
  const handleResourceClick = (resourceId: string) => {
    addToViewHistory(resourceId);
  };

  const handleLearningPathStart = (pathId: string) => {
    console.log(`Starting learning path: ${pathId}`);
    // Could navigate to a dedicated learning path page
  };
  
  return (
    <div className="flex flex-col">
      {/* SEO Head */}
      <Helmet>
        <title>{awesomeList?.title || "Awesome Video"}</title>
        <meta name="description" content={`${awesomeList?.description || "A curated list of awesome video resources"} - ${allResources.length} resources across ${categories.length} categories.`} />
        <meta name="keywords" content={`awesome video, ${awesomeList?.title?.toLowerCase() || 'video resources'}, video development, FFmpeg, streaming, video tools`} />
        <meta property="og:title" content={awesomeList?.title || "Awesome Video"} />
        <meta property="og:description" content={`${awesomeList?.description || "A curated list of awesome video resources"} - ${allResources.length} resources available.`} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="/og-image.svg" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={awesomeList?.title || "Awesome Video"} />
        <meta name="twitter:description" content={`${awesomeList?.description || "A curated list of awesome video resources"} - ${allResources.length} resources available.`} />
        <link rel="canonical" href="/" />
      </Helmet>
      
      {isLoading ? (
        <>
          <Skeleton className="h-12 w-3/4 mb-2" />
          <Skeleton className="h-6 w-full mb-8" />
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array(6).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="mb-6">
            <p className="text-muted-foreground mb-4">
              {awesomeList?.description || "A curated list of awesome resources"}
            </p>
            
            {/* Search Bar */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search resources..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          {/* Controls */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>
                Showing {filteredResources.length} of {allResources.length} resources
              </span>
              {searchTerm && (
                <span className="text-blue-600">
                  for "{searchTerm}"
                </span>
              )}
              {selectedCategory !== "all" && (
                <span className="text-green-600">
                  in {selectedCategory}
                </span>
              )}
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              {/* AI Recommendations Toggle */}
              {isLoaded && (
                <div className="flex gap-2 items-center">
                  <Button
                    variant={showRecommendations ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowRecommendations(!showRecommendations)}
                    className="flex items-center gap-2"
                  >
                    <Brain className="h-4 w-4" />
                    AI Recommendations
                  </Button>
                  {userProfile && (
                    <UserPreferences
                      userProfile={userProfile}
                      onProfileUpdate={updateProfile}
                      availableCategories={categories}
                    />
                  )}
                </div>
              )}

              {/* Category Filter */}
              {!showRecommendations && (
                <div className="flex gap-2 items-center">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Category:</span>
                  <Select
                    value={selectedCategory}
                    onValueChange={handleCategoryChange}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map(category => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Layout Switcher */}
              <LayoutSwitcher
                currentLayout={layout}
                onLayoutChange={setLayout}
              />
              
              {/* Sort */}
              <div className="flex gap-2 items-center">
                <span className="text-sm text-muted-foreground">Sort:</span>
                <Select
                  value={sortBy}
                  onValueChange={setSortBy}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="category">Category</SelectItem>
                    <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                    <SelectItem value="name-desc">Name (Z-A)</SelectItem>
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
              {/* Regular Resources Display */}
              {layout === "list" ? (
            <div className="space-y-1 mb-8">
              {paginatedResources.map((resource, index) => (
                <MobileResourcePopover key={`${resource.title}-${resource.url}`} resource={resource}>
                  <div className="p-4 border-l-4 border-l-primary bg-card rounded-r-lg hover:bg-accent/50 transition-colors min-h-[60px] flex items-center">
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-foreground mb-1">
                        {resource.title}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {resource.description}
                      </p>
                    </div>
                    <div className="ml-2 text-xs px-2 py-1 bg-primary/10 text-primary rounded-full shrink-0">
                      {resource.category}
                    </div>
                  </div>
                </MobileResourcePopover>
              ))}
            </div>
          ) : layout === "compact" ? (
            <div className="grid grid-cols-2 gap-2 mb-8">
              {paginatedResources.map((resource, index) => (
                <MobileResourcePopover key={`${resource.title}-${resource.url}`} resource={resource}>
                  <div className="p-3 border border-border rounded-lg bg-card hover:bg-accent/50 transition-colors min-h-[120px] flex flex-col">
                    <h3 className="text-sm font-medium text-foreground mb-2 line-clamp-2 flex-shrink-0">
                      {resource.title}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-3 flex-1">
                      {resource.description}
                    </p>
                    <span className="text-xs px-1.5 py-1 bg-muted text-muted-foreground rounded mt-2 self-start">
                      {resource.category}
                    </span>
                  </div>
                </MobileResourcePopover>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 mb-8">
              {paginatedResources.map((resource, index) => (
                <MobileResourcePopover key={`${resource.title}-${resource.url}`} resource={resource}>
                  <div className="p-6 border border-border rounded-xl bg-card shadow-sm hover:shadow-md transition-all">
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold text-foreground">
                        {resource.title}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {resource.description}
                      </p>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-3 py-1 bg-primary/10 text-primary rounded-full font-medium">
                            {resource.category}
                          </span>
                        </div>
                        {resource.tags && resource.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {resource.tags.slice(0, 4).map((tag, tagIndex) => (
                              <span
                                key={tagIndex}
                                className="text-xs px-2 py-1 bg-secondary text-secondary-foreground rounded"
                              >
                                {tag}
                              </span>
                            ))}
                            {resource.tags.length > 4 && (
                              <span className="text-xs text-muted-foreground">
                                +{resource.tags.length - 4} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </MobileResourcePopover>
              ))}
            </div>
          )}
          
          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onPageSizeChange={setItemsPerPage}
              totalItems={sortedResources.length}
              pageSizeOptions={[12, 24, 48, 96]}
            />
          )}
            </>
          )}
        </>
      )}
    </div>
  );
}

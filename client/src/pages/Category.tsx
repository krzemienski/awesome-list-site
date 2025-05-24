import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import ResourceCard from "@/components/ui/resource-card";
import ResourcePreviewTooltip from "@/components/ui/resource-preview-tooltip";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import TagFilter from "@/components/ui/tag-filter";
import LayoutSwitcher, { LayoutType } from "@/components/ui/layout-switcher";
import ResourceListItem from "@/components/ui/resource-list-item";
import ResourceCompactItem from "@/components/ui/resource-compact-item";
import Pagination from "@/components/ui/pagination";
import { Search, Filter } from "lucide-react";
import { deslugify, slugify } from "@/lib/utils";
import { Resource, AwesomeList } from "@/types/awesome-list";
import NotFound from "@/pages/not-found";
import { Helmet } from "react-helmet";
import { processAwesomeListData } from "@/lib/parser";

// Sample resources for categories
const sampleResources: Resource[] = [
  {
    id: "1",
    title: "Nextcloud",
    url: "https://nextcloud.com",
    description: "A suite of client-server software for creating and using file hosting services.",
    category: "File Transfer & Synchronization",
  },
  {
    id: "2",
    title: "Bitwarden",
    url: "https://bitwarden.com",
    description: "Open source password management solution.",
    category: "Password Managers",
  },
  {
    id: "3",
    title: "Jellyfin",
    url: "https://jellyfin.org",
    description: "Media system that puts you in control of managing and streaming your media.",
    category: "Media Streaming",
  },
  {
    id: "4",
    title: "Gitea",
    url: "https://gitea.io",
    description: "Painless self-hosted Git service written in Go.",
    category: "Software Development",
  },
  {
    id: "5",
    title: "Home Assistant",
    url: "https://home-assistant.io",
    description: "Open source home automation platform.",
    category: "Automation",
  },
  {
    id: "6",
    title: "Matomo",
    url: "https://matomo.org",
    description: "Google Analytics alternative that protects your data and your customers' privacy.",
    category: "Analytics",
  },
  {
    id: "7",
    title: "Grafana",
    url: "https://grafana.com",
    description: "The open and composable observability and data visualization platform.",
    category: "Monitoring",
  },
  {
    id: "8",
    title: "Plausible Analytics",
    url: "https://plausible.io",
    description: "Simple, lightweight (< 1 KB) and privacy-friendly analytics alternative to Google Analytics.",
    category: "Analytics",
  }
];

export default function Category() {
  const { slug } = useParams<{ slug: string }>();
  const [baseResources, setBaseResources] = useState<Resource[]>([]);
  const [filteredResources, setFilteredResources] = useState<Resource[]>([]);
  const [categoryName, setCategoryName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("name-asc");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [layout, setLayout] = useState<LayoutType>("list");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(24);
  
  // Configuration from config
  const pageSizeOptions = [12, 24, 48, 96];
  
  // Fetch awesome list data
  const { data: rawData, isLoading, error } = useQuery({
    queryKey: ["/api/awesome-list"],
    staleTime: 1000 * 60 * 60, // 1 hour
  });
  
  // Filter real resources by category
  useEffect(() => {
    if (slug && rawData) {
      // Process the raw data into structured format
      const awesomeList = processAwesomeListData(rawData);
      
      // Convert slug back to category name
      const decodedCategoryName = deslugify(slug);
      setCategoryName(decodedCategoryName);
      
      // Find matching category from the real data
      const matchingCategory = awesomeList.categories.find(category => 
        slugify(category.name) === slug
      );
      
      if (matchingCategory) {
        setBaseResources(matchingCategory.resources);
      } else {
        // If no exact match, search by partial name match
        const allResources = awesomeList.resources || [];
        const matchingResources = allResources.filter(resource => 
          resource.category && slugify(resource.category) === slug
        );
        setBaseResources(matchingResources);
      }
    }
  }, [slug, rawData]);
  
  // Apply search filter, tag filter, and sorting when criteria change
  useEffect(() => {
    let filtered = [...baseResources];
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(resource => 
        resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        resource.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply tag filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter(resource => 
        resource.tags && selectedTags.some(tag => resource.tags?.includes(tag))
      );
    }
    
    // Apply sorting
    switch(sortBy) {
      case "name-asc":
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "name-desc":
        filtered.sort((a, b) => b.title.localeCompare(a.title));
        break;
      case "newest":
        // For demo purposes, using random sorting for "newest"
        filtered.sort(() => Math.random() - 0.5);
        break;
      default:
        break;
    }
    
    setFilteredResources(filtered);
    
    // Reset to first page when filters change
    setCurrentPage(1);
  }, [baseResources, searchTerm, sortBy, selectedTags]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredResources.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedResources = filteredResources.slice(startIndex, endIndex);

  // Handle page changes
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top when page changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setItemsPerPage(newPageSize);
    setCurrentPage(1); // Reset to first page
  };
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };
  
  if (isLoading) {
    return (
      <div className="flex flex-col">
        <Skeleton className="h-12 w-1/2 mb-2" />
        <Skeleton className="h-6 w-3/4 mb-8" />
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(9).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }
  
  if (!categoryName && !isLoading) {
    return <NotFound />;
  }
  
  return (
    <div className="flex flex-col">
      {/* SEO Head */}
      <Helmet>
        <title>{categoryName} Resources - Awesome Selfhosted</title>
        <meta 
          name="description" 
          content={`Browse ${filteredResources.length} self-hosted resources in the ${categoryName} category.`} 
        />
      </Helmet>
      
      <h1 className="text-3xl font-bold tracking-tight mb-4">
        {categoryName}
      </h1>
      <p className="text-muted-foreground mb-6">
        {filteredResources.length} {filteredResources.length === 1 ? 'resource' : 'resources'} in this category
      </p>
      
      {/* Search and filter bar */}
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex flex-col sm:flex-row gap-4">
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search resources..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </form>
          
          <div className="flex gap-4 items-center">
            {/* Only show layout switcher if enabled in config */}
            <LayoutSwitcher
              currentLayout={layout}
              onLayoutChange={setLayout}
            />
            
            <div className="flex gap-2 items-center">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Sort:</span>
              <Select
                value={sortBy}
                onValueChange={setSortBy}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                  <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                  <SelectItem value="newest">Newest first</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        {/* Tag filter */}
        <TagFilter
          resources={baseResources}
          selectedTags={selectedTags}
          onTagsChange={setSelectedTags}
        />
      </div>
      
      {/* Resource Display */}
      {layout === "cards" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedResources.map((resource, index) => (
            <ResourceCard 
              key={`${resource.title}-${index}`} 
              resource={resource}
              index={index}
            />
          ))}
        </div>
      )}

      {layout === "list" && (
        <div className="border border-border rounded-lg overflow-hidden">
          {paginatedResources.map((resource, index) => (
            <ResourceListItem 
              key={`${resource.title}-${index}`} 
              resource={resource}
              index={index}
            />
          ))}
        </div>
      )}

      {layout === "compact" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {paginatedResources.map((resource, index) => (
            <ResourceCompactItem 
              key={`${resource.title}-${index}`} 
              resource={resource}
              index={index}
            />
          ))}
        </div>
      )}
      
      {filteredResources.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <h3 className="text-lg font-semibold mb-2">No resources found</h3>
          <p className="text-muted-foreground">
            {searchTerm ? `No resources matching "${searchTerm}" in this category.` : 'There are no resources in this category.'}
          </p>
        </div>
      )}

      {/* Pagination */}
      {filteredResources.length > 0 && totalPages > 1 && (
        <div className="mt-8 pt-8 border-t border-border">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            totalItems={filteredResources.length}
            pageSizeOptions={pageSizeOptions}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import ResourceCard from "@/components/ui/resource-card";
import LayoutSwitcher from "@/components/ui/layout-switcher";
import Pagination from "@/components/ui/pagination";
import { AwesomeList } from "@/types/awesome-list";
import { Helmet } from "react-helmet";
import { Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface HomeProps {
  awesomeList?: AwesomeList;
  isLoading: boolean;
}

type LayoutType = "cards" | "list" | "compact";

export default function Home({ awesomeList, isLoading }: HomeProps) {
  const [layout, setLayout] = useState<LayoutType>("list");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(24);
  const [sortBy, setSortBy] = useState("name-asc");
  
  // Use all resources for home page display
  const allResources = awesomeList?.resources || [];
  
  // Sort resources
  const sortedResources = [...allResources].sort((a, b) => {
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
  
  // Reset page when items per page changes
  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);
  
  return (
    <div className="flex flex-col">
      {/* SEO Head */}
      <Helmet>
        <title>{awesomeList?.title || "Awesome List"}</title>
        <meta name="description" content={awesomeList?.description || "A curated list of awesome resources"} />
        <meta property="og:title" content={awesomeList?.title || "Awesome List"} />
        <meta property="og:description" content={awesomeList?.description || "A curated list of awesome resources"} />
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
          <p className="text-muted-foreground mb-6">
            {awesomeList?.description || "A curated list of awesome resources"}
          </p>
          
          {/* Controls */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{allResources.length} resources total</span>
            </div>
            
            <div className="flex gap-4 items-center">
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
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                    <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                    <SelectItem value="category">Category</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          {/* Resources Display */}
          {layout === "list" ? (
            <div className="space-y-3 mb-8">
              {paginatedResources.map((resource, index) => (
                <div
                  key={`${resource.title}-${resource.url}`}
                  className="p-4 border border-border rounded-lg bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <a
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-lg font-medium text-foreground hover:text-primary transition-colors"
                        >
                          {resource.title}
                        </a>
                        <span className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground">
                          {resource.category}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {resource.description}
                      </p>
                      {resource.tags && resource.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {resource.tags.slice(0, 3).map((tag, tagIndex) => (
                            <span
                              key={tagIndex}
                              className="text-xs px-1.5 py-0.5 bg-secondary text-secondary-foreground rounded"
                            >
                              {tag}
                            </span>
                          ))}
                          {resource.tags.length > 3 && (
                            <span className="text-xs text-muted-foreground">
                              +{resource.tags.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : layout === "compact" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-8">
              {paginatedResources.map((resource, index) => (
                <div
                  key={`${resource.title}-${resource.url}`}
                  className="p-3 border border-border rounded-md bg-card hover:bg-accent/50 transition-colors"
                >
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-foreground hover:text-primary transition-colors block mb-1"
                  >
                    {resource.title}
                  </a>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                    {resource.description}
                  </p>
                  <span className="text-xs px-1.5 py-0.5 bg-muted rounded text-muted-foreground">
                    {resource.category}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {paginatedResources.map((resource, index) => (
                <ResourceCard 
                  key={`${resource.title}-${resource.url}`} 
                  resource={resource}
                  index={index}
                />
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
    </div>
  );
}

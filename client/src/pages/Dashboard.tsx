import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Search, Grid3x3, List, LayoutGrid } from "lucide-react"
import { AppSidebar } from "@/components/dashboard/app-sidebar-awesome"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { fetchStaticAwesomeList } from "@/lib/static-data"
import { processAwesomeListData } from "@/lib/parser"
import { cn } from "@/lib/utils"

type ViewMode = "grid" | "list" | "compact"

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>("grid")

  // Fetch awesome list data
  const { data: rawData, isLoading, error } = useQuery({
    queryKey: ["awesome-list-data"],
    queryFn: fetchStaticAwesomeList,
    staleTime: 1000 * 60 * 60, // 1 hour
  })
  
  const awesomeList = rawData ? processAwesomeListData(rawData) : undefined

  // Filter resources based on search and category
  const filteredResources = awesomeList?.resources.filter(resource => {
    const matchesSearch = !searchQuery || 
      resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.description?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesCategory = !selectedCategory || resource.category === selectedCategory
    const matchesSubcategory = !selectedSubcategory || resource.subcategory === selectedSubcategory
    
    return matchesSearch && matchesCategory && matchesSubcategory
  }) || []

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Error Loading Resources</CardTitle>
            <CardDescription>Failed to load the awesome list resources</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "280px",
          "--sidebar-width-mobile": "280px",
        } as React.CSSProperties
      }
    >
      <AppSidebar 
        awesomeList={awesomeList}
        isLoading={isLoading}
        selectedCategory={selectedCategory}
        selectedSubcategory={selectedSubcategory}
        onCategorySelect={(category, subcategory) => {
          setSelectedCategory(category)
          setSelectedSubcategory(subcategory)
        }}
      />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/">Awesome Video</BreadcrumbLink>
              </BreadcrumbItem>
              {selectedCategory && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{selectedCategory}</BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              )}
              {selectedSubcategory && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{selectedSubcategory}</BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              )}
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        
        <div className="flex flex-1 flex-col">
          {/* Search and View Controls */}
          <div className="flex items-center gap-4 p-4 border-b">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search packages, libraries, and tools..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-1">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("grid")}
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "compact" ? "default" : "outline"}
                size="icon"
                onClick={() => setViewMode("compact")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Resources Display */}
          <div className="flex-1 overflow-auto p-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-muted-foreground">Loading resources...</div>
              </div>
            ) : (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-2xl font-bold">Resources</h2>
                  <div className="text-sm text-muted-foreground">
                    {filteredResources.length} items
                  </div>
                </div>

                {/* Grid View */}
                {viewMode === "grid" && (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredResources.map((resource, index) => (
                      <Card key={index} className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <CardTitle className="text-lg line-clamp-1">
                            {resource.title}
                          </CardTitle>
                          <div className="flex gap-2 mt-2">
                            <Badge variant="secondary">{resource.category}</Badge>
                            {resource.subcategory && (
                              <Badge variant="outline">{resource.subcategory}</Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {resource.description || "No description available"}
                          </p>
                          <a
                            href={resource.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-4 inline-block text-sm text-primary hover:underline"
                          >
                            View Resource →
                          </a>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* List View */}
                {viewMode === "list" && (
                  <div className="space-y-2">
                    {filteredResources.map((resource, index) => (
                      <Card key={index} className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-base">
                                {resource.title}
                              </CardTitle>
                              <CardDescription className="mt-1">
                                {resource.description || "No description available"}
                              </CardDescription>
                            </div>
                            <div className="flex gap-2 ml-4">
                              <Badge variant="secondary">{resource.category}</Badge>
                              {resource.subcategory && (
                                <Badge variant="outline">{resource.subcategory}</Badge>
                              )}
                            </div>
                          </div>
                          <a
                            href={resource.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-block text-sm text-primary hover:underline"
                          >
                            {resource.url}
                          </a>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Compact View */}
                {viewMode === "compact" && (
                  <div className="divide-y">
                    {filteredResources.map((resource, index) => (
                      <div key={index} className="py-3 hover:bg-muted/50 px-2 -mx-2 rounded">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="font-medium text-sm">{resource.title}</h3>
                            {resource.description && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                {resource.description}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <Badge variant="secondary" className="text-xs">
                              {resource.category}
                            </Badge>
                            <a
                              href={resource.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline"
                            >
                              View →
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {filteredResources.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-64">
                    <p className="text-muted-foreground">No resources found</p>
                    {searchQuery && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Try adjusting your search
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
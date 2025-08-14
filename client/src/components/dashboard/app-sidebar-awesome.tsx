"use client"

import * as React from "react"
import {
  ChevronRight,
  Video,
  Package,
  Settings,
  Search,
  Filter,
} from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AwesomeList } from "@/types/awesome-list"
import { cn } from "@/lib/utils"

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  awesomeList?: AwesomeList
  isLoading: boolean
  selectedCategory: string | null
  selectedSubcategory: string | null
  onCategorySelect: (category: string | null, subcategory: string | null) => void
}

export function AppSidebar({ 
  awesomeList, 
  isLoading,
  selectedCategory,
  selectedSubcategory,
  onCategorySelect,
  ...props 
}: AppSidebarProps) {
  const [searchQuery, setSearchQuery] = React.useState("")

  // Group resources by category and subcategory
  const categoriesMap = React.useMemo(() => {
    if (!awesomeList) return new Map()
    
    const map = new Map<string, Map<string, number>>()
    
    awesomeList.resources.forEach(resource => {
      if (!map.has(resource.category)) {
        map.set(resource.category, new Map())
      }
      
      const subcats = map.get(resource.category)!
      const subcat = resource.subcategory || "General"
      subcats.set(subcat, (subcats.get(subcat) || 0) + 1)
    })
    
    return map
  }, [awesomeList])

  // Filter categories based on search
  const filteredCategories = React.useMemo(() => {
    if (!searchQuery) return Array.from(categoriesMap.entries())
    
    const query = searchQuery.toLowerCase()
    return Array.from(categoriesMap.entries()).filter(([category, subcats]) => {
      if (category.toLowerCase().includes(query)) return true
      return Array.from(subcats.keys()).some(subcat => 
        subcat.toLowerCase().includes(query)
      )
    })
  }, [categoriesMap, searchQuery])

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Video className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Awesome Video</span>
                  <span className="truncate text-xs">
                    {awesomeList ? `${awesomeList.resources.length} Resources` : "Loading..."}
                  </span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Search */}
        <SidebarGroup className="px-2 py-0">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search categories..."
              className="pl-8 h-8 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </SidebarGroup>

        {/* All Categories Button */}
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                className={cn(
                  "w-full justify-start",
                  !selectedCategory && "bg-sidebar-accent text-sidebar-accent-foreground"
                )}
                onClick={() => onCategorySelect(null, null)}
              >
                <Package className="size-4" />
                <span>All Categories</span>
                {awesomeList && (
                  <Badge variant="secondary" className="ml-auto">
                    {awesomeList.resources.length}
                  </Badge>
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {/* Categories */}
        <ScrollArea className="flex-1">
          <SidebarGroup>
            <SidebarGroupLabel>Categories</SidebarGroupLabel>
            <SidebarMenu>
              {isLoading ? (
                <SidebarMenuItem>
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    Loading categories...
                  </div>
                </SidebarMenuItem>
              ) : (
                filteredCategories.map(([category, subcategories]) => (
                  <Collapsible
                    key={category}
                    asChild
                    defaultOpen={selectedCategory === category}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          tooltip={category}
                          className={cn(
                            selectedCategory === category && !selectedSubcategory &&
                            "bg-sidebar-accent text-sidebar-accent-foreground"
                          )}
                          onClick={(e) => {
                            if (e.ctrlKey || e.metaKey) {
                              e.preventDefault()
                              onCategorySelect(category, null)
                            }
                          }}
                        >
                          <span>{category}</span>
                          <Badge variant="secondary" className="ml-auto mr-2">
                            {Array.from(subcategories.values()).reduce((a, b) => a + b, 0)}
                          </Badge>
                          <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {/* Show all in category */}
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              className={cn(
                                selectedCategory === category && !selectedSubcategory &&
                                "bg-sidebar-accent text-sidebar-accent-foreground"
                              )}
                              onClick={() => onCategorySelect(category, null)}
                            >
                              <span>All in {category}</span>
                              <Badge variant="outline" className="ml-auto">
                                {Array.from(subcategories.values()).reduce((a, b) => a + b, 0)}
                              </Badge>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                          
                          {/* Subcategories */}
                          {Array.from(subcategories.entries()).map(([subcat, count]) => (
                            <SidebarMenuSubItem key={subcat}>
                              <SidebarMenuSubButton
                                className={cn(
                                  selectedCategory === category && 
                                  selectedSubcategory === subcat &&
                                  "bg-sidebar-accent text-sidebar-accent-foreground"
                                )}
                                onClick={() => onCategorySelect(category, subcat)}
                              >
                                <span>{subcat}</span>
                                <Badge variant="outline" className="ml-auto">
                                  {count}
                                </Badge>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                ))
              )}
            </SidebarMenu>
          </SidebarGroup>
        </ScrollArea>

        {/* Footer Actions */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <a href="/preferences">
                    <Settings className="size-4" />
                    <span>Preferences</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <a href="/recommendations">
                    <Filter className="size-4" />
                    <span>AI Recommendations</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="sm" className="w-full">
              <span className="text-xs text-muted-foreground">
                Powered by krzemienski/awesome-video
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
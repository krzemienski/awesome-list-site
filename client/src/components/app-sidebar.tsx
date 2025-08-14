import {
  ChevronRight,
  ChevronDown,
  FileText,
  Video,
  Code,
  Play,
  Settings,
  Package,
  Server,
  Layers,
  Users,
  Home,
  Palette
} from "lucide-react"
import { useState, useEffect } from "react"
import { Link, useLocation } from "wouter"
import { cn } from "@/lib/utils"

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
  SidebarProvider,
  SidebarRail,
  SidebarTrigger
} from "@/components/ui/sidebar"
import { Category, Subcategory, SubSubcategory } from "@/types/awesome-list"
import ThemeSelectorSidebar from "@/components/ui/theme-selector-sidebar"

// Icons mapping for categories
const categoryIcons: { [key: string]: any } = {
  "Intro & Learning": FileText,
  "Protocols & Transport": Server,
  "Encoding & Codecs": Code,
  "Players & Clients": Play,
  "Media Tools": Settings,
  "Standards & Industry": Package,
  "Infrastructure & Delivery": Layers,
  "General Tools": Settings,
  "Community & Events": Users,
}

interface AppSidebarProps {
  categories: Category[]
  isLoading?: boolean
}

export function AppSidebar({ categories, isLoading }: AppSidebarProps) {
  const [location] = useLocation()
  const [expandedItems, setExpandedItems] = useState<string[]>([])

  // Filter out unwanted categories
  const filteredCategories = categories.filter(cat => 
    cat.resources.length > 0 && 
    cat.name !== "Table of contents" && 
    !cat.name.startsWith("List of") &&
    !["Contributing", "License", "External Links", "Anti-features"].includes(cat.name)
  )

  // Expand active category based on current location
  useEffect(() => {
    const pathParts = location.split('/')
    if (pathParts[1] === 'category') {
      const activeCategory = filteredCategories.find(cat => cat.slug === pathParts[2])
      if (activeCategory) {
        setExpandedItems(prev => Array.from(new Set([...prev, activeCategory.slug])))
      }
    } else if (pathParts[1] === 'subcategory') {
      const activeSubcategory = pathParts[2]
      const parentCategory = filteredCategories.find(cat => 
        cat.subcategories?.some(sub => sub.slug === activeSubcategory)
      )
      if (parentCategory) {
        setExpandedItems(prev => Array.from(new Set([...prev, parentCategory.slug])))
      }
    } else if (pathParts[1] === 'sub-subcategory') {
      const activeSubSubcategory = pathParts[2]
      let parentCategory: Category | undefined
      let parentSubcategory: Subcategory | undefined
      
      filteredCategories.forEach(cat => {
        cat.subcategories?.forEach(sub => {
          if (sub.subSubcategories?.some(subsub => subsub.slug === activeSubSubcategory)) {
            parentCategory = cat
            parentSubcategory = sub
          }
        })
      })
      
      if (parentCategory && parentSubcategory) {
        setExpandedItems(prev => Array.from(new Set([...prev, parentCategory!.slug, `${parentCategory!.slug}-${parentSubcategory!.slug}`])))
      }
    }
  }, [location, filteredCategories])

  const toggleExpand = (itemId: string) => {
    setExpandedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    )
  }

  const isActiveRoute = (path: string) => {
    return location === path
  }

  const renderSubSubcategories = (category: Category, subcategory: Subcategory, subSubcategories?: SubSubcategory[]) => {
    if (!subSubcategories || subSubcategories.length === 0) return null

    return (
      <SidebarMenuSub>
        {subSubcategories.map(subSub => (
          <SidebarMenuSubItem key={subSub.slug}>
            <SidebarMenuSubButton asChild>
              <Link
                href={`/sub-subcategory/${subSub.slug}`}
                className={cn(
                  "w-full pl-8",
                  isActiveRoute(`/sub-subcategory/${subSub.slug}`) && "bg-primary/10 text-primary font-medium"
                )}
              >
                <span className="flex items-center justify-between w-full">
                  <span className="truncate">{subSub.name}</span>
                  <span className="text-xs text-muted-foreground ml-2 shrink-0">
                    {subSub.resources.length}
                  </span>
                </span>
              </Link>
            </SidebarMenuSubButton>
          </SidebarMenuSubItem>
        ))}
      </SidebarMenuSub>
    )
  }

  const renderSubcategories = (category: Category, subcategories?: Subcategory[]) => {
    if (!subcategories || subcategories.length === 0) return null

    return (
      <SidebarMenuSub>
        {subcategories.map(sub => {
          const hasSubSubcategories = sub.subSubcategories && sub.subSubcategories.length > 0
          const subId = `${category.slug}-${sub.slug}`
          const isExpanded = expandedItems.includes(subId)

          return (
            <SidebarMenuSubItem key={sub.slug}>
              {hasSubSubcategories ? (
                <>
                  <SidebarMenuSubButton
                    onClick={() => toggleExpand(subId)}
                    className={cn(
                      "w-full",
                      isActiveRoute(`/subcategory/${sub.slug}`) && "bg-primary/10 text-primary font-medium"
                    )}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-3 w-3 mr-1" />
                    ) : (
                      <ChevronRight className="h-3 w-3 mr-1" />
                    )}
                    <span className="flex items-center justify-between w-full">
                      <Link
                        href={`/subcategory/${sub.slug}`}
                        className="truncate hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {sub.name}
                      </Link>
                      <span className="text-xs text-muted-foreground ml-2 shrink-0">
                        {sub.resources.length}
                      </span>
                    </span>
                  </SidebarMenuSubButton>
                  {isExpanded && renderSubSubcategories(category, sub, sub.subSubcategories)}
                </>
              ) : (
                <SidebarMenuSubButton asChild>
                  <Link
                    href={`/subcategory/${sub.slug}`}
                    className={cn(
                      "w-full",
                      isActiveRoute(`/subcategory/${sub.slug}`) && "bg-primary/10 text-primary font-medium"
                    )}
                  >
                    <span className="flex items-center justify-between w-full">
                      <span className="truncate">{sub.name}</span>
                      <span className="text-xs text-muted-foreground ml-2 shrink-0">
                        {sub.resources.length}
                      </span>
                    </span>
                  </Link>
                </SidebarMenuSubButton>
              )}
            </SidebarMenuSubItem>
          )
        })}
      </SidebarMenuSub>
    )
  }

  if (isLoading) {
    return (
      <Sidebar>
        <SidebarContent>
          <div className="p-4 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-8 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </SidebarContent>
      </Sidebar>
    )
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Video className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">Awesome Video</span>
                  <span className="text-xs text-muted-foreground">2,011 Resources</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/" className={cn(isActiveRoute("/") && "bg-primary/10 text-primary font-medium")}>
                    <Home className="h-4 w-4" />
                    <span>Home</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Categories</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredCategories.map(category => {
                const Icon = categoryIcons[category.name] || FileText
                const hasSubcategories = category.subcategories && category.subcategories.length > 0
                const isExpanded = expandedItems.includes(category.slug)

                return (
                  <SidebarMenuItem key={category.slug}>
                    {hasSubcategories ? (
                      <>
                        <SidebarMenuButton
                          onClick={() => toggleExpand(category.slug)}
                          className={cn(
                            "w-full",
                            isActiveRoute(`/category/${category.slug}`) && "bg-primary/10 text-primary font-medium"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          {isExpanded ? (
                            <ChevronDown className="h-3 w-3 ml-auto mr-1" />
                          ) : (
                            <ChevronRight className="h-3 w-3 ml-auto mr-1" />
                          )}
                          <span className="flex items-center justify-between w-full">
                            <Link
                              href={`/category/${category.slug}`}
                              className="truncate hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {category.name}
                            </Link>
                            <span className="text-xs text-muted-foreground ml-2 shrink-0">
                              {category.resources.length}
                            </span>
                          </span>
                        </SidebarMenuButton>
                        {isExpanded && renderSubcategories(category, category.subcategories)}
                      </>
                    ) : (
                      <SidebarMenuButton asChild>
                        <Link
                          href={`/category/${category.slug}`}
                          className={cn(
                            "w-full",
                            isActiveRoute(`/category/${category.slug}`) && "bg-primary/10 text-primary font-medium"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          <span className="flex items-center justify-between w-full">
                            <span className="truncate">{category.name}</span>
                            <span className="text-xs text-muted-foreground ml-2 shrink-0">
                              {category.resources.length}
                            </span>
                          </span>
                        </Link>
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <ThemeSelectorSidebar />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <a
                href="https://github.com/krzemienski/awesome-video"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                <Package className="h-4 w-4" />
                <span>View on GitHub</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      
      <SidebarRail />
    </Sidebar>
  )
}
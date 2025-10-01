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
import { useState, useEffect, useMemo } from "react"
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
  SidebarTrigger,
  useSidebar
} from "@/components/ui/sidebar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Category, Subcategory, SubSubcategory } from "@/types/awesome-list"
import ThemeSelectorSidebar from "@/components/ui/theme-selector-sidebar"
import { SidebarItemMorph, SidebarExpandableMorph, SidebarToggleMorph } from "@/components/animations/sidebar-morphing"

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
  
  // Safe access to sidebar context - it may not exist outside provider
  let isMobile = false;
  let setOpenMobile = (_: boolean) => {};
  try {
    const sidebarContext = useSidebar();
    isMobile = sidebarContext.isMobile;
    setOpenMobile = sidebarContext.setOpenMobile;
  } catch (e) {
    // Context not available, using defaults
  }

  // Filter out unwanted categories (memoized to prevent infinite useEffect loops)
  const filteredCategories = useMemo(() => 
    categories.filter(cat => 
      cat.resources.length > 0 && 
      cat.name !== "Table of contents" && 
      !cat.name.startsWith("List of") &&
      !["Contributing", "License", "External Links", "Anti-features"].includes(cat.name)
    ), [categories])

  // Auto-close sidebar on mobile when location changes
  useEffect(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [location, isMobile, setOpenMobile]);

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
                  "w-full pl-8 flex items-center gap-2 pr-3",
                  isActiveRoute(`/sub-subcategory/${subSub.slug}`) && "bg-primary/10 text-primary font-medium"
                )}
                onClick={() => isMobile && setOpenMobile(false)}
              >
                <span className="truncate flex-1">{subSub.name}</span>
                <span className="text-xs text-muted-foreground shrink-0 tabular-nums text-right min-w-[2ch] ml-auto">
                  {subSub.resources.length}
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
                  <SidebarItemMorph
                    isActive={isActiveRoute(`/subcategory/${sub.slug}`)}
                    isExpanded={isExpanded}
                  >
                    <SidebarMenuSubButton asChild>
                      <Link 
                        href={`/subcategory/${sub.slug}`} 
                        className="w-full flex items-center gap-2 pr-3"
                        onClick={() => isMobile && setOpenMobile(false)}
                      >
                        <span 
                          className="shrink-0 cursor-pointer"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            toggleExpand(subId)
                          }}
                        >
                          <SidebarToggleMorph isOpen={isExpanded} />
                        </span>
                        <span className="truncate flex-1">{sub.name}</span>
                        <span className="text-xs text-muted-foreground shrink-0 tabular-nums text-right min-w-[2ch] ml-auto">
                          {sub.resources.length}
                        </span>
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarItemMorph>
                  <SidebarExpandableMorph isExpanded={isExpanded}>
                    {renderSubSubcategories(category, sub, sub.subSubcategories)}
                  </SidebarExpandableMorph>
                </>
              ) : (
                <SidebarMenuSubButton asChild>
                  <Link
                    href={`/subcategory/${sub.slug}`}
                    className={cn(
                      "w-full flex items-center gap-2 pr-3",
                      isActiveRoute(`/subcategory/${sub.slug}`) && "bg-primary/10 text-primary font-medium"
                    )}
                    onClick={() => isMobile && setOpenMobile(false)}
                  >
                    <span className="truncate flex-1">{sub.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0 tabular-nums text-right min-w-[2ch] ml-auto">
                      {sub.resources.length}
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
              <Link href="/" onClick={() => isMobile && setOpenMobile(false)}>
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
        <ScrollArea className="flex-1">
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link 
                      href="/" 
                      className={cn(isActiveRoute("/") && "bg-primary/10 text-primary font-medium")}
                      onClick={() => isMobile && setOpenMobile(false)}
                    >
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
                          <SidebarItemMorph
                            isActive={isActiveRoute(`/category/${category.slug}`)}
                            isExpanded={isExpanded}
                          >
                            <SidebarMenuButton asChild>
                              <Link 
                                href={`/category/${category.slug}`} 
                                className="w-full flex items-center gap-2 pr-3"
                                onClick={() => isMobile && setOpenMobile(false)}
                              >
                                <Icon className="h-4 w-4 shrink-0" />
                                <span className="truncate flex-1">{category.name}</span>
                                <span 
                                  className="shrink-0 cursor-pointer ml-auto"
                                  onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    toggleExpand(category.slug)
                                  }}
                                >
                                  <SidebarToggleMorph isOpen={isExpanded} />
                                </span>
                                <span className="text-xs text-muted-foreground shrink-0 tabular-nums text-right min-w-[3ch] pl-2">
                                  {category.resources.length}
                                </span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarItemMorph>
                          <SidebarExpandableMorph isExpanded={isExpanded}>
                            {renderSubcategories(category, category.subcategories)}
                          </SidebarExpandableMorph>
                        </>
                      ) : (
                        <SidebarMenuButton asChild>
                          <Link
                            href={`/category/${category.slug}`}
                            className={cn(
                              "w-full flex items-center gap-2 pr-3",
                              isActiveRoute(`/category/${category.slug}`) && "bg-primary/10 text-primary font-medium"
                            )}
                            onClick={() => isMobile && setOpenMobile(false)}
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            <span className="truncate flex-1">{category.name}</span>
                            <span className="text-xs text-muted-foreground shrink-0 tabular-nums text-right min-w-[3ch] ml-auto">
                              {category.resources.length}
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
        </ScrollArea>
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
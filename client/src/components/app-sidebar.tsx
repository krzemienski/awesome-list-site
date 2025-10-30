import {
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
  ChevronRight,
  Moon,
  Sun,
  Palette
} from "lucide-react"
import { useState, useEffect, useMemo } from "react"
import { Link, useLocation } from "wouter"
import { cn } from "@/lib/utils"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@radix-ui/react-collapsible"

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
  SidebarRail,
  useSidebar
} from "@/components/ui/sidebar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Category, Subcategory, SubSubcategory } from "@/types/awesome-list"
import { useTheme } from "@/components/theme-provider-new"

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
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set())
  const [openSubcategories, setOpenSubcategories] = useState<Set<string>>(new Set())
  const { theme, setTheme } = useTheme()
  
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
      const timer = setTimeout(() => {
        setOpenMobile(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [location, isMobile, setOpenMobile]);

  // Auto-expand active category based on current location
  useEffect(() => {
    const pathParts = location.split('/')
    if (pathParts[1] === 'category') {
      const activeCategory = filteredCategories.find(cat => cat.slug === pathParts[2])
      if (activeCategory) {
        setOpenCategories(prev => new Set([...prev, activeCategory.slug]))
      }
    } else if (pathParts[1] === 'subcategory') {
      const activeSubcategory = pathParts[2]
      const parentCategory = filteredCategories.find(cat => 
        cat.subcategories?.some(sub => sub.slug === activeSubcategory)
      )
      if (parentCategory) {
        setOpenCategories(prev => new Set([...prev, parentCategory.slug]))
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
        setOpenCategories(prev => new Set([...prev, parentCategory!.slug]))
        setOpenSubcategories(prev => new Set([...prev, `${parentCategory!.slug}-${parentSubcategory!.slug}`]))
      }
    }
  }, [location, filteredCategories])

  const isActiveRoute = (path: string) => {
    return location === path
  }

  const handleMobileNavigation = (e: React.MouseEvent) => {
    if (isMobile) {
      e.stopPropagation();
      setTimeout(() => setOpenMobile(false), 150);
    }
  }

  const toggleTheme = () => {
    if (theme === "light") {
      setTheme("dark")
    } else if (theme === "dark") {
      setTheme("custom")
    } else {
      setTheme("light")
    }
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
              <Link href="/" onClick={handleMobileNavigation}>
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
          <SidebarMenuItem>
            <SidebarMenuButton onClick={toggleTheme} className="w-full">
              {theme === "light" ? (
                <Sun className="h-4 w-4" />
              ) : theme === "dark" ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Palette className="h-4 w-4" />
              )}
              <span className="capitalize">{theme} Theme</span>
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
                  <SidebarMenuButton asChild isActive={isActiveRoute("/")}>
                    <Link href="/" onClick={handleMobileNavigation}>
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
              {filteredCategories.map(category => {
                const Icon = categoryIcons[category.name] || FileText
                const hasSubcategories = category.subcategories && category.subcategories.length > 0
                const isOpen = openCategories.has(category.slug)

                return (
                  <Collapsible
                    key={category.slug}
                    open={isOpen}
                    onOpenChange={(open) => {
                      setOpenCategories(prev => {
                        const next = new Set(prev)
                        if (open) {
                          next.add(category.slug)
                        } else {
                          next.delete(category.slug)
                        }
                        return next
                      })
                    }}
                  >
                    <SidebarGroup className="p-0">
                      <SidebarGroupLabel asChild>
                        <div className="flex items-center">
                          <SidebarMenuButton asChild isActive={isActiveRoute(`/category/${category.slug}`)}>
                            <Link 
                              href={`/category/${category.slug}`} 
                              className="flex-1"
                              onClick={handleMobileNavigation}
                            >
                              <Icon className="h-4 w-4" />
                              <span className="flex-1">{category.name}</span>
                              <Badge variant="secondary" className="ml-auto mr-1">
                                {category.resources.length}
                              </Badge>
                            </Link>
                          </SidebarMenuButton>
                          {hasSubcategories && (
                            <CollapsibleTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-auto w-auto p-1.5 hover:bg-sidebar-accent"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ChevronRight
                                  className={cn(
                                    "h-4 w-4 transition-transform",
                                    isOpen && "rotate-90"
                                  )}
                                />
                                <span className="sr-only">Toggle</span>
                              </Button>
                            </CollapsibleTrigger>
                          )}
                        </div>
                      </SidebarGroupLabel>
                      {hasSubcategories && (
                        <CollapsibleContent>
                          <SidebarGroupContent>
                            <SidebarMenuSub>
                              {category.subcategories?.map(sub => {
                                const hasSubSubcategories = sub.subSubcategories && sub.subSubcategories.length > 0
                                const subId = `${category.slug}-${sub.slug}`
                                const isSubOpen = openSubcategories.has(subId)

                                return (
                                  <SidebarMenuSubItem key={sub.slug}>
                                    {hasSubSubcategories ? (
                                      <Collapsible
                                        open={isSubOpen}
                                        onOpenChange={(open) => {
                                          setOpenSubcategories(prev => {
                                            const next = new Set(prev)
                                            if (open) {
                                              next.add(subId)
                                            } else {
                                              next.delete(subId)
                                            }
                                            return next
                                          })
                                        }}
                                      >
                                        <div className="flex items-center">
                                          <SidebarMenuSubButton asChild isActive={isActiveRoute(`/subcategory/${sub.slug}`)}>
                                            <Link 
                                              href={`/subcategory/${sub.slug}`}
                                              className="flex-1"
                                              onClick={handleMobileNavigation}
                                            >
                                              <span className="flex-1">{sub.name}</span>
                                              <Badge variant="secondary" className="ml-auto mr-1 text-[10px] px-1.5 py-0">
                                                {sub.resources.length}
                                              </Badge>
                                            </Link>
                                          </SidebarMenuSubButton>
                                          <CollapsibleTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-auto w-auto p-1 hover:bg-sidebar-accent"
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              <ChevronRight
                                                className={cn(
                                                  "h-3 w-3 transition-transform",
                                                  isSubOpen && "rotate-90"
                                                )}
                                              />
                                              <span className="sr-only">Toggle</span>
                                            </Button>
                                          </CollapsibleTrigger>
                                        </div>
                                        <CollapsibleContent>
                                          <SidebarMenuSub className="ml-3">
                                            {sub.subSubcategories?.map(subSub => (
                                              <SidebarMenuSubItem key={subSub.slug}>
                                                <SidebarMenuSubButton asChild isActive={isActiveRoute(`/sub-subcategory/${subSub.slug}`)}>
                                                  <Link
                                                    href={`/sub-subcategory/${subSub.slug}`}
                                                    onClick={handleMobileNavigation}
                                                  >
                                                    <span className="flex-1">{subSub.name}</span>
                                                    <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0">
                                                      {subSub.resources.length}
                                                    </Badge>
                                                  </Link>
                                                </SidebarMenuSubButton>
                                              </SidebarMenuSubItem>
                                            ))}
                                          </SidebarMenuSub>
                                        </CollapsibleContent>
                                      </Collapsible>
                                    ) : (
                                      <SidebarMenuSubButton asChild isActive={isActiveRoute(`/subcategory/${sub.slug}`)}>
                                        <Link
                                          href={`/subcategory/${sub.slug}`}
                                          onClick={handleMobileNavigation}
                                        >
                                          <span className="flex-1">{sub.name}</span>
                                          <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0">
                                            {sub.resources.length}
                                          </Badge>
                                        </Link>
                                      </SidebarMenuSubButton>
                                    )}
                                  </SidebarMenuSubItem>
                                )
                              })}
                            </SidebarMenuSub>
                          </SidebarGroupContent>
                        </CollapsibleContent>
                      )}
                    </SidebarGroup>
                  </Collapsible>
                )
              })}
            </SidebarGroupContent>
          </SidebarGroup>
        </ScrollArea>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <a
                href="https://github.com/krzemienski/awesome-video"
                target="_blank"
                rel="noopener noreferrer"
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

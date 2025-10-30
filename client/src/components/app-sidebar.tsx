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
  Palette,
  Search,
  Sparkles,
  User,
  Zap,
  Github
} from "lucide-react"
import { useState, useEffect, useMemo } from "react"
import { Link, useLocation } from "wouter"
import { cn } from "@/lib/utils"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Category, Subcategory, SubSubcategory } from "@/types/awesome-list"
import { useTheme } from "@/components/theme-provider-new"
import SearchDialog from "@/components/ui/search-dialog"
import RecommendationPanel from "@/components/ui/recommendation-panel"
import UserPreferences from "@/components/ui/user-preferences"
import ColorPaletteGenerator from "@/components/ui/color-palette-generator"
import { useUserProfile } from "@/hooks/use-user-profile"

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
  const { userProfile, updateProfile, isLoaded } = useUserProfile()
  
  // Dialog states
  const [searchOpen, setSearchOpen] = useState(false)
  const [recommendationsOpen, setRecommendationsOpen] = useState(false)
  const [preferencesOpen, setPreferencesOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  
  // Safe access to sidebar context - it may not exist outside provider
  let isMobile = false;
  let setOpenMobile = (_: boolean) => {};
  let state: "expanded" | "collapsed" = "expanded";
  try {
    const sidebarContext = useSidebar();
    isMobile = sidebarContext.isMobile;
    setOpenMobile = sidebarContext.setOpenMobile;
    state = sidebarContext.state;
  } catch (e) {
    // Context not available, using defaults
  }

  // Calculate total count including all nested resources
  // This matches the logic used in HomePage for consistency
  const calculateTotalCount = (category: Category): number => {
    // Start with direct category resources
    let total = category.resources.length;
    
    // Add subcategory resources
    category.subcategories?.forEach(sub => {
      total += sub.resources.length;
      
      // Add sub-subcategory resources
      sub.subSubcategories?.forEach(subsub => {
        total += subsub.resources.length;
      });
    });
    
    return total;
  };

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

  // Flatten all resources for search
  const allResources = useMemo(() => {
    const resources: any[] = [];
    filteredCategories.forEach(category => {
      // Add category resources
      category.resources.forEach(res => {
        resources.push({
          ...res,
          category: category.name,
          subcategory: ''
        });
      });
      // Add subcategory resources
      category.subcategories?.forEach(sub => {
        sub.resources.forEach(res => {
          resources.push({
            ...res,
            category: category.name,
            subcategory: sub.name
          });
        });
        // Add sub-subcategory resources
        sub.subSubcategories?.forEach(subsub => {
          subsub.resources.forEach(res => {
            resources.push({
              ...res,
              category: category.name,
              subcategory: `${sub.name} → ${subsub.name}`
            });
          });
        });
      });
    });
    return resources;
  }, [filteredCategories]);

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
    <TooltipProvider>
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <SidebarMenuButton onClick={() => setSearchOpen(true)} className="w-full">
                    <Search className="h-4 w-4" />
                    <span>Search</span>
                    <kbd className="ml-auto hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                      <span className="text-xs">⌘</span>K
                    </kbd>
                  </SidebarMenuButton>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Search resources (⌘K)</p>
                </TooltipContent>
              </Tooltip>
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
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <SidebarMenuButton asChild isActive={isActiveRoute("/")}>
                        <Link href="/" onClick={handleMobileNavigation}>
                          <Home className="h-4 w-4" />
                          <span>Home</span>
                        </Link>
                      </SidebarMenuButton>
                    </TooltipTrigger>
                    <TooltipContent side="right">Home</TooltipContent>
                  </Tooltip>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <SidebarMenuButton asChild isActive={isActiveRoute("/advanced")}>
                        <Link href="/advanced" onClick={handleMobileNavigation}>
                          <Zap className="h-4 w-4" />
                          <span>Advanced Features</span>
                        </Link>
                      </SidebarMenuButton>
                    </TooltipTrigger>
                    <TooltipContent side="right">Advanced Features</TooltipContent>
                  </Tooltip>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <SidebarMenuButton onClick={() => setRecommendationsOpen(true)}>
                        <Sparkles className="h-4 w-4" />
                        <span>AI Recommendations</span>
                      </SidebarMenuButton>
                    </TooltipTrigger>
                    <TooltipContent side="right">AI-Powered Recommendations</TooltipContent>
                  </Tooltip>
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
                const totalCount = calculateTotalCount(category)

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
                                {totalCount}
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
            <Tooltip>
              <TooltipTrigger asChild>
                <SidebarMenuButton onClick={() => setPreferencesOpen(true)}>
                  <User className="h-4 w-4" />
                  <span>Preferences</span>
                </SidebarMenuButton>
              </TooltipTrigger>
              <TooltipContent side="right">User Preferences</TooltipContent>
            </Tooltip>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Tooltip>
              <TooltipTrigger asChild>
                <SidebarMenuButton onClick={toggleTheme}>
                  {theme === "light" ? (
                    <Sun className="h-4 w-4" />
                  ) : theme === "dark" ? (
                    <Moon className="h-4 w-4" />
                  ) : (
                    <Palette className="h-4 w-4" />
                  )}
                  <span className="capitalize">{theme} Theme</span>
                </SidebarMenuButton>
              </TooltipTrigger>
              <TooltipContent side="right">Switch Theme</TooltipContent>
            </Tooltip>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Tooltip>
              <TooltipTrigger asChild>
                <SidebarMenuButton onClick={() => setPaletteOpen(true)}>
                  <Palette className="h-4 w-4" />
                  <span>Customize Colors</span>
                </SidebarMenuButton>
              </TooltipTrigger>
              <TooltipContent side="right">Color Palette Generator</TooltipContent>
            </Tooltip>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Tooltip>
              <TooltipTrigger asChild>
                <SidebarMenuButton asChild>
                  <a
                    href="https://github.com/krzemienski/awesome-video"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Github className="h-4 w-4" />
                    <span>View on GitHub</span>
                  </a>
                </SidebarMenuButton>
              </TooltipTrigger>
              <TooltipContent side="right">View on GitHub</TooltipContent>
            </Tooltip>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      
      <SidebarRail />
    </Sidebar>
    
    {/* All Dialog Components */}
    <SearchDialog isOpen={searchOpen} setIsOpen={setSearchOpen} resources={allResources} />
    
    <Dialog open={recommendationsOpen} onOpenChange={setRecommendationsOpen}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI-Powered Recommendations
          </DialogTitle>
        </DialogHeader>
        {isLoaded && (
          <RecommendationPanel 
            userProfile={userProfile}
            onResourceClick={(resourceId) => {
              setRecommendationsOpen(false)
              window.open(resourceId, '_blank')
            }}
          />
        )}
      </DialogContent>
    </Dialog>
    
    {isLoaded && (
      <UserPreferences
        userProfile={userProfile}
        onProfileUpdate={updateProfile}
        availableCategories={filteredCategories.map(cat => cat.name)}
        open={preferencesOpen}
        onOpenChange={setPreferencesOpen}
      />
    )}
    
    <ColorPaletteGenerator
      isOpen={paletteOpen}
      onClose={() => setPaletteOpen(false)}
      onPaletteGenerated={(palette) => {
        console.log('Palette generated:', palette)
        setPaletteOpen(false)
      }}
    />
  </TooltipProvider>
  )
}

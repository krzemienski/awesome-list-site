import { useState, useEffect } from "react";
import { useLocation, useRoute, Link } from "wouter";
import { 
  Sidebar, 
  SidebarProvider, 
  SidebarHeader, 
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarFooter
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Home, Folder, ExternalLink, Menu, Sparkles, Zap, Shield, Plus } from "lucide-react";
import { slugify, getCategorySlug } from "@/lib/utils";
import { Category, Resource } from "@/types/awesome-list";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUserProfile } from "@/hooks/use-user-profile";
import RecommendationPanel from "@/components/ui/recommendation-panel";
import { getCategoryIcon, getSubcategoryIcon, getSubSubcategoryIcon } from "@/config/navigation-icons";

interface ModernSidebarProps {
  title: string;
  categories: Category[];
  resources: Resource[];
  isLoading: boolean;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  user?: any;
}

export default function ModernSidebar({ title, categories, resources, isLoading, isOpen, setIsOpen, user }: ModernSidebarProps) {
  const [location, setLocation] = useLocation();
  const [openCategories, setOpenCategories] = useState<string[]>([]);
  const [recommendationsOpen, setRecommendationsOpen] = useState(false);
  const isMobile = useIsMobile();
  const { userProfile } = useUserProfile();

  // Active route helper for navigation highlighting
  const isActiveRoute = (path: string) => {
    return location === path || location.startsWith(path + "/");
  };

  // Show true hierarchical structure from JSON data - categories with their actual subcategories
  const getHierarchicalCategories = (categories: Category[]) => {
    console.log("🏗️ BUILDING TRUE HIERARCHICAL NAVIGATION FROM JSON DATA");
    console.log("📊 Total categories:", categories.length);
    
    // Only filter out unwanted system categories, NOT by resource count
    // Resources are denormalized to subcategories, so top-level may have 0 resources
    const filteredCategories = categories.filter(cat => 
      cat.name !== "Table of contents" && 
      !cat.name.startsWith("List of") &&
      !["Contributing", "License", "External Links", "Anti-features"].includes(cat.name)
    );
    
    console.log("✅ Filtered categories:", filteredCategories.length);
    console.log("📝 Available categories:", filteredCategories.map(c => `${c.name} (${c.resources.length} resources)`));

    // Calculate total navigation items for comprehensive testing (including sub-subcategories)
    const totalSubcategories = filteredCategories.reduce((total, cat) => total + (cat.subcategories?.length || 0), 0);
    const totalSubSubcategories = filteredCategories.reduce((total, cat) => 
      total + (cat.subcategories?.reduce((subTotal, sub) => subTotal + (sub.subSubcategories?.length || 0), 0) || 0), 0
    );
    console.log(`🧮 Total navigation items: ${filteredCategories.length} categories + ${totalSubcategories} subcategories + ${totalSubSubcategories} sub-subcategories = ${filteredCategories.length + totalSubcategories + totalSubSubcategories} items`);

    console.log("🎯 HIERARCHICAL NAVIGATION STRUCTURE:");
    filteredCategories.forEach(cat => {
      console.log(`📁 ${cat.name} (${cat.resources.length} resources) -> /category/${cat.slug}`);
      if (cat.subcategories && cat.subcategories.length > 0) {
        cat.subcategories.forEach(sub => {
          console.log(`  ├── ${sub.name} (${sub.resources.length} resources) -> /subcategory/${sub.slug}`);
          if (sub.subSubcategories && sub.subSubcategories.length > 0) {
            sub.subSubcategories.forEach(subSub => {
              console.log(`    ├── ${subSub.name} (${subSub.resources.length} resources) -> /sub-subcategory/${subSub.slug}`);
            });
          }
        });
      }
    });
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // Return the original categories structure for proper hierarchical display
    return filteredCategories;
  };
  
  // Set initially open categories based on URL
  useEffect(() => {
    if (categories.length > 0) {
      const path = location.split('/');
      if (path[1] === 'category' || path[1] === 'subcategory') {
        const slug = path[2];
        const matchingCategory = categories.find(cat => 
          getCategorySlug(cat.name) === slug || 
          cat.subcategories?.some(sub => sub.slug === slug)
        );
        
        if (matchingCategory) {
          setOpenCategories(prev => {
            // Only add if not already in the array
            if (!prev.includes(matchingCategory.name)) {
              return [...prev, matchingCategory.name];
            }
            return prev;
          });
        }
      } else if (path[1] === '') {
        // Don't force open any categories on home page - let user control it
        // setOpenCategories([]);
      }
    }
  }, [categories, location]);
  
  // This function will properly toggle the sidebar on mobile
  const handleSidebarToggle = () => {
    setIsOpen(!isOpen);
  };
  
  // Toggle category open state with scroll-into-view for mobile
  const toggleCategory = (category: string, event?: React.MouseEvent) => {
    setOpenCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category) 
        : [...prev, category]
    );
    
    // On mobile, scroll the clicked element into view
    // Save reference before setTimeout to avoid React event pooling issues
    if (isMobile && event?.currentTarget) {
      const element = event.currentTarget as HTMLElement;
      setTimeout(() => {
        if (element) {
          element.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'nearest',
            inline: 'nearest'
          });
        }
      }, 100);
    }
  };

  // Navigation helper to close mobile sidebar after clicking
  const navigate = (path: string) => {
    setLocation(path);
    if (isMobile) {
      setIsOpen(false);
    }
  };

  // Sidebar content to reuse in both mobile and desktop views
  const sidebarContent = (
    <>
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 scroll-smooth">
        <div className="space-y-1 mb-4 pb-3 border-b border-border">
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start font-normal",
              location === "/" ? "bg-accent text-accent-foreground" : ""
            )}
            onClick={() => navigate('/')}
          >
            <Home className="mr-2 h-4 w-4" />
            Home
          </Button>
          
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start font-normal bg-pink-500/10 hover:bg-pink-500/20 text-pink-500",
              isActiveRoute("/submit") ? "bg-pink-500/20" : ""
            )}
            onClick={() => navigate('/submit')}
            data-testid="nav-submit-resource"
          >
            <Plus className="mr-2 h-4 w-4" />
            Submit Resource
          </Button>
          
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start font-normal",
              isActiveRoute("/advanced") ? "bg-accent text-accent-foreground" : ""
            )}
            onClick={() => navigate('/advanced')}
          >
            <Zap className="mr-2 h-4 w-4" />
            Advanced Features
          </Button>
          
          <Button
            variant="ghost"
            className="w-full justify-start font-normal"
            onClick={() => setRecommendationsOpen(true)}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            AI Recommendations
          </Button>

          {user?.role === "admin" && (
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start font-normal",
                isActiveRoute("/admin") ? "bg-accent text-accent-foreground" : ""
              )}
              onClick={() => navigate('/admin')}
            >
              <Shield className="mr-2 h-4 w-4" />
              Admin Dashboard
            </Button>
          )}
        </div>
        
        {isLoading ? (
          <div className="space-y-3">
            {Array(5).fill(0).map((_, i) => (
              <div key={i} className="pb-1">
                <Skeleton className="h-10 w-full mb-2" />
                <div className="pl-6">
                  <Skeleton className="h-8 w-4/5 mb-1" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            {/* True hierarchical categories with subcategories from JSON data */}
            {getHierarchicalCategories(categories)
              .map((category: Category) => (
              <div key={category.name} className="mb-2">
                {/* Main Category - Always expandable to show hierarchy */}
                <div className="flex items-center w-full">
                  <button
                    className="p-2 mr-1 min-h-[44px] min-w-[44px] flex items-center justify-center flex-shrink-0 touch-manipulation hover:bg-accent/50 rounded active:bg-accent"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleCategory(category.name, e);
                    }}
                    aria-label={`${openCategories.includes(category.name) ? 'Collapse' : 'Expand'} ${category.name}`}
                  >
                    <div className={cn(
                      "transform transition-transform duration-200",
                      openCategories.includes(category.name) ? "rotate-90" : ""
                    )}>
                      <span className="text-sm">▶</span>
                    </div>
                  </button>
                  <Button
                    variant="ghost"
                    className={cn(
                      "flex-1 justify-start font-normal text-sm py-2 px-2 min-h-[44px] touch-manipulation overflow-hidden",
                      location === `/category/${getCategorySlug(category.name)}` 
                        ? "bg-accent text-accent-foreground" 
                        : ""
                    )}
                    onClick={() => navigate(`/category/${getCategorySlug(category.name)}`)}
                  >
                    <div className="flex items-start gap-2 w-full min-w-0">
                      {(() => {
                        const IconComponent = getCategoryIcon(category.name);
                        return <IconComponent className="h-4 w-4 flex-shrink-0 mt-0.5" />;
                      })()}
                      <span className="break-words flex-1 text-left min-w-0 leading-tight">{category.name}</span>
                      <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded ml-2 flex-shrink-0 self-start">
                        {category.resources.length}
                      </span>
                    </div>
                  </Button>
                </div>
                
                {/* Subcategories - Show when category is expanded */}
                {category.subcategories && category.subcategories.length > 0 && openCategories.includes(category.name) && (
                  <div className="ml-6 mt-1 space-y-1 border-l border-muted pl-3">
                    {category.subcategories.map((subcategory: any) => (
                      <div key={subcategory.name}>
                        {/* Level 2: Subcategory */}
                        <div className="flex items-center w-full">
                          {/* Expand button for Level 3 if subSubcategories exist */}
                          {subcategory.subSubcategories && subcategory.subSubcategories.length > 0 ? (
                            <button
                              className="p-2 mr-1 min-h-[44px] min-w-[44px] flex items-center justify-center flex-shrink-0 touch-manipulation hover:bg-accent/50 rounded active:bg-accent"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                toggleCategory(`${category.name}-${subcategory.name}`, e);
                              }}
                              aria-label={`${openCategories.includes(`${category.name}-${subcategory.name}`) ? 'Collapse' : 'Expand'} ${subcategory.name}`}
                            >
                              <div className={cn(
                                "transform transition-transform duration-200",
                                openCategories.includes(`${category.name}-${subcategory.name}`) ? "rotate-90" : ""
                              )}>
                                <span className="text-sm">▶</span>
                              </div>
                            </button>
                          ) : (
                            <div className="min-w-[44px] h-[44px] flex-shrink-0"></div>
                          )}
                          <Button
                            variant="ghost"
                            className={cn(
                              "flex-1 justify-start font-normal text-sm py-1.5 px-2 min-h-[44px] touch-manipulation overflow-hidden",
                              location === `/subcategory/${subcategory.slug}` 
                                ? "bg-accent text-accent-foreground" 
                                : ""
                            )}
                            onClick={() => navigate(`/subcategory/${subcategory.slug}`)}
                            data-testid={`nav-subcategory-${subcategory.slug}`}
                          >
                            <div className="flex items-start gap-2 w-full min-w-0">
                              {(() => {
                                const IconComponent = getSubcategoryIcon(subcategory.name);
                                return <IconComponent className="h-4 w-4 flex-shrink-0 mt-0.5" />;
                              })()}
                              <span className="break-words flex-1 text-left min-w-0 leading-tight">{subcategory.name}</span>
                              <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded ml-2 flex-shrink-0 self-start">
                                {subcategory.resources.length}
                              </span>
                            </div>
                          </Button>
                        </div>
                        
                        {/* Level 3: Sub-subcategories */}
                        {subcategory.subSubcategories && subcategory.subSubcategories.length > 0 && 
                         openCategories.includes(`${category.name}-${subcategory.name}`) && (
                          <div className="ml-6 mt-1 space-y-1 border-l border-muted/50 pl-3">
                            {subcategory.subSubcategories.map((subSubcategory: any) => (
                              <Button
                                key={subSubcategory.name}
                                variant="ghost"
                                className={cn(
                                  "w-full justify-start font-normal text-xs py-1 px-2 min-h-[44px] touch-manipulation overflow-hidden",
                                  location === `/sub-subcategory/${subSubcategory.slug}` 
                                    ? "bg-accent text-accent-foreground" 
                                    : ""
                                )}
                                onClick={() => navigate(`/sub-subcategory/${subSubcategory.slug}`)}
                                data-testid={`nav-sub-subcategory-${subSubcategory.slug}`}
                              >
                                <div className="flex items-start gap-2 w-full min-w-0">
                                  {(() => {
                                    const IconComponent = getSubSubcategoryIcon(subSubcategory.name);
                                    return <IconComponent className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />;
                                  })()}
                                  <span className="break-words flex-1 text-left min-w-0 leading-tight">{subSubcategory.name}</span>
                                  <span className="text-xs bg-muted/80 text-muted-foreground px-1 py-0.5 rounded ml-2 flex-shrink-0 self-start">
                                    {subSubcategory.resources.length}
                                  </span>
                                </div>
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="border-t border-border p-3">
        <Button variant="ghost" className="w-full justify-start" asChild>
          <a href={title.includes("Selfhosted") 
              ? "https://github.com/awesome-selfhosted/awesome-selfhosted" 
              : "https://github.com/krzemienski/awesome-video"} 
             target="_blank" 
             rel="noopener noreferrer">
            <ExternalLink className="mr-2 h-4 w-4" />
            GitHub Repository
          </a>
        </Button>
      </div>
    </>
  );

  // Mobile sidebar with sheet component
  if (isMobile) {
    return (
      <>
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetContent side="left" className="p-0 w-[85vw] max-w-[380px]">
            <div className="flex flex-col h-full">
              {sidebarContent}
            </div>
          </SheetContent>
        </Sheet>
        
        <Dialog open={recommendationsOpen} onOpenChange={setRecommendationsOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                AI-Powered Recommendations
              </DialogTitle>
            </DialogHeader>
            {userProfile ? (
              <RecommendationPanel 
                userProfile={userProfile}
                resources={resources}
                onResourceClick={(resourceId) => {
                  setRecommendationsOpen(false);
                  window.open(resourceId, '_blank');
                }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <Sparkles className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Set Up Your Profile</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-md">
                  Create your personalized profile to get AI-powered recommendations tailored to your learning goals and interests.
                </p>
                <Button 
                  onClick={() => {
                    setRecommendationsOpen(false);
                    navigate('/advanced');
                  }}
                  className="flex items-center gap-2"
                >
                  <Zap className="h-4 w-4" />
                  Go to Preferences
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Desktop sidebar using shadcn Sidebar component (in-flow, not fixed)
  return (
    <>
      <Sidebar variant="sidebar" collapsible="none" style={{ "--sidebar-width": "16rem" } as React.CSSProperties}>
        <SidebarContent>
          {sidebarContent}
        </SidebarContent>
        <SidebarFooter>
          <div className="border-t border-border p-3">
            <Button variant="ghost" className="w-full justify-start" asChild>
              <a href={title.includes("Selfhosted") 
                  ? "https://github.com/awesome-selfhosted/awesome-selfhosted" 
                  : "https://github.com/krzemienski/awesome-video"} 
                 target="_blank" 
                 rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                GitHub Repository
              </a>
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>
      
      <Dialog open={recommendationsOpen} onOpenChange={setRecommendationsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              AI-Powered Recommendations
            </DialogTitle>
          </DialogHeader>
          {userProfile ? (
            <RecommendationPanel 
              userProfile={userProfile}
              resources={resources}
              onResourceClick={(resourceId) => {
                setRecommendationsOpen(false);
                window.open(resourceId, '_blank');
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Sparkles className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Set Up Your Profile</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md">
                Create your personalized profile to get AI-powered recommendations tailored to your learning goals and interests.
              </p>
              <Button 
                onClick={() => {
                  setRecommendationsOpen(false);
                  navigate('/advanced');
                }}
                className="flex items-center gap-2"
              >
                <Zap className="h-4 w-4" />
                Go to Preferences
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
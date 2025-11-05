import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { 
  Sidebar, 
  SidebarProvider, 
  SidebarTrigger, 
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
import { Home, Folder, ExternalLink, Menu } from "lucide-react";
import { slugify, getCategorySlug } from "@/lib/utils";
import { Category } from "@/types/awesome-list";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface ModernSidebarProps {
  title: string;
  categories: Category[];
  isLoading: boolean;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export default function ModernSidebar({ title, categories, isLoading, isOpen, setIsOpen }: ModernSidebarProps) {
  const [location] = useLocation();
  const [openCategories, setOpenCategories] = useState<string[]>([]);
  const isMobile = useIsMobile();

  // Show true hierarchical structure from JSON data - categories with their actual subcategories
  const getHierarchicalCategories = (categories: Category[]) => {
    console.log("🏗️ BUILDING TRUE HIERARCHICAL NAVIGATION FROM JSON DATA");
    console.log("📊 Total categories:", categories.length);
    
    const filteredCategories = categories.filter(cat => 
      cat.resources.length > 0 && 
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
  
  // Toggle category open state
  const toggleCategory = (category: string) => {
    setOpenCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category) 
        : [...prev, category]
    );
  };

  // Navigation helper to close mobile sidebar after clicking
  const navigate = (path: string) => {
    window.location.href = path;
    if (isMobile) {
      setIsOpen(false);
    }
  };

  // Sidebar content to reuse in both mobile and desktop views
  const sidebarContent = (
    <>
      <div className="flex-1 overflow-auto p-3">
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start font-normal mb-3",
            location === "/" ? "bg-accent text-accent-foreground" : ""
          )}
          onClick={() => navigate('/')}
        >
          <Home className="mr-2 h-4 w-4" />
          Home
        </Button>
        
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
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-1 mr-1 h-6 w-6 flex-shrink-0"
                    onClick={() => toggleCategory(category.name)}
                  >
                    <div className={cn(
                      "transform transition-transform duration-200",
                      openCategories.includes(category.name) ? "rotate-90" : ""
                    )}>
                      <span className="text-xs">▶</span>
                    </div>
                  </Button>
                  <Button
                    variant="ghost"
                    className={cn(
                      "flex-1 justify-start font-normal text-sm py-2 px-2 min-h-[36px]",
                      location === `/category/${getCategorySlug(category.name)}` 
                        ? "bg-accent text-accent-foreground" 
                        : ""
                    )}
                    onClick={() => navigate(`/category/${getCategorySlug(category.name)}`)}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <Folder className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate flex-1 text-left">{category.name}</span>
                      <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded ml-auto flex-shrink-0">
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
                            <Button
                              variant="ghost"
                              size="sm"
                              className="p-1 mr-1 h-5 w-5 flex-shrink-0"
                              onClick={() => toggleCategory(`${category.name}-${subcategory.name}`)}
                            >
                              <div className={cn(
                                "transform transition-transform duration-200",
                                openCategories.includes(`${category.name}-${subcategory.name}`) ? "rotate-90" : ""
                              )}>
                                <span className="text-xs">▶</span>
                              </div>
                            </Button>
                          ) : (
                            <div className="w-6 h-5 flex-shrink-0"></div>
                          )}
                          <Button
                            variant="ghost"
                            className={cn(
                              "flex-1 justify-start font-normal text-sm py-1.5 px-2 min-h-[32px]",
                              location === `/subcategory/${subcategory.slug}` 
                                ? "bg-accent text-accent-foreground" 
                                : ""
                            )}
                            onClick={() => navigate(`/subcategory/${subcategory.slug}`)}
                          >
                            <div className="flex items-center gap-2 w-full">
                              <span className="w-2 h-2 rounded-full bg-muted-foreground/40 flex-shrink-0"></span>
                              <span className="truncate flex-1 text-left">{subcategory.name}</span>
                              <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded ml-auto flex-shrink-0">
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
                                  "w-full justify-start font-normal text-xs py-1 px-2 min-h-[28px]",
                                  location === `/sub-subcategory/${subSubcategory.slug}` 
                                    ? "bg-accent text-accent-foreground" 
                                    : ""
                                )}
                                onClick={() => navigate(`/sub-subcategory/${subSubcategory.slug}`)}
                              >
                                <div className="flex items-center gap-2 w-full">
                                  <span className="w-1 h-1 rounded-full bg-muted-foreground/30 flex-shrink-0"></span>
                                  <span className="truncate flex-1 text-left">{subSubcategory.name}</span>
                                  <span className="text-xs bg-muted/80 text-muted-foreground px-1 py-0.5 rounded ml-auto flex-shrink-0">
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
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="left" className="p-0 w-[280px] sm:w-[320px]">
          <div className="flex flex-col h-full">
            {sidebarContent}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop sidebar with regular div
  return (
    <div className={cn(
      "fixed inset-y-0 left-0 z-40 w-64 bg-background border-r border-border flex flex-col transition-transform duration-300 ease-in-out",
      isOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      {sidebarContent}
    </div>
  );
}
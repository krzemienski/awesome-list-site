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
import { slugify, getCategorySlug, getSubcategorySlug } from "@/lib/utils";
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

  // Build hierarchical categories based on CSV structure with accurate project counts
  const getHierarchicalCategories = (categories: Category[]) => {
    console.log("🏗️ BUILDING HIERARCHICAL STRUCTURE FROM CSV DATA");
    console.log("📊 Original flat categories count:", categories.length);
    
    const filteredCategories = categories.filter(cat => 
      cat.resources.length > 0 && 
      cat.name !== "Table of contents" && 
      !cat.name.startsWith("List of") &&
      !["Contributing", "License", "External Links", "Anti-features"].includes(cat.name)
    );
    
    console.log("✅ Filtered categories count:", filteredCategories.length);
    console.log("📝 Available categories:", filteredCategories.map(c => `${c.name} (${c.resources.length} resources)`));

    // CSV-based hierarchical structure with 9 main categories
    const hierarchicalStructure = [
      {
        name: "Community & Events",
        subcategories: [
          { name: "Community Groups", children: ["Online Forums", "Slack & Meetups"] },
          { name: "Events & Conferences", children: ["Conferences", "Podcasts & Webinars"] }
        ]
      },
      {
        name: "Encoding & Codecs", 
        subcategories: [
          { name: "Codecs", children: ["AV1", "HEVC", "VP9"] },
          { name: "Encoding Tools", children: ["FFMPEG", "Other Encoders"] }
        ]
      },
      {
        name: "General Tools",
        subcategories: [
          { name: "DRM" },
          { name: "FFMPEG & Tools" }
        ]
      },
      {
        name: "Infrastructure & Delivery",
        subcategories: [
          { name: "Cloud & CDN", children: ["CDN Integration", "Cloud Platforms"] },
          { name: "Streaming Servers", children: ["Origin Servers", "Storage Solutions"] }
        ]
      },
      {
        name: "Intro & Learning",
        subcategories: [
          { name: "Introduction" },
          { name: "Learning Resources" },
          { name: "Tutorials & Case Studies" }
        ]
      },
      {
        name: "Media Tools",
        subcategories: [
          { name: "Ads & QoE", children: ["Advertising", "Quality & Testing"] },
          { name: "Audio & Subtitles", children: ["Audio", "Subtitles & Captions"] }
        ]
      },
      {
        name: "Players & Clients",
        subcategories: [
          { name: "Hardware Players", children: ["Chromecast", "Roku", "Smart TVs"] },
          { name: "Mobile & Web Players", children: ["Android", "iOS/tvOS", "Web Players"] }
        ]
      },
      {
        name: "Protocols & Transport",
        subcategories: [
          { name: "Adaptive Streaming", children: ["DASH", "HLS"] },
          { name: "Transport Protocols", children: ["RIST", "RTMP", "SRT"] }
        ]
      },
      {
        name: "Standards & Industry",
        subcategories: [
          { name: "Specs & Standards", children: ["MPEG & Forums", "Official Specs"] },
          { name: "Vendors & HDR", children: ["HDR Guidelines", "Vendor Docs"] }
        ]
      }
    ];

    const hierarchicalCategories: Category[] = [];
    const processedNames = new Set<string>();

    // Build hierarchical categories with accurate project counts
    console.log("🏗️ Building hierarchical structure from CSV data...");
    hierarchicalStructure.forEach(mainCat => {
      const matchingMainCategory = filteredCategories.find(cat => cat.name === mainCat.name);
      
      if (matchingMainCategory) {
        console.log(`📁 Processing: ${mainCat.name}`);
        
        // Start with main category resources
        let totalResources = [...matchingMainCategory.resources];
        const hierarchicalSubs: any[] = [];
        
        // Process level 2 subcategories
        mainCat.subcategories.forEach(subCat => {
          const matchingSubCategory = filteredCategories.find(cat => cat.name === subCat.name);
          
          if (matchingSubCategory) {
            console.log(`  📄 Level 2: ${subCat.name} (${matchingSubCategory.resources.length} direct resources)`);
            
            // Collect subcategory resources and children
            let subcategoryResources = [...matchingSubCategory.resources];
            const subSubcategories: any[] = [];
            
            // Process level 3 children if they exist
            if (subCat.children) {
              subCat.children.forEach(childName => {
                const matchingChild = filteredCategories.find(cat => cat.name === childName);
                if (matchingChild) {
                  console.log(`    └── Level 3: ${childName} (${matchingChild.resources.length} resources)`);
                  subcategoryResources = subcategoryResources.concat(matchingChild.resources);
                  subSubcategories.push({
                    name: childName,
                    resources: matchingChild.resources
                  });
                  processedNames.add(childName);
                }
              });
            }
            
            hierarchicalSubs.push({
              name: subCat.name,
              resources: subcategoryResources,
              subcategories: subSubcategories
            });
            
            // Add subcategory resources to main category total
            totalResources = totalResources.concat(subcategoryResources);
            processedNames.add(subCat.name);
          }
        });
        
        // Create hierarchical category with accurate counts
        hierarchicalCategories.push({
          name: mainCat.name,
          slug: getCategorySlug(mainCat.name),
          resources: totalResources,
          subcategories: hierarchicalSubs
        });
        
        processedNames.add(mainCat.name);
        console.log(`✅ ${mainCat.name}: ${totalResources.length} total resources across ${hierarchicalSubs.length} subcategories`);
      }
    });

    // Add any unprocessed categories
    const remainingCategories = filteredCategories.filter(cat => !processedNames.has(cat.name));
    if (remainingCategories.length > 0) {
      console.log("📌 Adding remaining categories:", remainingCategories.map(c => c.name));
      hierarchicalCategories.push(...remainingCategories);
    }

    console.log("🎉 HIERARCHICAL STRUCTURE COMPLETE:");
    hierarchicalCategories.forEach((cat, index) => {
      console.log(`${index + 1}. 📁 ${cat.name} (${cat.resources.length} total resources)`);
      if (cat.subcategories && cat.subcategories.length > 0) {
        cat.subcategories.forEach((sub, subIndex) => {
          console.log(`   ${subIndex + 1}. 📄 ${sub.name} (${sub.resources.length} resources)`);
        });
      }
    });
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    return hierarchicalCategories;
  };
  
  // Set initially open categories based on URL
  useEffect(() => {
    if (categories.length > 0) {
      const path = location.split('/');
      if (path[1] === 'category' || path[1] === 'subcategory') {
        const slug = path[2];
        const matchingCategory = categories.find(cat => 
          getCategorySlug(cat.name) === slug || 
          cat.subcategories?.some(sub => getSubcategorySlug(cat.name, sub.name) === slug)
        );
        
        if (matchingCategory) {
          setOpenCategories(prev => [...prev, matchingCategory.name]);
        }
      } else if (path[1] === '') {
        // Open first category on home page
        if (categories[0]) {
          setOpenCategories([categories[0].name]);
        }
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
            {/* Real categories with proper hierarchical organization */}
            {getHierarchicalCategories(categories)
              .map(category => (
              <Accordion
                key={category.name}
                type="multiple"
                value={openCategories}
                className="w-full"
              >
                <AccordionItem value={category.name} className="border-0">
                  <AccordionTrigger
                    onClick={() => toggleCategory(category.name)}
                    className="py-2 px-2 text-sm hover:bg-accent hover:text-accent-foreground rounded-md"
                  >
                    <div className="flex items-center gap-2">
                      <Folder className="h-4 w-4" />
                      <span>{category.name}</span>
                    </div>
                  </AccordionTrigger>
                  
                  <AccordionContent className="pb-1 pl-4">
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start font-normal text-sm mb-1",
                        location === `/category/${getCategorySlug(category.name)}` 
                          ? "bg-accent text-accent-foreground" 
                          : ""
                      )}
                      onClick={() => navigate(`/category/${getCategorySlug(category.name)}`)}
                    >
                      All ({category.resources.length})
                    </Button>
                    
                    {/* Render subcategories if they exist - Level 2 */}
                    {category.subcategories && category.subcategories.length > 0 && (
                      <div className="mt-1 space-y-1">
                        {category.subcategories.map(subcategory => (
                          <div key={subcategory.name}>
                            <Button
                              variant="ghost"
                              className={cn(
                                "w-full justify-start font-normal text-xs pl-4",
                                location === `/subcategory/${getSubcategorySlug(category.name, subcategory.name)}` 
                                  ? "bg-accent text-accent-foreground" 
                                  : "text-muted-foreground hover:text-foreground"
                              )}
                              onClick={() => navigate(`/subcategory/${getSubcategorySlug(category.name, subcategory.name)}`)}
                            >
                              <div className="flex items-center gap-2 w-full">
                                <div className="w-2 h-2 rounded-full bg-muted-foreground/40 flex-shrink-0" />
                                <span className="truncate">{subcategory.name}</span>
                                <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded ml-auto">
                                  {subcategory.resources.length}
                                </span>
                              </div>
                            </Button>
                            
                            {/* Render sub-subcategories if they exist - Level 3 */}
                            {subcategory.subcategories && subcategory.subcategories.length > 0 && (
                              <div className="mt-1 space-y-1 pl-6">
                                {subcategory.subcategories.map(subSubcategory => (
                                  <Button
                                    key={subSubcategory.name}
                                    variant="ghost"
                                    className={cn(
                                      "w-full justify-start font-normal text-xs pl-2",
                                      location === `/subcategory/${getSubcategorySlug(subcategory.name, subSubcategory.name)}` 
                                        ? "bg-accent text-accent-foreground" 
                                        : "text-muted-foreground/70 hover:text-foreground"
                                    )}
                                    onClick={() => navigate(`/subcategory/${getSubcategorySlug(subcategory.name, subSubcategory.name)}`)}
                                  >
                                    <div className="flex items-center gap-2 w-full">
                                      <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 flex-shrink-0" />
                                      <span className="truncate text-[11px]">{subSubcategory.name}</span>
                                      <span className="text-[10px] bg-muted/50 text-muted-foreground px-1 py-0.5 rounded ml-auto">
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
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
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
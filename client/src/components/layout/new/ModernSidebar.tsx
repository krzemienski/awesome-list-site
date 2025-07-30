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
import { Home, Folder, ExternalLink, Menu, Palette } from "lucide-react";
import { slugify, getCategorySlug, getSubcategorySlug } from "@/lib/utils";
import { Category } from "@/types/awesome-list";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import SidebarCustomizer, { useSidebarSettings } from "@/components/sidebar/SidebarCustomizer";

interface ModernSidebarProps {
  title: string;
  categories: Category[];
  isLoading: boolean;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export default function ModernSidebar({ title, categories, isLoading, isOpen, setIsOpen }: ModernSidebarProps) {
  const [location, setLocation] = useLocation();
  const [openCategories, setOpenCategories] = useState<string[]>([]);
  const isMobile = useIsMobile();
  
  // Sidebar customization settings
  const { settings, updateSettings, getOrganizedCategories: applySidebarSettings } = useSidebarSettings(categories);

  // Organize categories with proper hierarchy for media/streaming tech
  const getOrganizedCategories = (categories: Category[]) => {
    console.log("🏗️ ORGANIZING NAVIGATION HIERARCHY");
    console.log("📊 Original categories count:", categories.length);
    
    const filteredCategories = categories.filter(cat => 
      cat.resources.length > 0 && 
      cat.name !== "Table of contents" && 
      !cat.name.startsWith("List of") &&
      !["Contributing", "License", "External Links", "Anti-features"].includes(cat.name)
    );
    
    console.log("✅ Filtered categories count:", filteredCategories.length);
    console.log("📝 Available categories:", filteredCategories.map(c => `${c.name} (${c.resources.length} resources)`));

    // Define the proper hierarchical order for media streaming tech based on production screenshots
    const hierarchyOrder = [
      // Learning & Introduction (top level as shown in screenshots)
      "Intro & Learning",
      "Tutorials & Case Studies",
      
      // Core Infrastructure (as shown: Encoding Tools contains FFMPEG)
      "Encoding Tools", 
      "FFMPEG",
      "Codecs",
      "VP9",
      "AV1",
      
      // Streaming & Delivery
      "Adaptive Streaming",
      "Streaming Servers", 
      "Protocols & Transport",
      "Cloud & CDN",
      "CDN Integration",
      "Infrastructure & Delivery",
      
      // Players & Clients
      "Players & Clients",
      "Web Players",
      "Mobile & Web Players",
      
      // Standards & Documentation
      "Official Specs",
      "Standards & Industry",
      
      // Everything else
      "Other"
    ];

    // Group categories by their hierarchical position
    const organizedCategories: Category[] = [];
    const processedNames = new Set<string>();

    // Process categories in hierarchical order
    console.log("🔄 Processing hierarchy order...");
    hierarchyOrder.forEach(orderName => {
      const matchingCategories = filteredCategories.filter(cat => 
        cat.name === orderName && !processedNames.has(cat.name)
      );
      
      if (matchingCategories.length > 0) {
        console.log(`🎯 Processing "${orderName}" - found ${matchingCategories.length} matching categories`);
      }
      
      matchingCategories.forEach(cat => {
        // Special handling for Encoding Tools - make FFMPEG a subcategory 
        if (orderName === "Encoding Tools") {
          console.log("🔧 SPECIAL PROCESSING: Encoding Tools category");
          const encodingCategory = { ...cat };
          
          // Add FFMPEG as subcategory under Encoding Tools
          const ffmpegCat = filteredCategories.find(c => c.name === "FFMPEG");
          if (ffmpegCat) {
            console.log(`  ├── Adding FFMPEG as subcategory (${ffmpegCat.resources.length} resources)`);
            encodingCategory.subcategories.push({
              name: "FFMPEG",
              slug: getCategorySlug("FFMPEG"),
              resources: ffmpegCat.resources
            });
            processedNames.add("FFMPEG");
          }
          
          console.log(`  └── Total Encoding Tools: ${encodingCategory.resources.length} direct + ${encodingCategory.subcategories.length} subcategories`);
          organizedCategories.push(encodingCategory);
        }
        // Special handling for codec categories - merge VP9 and AV1 into Codecs
        else if (orderName === "Codecs") {
          console.log("🎬 SPECIAL PROCESSING: Codecs category");
          const codecsCategory = { ...cat };
          
          // Add VP9 and AV1 resources to Codecs subcategories
          const vp9Cat = filteredCategories.find(c => c.name === "VP9");
          const av1Cat = filteredCategories.find(c => c.name === "AV1");
          
          if (vp9Cat) {
            console.log(`  ├── Adding VP9 as subcategory (${vp9Cat.resources.length} resources)`);
            codecsCategory.subcategories.push({
              name: "VP9",
              slug: getCategorySlug("VP9"),
              resources: vp9Cat.resources
            });
            processedNames.add("VP9");
          }
          
          if (av1Cat) {
            console.log(`  ├── Adding AV1 as subcategory (${av1Cat.resources.length} resources)`);
            codecsCategory.subcategories.push({
              name: "AV1", 
              slug: getCategorySlug("AV1"),
              resources: av1Cat.resources
            });
            processedNames.add("AV1");
          }
          
          console.log(`  └── Total Codecs: ${codecsCategory.resources.length} direct + ${codecsCategory.subcategories.length} subcategories`);
          organizedCategories.push(codecsCategory);
        }
        // Special handling for Cloud & CDN - consolidate duplicates
        else if (orderName === "Cloud & CDN") {
          console.log("☁️ SPECIAL PROCESSING: Cloud & CDN consolidation");
          const cloudCategories = filteredCategories.filter(c => 
            (c.name === "Cloud & CDN" || c.name === "CDN Integration") && 
            !processedNames.has(c.name)
          );
          
          if (cloudCategories.length > 0) {
            console.log(`  ├── Found ${cloudCategories.length} cloud categories to consolidate:`, cloudCategories.map(c => c.name));
            const consolidatedCategory: Category = {
              name: "Cloud & CDN",
              slug: getCategorySlug("Cloud & CDN"),
              resources: [],
              subcategories: []
            };
            
            cloudCategories.forEach(cloudCat => {
              console.log(`  ├── Merging ${cloudCat.name} (${cloudCat.resources.length} resources, ${cloudCat.subcategories.length} subcategories)`);
              consolidatedCategory.resources.push(...cloudCat.resources);
              consolidatedCategory.subcategories.push(...cloudCat.subcategories);
              processedNames.add(cloudCat.name);
            });
            
            console.log(`  └── Consolidated Cloud & CDN: ${consolidatedCategory.resources.length} total resources`);
            organizedCategories.push(consolidatedCategory);
          }
        }
        // Normal category processing
        else if (!["VP9", "AV1", "CDN Integration", "FFMPEG"].includes(orderName)) {
          console.log(`  ├── Adding "${cat.name}" (${cat.resources.length} resources, ${cat.subcategories.length} subcategories)`);
          organizedCategories.push(cat);
        }
        
        processedNames.add(cat.name);
      });
    });

    // Add any remaining categories that weren't in the hierarchy order
    const remainingCategories = filteredCategories.filter(cat => !processedNames.has(cat.name));
    if (remainingCategories.length > 0) {
      console.log("📌 Adding remaining categories:", remainingCategories.map(c => c.name));
      remainingCategories.forEach(cat => {
        console.log(`  ├── "${cat.name}" (${cat.resources.length} resources)`);
        organizedCategories.push(cat);
      });
    }

    console.log("🎉 FINAL HIERARCHY RESULT:");
    organizedCategories.forEach((cat, index) => {
      console.log(`${index + 1}. 📁 ${cat.name} (${cat.resources.length} resources)`);
      if (cat.subcategories.length > 0) {
        cat.subcategories.forEach((sub, subIndex) => {
          console.log(`   ${subIndex + 1}. 📄 ${sub.name} (${sub.resources.length} resources)`);
        });
      }
    });
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    return organizedCategories;
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
  const navigateAndClose = (path: string) => {
    setLocation(path);
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
          onClick={() => navigateAndClose('/')}
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
            {/* Real categories with proper hierarchical organization and user customization */}
            {applySidebarSettings(getOrganizedCategories(categories))
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
                    
                    {/* Render subcategories if they exist */}
                    {category.subcategories && category.subcategories.length > 0 && (
                      <div className="mt-1 space-y-1">
                        {category.subcategories.map(subcategory => (
                          <Button
                            key={subcategory.name}
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
      
      <div className="border-t border-border p-3 space-y-2">
        <div className="flex items-center justify-between">
          <Button variant="ghost" className="flex-1 justify-start" asChild>
            <a href={title.includes("Selfhosted") 
                ? "https://github.com/awesome-selfhosted/awesome-selfhosted" 
                : "https://github.com/krzemienski/awesome-video"} 
               target="_blank" 
               rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              GitHub Repository
            </a>
          </Button>
          <SidebarCustomizer 
            categories={categories}
            settings={settings}
            onSettingsChange={updateSettings}
          />
        </div>
        
        <Button 
          variant="ghost" 
          className="w-full justify-start" 
          onClick={() => navigateAndClose('/color-palette')}
        >
          <Palette className="mr-2 h-4 w-4" />
          Color Palette Generator
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
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

  // Use original categories but organize them visually in hierarchical structure
  const getHierarchicalCategories = (categories: Category[]) => {
    console.log("🏗️ ORGANIZING ORIGINAL CATEGORIES IN HIERARCHICAL DISPLAY");
    console.log("📊 Original categories count:", categories.length);
    
    const filteredCategories = categories.filter(cat => 
      cat.resources.length > 0 && 
      cat.name !== "Table of contents" && 
      !cat.name.startsWith("List of") &&
      !["Contributing", "License", "External Links", "Anti-features"].includes(cat.name)
    );
    
    console.log("✅ Filtered categories count:", filteredCategories.length);
    console.log("📝 Available categories:", filteredCategories.map(c => `${c.name} (${c.resources.length} resources)`));

    // Define visual grouping based on CSV structure but use original categories
    const hierarchicalGroups = [
      {
        name: "🎓 Learning & Introduction",
        categories: ["Introduction", "Learning Resources"]
      },
      {
        name: "🔧 Encoding & Codecs", 
        categories: ["FFMPEG", "Encoding Tools", "Codecs", "AV1", "HEVC", "VP9"]
      },
      {
        name: "🎯 Streaming & Protocols",
        categories: ["Adaptive Streaming", "DASH", "HLS", "Transport Protocols", "RIST", "SRT", "RTMP"]
      },
      {
        name: "📱 Players & Clients",
        categories: ["Players & Clients", "Web Players", "Mobile & Web Players", "Android", "iOS/tvOS", "Hardware Players", "Chromecast", "Roku", "Smart TVs"]
      },
      {
        name: "☁️ Infrastructure & Delivery",
        categories: ["Streaming Servers", "Cloud & CDN", "CDN Integration", "Cloud Platforms", "Origin Servers", "Storage Solutions"]
      },
      {
        name: "🛡️ Security & Quality",
        categories: ["DRM", "Quality & Testing", "Advertising", "Ads & QoE"]
      },
      {
        name: "🎵 Media Processing",
        categories: ["Media Tools", "Audio & Subtitles", "Audio", "Subtitles & Captions"]
      },
      {
        name: "📋 Standards & Documentation", 
        categories: ["Specs & Standards", "Standards & Industry", "MPEG & Forums", "Official Specs", "Vendors & HDR", "HDR Guidelines", "Vendor Docs"]
      },
      {
        name: "👥 Community & Events",
        categories: ["Community & Events", "Community Groups", "Events & Conferences", "Online Forums", "Podcasts & Webinars"]
      }
    ];

    // Group categories visually but keep original data structure
    const groupedCategories: any[] = [];
    const usedCategories = new Set<string>();
    
    hierarchicalGroups.forEach(group => {
      const groupCategories: Category[] = [];
      
      group.categories.forEach(categoryName => {
        const matchingCategory = filteredCategories.find(cat => cat.name === categoryName);
        if (matchingCategory && !usedCategories.has(categoryName)) {
          groupCategories.push(matchingCategory);
          usedCategories.add(categoryName);
        }
      });
      
      if (groupCategories.length > 0) {
        groupedCategories.push({
          groupName: group.name,
          categories: groupCategories
        });
      }
    });

    // Add any remaining categories
    const remainingCategories = filteredCategories.filter(cat => !usedCategories.has(cat.name));
    if (remainingCategories.length > 0) {
      groupedCategories.push({
        groupName: "📦 Other Tools",
        categories: remainingCategories
      });
    }

    console.log("🎉 GROUPED CATEGORIES STRUCTURE:");
    groupedCategories.forEach(group => {
      console.log(`📁 ${group.groupName} (${group.categories.length} categories)`);
      group.categories.forEach(cat => {
        console.log(`  └── ${cat.name} (${cat.resources.length} resources)`);
      });
    });
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    return groupedCategories;
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
            {/* Grouped categories with original data structure */}
            {getHierarchicalCategories(categories)
              .map(group => (
              <div key={group.groupName} className="mb-4">
                <h3 className="px-2 mb-2 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">
                  {group.groupName}
                </h3>
                <div className="space-y-1">
                  {group.categories.map((category: Category) => (
                    <div key={category.name}>
                      {/* Main Category */}
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
                        <div className="flex items-center gap-2 w-full">
                          <Folder className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">{category.name}</span>
                          <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded ml-auto">
                            {category.resources.length}
                          </span>
                        </div>
                      </Button>
                      
                      {/* Subcategories */}
                      {category.subcategories && category.subcategories.length > 0 && (
                        <div className="ml-4 space-y-1">
                          {category.subcategories.map((subcategory: any) => (
                            <Button
                              key={subcategory.name}
                              variant="ghost"
                              className={cn(
                                "w-full justify-start font-normal text-xs pl-2",
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
                    </div>
                  ))}
                </div>
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
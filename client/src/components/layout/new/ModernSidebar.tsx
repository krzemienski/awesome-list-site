import { useState, useEffect } from "react";
import { useLocation } from "wouter";
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
import { Home, Folder, ExternalLink } from "lucide-react";
import { slugify, getCategorySlug, getSubcategorySlug } from "@/lib/utils";
import { Category } from "@/types/awesome-list";
import { cn } from "@/lib/utils";

interface ModernSidebarProps {
  title: string;
  categories: Category[];
  isLoading: boolean;
}

export default function ModernSidebar({ title, categories, isLoading }: ModernSidebarProps) {
  const [location] = useLocation();
  const [openCategories, setOpenCategories] = useState<string[]>([]);
  
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
  
  // Toggle category open state
  const toggleCategory = (category: string) => {
    setOpenCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category) 
        : [...prev, category]
    );
  };

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6 text-primary"
            >
              <path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5a2 2 0 0 0 2 2h1" />
              <path d="M16 3h1a2 2 0 0 1 2 2v5a2 2 0 0 0 2 2 2 2 0 0 0-2 2v5a2 2 0 0 1-2 2h-1" />
              <line x1="12" x2="12" y1="8" y2="8" />
              <line x1="12" x2="12" y1="12" y2="12" />
              <line x1="12" x2="12" y1="16" y2="16" />
            </svg>
            <h1 className="text-base font-semibold">{title}</h1>
          </div>
        </SidebarHeader>
        
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start font-normal",
                  location === "/" ? "bg-accent text-accent-foreground" : ""
                )}
                onClick={() => window.location.href = '/'}
              >
                <Home className="mr-2 h-4 w-4" />
                Home
              </Button>
            </SidebarMenuItem>
          </SidebarMenu>
          
          {isLoading ? (
            <div className="px-2 space-y-3">
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
              {categories.map(category => (
                <SidebarGroup key={category.name}>
                  <Accordion
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
                      
                      <AccordionContent className="pb-1 pl-10">
                        <SidebarGroupContent>
                          <SidebarMenu>
                            <SidebarMenuItem>
                              <Button
                                variant="ghost"
                                className={cn(
                                  "w-full justify-start font-normal text-sm",
                                  location === `/category/${getCategorySlug(category.name)}` 
                                    ? "bg-accent text-accent-foreground" 
                                    : ""
                                )}
                                onClick={() => window.location.href = `/category/${getCategorySlug(category.name)}`}
                              >
                                All ({category.resources.length})
                              </Button>
                            </SidebarMenuItem>
                            
                            {category.subcategories?.map(subcategory => (
                              <SidebarMenuItem key={subcategory.name}>
                                <Button
                                  variant="ghost"
                                  className={cn(
                                    "w-full justify-start font-normal text-sm",
                                    location === `/subcategory/${getSubcategorySlug(category.name, subcategory.name)}` 
                                      ? "bg-accent text-accent-foreground" 
                                      : ""
                                  )}
                                  onClick={() => window.location.href = `/subcategory/${getSubcategorySlug(category.name, subcategory.name)}`}
                                >
                                  {subcategory.name} ({subcategory.resources.length})
                                </Button>
                              </SidebarMenuItem>
                            ))}
                          </SidebarMenu>
                        </SidebarGroupContent>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </SidebarGroup>
              ))}
            </div>
          )}
        </SidebarContent>
        
        <SidebarFooter>
          <Button variant="ghost" className="w-full justify-start" asChild>
            <a href="https://github.com/krzemienski/awesome-video" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              GitHub Repository
            </a>
          </Button>
        </SidebarFooter>
      </Sidebar>
    </SidebarProvider>
  );
}
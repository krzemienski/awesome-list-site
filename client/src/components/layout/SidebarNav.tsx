import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { X } from "lucide-react";
import { slugify, getCategorySlug, countResourcesByCategory } from "@/lib/utils";
import { Category, Resource } from "@/types/awesome-list";
import { Skeleton } from "@/components/ui/skeleton";

interface SidebarNavProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  categories: Category[];
  isLoading: boolean;
  title: string;
}

export default function SidebarNav({
  isOpen,
  setIsOpen,
  categories,
  isLoading,
  title
}: SidebarNavProps) {
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
          cat.subcategories?.some(sub => sub.slug === slug)
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

  // Desktop sidebar
  const DesktopSidebar = (
    <aside 
      className="w-[250px] border-r pt-4 hidden md:block transition-all duration-200 ease-in-out relative z-10"
      data-state={isOpen ? "open" : "closed"}
      style={{ pointerEvents: 'auto' }}
    >
      <div className="flex h-[calc(100vh-3.5rem)] flex-col gap-2">
        <nav className="flex-1 px-2 overflow-auto pb-6">
          <div className="space-y-1">
            <div 
              className={`w-full text-left flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
                location === "/" ? "bg-accent text-accent-foreground" : "hover:bg-accent hover:text-accent-foreground"
              }`} 
              onClick={() => window.location.href = "/"} 
              role="button" 
              tabIndex={0}
              data-testid="nav-home"
            >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                Home
              </div>
              
            <div 
              className={`w-full text-left flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
                location === "/advanced" ? "bg-accent text-accent-foreground" : "hover:bg-accent hover:text-accent-foreground"
              }`} 
              onClick={() => window.location.href = "/advanced"} 
              role="button" 
              tabIndex={0}
              data-testid="nav-advanced"
            >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <path d="M12 2 2 7l10 5 10-5-10-5z" />
                  <path d="m2 17 10 5 10-5" />
                  <path d="m2 12 10 5 10-5" />
                </svg>
                Advanced Features
              </div>
          </div>
          
          <div className="mt-4">
            {isLoading ? (
              Array(5).fill(0).map((_, i) => (
                <div key={i} className="pb-1">
                  <Skeleton className="h-10 w-full mb-2" />
                  <div className="pl-6">
                    <Skeleton className="h-8 w-4/5 mb-1" />
                  </div>
                </div>
              ))
            ) : (
              categories.map(category => (
                <Accordion
                  key={category.name}
                  type="multiple"
                  value={openCategories}
                  className="pb-1"
                  data-testid={`accordion-category-${getCategorySlug(category.name)}`}
                >
                  <AccordionItem value={category.name} className="border-0">
                    <AccordionTrigger
                      onClick={() => toggleCategory(category.name)}
                      className="py-2 px-3 text-sm hover:bg-accent hover:text-accent-foreground rounded-md"
                      data-testid={`nav-category-trigger-${getCategorySlug(category.name)}`}
                    >
                      <div className="flex items-center gap-2">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-4 w-4"
                        >
                          <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
                        </svg>
                        <span>{category.name}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-1 pl-6">
                      <div className="space-y-1 flex flex-col">
                        <div 
                          className={`rounded-md px-3 py-2 text-sm font-medium ${
                            location === `/category/${getCategorySlug(category.name)}` 
                              ? "bg-accent text-accent-foreground" 
                              : "hover:bg-accent hover:text-accent-foreground"
                          }`}
                          onClick={() => window.location.href = `/category/${getCategorySlug(category.name)}`}
                          role="button"
                          tabIndex={0}
                          data-testid={`nav-category-all-${getCategorySlug(category.name)}`}
                        >
                          All ({category.resources.length})
                        </div>
                        
                        {category.subcategories?.map(subcategory => (
                          <div 
                            key={subcategory.name}
                            className={`rounded-md px-3 py-2 text-sm font-medium ${
                              location === `/subcategory/${subcategory.slug}` 
                                ? "bg-accent text-accent-foreground" 
                                : "hover:bg-accent hover:text-accent-foreground"
                            }`}
                            onClick={() => window.location.href = `/subcategory/${subcategory.slug}`}
                            role="button"
                            tabIndex={0}
                            data-testid={`nav-subcategory-${subcategory.slug}`}
                          >
                            {subcategory.name} ({subcategory.resources.length})
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              ))
            )}
          </div>
        </nav>
      </div>
    </aside>
  );

  // Mobile sidebar (Sheet)
  return (
    <>
      {DesktopSidebar}
      
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="left" className="w-[85%] sm:max-w-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <SheetTitle className="flex items-center gap-2">
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
              <span className="font-bold truncate">{title}</span>
            </SheetTitle>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsOpen(false)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="mt-4 h-[calc(100vh-100px)] overflow-y-auto">
            <nav className="flex flex-col space-y-1">
              <div
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium cursor-pointer ${
                  location === "/" ? "bg-accent text-accent-foreground" : "hover:bg-accent hover:text-accent-foreground"
                }`}
                onClick={() => {
                  setIsOpen(false);
                  window.location.href = "/";
                }}
                role="button"
                tabIndex={0}
                data-testid="nav-home-mobile"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                Home
              </div>
              
              <div className="pt-4">
                {isLoading ? (
                  Array(3).fill(0).map((_, i) => (
                    <div key={i} className="pb-1">
                      <Skeleton className="h-10 w-full mb-2" />
                      <div className="pl-6">
                        <Skeleton className="h-8 w-4/5 mb-1" />
                      </div>
                    </div>
                  ))
                ) : (
                  categories.map(category => (
                    <Accordion
                      key={category.name}
                      type="multiple"
                      value={openCategories}
                      className="pb-1"
                      data-testid={`accordion-category-${getCategorySlug(category.name)}-mobile`}
                    >
                      <AccordionItem value={category.name} className="border-0">
                        <AccordionTrigger
                          onClick={() => toggleCategory(category.name)}
                          className="py-2 px-3 text-sm hover:bg-accent hover:text-accent-foreground rounded-md"
                          data-testid={`nav-category-trigger-${getCategorySlug(category.name)}-mobile`}
                        >
                          <div className="flex items-center gap-2">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="h-4 w-4 flex-shrink-0"
                            >
                              <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
                            </svg>
                            <span className="truncate">{category.name}</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-1 pl-6">
                          <div className="space-y-1 flex flex-col">
                            <div
                              className={`rounded-md px-3 py-2 text-sm font-medium cursor-pointer ${
                                location === `/category/${getCategorySlug(category.name)}` 
                                  ? "bg-accent text-accent-foreground" 
                                  : "hover:bg-accent hover:text-accent-foreground"
                              }`}
                              onClick={() => {
                                setIsOpen(false);
                                window.location.href = `/category/${getCategorySlug(category.name)}`;
                              }}
                              role="button"
                              tabIndex={0}
                              data-testid={`nav-category-all-${getCategorySlug(category.name)}-mobile`}
                            >
                              All ({category.resources.length})
                            </div>
                            
                            {category.subcategories?.map(subcategory => (
                              <div 
                                key={subcategory.name}
                                className={`rounded-md px-3 py-2 text-sm font-medium cursor-pointer ${
                                  location === `/subcategory/${subcategory.slug}` 
                                    ? "bg-accent text-accent-foreground" 
                                    : "hover:bg-accent hover:text-accent-foreground"
                                }`}
                                onClick={() => {
                                  setIsOpen(false);
                                  window.location.href = `/subcategory/${subcategory.slug}`;
                                }}
                                role="button"
                                tabIndex={0}
                                data-testid={`nav-subcategory-${subcategory.slug}-mobile`}
                              >
                                <span className="truncate">{subcategory.name}</span> <span className="text-muted-foreground">({subcategory.resources.length})</span>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  ))
                )}
              </div>
            </nav>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

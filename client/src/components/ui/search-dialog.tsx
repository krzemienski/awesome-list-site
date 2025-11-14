import { useState, useEffect, useMemo, useRef } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { useLocation } from "wouter";
import Fuse from "fuse.js";
import { Resource } from "@/types/awesome-list";
import { trackSearch, trackResourceClick, trackPerformance } from "@/lib/analytics";

interface SearchDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  resources: Resource[];
}

export default function SearchDialog({ isOpen, setIsOpen, resources }: SearchDialogProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Resource[]>([]);
  const [, navigate] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const linkClickingRef = useRef(false);

  // Debug: Log resources to see if they're being passed correctly
  // Search dialog initialized with ${resources?.length || 0} resources

  // Create Fuse.js instance for search with special character support
  const fuse = useMemo(() => {
    if (!resources || resources.length === 0) return null;
    return new Fuse(resources, {
      keys: ['title', 'description', 'category', 'subcategory'],
      threshold: 0.4, // More lenient for punctuation (was 0.3)
      includeScore: true,
      ignoreLocation: true,
      minMatchCharLength: 2,
      shouldSort: true,
      ignoreFieldNorm: true, // Ignore field length for better special char matching
    });
  }, [resources]);

  // Search when query changes
  useEffect(() => {
    if (!query || query.length < 2 || !fuse) {
      setResults([]);
      return;
    }

    const startTime = performance.now();
    const searchResults = fuse!.search(query);
    const endTime = performance.now();
    
    // Track search analytics
    trackSearch(query, searchResults.length);
    trackPerformance('search_time', endTime - startTime);
    
    setResults(searchResults.slice(0, 15).map(result => result.item));
  }, [query, fuse]);

  // Global keyboard shortcut listener (Cmd+K, Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd+K (Mac) or Ctrl+K (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [setIsOpen]);

  // Focus input when dialog opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Clear search when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setResults([]);
    }
  }, [isOpen]);

  // Prevent dialog from closing when clicking search results
  const handleOpenChange = (open: boolean) => {
    // If trying to close while clicking a link, prevent it
    if (!open && linkClickingRef.current) {
      return;
    }
    // Otherwise, allow normal open/close behavior
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Search Resources</DialogTitle>
          <DialogDescription>
            Find packages, libraries, and tools in the awesome list.
          </DialogDescription>
        </DialogHeader>
        
        <Command className="overflow-visible" shouldFilter={false}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none z-10" />
            <CommandInput
              ref={inputRef}
              placeholder="Search packages, libraries, and tools..."
              value={query}
              onValueChange={(value) => {
                console.log(`Input value changed to: "${value}"`);
                setQuery(value);
              }}
              className="w-full pl-10 pr-4 py-2"
            />
          </div>
          
          <CommandList className="max-h-[300px] overflow-y-auto">
            {query.length >= 2 ? (
              results.length > 0 ? (
                <CommandGroup>
                  {results.map((resource, index) => (
                    <CommandItem
                      key={`${resource.title}-${resource.url}-${index}`}
                      asChild
                      onSelect={(e) => {
                        // Set flag to prevent dialog from closing
                        linkClickingRef.current = true;
                        trackResourceClick(resource.title, resource.url, resource.category);
                        // Open link in new tab
                        window.open(resource.url, '_blank', 'noopener,noreferrer');
                        // Reset flag after longer delay to ensure guard works
                        setTimeout(() => {
                          linkClickingRef.current = false;
                        }, 500);
                      }}
                      data-testid={`search-result-${index}`}
                    >
                      <a
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => {
                          // Prevent anchor's default navigation - onSelect handles it
                          e.preventDefault();
                        }}
                        className="flex flex-col gap-1 cursor-pointer p-3 no-underline text-inherit hover:no-underline"
                      >
                        <div className="font-medium text-sm">{resource.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {resource.category} {resource.subcategory ? `→ ${resource.subcategory}` : ''} 
                        </div>
                        <div className="text-xs text-muted-foreground line-clamp-2">
                          {resource.description}
                        </div>
                      </a>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : (
                <div className="flex flex-col items-center justify-center h-[200px] text-center p-4">
                  <div className="flex h-16 w-16 items-center justify-center bg-muted">
                    <Search className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="mt-4 text-sm font-semibold">No results found</h3>
                  <p className="mt-2 text-xs text-muted-foreground">Try different keywords</p>
                </div>
              )
            ) : (
              <div className="flex flex-col items-center justify-center h-[200px] text-center p-4">
                <div className="flex h-16 w-16 items-center justify-center bg-muted">
                  <Search className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-sm font-semibold">Start typing to search</h3>
                <p className="mt-2 text-xs text-muted-foreground">Type at least 2 characters</p>
              </div>
            )}
          </CommandList>
        </Command>
        
        <DialogFooter>
          <Button
            variant="secondary"
            onClick={() => setIsOpen(false)}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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

  // Debug: Log resources to see if they're being passed correctly
  // Search dialog initialized with ${resources?.length || 0} resources

  // Create Fuse.js instance for search
  const fuse = useMemo(() => {
    if (!resources || resources.length === 0) return null;
    return new Fuse(resources, {
      keys: ['title', 'description', 'category', 'subcategory'],
      threshold: 0.3,
      includeScore: true,
      ignoreLocation: true,
      minMatchCharLength: 2
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

  // Handle resource selection
  const handleSelect = (resource: Resource) => {
    // Track search result click
    trackResourceClick(resource.title, resource.url, resource.category);
    
    setIsOpen(false);
    
    // Open the resource URL in a new tab
    window.open(resource.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Search Resources</DialogTitle>
          <DialogDescription>
            Find packages, libraries, and tools in the awesome list.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search packages, libraries, and tools..."
              value={query}
              onChange={(e) => {
                console.log(`Input value changed to: "${e.target.value}"`);
                setQuery(e.target.value);
              }}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
          
          <div className="max-h-[300px] overflow-y-auto border border-border rounded-md">
            {query.length >= 2 ? (
              results.length > 0 ? (
                <div className="p-2">
                  {results.map((resource, index) => (
                    <div
                      key={`${resource.title}-${resource.url}-${index}`}
                      onClick={() => handleSelect(resource)}
                      className="p-3 hover:bg-accent hover:text-accent-foreground cursor-pointer rounded border-b border-border last:border-b-0"
                    >
                      <div className="font-medium text-sm">{resource.title}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {resource.category} {resource.subcategory ? `→ ${resource.subcategory}` : ''} 
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {resource.description}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[200px] text-center p-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <Search className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="mt-4 text-sm font-semibold">No results found</h3>
                  <p className="mt-2 text-xs text-muted-foreground">Try different keywords</p>
                </div>
              )
            ) : (
              <div className="flex flex-col items-center justify-center h-[200px] text-center p-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <Search className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-sm font-semibold">Start typing to search</h3>
                <p className="mt-2 text-xs text-muted-foreground">Type at least 2 characters</p>
              </div>
            )}
          </div>
        </div>
        
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

import { useState, useEffect, useMemo, useRef } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { useLocation } from "wouter";
import Fuse from "fuse.js";
import { Resource } from "@/types/awesome-list";

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

  // Create Fuse.js instance for search
  const fuse = useMemo(() => {
    return new Fuse(resources, {
      keys: ['title', 'description'],
      threshold: 0.4,
      includeScore: true
    });
  }, [resources]);

  // Search when query changes
  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    const searchResults = fuse.search(query);
    setResults(searchResults.slice(0, 10).map(result => result.item));
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
    setIsOpen(false);
    
    // Navigate to category/subcategory page
    if (resource.subcategory) {
      const categorySlug = resource.category.toLowerCase().replace(/\s+/g, '-');
      const subcategorySlug = resource.subcategory.toLowerCase().replace(/\s+/g, '-');
      navigate(`/subcategory/${categorySlug}-${subcategorySlug}`);
    } else {
      const categorySlug = resource.category.toLowerCase().replace(/\s+/g, '-');
      navigate(`/category/${categorySlug}`);
    }
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
        
        <Command className="rounded-lg border shadow-md">
          <CommandInput
            ref={inputRef}
            placeholder="Search..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList className="h-[300px] overflow-y-auto">
            <CommandEmpty>
              <div className="flex flex-col items-center justify-center h-[200px] text-center p-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                  <Search className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">No results found</h3>
                <p className="mb-4 mt-2 text-sm text-muted-foreground">Try searching for something else.</p>
              </div>
            </CommandEmpty>
            
            {results.length > 0 && (
              <CommandGroup>
                {results.map((resource) => (
                  <CommandItem
                    key={`${resource.title}-${resource.url}`}
                    onSelect={() => handleSelect(resource)}
                    className="cursor-pointer"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{resource.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {resource.category} {resource.subcategory ? `- ${resource.subcategory}` : ''} - {resource.description}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
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

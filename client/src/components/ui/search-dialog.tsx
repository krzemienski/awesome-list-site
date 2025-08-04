import { useState, useEffect, useMemo, useRef } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Badge } from "@/components/ui/badge";
import { Search, ExternalLink, Star, Github, Globe, History, X, Clock } from "lucide-react";
import { useLocation } from "wouter";
import Fuse from "fuse.js";
import { Resource } from "@/types/awesome-list";
import { trackSearch, trackResourceClick, trackPerformance } from "@/lib/analytics";
import { useSearchHistory } from "@/hooks/use-search-history";

interface SearchDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  resources: Resource[];
}

export default function SearchDialog({ isOpen, setIsOpen, resources }: SearchDialogProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Resource[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [, navigate] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const { history, addToHistory, clearHistory, removeFromHistory, getRecentQueries } = useSearchHistory();

  // Debug: Log resources to see if they're being passed correctly
  console.log(`Search dialog has ${resources?.length || 0} resources`);

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
    console.log(`Searching for: "${query}", query length: ${query.length}, fuse exists: ${!!fuse}`);
    
    if (!query || query.length < 2 || !fuse) {
      setResults([]);
      setShowHistory(query.length === 0);
      return;
    }

    setShowHistory(false);
    const startTime = performance.now();
    const searchResults = fuse!.search(query);
    const endTime = performance.now();
    
    console.log(`Search results for "${query}":`, searchResults.length);
    
    // Track search analytics
    trackSearch(query, searchResults.length);
    trackPerformance('search_time', endTime - startTime);
    
    const searchResultItems = searchResults.slice(0, 15).map(result => result.item);
    setResults(searchResultItems);
    
    // Add to search history if we have results - use a timeout to prevent immediate re-render
    if (searchResultItems.length > 0) {
      setTimeout(() => {
        addToHistory(query, searchResultItems.length);
      }, 0);
    }
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
      setShowHistory(false);
    }
  }, [isOpen]);

  // Show history when input is focused and empty
  useEffect(() => {
    if (isOpen && query.length === 0) {
      setShowHistory(true);
    } else {
      setShowHistory(false);
    }
  }, [query, isOpen]);

  // Handle resource selection
  const handleSelect = (resource: Resource) => {
    // Track search result click
    trackResourceClick(resource.title, resource.url, resource.category);
    
    setIsOpen(false);
    
    // Open the resource URL in a new tab
    window.open(resource.url, '_blank', 'noopener,noreferrer');
  };

  // Handle history item selection
  const handleHistorySelect = (historyQuery: string) => {
    setQuery(historyQuery);
    setShowHistory(false);
  };

  // Handle removing item from history
  const handleRemoveFromHistory = (historyQuery: string, event: React.MouseEvent) => {
    event.stopPropagation();
    removeFromHistory(historyQuery);
  };

  // Get platform icon based on URL
  const getPlatformIcon = (url: string) => {
    if (url.includes('github.com')) {
      return <Github className="h-3 w-3" />;
    } else if (url.includes('gitlab.com')) {
      return <Globe className="h-3 w-3" />;
    } else {
      return <Globe className="h-3 w-3" />;
    }
  };

  // Preview tooltip content
  const PreviewTooltip = ({ resource }: { resource: Resource }) => (
    <HoverCardContent className="w-80 p-4" side="right" align="start">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm truncate">{resource.title}</h4>
            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
              {getPlatformIcon(resource.url)}
              <span className="truncate">{resource.url.replace(/^https?:\/\//, '').split('/')[0]}</span>
            </div>
          </div>
          <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
        </div>
        
        <p className="text-sm text-muted-foreground leading-relaxed">
          {resource.description}
        </p>
        
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary" className="text-xs">
            {resource.category}
          </Badge>
          {resource.subcategory && (
            <Badge variant="outline" className="text-xs">
              {resource.subcategory}
            </Badge>
          )}
          {resource.tags?.slice(0, 3).map((tag, index) => (
            <Badge key={index} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
          {resource.tags && resource.tags.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{resource.tags.length - 3} more
            </Badge>
          )}
        </div>
        
        <div className="pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Click to open in new tab
          </p>
        </div>
      </div>
    </HoverCardContent>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="sr-only">
          <DialogTitle>Search Resources</DialogTitle>
          <DialogDescription>
            Find packages, libraries, and tools in the awesome list.
          </DialogDescription>
        </DialogHeader>
        
        <Command className="[&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group]]:px-2 [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
          <CommandInput
            ref={inputRef}
            placeholder="Search packages, libraries, and tools..."
            value={query}
            onValueChange={(value) => {
              console.log(`Command input value changed to: "${value}"`);
              setQuery(value);
            }}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          <CommandList>
            {showHistory && history.length > 0 ? (
              <CommandGroup heading="Recent Searches">
                <div className="flex items-center justify-between mb-2 px-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearHistory}
                    className="h-6 text-xs text-muted-foreground hover:text-foreground ml-auto"
                  >
                    Clear all
                  </Button>
                </div>
                {getRecentQueries(5).map((historyQuery, index) => {
                  const historyItem = history.find(h => h.query === historyQuery);
                  return (
                    <CommandItem
                      key={`${historyQuery}-${index}`}
                      onSelect={() => handleHistorySelect(historyQuery)}
                      className="flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="text-sm truncate">{historyQuery}</span>
                        {historyItem && (
                          <span className="text-xs text-muted-foreground">
                            ({historyItem.resultCount} results)
                          </span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleRemoveFromHistory(historyQuery, e);
                        }}
                        className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ) : query.length >= 2 ? (
              results.length > 0 ? (
                <CommandGroup heading={`${results.length} results`}>
                  {results.map((resource, index) => (
                    <HoverCard key={`${resource.title}-${resource.url}-${index}`} openDelay={300} closeDelay={100}>
                      <HoverCardTrigger asChild>
                        <CommandItem
                          onSelect={() => handleSelect(resource)}
                          className="flex flex-col items-start gap-1 p-3"
                        >
                          <div className="flex items-center justify-between gap-2 w-full">
                            <div className="font-medium text-sm truncate flex-1">{resource.title}</div>
                            <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {resource.category} {resource.subcategory ? `→ ${resource.subcategory}` : ''} 
                          </div>
                          <div className="text-xs text-muted-foreground line-clamp-2">
                            {resource.description}
                          </div>
                        </CommandItem>
                      </HoverCardTrigger>
                      <PreviewTooltip resource={resource} />
                    </HoverCard>
                  ))}
                </CommandGroup>
              ) : (
                <CommandEmpty>
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                      <Search className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="mt-4 text-sm font-semibold">No results found</h3>
                    <p className="mt-2 text-xs text-muted-foreground">Try different keywords</p>
                  </div>
                </CommandEmpty>
              )
            ) : (
              <CommandEmpty>
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <Search className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="mt-4 text-sm font-semibold">Start typing to search</h3>
                  <p className="mt-2 text-xs text-muted-foreground">Type at least 2 characters</p>
                  {history.length > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">Or select from recent searches above</p>
                  )}
                </div>
              </CommandEmpty>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

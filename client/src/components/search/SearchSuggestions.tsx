import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Clock, TrendingUp, Hash, ExternalLink, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";

interface SearchSuggestion {
  id: string;
  type: 'recent' | 'popular' | 'category' | 'resource' | 'tag';
  text: string;
  description?: string;
  count?: number;
  url?: string;
  category?: string;
}

interface SearchSuggestionsProps {
  query: string;
  resources: any[];
  categories: string[];
  isVisible: boolean;
  onSuggestionClick: (suggestion: string) => void;
  onClose: () => void;
  inputRef: React.RefObject<HTMLInputElement>;
}

export default function SearchSuggestions({
  query,
  resources,
  categories,
  isVisible,
  onSuggestionClick,
  onClose,
  inputRef
}: SearchSuggestionsProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('awesome-search-recent');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.warn('Failed to parse recent searches');
      }
    }
  }, []);

  // Generate suggestions based on query
  const suggestions: SearchSuggestion[] = (() => {
    if (!query.trim()) {
      // Show recent searches and popular categories when no query
      const recent = recentSearches.slice(0, 3).map((search, index) => ({
        id: `recent-${index}`,
        type: 'recent' as const,
        text: search,
        description: 'Recent search'
      }));

      const popularCategories = categories
        .filter(cat => cat.toLowerCase().includes('web') || 
                      cat.toLowerCase().includes('database') ||
                      cat.toLowerCase().includes('testing') ||
                      cat.toLowerCase().includes('authentication'))
        .slice(0, 4)
        .map((cat, index) => ({
          id: `popular-${index}`,
          type: 'popular' as const,
          text: cat,
          description: 'Popular category',
          count: resources.filter(r => r.category === cat).length
        }));

      return [...recent, ...popularCategories];
    }

    const queryLower = query.toLowerCase();
    const suggestions: SearchSuggestion[] = [];

    // Category suggestions
    const matchingCategories = categories
      .filter(cat => cat.toLowerCase().includes(queryLower))
      .slice(0, 3)
      .map((cat, index) => ({
        id: `category-${index}`,
        type: 'category' as const,
        text: cat,
        description: 'Category',
        count: resources.filter(r => r.category === cat).length
      }));

    // Resource suggestions (exact title matches first)
    const exactMatches = resources
      .filter(r => r.title.toLowerCase().includes(queryLower))
      .slice(0, 4)
      .map((resource, index) => ({
        id: `resource-${index}`,
        type: 'resource' as const,
        text: resource.title,
        description: resource.description?.slice(0, 60) + '...',
        url: resource.url,
        category: resource.category
      }));

    // Tag suggestions from popular tags
    const allTags = resources
      .flatMap(r => r.tags || [])
      .filter(tag => tag.toLowerCase().includes(queryLower));
    
    const tagCounts = allTags.reduce((acc, tag) => {
      acc[tag] = (acc[tag] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const popularTags = Object.entries(tagCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 2)
      .map(([tag, count], index) => ({
        id: `tag-${index}`,
        type: 'tag' as const,
        text: tag,
        description: 'Tag',
        count
      }));

    return [...matchingCategories, ...exactMatches, ...popularTags];
  })();

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isVisible || suggestions.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (suggestions[selectedIndex]) {
            handleSuggestionClick(suggestions[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, suggestions, selectedIndex, onClose]);

  // Reset selected index when suggestions change
  useEffect(() => {
    setSelectedIndex(0);
  }, [suggestions]);

  // Save search to recent searches
  const saveRecentSearch = (searchTerm: string) => {
    if (!searchTerm.trim()) return;
    
    const updated = [searchTerm, ...recentSearches.filter(s => s !== searchTerm)].slice(0, 10);
    setRecentSearches(updated);
    localStorage.setItem('awesome-search-recent', JSON.stringify(updated));
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    // Track the suggestion click
    trackEvent('search_suggestion_click', 'search', `${suggestion.type}:${suggestion.text}`);
    
    if (suggestion.type === 'resource' && suggestion.url) {
      // For resource suggestions, open the URL
      window.open(suggestion.url, '_blank', 'noopener,noreferrer');
      trackEvent('resource_click', 'suggestion', suggestion.text);
    } else {
      // For other suggestions, perform the search
      onSuggestionClick(suggestion.text);
      saveRecentSearch(suggestion.text);
    }
    onClose();
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'recent': return <Clock className="h-4 w-4 text-muted-foreground" />;
      case 'popular': return <TrendingUp className="h-4 w-4 text-blue-500" />;
      case 'category': return <Hash className="h-4 w-4 text-green-500" />;
      case 'resource': return <ExternalLink className="h-4 w-4 text-primary" />;
      case 'tag': return <Hash className="h-4 w-4 text-purple-500" />;
      default: return <Search className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (!isVisible || suggestions.length === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        ref={suggestionsRef}
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden"
        style={{ minWidth: inputRef.current?.offsetWidth || 300 }}
      >
        <div className="p-2 space-y-1 max-h-80 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <motion.button
              key={suggestion.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.02 }}
              onClick={() => handleSuggestionClick(suggestion)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-all duration-150",
                "hover:bg-accent hover:text-accent-foreground",
                "focus:bg-accent focus:text-accent-foreground focus:outline-none",
                selectedIndex === index && "bg-accent text-accent-foreground"
              )}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className="flex-shrink-0">
                {getSuggestionIcon(suggestion.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">
                    {suggestion.text}
                  </span>
                  {suggestion.count !== undefined && (
                    <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                      {suggestion.count}
                    </span>
                  )}
                  {suggestion.type === 'resource' && (
                    <ArrowUpRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  )}
                </div>
                
                {suggestion.description && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {suggestion.description}
                  </p>
                )}
                
                {suggestion.category && (
                  <span className="text-xs text-muted-foreground">
                    in {suggestion.category}
                  </span>
                )}
              </div>
            </motion.button>
          ))}
        </div>
        
        {query && (
          <div className="border-t border-border p-2 bg-muted/30">
            <p className="text-xs text-muted-foreground text-center">
              Press Enter to search, ↑↓ to navigate, Esc to close
            </p>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
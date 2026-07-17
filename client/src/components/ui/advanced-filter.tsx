import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { SlidersHorizontal, X, ChevronDown } from "lucide-react";

interface AdvancedFilterProps {
  selectedTags: string[];
  sortBy: string;
  availableTags: { tag: string; count: number }[];
  onTagsChange: (tags: string[]) => void;
  onSortChange: (sortBy: string) => void;
  /**
   * BUG-003 (run14): "Most/Fewest Resources" only makes sense where the list
   * being sorted is a list of CATEGORIES (Home). On flat resource lists
   * (Category/Subcategory/Sub-subcategory pages) those options were silent
   * no-ops — hide them there.
   */
  showCountSorts?: boolean;
}

export default function AdvancedFilter({
  selectedTags,
  sortBy,
  availableTags,
  onTagsChange,
  onSortChange,
  showCountSorts = true,
}: AdvancedFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isTagsOpen, setIsTagsOpen] = useState(true);

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter((t) => t !== tag));
    } else {
      onTagsChange([...selectedTags, tag]);
    }
  };

  const clearAll = () => {
    onTagsChange([]);
  };

  const hasSelectedFilters = selectedTags.length > 0;

  return (
    <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
      {/* Run16 BUG-052: pages whose resources carry no tags used to silently
          omit the control, which read as an inconsistency across taxonomy
          pages — show it disabled with an explanation instead. */}
      {availableTags.length === 0 && (
        <Button
          variant="outline"
          size="sm"
          className="min-h-[44px] flex-1 sm:flex-none"
          disabled
          title="No tags available for the resources on this page"
          data-testid="button-filter-by-tag-disabled"
        >
          <SlidersHorizontal className="h-4 w-4 mr-2" />
          Filter by Tag
          <span className="sr-only">(no tags available for the resources on this page)</span>
        </Button>
      )}
      {availableTags.length > 0 && (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="min-h-[44px] flex-1 sm:flex-none">
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Filter by Tag
              {hasSelectedFilters && (
                <Badge
                  variant="secondary"
                  className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
                  title={`${selectedTags.length} ${selectedTags.length === 1 ? "tag" : "tags"} selected`}
                  aria-label={`${selectedTags.length} ${selectedTags.length === 1 ? "tag" : "tags"} selected`}
                >
                  {selectedTags.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[calc(100vw-2rem)] sm:w-80 p-0" align="start">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Filter by Tags</h4>
                {hasSelectedFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAll}
                    className="min-h-[44px] px-2 text-xs"
                  >
                    Clear all
                  </Button>
                )}
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              <Collapsible
                open={isTagsOpen}
                onOpenChange={setIsTagsOpen}
              >
                <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-accent min-h-[44px]">
                  <h5 className="text-sm font-medium">Tags</h5>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      isTagsOpen ? "transform rotate-180" : ""
                    }`}
                  />
                </CollapsibleTrigger>
                <CollapsibleContent className="px-4 pb-4">
                  <div className="space-y-1 pt-1">
                    {availableTags.slice(0, 20).map(({ tag, count }) => (
                      <div
                        key={tag}
                        className="flex items-center space-x-2 p-2 hover:bg-accent cursor-pointer rounded-sm min-h-[44px]"
                        onClick={() => toggleTag(tag)}
                      >
                        <Checkbox
                          aria-label={`Filter by ${tag}`}
                          checked={selectedTags.includes(tag)}
                          onCheckedChange={() => toggleTag(tag)}
                        />
                        <div className="flex-1 flex items-center justify-between">
                          <span className="text-sm">{tag}</span>
                          <Badge variant="secondary" className="ml-2 text-xs">
                            {count}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* BUG-027 (run9): opening the sort dropdown closes the filter popover so
          the two never overlap. */}
      <Select
        value={sortBy}
        onValueChange={onSortChange}
        onOpenChange={(open) => {
          if (open) setIsOpen(false);
        }}
      >
        <SelectTrigger aria-label="Sort resources" className="w-full sm:w-[180px] min-h-[44px] flex-1 sm:flex-none">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="default">Default</SelectItem>
          <SelectItem value="name-asc">Name A-Z</SelectItem>
          <SelectItem value="name-desc">Name Z-A</SelectItem>
          {showCountSorts && (
            <>
              <SelectItem value="count-desc">Most Resources</SelectItem>
              <SelectItem value="count-asc">Fewest Resources</SelectItem>
            </>
          )}
        </SelectContent>
      </Select>

      {hasSelectedFilters && (
        <div className="flex gap-1.5 flex-wrap items-center w-full sm:w-auto">
          <span className="text-xs text-muted-foreground">Active:</span>
          {selectedTags.map((tag) => (
            <Badge
              key={tag}
              variant="default"
              className="text-xs cursor-pointer hover:bg-destructive hover:text-destructive-foreground px-3 py-1 min-h-[32px] flex items-center gap-1 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => toggleTag(tag)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggleTag(tag);
                }
              }}
              aria-label={`Remove ${tag} filter`}
            >
              {tag}
              <X className="h-3 w-3" />
            </Badge>
          ))}
          <Button variant="ghost" size="sm" onClick={clearAll} className="text-xs min-h-[32px] px-2">
            Clear
          </Button>
        </div>
      )}
    </div>
  );
}

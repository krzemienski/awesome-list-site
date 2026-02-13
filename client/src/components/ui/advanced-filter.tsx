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
}

export default function AdvancedFilter({
  selectedTags,
  sortBy,
  availableTags,
  onTagsChange,
  onSortChange,
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
    <div className="flex items-center gap-2 flex-wrap">
      {availableTags.length > 0 && (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="min-h-[44px]">
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Filter by Tag
              {hasSelectedFilters && (
                <Badge
                  variant="secondary"
                  className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
                >
                  {selectedTags.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full sm:w-80 p-0" align="start">
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

      <Select value={sortBy} onValueChange={onSortChange}>
        <SelectTrigger className="w-[180px] min-h-[44px]">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="default">Default</SelectItem>
          <SelectItem value="name-asc">Name A-Z</SelectItem>
          <SelectItem value="name-desc">Name Z-A</SelectItem>
          <SelectItem value="count-desc">Most Resources</SelectItem>
          <SelectItem value="count-asc">Fewest Resources</SelectItem>
        </SelectContent>
      </Select>

      {hasSelectedFilters && (
        <>
          <div className="text-sm text-muted-foreground">Filtered:</div>
          <div className="flex gap-1 flex-wrap">
            {selectedTags.map((tag) => (
              <Badge
                key={tag}
                variant="default"
                className="min-h-[44px] text-xs cursor-pointer hover:bg-destructive hover:text-destructive-foreground px-3 flex items-center"
                onClick={() => toggleTag(tag)}
              >
                <span>{tag}</span>
                <X className="h-3 w-3 ml-1" />
              </Badge>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

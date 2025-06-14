import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Filter, X } from "lucide-react";
import { Resource } from "../../types/awesome-list";

interface TagFilterProps {
  resources: Resource[];
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
}

export default function TagFilter({ resources, selectedTags, onTagsChange }: TagFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Get all unique tags from resources
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    resources.forEach(resource => {
      resource.tags?.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [resources]);

  // Get tag counts
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    resources.forEach(resource => {
      resource.tags?.forEach(tag => {
        counts[tag] = (counts[tag] || 0) + 1;
      });
    });
    return counts;
  }, [resources]);

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter(t => t !== tag));
    } else {
      onTagsChange([...selectedTags, tag]);
    }
  };

  const clearTags = () => {
    onTagsChange([]);
  };

  const hasSelectedTags = selectedTags.length > 0;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8">
            <Filter className="h-4 w-4 mr-2" />
            Filter by Tag
            {hasSelectedTags && (
              <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                {selectedTags.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Filter by Tags</h4>
              {hasSelectedTags && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearTags}
                  className="h-6 px-2 text-xs"
                >
                  Clear all
                </Button>
              )}
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto p-2">
            {availableTags.length === 0 ? (
              <div className="text-center py-4 text-sm text-muted-foreground">
                No tags available
              </div>
            ) : (
              <div className="space-y-1">
                {availableTags.map(tag => (
                  <div
                    key={tag}
                    className="flex items-center space-x-2 p-2 hover:bg-accent rounded-sm cursor-pointer"
                    onClick={() => toggleTag(tag)}
                  >
                    <Checkbox
                      checked={selectedTags.includes(tag)}
                      onChange={() => toggleTag(tag)}
                    />
                    <div className="flex-1 flex items-center justify-between">
                      <span className="text-sm">{tag}</span>
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {tagCounts[tag] || 0}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Display selected tags */}
      {hasSelectedTags && (
        <>
          <div className="text-sm text-muted-foreground">Filtered by:</div>
          <div className="flex gap-1 flex-wrap">
            {selectedTags.map(tag => (
              <Badge
                key={tag}
                variant="default"
                className="h-6 text-xs cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => toggleTag(tag)}
              >
                {tag}
                <X className="h-3 w-3 ml-1" />
              </Badge>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
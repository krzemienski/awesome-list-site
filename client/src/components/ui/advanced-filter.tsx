import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { SlidersHorizontal, X, ChevronDown } from "lucide-react";

interface AdvancedFilterProps {
  selectedResourceTypes: string[];
  selectedDifficulties: string[];
  sortBy: string;
  resourceTypeCounts: Record<string, number>;
  difficultyCounts: Record<string, number>;
  onResourceTypesChange: (types: string[]) => void;
  onDifficultiesChange: (difficulties: string[]) => void;
  onSortChange: (sortBy: string) => void;
}

const RESOURCE_TYPES = [
  "tool",
  "library",
  "tutorial",
  "documentation",
  "article",
];

const DIFFICULTY_LEVELS = ["beginner", "intermediate", "advanced"];

export default function AdvancedFilter({
  selectedResourceTypes,
  selectedDifficulties,
  sortBy,
  resourceTypeCounts,
  difficultyCounts,
  onResourceTypesChange,
  onDifficultiesChange,
  onSortChange,
}: AdvancedFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isResourceTypeOpen, setIsResourceTypeOpen] = useState(true);
  const [isDifficultyOpen, setIsDifficultyOpen] = useState(true);

  const toggleResourceType = (type: string) => {
    if (selectedResourceTypes.includes(type)) {
      onResourceTypesChange(selectedResourceTypes.filter((t) => t !== type));
    } else {
      onResourceTypesChange([...selectedResourceTypes, type]);
    }
  };

  const toggleDifficulty = (difficulty: string) => {
    if (selectedDifficulties.includes(difficulty)) {
      onDifficultiesChange(
        selectedDifficulties.filter((d) => d !== difficulty)
      );
    } else {
      onDifficultiesChange([...selectedDifficulties, difficulty]);
    }
  };

  const clearAll = () => {
    onResourceTypesChange([]);
    onDifficultiesChange([]);
  };

  const hasSelectedFilters =
    selectedResourceTypes.length > 0 || selectedDifficulties.length > 0;
  const totalFilterCount =
    selectedResourceTypes.length + selectedDifficulties.length;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="min-h-[44px]">
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Advanced Filters
            {hasSelectedFilters && (
              <Badge
                variant="secondary"
                className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
              >
                {totalFilterCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full sm:w-80 p-0" align="start">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Advanced Filters</h4>
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
            {/* Resource Type Section */}
            <Collapsible
              open={isResourceTypeOpen}
              onOpenChange={setIsResourceTypeOpen}
              className="border-b"
            >
              <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-accent min-h-[44px]">
                <h5 className="text-sm font-medium">Resource Type</h5>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${
                    isResourceTypeOpen ? "transform rotate-180" : ""
                  }`}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="px-4 pb-4">
                {RESOURCE_TYPES.filter(type => (resourceTypeCounts[type] || 0) > 0).length === 0 ? (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    No resource types available
                  </div>
                ) : (
                  <div className="space-y-1 pt-3">
                    {RESOURCE_TYPES.map((type) => {
                      const count = resourceTypeCounts[type] || 0;
                      if (count === 0) return null;
                      return (
                        <div
                          key={type}
                          className="flex items-center space-x-2 p-2 hover:bg-accent cursor-pointer rounded-sm min-h-[44px]"
                          onClick={() => toggleResourceType(type)}
                        >
                          <Checkbox
                            checked={selectedResourceTypes.includes(type)}
                            onCheckedChange={() => toggleResourceType(type)}
                          />
                          <div className="flex-1 flex items-center justify-between">
                            <span className="text-sm capitalize">{type}</span>
                            <Badge variant="secondary" className="ml-2 text-xs">
                              {count}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>

            {/* Difficulty Level Section */}
            <Collapsible
              open={isDifficultyOpen}
              onOpenChange={setIsDifficultyOpen}
            >
              <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-accent min-h-[44px]">
                <h5 className="text-sm font-medium">Difficulty Level</h5>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${
                    isDifficultyOpen ? "transform rotate-180" : ""
                  }`}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="px-4 pb-4">
                {DIFFICULTY_LEVELS.filter(difficulty => (difficultyCounts[difficulty] || 0) > 0).length === 0 ? (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    No difficulty levels available
                  </div>
                ) : (
                  <div className="space-y-1 pt-3">
                    {DIFFICULTY_LEVELS.map((difficulty) => {
                      const count = difficultyCounts[difficulty] || 0;
                      if (count === 0) return null;
                      return (
                        <div
                          key={difficulty}
                          className="flex items-center space-x-2 p-2 hover:bg-accent cursor-pointer rounded-sm min-h-[44px]"
                          onClick={() => toggleDifficulty(difficulty)}
                        >
                          <Checkbox
                            checked={selectedDifficulties.includes(difficulty)}
                            onCheckedChange={() => toggleDifficulty(difficulty)}
                          />
                          <div className="flex-1 flex items-center justify-between">
                            <span className="text-sm capitalize">{difficulty}</span>
                            <Badge variant="secondary" className="ml-2 text-xs">
                              {count}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          </div>
        </PopoverContent>
      </Popover>

      {/* Sort */}
      <Select value={sortBy} onValueChange={onSortChange}>
        <SelectTrigger className="w-full md:w-[180px]">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="name-asc">Name A-Z</SelectItem>
          <SelectItem value="name-desc">Name Z-A</SelectItem>
          <SelectItem value="newest">Newest</SelectItem>
          <SelectItem value="oldest">Oldest</SelectItem>
          <SelectItem value="recently-updated">Recently Updated</SelectItem>
        </SelectContent>
      </Select>

      {/* Display selected filters */}
      {hasSelectedFilters && (
        <>
          <div className="text-sm text-muted-foreground">Filtered by:</div>
          <div className="flex gap-1 flex-wrap">
            {selectedResourceTypes.map((type) => (
              <Badge
                key={type}
                variant="default"
                className="min-h-[44px] text-xs cursor-pointer hover:bg-destructive hover:text-destructive-foreground px-3 flex items-center"
                onClick={() => toggleResourceType(type)}
              >
                <span className="capitalize">{type}</span>
                <X className="h-3 w-3 ml-1" />
              </Badge>
            ))}
            {selectedDifficulties.map((difficulty) => (
              <Badge
                key={difficulty}
                variant="default"
                className="min-h-[44px] text-xs cursor-pointer hover:bg-destructive hover:text-destructive-foreground px-3 flex items-center"
                onClick={() => toggleDifficulty(difficulty)}
              >
                <span className="capitalize">{difficulty}</span>
                <X className="h-3 w-3 ml-1" />
              </Badge>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

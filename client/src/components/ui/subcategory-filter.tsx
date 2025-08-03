import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Layers, X } from "lucide-react";
import { Subcategory } from "@/types/awesome-list";

interface SubcategoryFilterProps {
  subcategories: Subcategory[];
  selectedSubcategories: string[];
  onSubcategoriesChange: (subcategories: string[]) => void;
}

export default function SubcategoryFilter({ 
  subcategories, 
  selectedSubcategories, 
  onSubcategoriesChange 
}: SubcategoryFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Sort subcategories by name
  const sortedSubcategories = useMemo(() => {
    return [...subcategories].sort((a, b) => a.name.localeCompare(b.name));
  }, [subcategories]);

  const toggleSubcategory = (subcategoryName: string) => {
    if (selectedSubcategories.includes(subcategoryName)) {
      onSubcategoriesChange(selectedSubcategories.filter(s => s !== subcategoryName));
    } else {
      onSubcategoriesChange([...selectedSubcategories, subcategoryName]);
    }
  };

  const clearSubcategories = () => {
    onSubcategoriesChange([]);
  };

  const hasSelectedSubcategories = selectedSubcategories.length > 0;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8">
            <Layers className="h-4 w-4 mr-2" />
            Filter by Subcategory
            {hasSelectedSubcategories && (
              <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                {selectedSubcategories.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Filter by Subcategories</h4>
              {hasSelectedSubcategories && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSubcategories}
                  className="h-6 px-2 text-xs"
                >
                  Clear all
                </Button>
              )}
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto p-2">
            {sortedSubcategories.length === 0 ? (
              <div className="text-center py-4 text-sm text-muted-foreground">
                No subcategories available
              </div>
            ) : (
              <div className="space-y-1">
                {sortedSubcategories.map(subcategory => (
                  <div
                    key={subcategory.name}
                    className="flex items-center space-x-2 p-2 hover:bg-accent rounded-sm cursor-pointer"
                    onClick={() => toggleSubcategory(subcategory.name)}
                  >
                    <Checkbox
                      checked={selectedSubcategories.includes(subcategory.name)}
                      onChange={() => toggleSubcategory(subcategory.name)}
                    />
                    <div className="flex-1 flex items-center justify-between">
                      <span className="text-sm">{subcategory.name}</span>
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {subcategory.resources.length}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Display selected subcategories */}
      {hasSelectedSubcategories && (
        <>
          <div className="text-sm text-muted-foreground">Filtered by:</div>
          <div className="flex gap-1 flex-wrap">
            {selectedSubcategories.map(subcategory => (
              <Badge
                key={subcategory}
                variant="default"
                className="h-6 text-xs cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => toggleSubcategory(subcategory)}
              >
                {subcategory}
                <X className="h-3 w-3 ml-1" />
              </Badge>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
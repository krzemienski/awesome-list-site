import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { LayoutGrid, List, LayoutList } from "lucide-react";
import { cn } from "@/lib/utils";

export type ViewMode = "grid" | "list" | "compact";

interface ViewModeToggleProps {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
  className?: string;
}

export function ViewModeToggle({ value, onChange, className }: ViewModeToggleProps) {
  const handleChange = (newValue: string) => {
    if (newValue && (newValue === "grid" || newValue === "list" || newValue === "compact")) {
      onChange(newValue);
    }
  };

  return (
    <ToggleGroup 
      type="single" 
      value={value} 
      onValueChange={handleChange}
      className={cn("border rounded-md p-1", className)}
    >
      <ToggleGroupItem 
        value="grid" 
        aria-label="Grid view"
        className="px-2 py-1 data-[state=on]:bg-accent"
        data-testid="view-mode-grid"
      >
        <LayoutGrid className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem 
        value="list" 
        aria-label="List view"
        className="px-2 py-1 data-[state=on]:bg-accent"
        data-testid="view-mode-list"
      >
        <List className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem 
        value="compact" 
        aria-label="Compact view"
        className="px-2 py-1 data-[state=on]:bg-accent"
        data-testid="view-mode-compact"
      >
        <LayoutList className="h-4 w-4" />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

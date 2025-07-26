import { Button } from "../ui/button";
import { Grid3X3, List, LayoutGrid } from "lucide-react";

export type LayoutType = "cards" | "list" | "compact";

interface LayoutSwitcherProps {
  currentLayout: LayoutType;
  onLayoutChange: (layout: LayoutType) => void;
}

export default function LayoutSwitcher({ currentLayout, onLayoutChange }: LayoutSwitcherProps) {
  return (
    <div className="flex items-center gap-1">
      <Button
        variant={currentLayout === "cards" ? "default" : "ghost"}
        size="sm"
        onClick={() => onLayoutChange("cards")}
        className="h-8 w-8 p-0"
        title="Card View"
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
      
      <Button
        variant={currentLayout === "list" ? "default" : "ghost"}
        size="sm"
        onClick={() => onLayoutChange("list")}
        className="h-8 w-8 p-0"
        title="List View"
      >
        <List className="h-4 w-4" />
      </Button>
      
      <Button
        variant={currentLayout === "compact" ? "default" : "ghost"}
        size="sm"
        onClick={() => onLayoutChange("compact")}
        className="h-8 w-8 p-0"
        title="Compact Grid"
      >
        <Grid3X3 className="h-4 w-4" />
      </Button>
    </div>
  );
}
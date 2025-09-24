import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Grid3X3, List, LayoutGrid, MoreVertical } from "lucide-react";
import { trackLayoutChange } from "@/lib/analytics";

export type LayoutType = "cards" | "list" | "compact";

interface LayoutSwitcherProps {
  currentLayout: LayoutType;
  onLayoutChange: (layout: LayoutType) => void;
}

export default function LayoutSwitcher({ currentLayout, onLayoutChange }: LayoutSwitcherProps) {
  const handleLayoutChange = (layout: LayoutType) => {
    trackLayoutChange(layout);
    onLayoutChange(layout);
  };

  return (
    <div className="flex items-center gap-1">
      <Button
        variant={currentLayout === "cards" ? "default" : "ghost"}
        size="sm"
        onClick={() => handleLayoutChange("cards")}
        className="h-8 w-8 p-0"
        title="Card View"
        data-testid="layout-cards-button"
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
      
      <Button
        variant={currentLayout === "list" ? "default" : "ghost"}
        size="sm"
        onClick={() => handleLayoutChange("list")}
        className="h-8 w-8 p-0"
        title="List View"
        data-testid="layout-list-button"
      >
        <List className="h-4 w-4" />
      </Button>
      
      <Button
        variant={currentLayout === "compact" ? "default" : "ghost"}
        size="sm"
        onClick={() => handleLayoutChange("compact")}
        className="h-8 w-8 p-0"
        title="Compact Grid"
        data-testid="layout-compact-button"
      >
        <Grid3X3 className="h-4 w-4" />
      </Button>
    </div>
  );
}
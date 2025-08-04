import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Grid3X3, List, LayoutGrid, Table } from "lucide-react";
import { trackLayoutChange } from "@/lib/analytics";

export type LayoutType = "cards" | "list" | "compact" | "table";

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
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
      
      <Button
        variant={currentLayout === "list" ? "default" : "ghost"}
        size="sm"
        onClick={() => handleLayoutChange("list")}
        className="h-8 w-8 p-0"
        title="List View"
      >
        <List className="h-4 w-4" />
      </Button>
      
      <Button
        variant={currentLayout === "compact" ? "default" : "ghost"}
        size="sm"
        onClick={() => handleLayoutChange("compact")}
        className="h-8 w-8 p-0"
        title="Compact Grid"
      >
        <Grid3X3 className="h-4 w-4" />
      </Button>
      
      <Button
        variant={currentLayout === "table" ? "default" : "ghost"}
        size="sm"
        onClick={() => handleLayoutChange("table")}
        className="h-8 w-8 p-0"
        title="Table View"
      >
        <Table className="h-4 w-4" />
      </Button>
    </div>
  );
}
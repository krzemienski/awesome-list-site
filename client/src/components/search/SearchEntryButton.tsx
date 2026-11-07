import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CommandPaletteOpenMethod } from "@/lib/analytics";
import { openSearchPalette } from "@/lib/search-palette";
import { cn } from "@/lib/utils";

interface SearchEntryButtonProps {
  method: CommandPaletteOpenMethod;
  surface: string;
  className?: string;
}

/** A labelled page-level entry into the global search palette. */
export function SearchEntryButton({ method, surface, className }: SearchEntryButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn("gap-2", className)}
      onClick={() => openSearchPalette({ method, surface })}
      data-testid="button-open-search"
    >
      <Search aria-hidden="true" />
      <span>Search all resources</span>
    </Button>
  );
}

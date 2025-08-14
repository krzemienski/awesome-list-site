import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ExternalLink, Star, GitFork } from "lucide-react";
import { Resource } from "@/types/awesome-list";
import ResourcePreviewTooltip from "@/components/ui/resource-preview-tooltip";
import { cn } from "@/lib/utils";

interface ResourceListItemProps {
  resource: Resource;
  index?: number;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onSelectionToggle?: (resource: Resource) => void;
}

export default function ResourceListItem({ resource, isSelectionMode, isSelected, onSelectionToggle }: ResourceListItemProps) {
  const handleClick = () => {
    window.open(resource.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <ResourcePreviewTooltip resource={resource} side="right" align="start">
      <div 
        className={cn(
          "flex items-center justify-between p-4 border-b border-border hover:bg-accent/50 cursor-pointer transition-colors",
          isSelected && "bg-accent/50 border-primary"
        )}
        onClick={handleClick}
      >
        {/* Selection checkbox */}
        {isSelectionMode && (
          <div className="mr-3">
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onSelectionToggle?.(resource)}
              onClick={(e) => e.stopPropagation()}
              aria-label={`Select ${resource.title}`}
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-sm truncate">{resource.title}</h3>
            <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
          </div>
          
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
            {resource.description}
          </p>
          
          <div className="flex items-center gap-2 flex-wrap">
            {resource.subcategory && (
              <Badge variant="secondary" className="text-xs h-5">
                {resource.subcategory}
              </Badge>
            )}
            {resource.tags?.map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs h-5">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </ResourcePreviewTooltip>
  );
}
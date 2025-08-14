import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ExternalLink } from "lucide-react";
import { Resource } from "@/types/awesome-list";
import ResourcePreviewTooltip from "@/components/ui/resource-preview-tooltip";
import { cn } from "@/lib/utils";

interface ResourceCompactItemProps {
  resource: Resource;
  index?: number;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onSelectionToggle?: (resource: Resource) => void;
}

export default function ResourceCompactItem({ resource, isSelectionMode, isSelected, onSelectionToggle }: ResourceCompactItemProps) {
  const handleClick = () => {
    window.open(resource.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <ResourcePreviewTooltip resource={resource} side="top" align="center">
      <div 
        className={cn(
          "p-3 border border-border rounded-md hover:bg-accent/50 cursor-pointer transition-colors",
          isSelected && "bg-accent/50 border-primary"
        )}
        onClick={handleClick}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          {/* Selection checkbox */}
          {isSelectionMode && (
            <div className="mr-2">
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => onSelectionToggle?.(resource)}
                onClick={(e) => e.stopPropagation()}
                aria-label={`Select ${resource.title}`}
                className="mt-0.5"
              />
            </div>
          )}
          <h3 className="font-medium text-sm line-clamp-1 flex-1">{resource.title}</h3>
          <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
        </div>
        
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
          {resource.description}
        </p>
        
        <div className="flex gap-1 flex-wrap">
          {resource.subcategory && (
            <Badge variant="secondary" className="text-xs h-4 px-1">
              {resource.subcategory.length > 15 ? resource.subcategory.substring(0, 12) + "..." : resource.subcategory}
            </Badge>
          )}
          {resource.tags?.slice(0, 2).map((tag, index) => (
            <Badge key={index} variant="outline" className="text-xs h-4 px-1">
              {tag.length > 10 ? tag.substring(0, 8) + "..." : tag}
            </Badge>
          ))}
          {resource.tags && resource.tags.length > 2 && (
            <Badge variant="outline" className="text-xs h-4 px-1">
              +{resource.tags.length - 2}
            </Badge>
          )}
        </div>
      </div>
    </ResourcePreviewTooltip>
  );
}
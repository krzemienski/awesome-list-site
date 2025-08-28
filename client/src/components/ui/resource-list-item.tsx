import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ExternalLink, Bookmark, Share2 } from "lucide-react";
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

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('Bookmark clicked:', resource.title);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.share) {
      navigator.share({
        title: resource.title,
        text: resource.description,
        url: resource.url,
      });
    } else {
      navigator.clipboard.writeText(resource.url);
    }
  };

  return (
    <Card 
      className={cn(
        "hover:shadow-sm cursor-pointer transition-all duration-200 group border-0 border-b rounded-none hover:bg-accent/30",
        isSelected && "bg-accent/50 border-l-4 border-l-primary"
      )}
      onClick={handleClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
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
              <h3 className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                {resource.title}
              </h3>
              <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            
            <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
              {resource.description}
            </p>
            
            <div className="flex items-center gap-1 flex-wrap">
              <Badge variant="default" className="text-xs h-5">
                {resource.category}
              </Badge>
              {resource.subcategory && (
                <Badge variant="secondary" className="text-xs h-5">
                  {resource.subcategory}
                </Badge>
              )}
              {resource.tags?.slice(0, 2).map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs h-5">
                  {tag}
                </Badge>
              ))}
              {resource.tags && resource.tags.length > 2 && (
                <Badge variant="outline" className="text-xs h-5">
                  +{resource.tags.length - 2}
                </Badge>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 ml-3">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleBookmark}
            >
              <Bookmark className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleShare}
            >
              <Share2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
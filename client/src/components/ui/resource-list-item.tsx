import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { Separator } from "@/components/ui/separator";
import { ExternalLink, Bookmark, Share2 } from "lucide-react";
import { Resource } from "@/types/awesome-list";
import ResourcePreviewTooltip from "@/components/ui/resource-preview-tooltip";
import { cn } from "@/lib/utils";

interface ResourceListItemProps {
  resource: Resource;
  index?: number;
}

export default function ResourceListItem({ resource }: ResourceListItemProps) {
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
      className="cursor-pointer group border-0 border-b rounded-none"
      onClick={handleClick}
    >
      <CardContent className="p-4 overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium text-sm truncate group-hover:text-primary">
                {resource.title}
              </h3>
              <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 flex-shrink-0" />
            </div>
            
            <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
              {resource.description}
            </p>
            
            <div className="flex items-center gap-1 flex-wrap overflow-hidden">
              <Badge variant="default" className="text-xs h-5 flex-shrink-0">
                {resource.category}
              </Badge>
              {resource.subcategory && (
                <Badge variant="secondary" className="text-xs h-5 flex-shrink-0">
                  {resource.subcategory}
                </Badge>
              )}
              {resource.tags?.slice(0, 2).map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs h-5 flex-shrink-0">
                  {tag}
                </Badge>
              ))}
              {resource.tags && resource.tags.length > 2 && (
                <Badge variant="outline" className="text-xs h-5 flex-shrink-0">
                  +{resource.tags.length - 2}
                </Badge>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 ml-3 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
              onClick={handleBookmark}
            >
              <Bookmark className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100"
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { ExternalLink, Bookmark, Share2 } from "lucide-react";
import { Resource } from "@/types/awesome-list";
import ResourcePreviewTooltip from "@/components/ui/resource-preview-tooltip";
import { cn } from "@/lib/utils";

interface ResourceCompactItemProps {
  resource: Resource;
  index?: number;
}

export default function ResourceCompactItem({ resource }: ResourceCompactItemProps) {
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
      className="hover:shadow-md cursor-pointer group overflow-hidden"
      onClick={handleClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm line-clamp-1 group-hover:text-primary">
              {resource.title}
            </CardTitle>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 flex-shrink-0" />
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 flex-shrink-0"
              onClick={handleBookmark}
            >
              <Bookmark className="h-2.5 w-2.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 flex-shrink-0"
              onClick={handleShare}
            >
              <Share2 className="h-2.5 w-2.5" />
            </Button>
          </div>
        </div>
        <CardDescription className="line-clamp-2 text-xs">
          {resource.description}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-0 pb-3 overflow-hidden">
        <div className="flex gap-1 flex-wrap overflow-hidden">
          <Badge variant="default" className="text-xs h-4 px-1 flex-shrink-0">
            {resource.category}
          </Badge>
          {resource.subcategory && (
            <Badge variant="secondary" className="text-xs h-4 px-1 flex-shrink-0">
              {resource.subcategory.length > 12 ? resource.subcategory.substring(0, 10) + "..." : resource.subcategory}
            </Badge>
          )}
          {resource.tags?.slice(0, 1).map((tag, index) => (
            <Badge key={index} variant="outline" className="text-xs h-4 px-1 flex-shrink-0">
              {tag.length > 8 ? tag.substring(0, 6) + "..." : tag}
            </Badge>
          ))}
          {resource.tags && resource.tags.length > 1 && (
            <Badge variant="outline" className="text-xs h-4 px-1">
              +{resource.tags.length - 1}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ExternalLink, Bookmark, Share2 } from "lucide-react";
import { Resource } from "@/types/awesome-list";
import { trackResourceClick } from "@/lib/analytics";
import ResourceTooltip from "@/components/ui/resource-tooltip";
import { cn } from "@/lib/utils";

interface ResourceCardProps {
  resource: Resource;
  index: number;
}

export default function ResourceCard({ resource, index }: ResourceCardProps) {
  
  const handleResourceClick = () => {
    trackResourceClick(resource.title, resource.url, resource.category);
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
    <div className="h-full quick-fade hw-accelerated">
      <Card 
        className="h-full cursor-pointer group transition-all duration-200 hover:shadow-lg hover:scale-[1.02] transform-gpu"
        data-testid={`resource-card-${resource.title.replace(/\s+/g, '-').toLowerCase()}`}
        onClick={handleResourceClick}
      >
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg font-semibold leading-tight group-hover:text-primary">
                {resource.title}
              </CardTitle>
              <CardDescription className="mt-2 line-clamp-2">
                {resource.description}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant="default">
              {resource.category}
            </Badge>
            {resource.subcategory && (
              <Badge variant="secondary">
                {resource.subcategory}
              </Badge>
            )}
          </div>
          
          {resource.tags && resource.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {resource.tags.slice(0, 3).map((tag, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {resource.tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{resource.tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </CardContent>

        <CardFooter className="pt-0">
          <div className="flex items-center justify-end w-full gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBookmark}
            >
              <Bookmark className="h-4 w-4 mr-1" />
              Bookmark
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
            >
              <Share2 className="h-4 w-4 mr-1" />
              Share
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

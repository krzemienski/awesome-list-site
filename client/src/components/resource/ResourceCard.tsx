import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import FavoriteButton from "./FavoriteButton";
import BookmarkButton from "./BookmarkButton";
import { cn } from "@/lib/utils";

interface ResourceCardProps {
  resource: {
    id: string;
    name: string;
    url: string;
    description?: string;
    category?: string;
    tags?: string[];
    isFavorited?: boolean;
    isBookmarked?: boolean;
    favoriteCount?: number;
    bookmarkNotes?: string;
  };
  className?: string;
  onClick?: () => void;
}

export default function ResourceCard({ 
  resource, 
  className,
  onClick 
}: ResourceCardProps) {
  const { isAuthenticated } = useAuth();

  const handleCardClick = () => {
    if (onClick) {
      onClick();
    }
  };

  const handleResourceClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(resource.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Card 
      className={cn(
        "group hover:border-pink-500/50 transition-all cursor-pointer",
        className
      )}
      onClick={handleCardClick}
      data-testid={`card-resource-${resource.id}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg line-clamp-1 flex-1 min-w-0">
            {resource.name}
          </CardTitle>
          {isAuthenticated && (
            <div className="flex items-center gap-1 ml-2">
              <FavoriteButton
                resourceId={resource.id}
                isFavorited={resource.isFavorited}
                favoriteCount={resource.favoriteCount}
                size="sm"
                showCount={false}
              />
              <BookmarkButton
                resourceId={resource.id}
                isBookmarked={resource.isBookmarked}
                notes={resource.bookmarkNotes}
                size="sm"
              />
            </div>
          )}
        </div>
        {resource.description && (
          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
            {resource.description}
          </p>
        )}
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {resource.category && (
            <Badge variant="secondary" className="text-xs">
              {resource.category}
            </Badge>
          )}
          {resource.tags && resource.tags.length > 0 && (
            <>
              {resource.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  #{tag}
                </Badge>
              ))}
              {resource.tags.length > 3 && (
                <span className="text-xs text-muted-foreground">
                  +{resource.tags.length - 3} more
                </span>
              )}
            </>
          )}
        </div>
        
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full border-cyan-500/50 hover:bg-cyan-500/10 hover:border-cyan-500"
          onClick={handleResourceClick}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Visit Resource
        </Button>
      </CardContent>
    </Card>
  );
}
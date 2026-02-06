import { useState, memo } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Edit, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import FavoriteButton from "./FavoriteButton";
import BookmarkButton from "./BookmarkButton";
import { SuggestEditDialog } from "@/components/ui/suggest-edit-dialog";
import { cn } from "@/lib/utils";
import { Blurhash } from "react-blurhash";
import type { Resource } from "@shared/schema";

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
  fullResource?: Resource;
  className?: string;
  onClick?: () => void;
}

function ResourceCard({
  resource,
  fullResource,
  className,
  onClick
}: ResourceCardProps) {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [suggestEditOpen, setSuggestEditOpen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const numericId = parseInt(resource.id);
  const isValidDbResource = !isNaN(numericId) && numericId > 0;

  const handleCardClick = () => {
    if (onClick) {
      onClick();
    } else if (isValidDbResource) {
      setLocation(`/resource/${resource.id}`);
    } else {
      window.open(resource.url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleExternalLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(resource.url, '_blank', 'noopener,noreferrer');
  };

  const handleSuggestEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSuggestEditOpen(true);
  };

  const resourceForDialog: Resource = fullResource || {
    id: numericId,
    title: resource.name,
    url: resource.url,
    description: resource.description || "",
    category: resource.category || "",
    subcategory: null,
    subSubcategory: null,
    status: "approved",
    submittedBy: null,
    approvedBy: null,
    approvedAt: null,
    githubSynced: false,
    lastSyncedAt: null,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
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
        {fullResource?.metadata?.urlScraped && (
          <div className="mb-3 space-y-2">
            {fullResource.metadata.ogImage && (
              <div className="rounded-md overflow-hidden border border-border relative h-32">
                {fullResource.metadata.ogImageBlurhash && !imageLoaded && (
                  <div className="absolute inset-0">
                    <Blurhash
                      hash={fullResource.metadata.ogImageBlurhash}
                      width="100%"
                      height="100%"
                      resolutionX={32}
                      resolutionY={32}
                      punch={1}
                    />
                  </div>
                )}
                <img
                  src={fullResource.metadata.ogImage}
                  alt={fullResource.metadata.ogTitle || resource.name}
                  className="w-full h-32 object-cover relative z-10"
                  loading="lazy"
                  onLoad={() => setImageLoaded(true)}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
            {fullResource.metadata.scrapedTitle && fullResource.metadata.scrapedTitle !== resource.name && (
              <div className="text-xs text-muted-foreground">
                <span className="font-medium">Page Title:</span> {fullResource.metadata.scrapedTitle}
              </div>
            )}
            {fullResource.metadata.scrapedDescription && fullResource.metadata.scrapedDescription !== resource.description && (
              <div className="text-xs text-muted-foreground line-clamp-2">
                <span className="font-medium">Page Description:</span> {fullResource.metadata.scrapedDescription}
              </div>
            )}
          </div>
        )}
        
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {isValidDbResource && (
            <Badge variant="outline" className="text-xs border-pink-500/30 text-pink-400">
              <ChevronRight className="h-3 w-3 mr-0.5" />
              View Details
            </Badge>
          )}
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
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 border-cyan-500/50 hover:bg-cyan-500/10 hover:border-cyan-500 min-h-[44px]"
            onClick={handleExternalLink}
            data-testid={`button-visit-${resource.id}`}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open Link
          </Button>
          {isValidDbResource && (
            <Button
              variant="ghost"
              size="sm"
              className="min-h-[44px] min-w-[44px]"
              onClick={handleSuggestEdit}
              data-testid={`button-suggest-edit-${resource.id}`}
              title="Suggest an edit"
              aria-label="Suggest an edit"
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>

      {suggestEditOpen && (
        <SuggestEditDialog 
          resource={resourceForDialog}
          open={suggestEditOpen}
          onOpenChange={setSuggestEditOpen}
        />
      )}
    </Card>
  );
}

export default memo(ResourceCard, (prevProps, nextProps) => {
  const prevRes = prevProps.resource;
  const nextRes = nextProps.resource;

  // Return true if props are equal (skip re-render), false if different (re-render)
  return (
    prevRes.id === nextRes.id &&
    prevRes.name === nextRes.name &&
    prevRes.url === nextRes.url &&
    prevRes.description === nextRes.description &&
    prevRes.isFavorited === nextRes.isFavorited &&
    prevRes.isBookmarked === nextRes.isBookmarked &&
    prevRes.favoriteCount === nextRes.favoriteCount &&
    prevRes.bookmarkNotes === nextRes.bookmarkNotes &&
    prevRes.category === nextRes.category &&
    // Handle optional array comparison
    JSON.stringify(prevRes.tags || []) === JSON.stringify(nextRes.tags || []) &&
    // Compare other props
    prevProps.className === nextProps.className &&
    prevProps.onClick === nextProps.onClick &&
    prevProps.fullResource === nextProps.fullResource
  );
});

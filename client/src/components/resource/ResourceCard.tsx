import { useState, memo } from "react";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Edit, ChevronRight } from "lucide-react";
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
  /** BUG-018 (run14): when provided, tag pills become buttons that apply the
   * tag as a filter on the hosting page; otherwise they link to the
   * tag-filtered home view. */
  onTagClick?: (tag: string) => void;
}

function ResourceCard({
  resource,
  fullResource,
  className,
  onClick,
  onTagClick
}: ResourceCardProps) {
  const [, setLocation] = useLocation();
  const [suggestEditOpen, setSuggestEditOpen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  // Run15 BUG-022: expandable tag row ("+N more" reveals the hidden tags)
  const [showAllTags, setShowAllTags] = useState(false);

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
    searchTsv: null,
  };

  // Run3 audit R3-31: the card title is a REAL anchor (stretched-link pattern)
  // instead of a JS-only onClick <div>, so middle-click / cmd-click / "open in
  // new tab" / link previews work and crawlers see an href. The after:inset-0
  // overlay keeps the whole card clickable; interactive children (favorite,
  // bookmark, Open Link, Suggest Edit) sit above it via relative z-10. The
  // legacy onClick prop path (custom card behavior) is preserved unchanged.
  // Run16 BUG-049: inline-block + py-1/-my-1 lifts the anchor's own hit-box to
  // ≥24px (WCAG 2.5.8) without moving the text; the stretched after:inset-0
  // overlay still makes the whole card the effective target.
  const titleContent = onClick ? (
    resource.name
  ) : isValidDbResource ? (
    <Link
      href={`/resource/${resource.id}`}
      className="inline-block py-1 -my-1 hover:text-primary transition-colors after:absolute after:inset-0 after:content-['']"
      data-testid={`link-resource-title-${resource.id}`}
    >
      {resource.name}
    </Link>
  ) : (
    <a
      href={resource.url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-block py-1 -my-1 hover:text-primary transition-colors after:absolute after:inset-0 after:content-['']"
      data-testid={`link-resource-title-${resource.id}`}
    >
      {resource.name}
    </a>
  );

  return (
    <Card 
      className={cn(
        "group relative hover:border-primary/50 transition-all cursor-pointer",
        className
      )}
      onClick={onClick ? handleCardClick : undefined}
      data-testid={`card-resource-${resource.id}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          {/* BUG-021/036 (run10): full title via native tooltip — the visual
              title is line-clamped so hover/long-press reveals the rest.
              BUG-v3-H02 (run12): rendered as a real h2 so resource cards sit
              beneath the page h1 in the heading hierarchy. */}
          <h2
            className="text-lg font-semibold leading-none tracking-tight line-clamp-1 flex-1 min-w-0"
            title={resource.name}
          >
            {titleContent}
          </h2>
          {/* R2-L09: shown to anonymous users too — the buttons themselves
              prompt sign-in on click instead of hiding the affordance. */}
          <div className="relative z-10 flex items-center gap-1 ml-2">
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
          {/* BUG-012 (run14): "View Details" is a real link to the detail page
              (was a decorative Badge that swallowed clicks under the
              stretched-link overlay). */}
          {isValidDbResource && (
            <Link
              href={`/resource/${resource.id}`}
              className="relative z-10"
              data-testid={`link-view-details-${resource.id}`}
              aria-label={`View details for ${resource.name}`}
            >
              <Badge variant="outline" className="text-xs border-primary/30 text-primary hover:bg-primary/10 transition-colors">
                <ChevronRight className="h-3 w-3 mr-0.5" />
                View Details
              </Badge>
            </Link>
          )}
          {resource.category && (
            <Badge variant="secondary" className="text-xs">
              {resource.category}
            </Badge>
          )}
          {/* BUG-018 (run14): tag pills are interactive — they filter the
              hosting page (onTagClick) or link to the tag-filtered home. */}
          {resource.tags && resource.tags.length > 0 && (
            <>
              {(showAllTags ? resource.tags : resource.tags.slice(0, 3)).map((tag) =>
                onTagClick ? (
                  <button
                    key={tag}
                    type="button"
                    className="relative z-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTagClick(tag);
                    }}
                    data-testid={`tag-pill-${resource.id}-${tag}`}
                    aria-label={`Filter by tag ${tag}`}
                  >
                    <Badge variant="outline" className="text-xs hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer">
                      #{tag}
                    </Badge>
                  </button>
                ) : (
                  <Link
                    key={tag}
                    href={`/?tags=${encodeURIComponent(tag)}`}
                    className="relative z-10"
                    data-testid={`tag-pill-${resource.id}-${tag}`}
                    aria-label={`Browse resources tagged ${tag}`}
                  >
                    <Badge variant="outline" className="text-xs hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer">
                      #{tag}
                    </Badge>
                  </Link>
                ),
              )}
              {/* Run15 BUG-022: "+N more" is now a real control — clicking it
                  reveals the remaining tags (and can collapse them again). */}
              {resource.tags.length > 3 && (
                <button
                  type="button"
                  className="relative z-10 text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAllTags((v) => !v);
                  }}
                  aria-expanded={showAllTags}
                  aria-label={
                    showAllTags
                      ? "Show fewer tags"
                      : `Show ${resource.tags.length - 3} more tags`
                  }
                  data-testid={`button-more-tags-${resource.id}`}
                >
                  {showAllTags ? "Show fewer" : `+${resource.tags.length - 3} more`}
                </button>
              )}
            </>
          )}
        </div>
        
        <div className="relative z-10 flex gap-2">
          {/* Run16 BUG-006/BUG-020: real anchor (not JS window.open) so the
              action can never silently fail and middle-click/cmd-click work */}
          <Button
            asChild
            variant="outline"
            size="sm"
            className="flex-1 border-primary/50 hover:bg-primary/10 hover:border-primary min-h-[44px]"
          >
            <a
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              data-testid={`button-visit-${resource.id}`}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Link
            </a>
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
    prevProps.onTagClick === nextProps.onTagClick &&
    prevProps.fullResource === nextProps.fullResource
  );
});

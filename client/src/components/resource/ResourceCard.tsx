import { useState, useRef, memo, lazy, Suspense } from "react";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Edit, ChevronRight, NotebookPen } from "lucide-react";
import FavoriteButton from "./FavoriteButton";
import BookmarkButton from "./BookmarkButton";
import { cn } from "@/lib/utils";
import { Blurhash } from "react-blurhash";
import type { Resource } from "@shared/schema";
import { tagLandingPath } from "@shared/tagNormalize";
import "@/styles/components/resource-card.css";

// This form is only needed after an authenticated visitor explicitly chooses
// "Suggest an edit". Keep its Zod/react-hook-form closure out of resource
// listing routes while preserving the same dialog contract.
const SuggestEditDialog = lazy(() =>
  import("@/components/ui/suggest-edit-dialog").then(({ SuggestEditDialog }) => ({
    default: SuggestEditDialog,
  })),
);

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
  /** When provided, normal clicks still apply the hosting page's filter while
   * each pill remains a crawlable link to its canonical tag landing page. */
  onTagClick?: (tag: string) => void;
  /** Public read-only collections hide account/edit actions while preserving
   * the card's real detail and external links. */
  showPersonalActions?: boolean;
  /** Compact, read-only presentation used by taxonomy pages to mirror the
   * public catalogue card while retaining the card's real links. */
  variant?: "default" | "taxonomy";
}

const RESOURCE_CATEGORY_MARKS: Record<string, string> = {
  "community-events": "◈",
  "encoding-codecs": "◇",
  "general-tools": "◆",
  "infrastructure-delivery": "▣",
  "intro-learning": "▤",
  "media-tools": "▥",
  "players-clients": "▶",
  "protocols-transport": "⟁",
  "standards-industry": "◉",
};

function resourceCategoryMark(category?: string): string {
  if (!category) return "◆";

  const slug = category
    .trim()
    .toLowerCase()
    .replace(/&/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return RESOURCE_CATEGORY_MARKS[slug] || "◆";
}

function ResourceCard({
  resource,
  fullResource,
  className,
  onClick,
  onTagClick,
  showPersonalActions = true,
  variant = "default",
}: ResourceCardProps) {
  const [, setLocation] = useLocation();
  const [suggestEditOpen, setSuggestEditOpen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
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
    resourceFormat: "unknown",
    provider: "unknown",
    skillLevel: "unknown",
    kind: null,
    status: "approved",
    submittedBy: null,
    approvedBy: null,
    approvedAt: null,
    contributorRejectionReason: null,
    statusChangedAt: null,
    githubSynced: false,
    lastSyncedAt: null,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    searchTsv: null,
  };
  const categoryMark = resourceCategoryMark(resource.category);

  // Run3 audit R3-31: the card title is a REAL anchor (stretched-link pattern)
  // instead of a JS-only onClick <div>, so middle-click / cmd-click / "open in
  // new tab" / link previews work and crawlers see an href. The after:inset-0
  // overlay keeps the whole card clickable; interactive children (favorite,
  // bookmark, Open Link, Suggest Edit) sit above it via relative z-10. The
  // legacy onClick prop path (custom card behavior) is preserved unchanged.
  // Run16 BUG-049: inline-block + py-1/-my-1 lifts the anchor's own hit-box to
  // ≥24px (WCAG 2.5.8) without moving the text; the stretched after:inset-0
  // overlay still makes the whole card the effective target.
  // BUG-003 (run22): the 2-line clamp lives on the anchor itself, not only the
  // h2 — an inline-block child inside a -webkit-box parent defeats
  // -webkit-line-clamp (all lines render, no ellipsis). line-clamp's box is
  // block-level; min-h-10 keeps the title target large without padding extra
  // text into the clamp box (which would expose part of a third line).
  const titleContent = onClick ? (
    <span className="resource-card__title-link">
      {resource.name}
    </span>
  ) : isValidDbResource ? (
    <Link
      href={`/resource/${resource.id}`}
      className="resource-card__title-link"
      data-testid={`link-resource-title-${resource.id}`}
    >
      {resource.name}
    </Link>
  ) : (
    <a
      href={resource.url}
      target="_blank"
      rel="noopener noreferrer"
      className="resource-card__title-link"
      data-testid={`link-resource-title-${resource.id}`}
    >
      {resource.name}
      {/* Run25 F-003: external title anchor — announce the new tab. */}
      <span className="sr-only"> (opens in new tab)</span>
    </a>
  );

  return (
    <Card 
      ref={cardRef}
      className={cn(
        "resource-card card hoverable glow group relative",
        variant === "taxonomy" && "resource-card--taxonomy",
        className
      )}
      data-ds="card-hover"
      onClick={onClick ? handleCardClick : undefined}
      data-testid={`card-resource-${resource.id}`}
    >
      <CardHeader className="resource-card__header">
        <div className="resource-card__top">
          <div className="resource-card__mark" aria-hidden="true">
            {categoryMark}
          </div>
          {/* R2-L09: shown to anonymous users too — the buttons themselves
              prompt sign-in on click instead of hiding the affordance. */}
          {showPersonalActions && (
            <div className="resource-card__personal-actions no-print relative z-10">
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
        <div className="resource-card__title-row">
          {/* BUG-021/036 (run10): full title via native tooltip — the visual
              title is line-clamped so hover/long-press reveals the rest.
              BUG-v3-H02 (run12): rendered as a real h2 so resource cards sit
              beneath the page h1 in the heading hierarchy. */}
          <h2
            /* NB-050 (run18): allow titles to wrap to two lines with an
               ellipsis (break-words) instead of hard-clipping mid-word in the
               grid; the native title tooltip still reveals the full text. */
            className="resource-card__title"
            title={resource.name}
          >
            {titleContent}
          </h2>
        </div>
        {/* R5-053 (run24): printed card grids previously showed dead buttons
            and never a URL. Print the destination under the title so a paper
            catalog stays actionable (screen: hidden). */}
        <p className="resource-card__print-url print-only" aria-hidden="true">
          {resource.url}
        </p>
        {resource.description && (
          <p className="resource-card__description">
            {resource.description}
          </p>
        )}
        {/* BUG-021 (run25): bookmark notes were stored but never rendered —
            show the saved note on the card (the /bookmarks page passes it). */}
        {resource.bookmarkNotes && (
          <p
            className="resource-card__bookmark-note"
            data-testid={`text-bookmark-notes-${resource.id}`}
          >
            <NotebookPen className="resource-card__bookmark-note-icon" aria-hidden="true" />
            {/* line-clamp sits on the element that directly holds the text;
                min-w-0 lets long unbroken notes wrap inside the flex row. */}
            <span className="min-w-0 line-clamp-2">{resource.bookmarkNotes}</span>
          </p>
        )}
      </CardHeader>
      
      <CardContent className="resource-card__content">
        {fullResource?.metadata?.urlScraped && (
          <div className="resource-card__scraped">
            {fullResource.metadata.ogImage && (
              <div className="resource-card__image-frame">
                {fullResource.metadata.ogImageBlurhash && !imageLoaded && (
                  <div className="resource-card__blurhash">
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
                  className="resource-card__image"
                  loading="lazy"
                  onLoad={() => setImageLoaded(true)}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
            {fullResource.metadata.scrapedTitle && fullResource.metadata.scrapedTitle !== resource.name && (
              <div className="resource-card__scraped-copy">
                <span>Page Title:</span> {fullResource.metadata.scrapedTitle}
              </div>
            )}
            {fullResource.metadata.scrapedDescription && fullResource.metadata.scrapedDescription !== resource.description && (
              <div className="resource-card__scraped-copy resource-card__scraped-copy--clamp">
                <span>Page Description:</span> {fullResource.metadata.scrapedDescription}
              </div>
            )}
          </div>
        )}
        
        <div className="resource-card__metadata">
          {/* BUG-012 (run14): "View Details" is a real link to the detail page
              (was a decorative Badge that swallowed clicks under the
              stretched-link overlay). */}
          {/* R5-053 (run24): no-print — "View Details" is an anchor, not a
              button, so the blanket print button-hide missed it. */}
          {isValidDbResource && (
            <Link
              href={`/resource/${resource.id}`}
              className="resource-card__meta-link no-print relative z-10"
              data-testid={`link-view-details-${resource.id}`}
              aria-label={`View details for ${resource.name}`}
            >
              <Badge variant="outline" className="resource-card__meta-badge">
                <ChevronRight className="resource-card__meta-icon" />
                View Details
              </Badge>
            </Link>
          )}
          {resource.category && (
            <Badge variant="chip" className="resource-card__category-badge">
              {resource.category}
            </Badge>
          )}
          {/* BUG-018 (run14): tag pills are interactive — they filter the
              hosting page (onTagClick) or link to the tag-filtered home. */}
          {resource.tags && resource.tags.length > 0 && (
            <>
              {(showAllTags ? resource.tags : resource.tags.slice(0, 3)).map((tag) => (
                <Link
                  key={tag}
                  href={tagLandingPath(tag)}
                  className="resource-card__tag-link relative z-10"
                  onClick={onTagClick ? (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onTagClick(tag);
                  } : undefined}
                  data-testid={`tag-pill-${resource.id}-${tag}`}
                  aria-label={onTagClick ? `Filter by tag ${tag}` : `Browse resources tagged ${tag}`}
                >
                  <Badge variant="chip" className="resource-card__tag">
                    #{tag}
                  </Badge>
                </Link>
              ))}
              {/* Run15 BUG-022: "+N more" is now a real control — clicking it
                  reveals the remaining tags (and can collapse them again). */}
              {resource.tags.length > 3 && (
                <button
                  type="button"
                  className="resource-card__more-tags relative z-10"
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
        
        {/* R5-053 (run24): no-print — the "Open Link" action is an anchor
            styled as a button; on paper it printed as a dead rectangle. */}
        <div className="resource-card__actions no-print relative z-10">
          {/* Run16 BUG-006/BUG-020: real anchor (not JS window.open) so the
              action can never silently fail and middle-click/cmd-click work */}
          <Button
            asChild
            variant="outline"
            size="sm"
              className="resource-card__visit-button"
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
              {/* Run25 F-003: SRs need to know this leaves the app in a new tab. */}
              <span className="sr-only"> (opens in new tab)</span>
            </a>
          </Button>
          {isValidDbResource && showPersonalActions && (
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

      {suggestEditOpen && showPersonalActions && (
        <Suspense fallback={null}>
          <SuggestEditDialog
            resource={resourceForDialog}
            open={suggestEditOpen}
            onOpenChange={setSuggestEditOpen}
          />
        </Suspense>
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
    prevProps.showPersonalActions === nextProps.showPersonalActions &&
    prevProps.variant === nextProps.variant &&
    prevProps.fullResource === nextProps.fullResource
  );
});

import { useParams, Link, useLocation } from "wouter";
import { hasInAppHistory } from "@/lib/nav-history";
import { useQuery } from "@tanstack/react-query";
import NotFound from "@/pages/not-found";
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import SEOHead from "@/components/layout/SEOHead";
import { SuggestEditDialog } from "@/components/ui/suggest-edit-dialog";
import {
  ArrowLeft,
  ExternalLink,
  Calendar,
  FolderTree,
  Bookmark,
  Heart,
  Share2,
  Edit,
  Globe,
  Tag,
  Image as ImageIcon,
  Link2,
  Clock,
  ChevronRight,
  TrendingUp
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useFavoriteToggle, useBookmarkToggle } from "@/hooks/useResourceToggle";
import { trackSelectContent, trackShare, trackResourceFavorite } from "@/lib/analytics";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { slugify, formatAdminDate } from "@/lib/utils";
import { fetchAwesomeListNav } from "@/lib/static-data";
import { Blurhash } from "react-blurhash";
import type { Resource } from "@shared/schema";

export default function ResourceDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [suggestEditOpen, setSuggestEditOpen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const { data: resource, isLoading, error } = useQuery<Resource>({
    queryKey: ['/api/resources', id],
    queryFn: async () => {
      const response = await fetch(`/api/resources/${id}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Resource not found');
      return response.json();
    },
    enabled: !!id
  });

  const { data: favorites } = useQuery<Resource[]>({
    queryKey: ['/api/favorites'],
    enabled: isAuthenticated
  });

  const { data: bookmarks } = useQuery<Resource[]>({
    queryKey: ['/api/bookmarks'],
    enabled: isAuthenticated
  });

  // BUG-039 (run13): subcategory/sub-subcategory badges become real links.
  // Slugs are resolved from the cached taxonomy tree (shared with the
  // sidebar) because DB slugs are NOT always slugify(name) — de-duplicated
  // sub-subcategories carry "-sc<id>" suffixes.
  const { data: awesomeListTree } = useQuery<{
    categories?: {
      name: string;
      slug?: string;
      subcategories?: {
        name: string;
        slug?: string;
        subSubcategories?: { name: string; slug?: string }[];
      }[];
    }[];
  }>({
    // R4-033 (run21): same cache entry as App.tsx — no second download.
    // Run22 BUG-008: slug resolution only needs names+slugs, so this now
    // rides the ~few-KB nav tree instead of the 2.7MB corpus.
    queryKey: ["awesome-list-nav"],
    queryFn: fetchAwesomeListNav,
    staleTime: 1000 * 60 * 60,
  });

  const taxonomySlugs = useMemo(() => {
    const out: { subcategory?: string; subSubcategory?: string } = {};
    if (!awesomeListTree?.categories || !resource) return out;
    for (const cat of awesomeListTree.categories) {
      if (cat.name !== resource.category) continue;
      for (const sub of cat.subcategories || []) {
        if (sub.name !== resource.subcategory) continue;
        out.subcategory = sub.slug;
        if (resource.subSubcategory) {
          const ss = (sub.subSubcategories || []).find(
            (s) => s.name === resource.subSubcategory,
          );
          out.subSubcategory = ss?.slug;
        }
        return out;
      }
    }
    return out;
  }, [awesomeListTree, resource]);

  const { data: relatedResources } = useQuery<{ similar: { resource: Resource; score: number; reasons: string[] }[] }>({
    queryKey: ['/api/resources', id, 'related'],
    queryFn: async () => {
      const response = await fetch(`/api/resources/${id}/related`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch related resources');
      return response.json();
    },
    enabled: !!id
  });

  const numericId = parseInt(id || '0');
  const isFavorite = favorites?.some(f => f.id === numericId) ?? false;
  const isBookmarked = bookmarks?.some(b => b.id === numericId) ?? false;

  // Optimistic state lives in the query cache lists here (not local state):
  // flip the cached list membership so isFavorite/isBookmarked re-derive.
  const flipCachedList = (listKey: string, next: boolean) => {
    if (!resource) return;
    queryClient.setQueryData<Resource[]>([listKey], (old) => {
      const list = old ?? [];
      return next
        ? (list.some(r => r.id === numericId) ? list : [...list, resource])
        : list.filter(r => r.id !== numericId);
    });
  };

  // NB-024/NB-059 (run24): latest-wins rapid-click handling, auth gate,
  // error surfacing, invalidation and cross-tab sync all live in the shared
  // useFavoriteToggle/useBookmarkToggle hooks (same behavior as
  // FavoriteButton/BookmarkButton) — only toasts, Undo and analytics are
  // page-specific here.
  const favorite = useFavoriteToggle({
    resourceId: id || '',
    isActive: isFavorite,
    onOptimistic: (next) => flipCachedList('/api/favorites', next),
    onSuccess: (_data, vars, showToast) => {
      if (resource) {
        trackResourceFavorite(resource.title, resource.category ?? 'uncategorized', vars.remove ? 'remove' : 'add');
      }
      showToast({
        title: vars.remove ? "Removed from favorites" : "Added to favorites",
        description: vars.remove ? "Resource removed from your favorites" : "Resource saved to your favorites"
      });
    },
    onErrorRevert: () => {
      // Cache truth is server-side — refetch the list instead of guessing.
      queryClient.invalidateQueries({ queryKey: ['/api/favorites'] });
    },
  });

  const bookmark = useBookmarkToggle({
    resourceId: id || '',
    isActive: isBookmarked,
    onOptimistic: (next) => flipCachedList('/api/bookmarks', next),
    onSuccess: (_data, vars, showToast) => {
      if (vars.remove) {
        // Run17 BUG-013: removal is instant — offer a one-click Undo instead
        // of a confirm dialog.
        showToast({
          title: "Removed from bookmarks",
          description: "Resource removed from your bookmarks",
          action: (
            <ToastAction
              altText="Undo bookmark removal"
              onClick={async () => {
                await apiRequest(`/api/bookmarks/${id}`, { method: 'POST' });
                queryClient.invalidateQueries({ queryKey: ['/api/bookmarks'] });
              }}
              data-testid="button-undo-bookmark-removal"
            >
              Undo
            </ToastAction>
          ),
        });
      } else {
        showToast({
          title: "Added to bookmarks",
          description: "Resource saved to your bookmarks"
        });
      }
    },
    onErrorRevert: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bookmarks'] });
    },
  });

  // R2-L09: anonymous users get a clear sign-in prompt instead of a
  // confusing failed request. BUG-044/026 (run14): the toast now carries a
  // working "Sign in" action (was a dead end) that preserves the current page
  // via ?next= — the same gate pattern used across favorite/bookmark surfaces.
  const signInAction = (
    <ToastAction
      altText="Sign in"
      onClick={() =>
        setLocation(
          `/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`,
        )
      }
    >
      Sign in
    </ToastAction>
  );

  const handleFavoriteClick = () => favorite.toggle();
  const handleBookmarkClick = () => bookmark.toggle();

  // BUG-028 (run19): Suggest Edit used to open the dialog (which showed its own
  // sign-in wall) while Favorite/Bookmark toast — one auth-gate pattern now:
  // logged-out clicks get the same toast + Sign in action everywhere.
  const handleSuggestEditClick = () => {
    if (!isAuthenticated) {
      toast({
        title: "Sign in to suggest edits",
        description: "Create an account or sign in to propose changes to this resource.",
        action: signInAction,
      });
      return;
    }
    setSuggestEditOpen(true);
  };

  const trackInteraction = useMutation({
    mutationFn: async (interaction: {
      resourceId: string;
      interactionType: string;
      interactionValue?: number;
      metadata?: any;
    }) => {
      const response = await fetch("/api/interactions", {
        method: "POST",
        body: JSON.stringify({
          userId: user?.id,
          ...interaction
        }),
        headers: { "Content-Type": "application/json" }
      });
      return response.json();
    },
  });

  // Track page view when resource loads
  useEffect(() => {
    if (resource && user?.id) {
      trackInteraction.mutate({
        resourceId: resource.id.toString(),
        interactionType: "view",
        metadata: { timestamp: new Date().toISOString() }
      });
    }
  }, [resource?.id, user?.id]);

  // GA4 select_content — fires for all visitors when a resource detail loads.
  useEffect(() => {
    if (resource) {
      trackSelectContent('resource', resource.id, {
        content_name: resource.title,
        content_category: resource.category,
      });
    }
  }, [resource?.id]);

  const handleShare = async () => {
    const url = window.location.href;
    const canWebShare = typeof navigator.share === 'function';
    if (resource) {
      trackShare(canWebShare ? 'web_share' : 'clipboard', 'resource', resource.id);
    }
    if (canWebShare) {
      try {
        await navigator.share({
          title: resource?.title,
          text: resource?.description || `Check out ${resource?.title}`,
          url: url
        });
      } catch (err) {
        // User cancelled or share failed - fall back to clipboard
        try {
          await navigator.clipboard.writeText(url);
          toast({
            title: "Link copied",
            description: "Resource link copied to clipboard"
          });
        } catch {
          toast({
            title: "Unable to share",
            description: "Please copy the URL manually",
            variant: "destructive"
          });
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        toast({
          title: "Link copied",
          description: "Resource link copied to clipboard"
        });
      } catch {
        toast({
          title: "Unable to copy",
          description: "Please copy the URL manually from the address bar",
          variant: "destructive"
        });
      }
    }
  };

  // Run16 BUG-020: the Visit Resource CTAs are real anchors now (Button
  // asChild), so navigation is native and can never silently no-op;
  // middle-click/cmd-click also work. The click handler only fires the toast.
  const handleVisitResource = () => {
    toast({
      title: "Opening resource",
      description: "Opening in a new tab"
    });
  };

  // BUG-011 (run14): related cards are real anchors now. Plain left-clicks are
  // intercepted for SPA navigation (after tracking); modified clicks
  // (cmd/ctrl/shift/middle) fall through to native anchor behavior so
  // open-in-new-tab works.
  const handleRelatedResourceClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    relatedResource: Resource,
  ) => {
    trackInteraction.mutate({
      resourceId: relatedResource.id.toString(),
      interactionType: "click",
      metadata: { source: "related-resources", fromResourceId: id }
    });
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    setLocation(`/resource/${relatedResource.id}`);
  };

  const metadata = resource?.metadata as Record<string, any> | undefined;
  const hasOgImage = metadata?.ogImage;
  const hasFavicon = metadata?.favicon;
  const scrapedTitle = metadata?.scrapedTitle || metadata?.ogTitle;
  const scrapedDescription = metadata?.scrapedDescription || metadata?.ogDescription;
  const urlScraped = metadata?.urlScraped;
  const tags = metadata?.tags as string[] | undefined;

  const filteredRelatedResources = (relatedResources?.similar ?? [])
    .slice(0, 6)
    .map((item) => ({ ...item.resource, score: item.score, reasons: item.reasons }));

  if (isLoading) {
    return (
      <div className="space-y-4 sm:space-y-6 max-w-5xl mx-auto px-0 sm:px-4" aria-busy={true} aria-live="polite">
        {/* BUG-031 (run22): head must swap with the route, not lag behind the
            data fetch — otherwise a soft nav briefly shows the PREVIOUS page's
            title with no canonical. Neutral title now, real title on load. */}
        <SEOHead title="Loading resource" description="Loading resource details on Awesome Video." />
        <h1 className="sr-only">Loading resource…</h1>
        <Skeleton className="h-10 w-32" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !resource) {
    // BUG-031 (run13): use the shared 404 template (with a contextual
    // heading) so every not-found surface renders the same card.
    return <NotFound heading="Resource Not Found" />;
  }

  return (
    <div className="space-y-4 sm:space-y-6 max-w-5xl mx-auto px-0 sm:px-4 overflow-x-hidden">
      <SEOHead 
        title={`${resource.title}`}
        description={resource.description || scrapedDescription || `View details for ${resource.title}`}
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* BUG-011 (run13): "Back" now behaves like a real back button —
            history.back() when there is history, home as the fallback for
            direct/deep-linked visits. */}
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          data-testid="button-back"
          onClick={() => {
            // BUG-013 (run14): history.length lies on deep links (about:blank
            // and the new-tab page count toward it), sending fresh-tab
            // visitors to a blank page. Only go back when the app itself
            // recorded an in-app navigation.
            if (hasInAppHistory() && window.history.length > 1) {
              window.history.back();
            } else {
              setLocation("/");
            }
          }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        
        <div className="flex flex-wrap items-center gap-2">
          {/* R2-L09: favorite/bookmark shown to anonymous users too — clicks
              prompt sign-in instead of hiding the affordance. */}
          <Button
            variant={isFavorite ? "default" : "outline"}
            size="sm"
            onClick={handleFavoriteClick}
            aria-disabled={favorite.isPending}
            aria-busy={favorite.isPending}
            data-testid="button-favorite"
            className="min-h-[44px] px-4"
            aria-pressed={isFavorite}
            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            {/* BUG-050 (run19): labels stay visible at every width — icon-only
                buttons at 375px were mystery meat for sighted mobile users. */}
            <Heart className={`h-4 w-4 mr-2 ${isFavorite ? 'fill-current' : ''}`} />
            <span>{isFavorite ? 'Favorited' : 'Favorite'}</span>
          </Button>
          <Button
            variant={isBookmarked ? "default" : "outline"}
            size="sm"
            onClick={handleBookmarkClick}
            aria-disabled={bookmark.isPending}
            aria-busy={bookmark.isPending}
            data-testid="button-bookmark"
            className="min-h-[44px] px-4"
            aria-pressed={isBookmarked}
            aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}
          >
            <Bookmark className={`h-4 w-4 mr-2 ${isBookmarked ? 'fill-current' : ''}`} />
            <span>{isBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleShare} 
            data-testid="button-share"
            className="min-h-[44px] px-4"
            aria-label="Share this resource"
          >
            <Share2 className="h-4 w-4 mr-2" />
            <span>Share</span>
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleSuggestEditClick} 
            data-testid="button-suggest-edit"
            className="min-h-[44px] px-4"
            aria-label="Suggest an edit"
          >
            <Edit className="h-4 w-4 mr-2" />
            <span>Suggest Edit</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="overflow-hidden">
            {hasOgImage && (
              <div className="relative w-full h-48 md:h-64 overflow-hidden bg-gradient-to-b from-primary/10 to-transparent">
                {metadata.ogImageBlurhash && !imageLoaded && (
                  <div className="absolute inset-0">
                    <Blurhash
                      hash={metadata.ogImageBlurhash}
                      width="100%"
                      height="100%"
                      resolutionX={32}
                      resolutionY={32}
                      punch={1}
                    />
                  </div>
                )}
                <img
                  src={metadata.ogImage}
                  alt={resource.title}
                  className="w-full h-full object-cover relative z-10"
                  loading="lazy"
                  onLoad={() => setImageLoaded(true)}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              </div>
            )}
            
            <CardHeader className={hasOgImage ? "-mt-16 relative z-10" : ""}>
              <div className="flex flex-col gap-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3">
                      {hasFavicon && (
                        <img 
                          src={metadata.favicon} 
                          alt=""
                          className="w-8 h-8 rounded"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      )}
                      <h1 className="display-h text-xl sm:text-2xl md:text-3xl" data-testid="text-resource-title">
                        {resource.title}
                      </h1>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {resource.category && (
                        <Link href={`/category/${slugify(resource.category)}`}>
                          <Badge 
                            variant="secondary" 
                            className="cursor-pointer hover:bg-secondary/80"
                            data-testid="badge-category"
                          >
                            <FolderTree className="h-3 w-3 mr-1" />
                            {resource.category}
                          </Badge>
                        </Link>
                      )}
                      {resource.subcategory && (
                        taxonomySlugs.subcategory ? (
                          <Link href={`/subcategory/${taxonomySlugs.subcategory}`}>
                            <Badge
                              variant="outline"
                              className="cursor-pointer hover:bg-secondary/80"
                              data-testid="badge-subcategory"
                            >
                              {resource.subcategory}
                            </Badge>
                          </Link>
                        ) : (
                          <Badge variant="outline" data-testid="badge-subcategory">
                            {resource.subcategory}
                          </Badge>
                        )
                      )}
                      {resource.subSubcategory && (
                        taxonomySlugs.subSubcategory ? (
                          <Link href={`/sub-subcategory/${taxonomySlugs.subSubcategory}`}>
                            <Badge
                              variant="outline"
                              className="cursor-pointer hover:bg-secondary/80"
                              data-testid="badge-sub-subcategory"
                            >
                              {resource.subSubcategory}
                            </Badge>
                          </Link>
                        ) : (
                          <Badge variant="outline" data-testid="badge-sub-subcategory">
                            {resource.subSubcategory}
                          </Badge>
                        )
                      )}
                      {/* BUG-044 (run19): the admin-only "approved" badge leaked
                          internal moderation vocabulary onto the public page.
                          Moderation state now lives only in /admin (the "Edit
                          in Admin" button below covers the workflow jump). */}
                    </div>
                  </div>
                  
                  <Button
                    asChild
                    className="flex-shrink-0 min-h-[44px]"
                  >
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={handleVisitResource}
                      data-testid="button-visit"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Visit Resource</span>
                      <span className="sm:hidden">Visit</span>
                    </a>
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <Separator />
            
            <CardContent className="pt-6 space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary" />
                  Description
                </h2>
                <CardDescription className="text-base leading-relaxed" data-testid="text-description">
                  {resource.description || 'No description available for this resource.'}
                </CardDescription>
              </div>

              {scrapedDescription && scrapedDescription !== resource.description && (
                <>
                  <Separator />
                  <div>
                    <h2 className="text-sm font-semibold mb-2 text-muted-foreground flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" />
                      Page Description
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {scrapedDescription}
                    </p>
                  </div>
                </>
              )}

              <Separator />

              <div>
                <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-primary" />
                  URL
                </h2>
                <a 
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline break-all flex items-center gap-2 text-sm md:text-base min-h-[24px]"
                  data-testid="link-url"
                >
                  {resource.url}
                  <ExternalLink className="h-4 w-4 flex-shrink-0" />
                </a>
              </div>

              {tags && tags.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <Tag className="h-4 w-4 text-primary" />
                      Tags
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {/* BUG-039 (run13): tags link to the home catalog
                          pre-filtered on that tag (?tags= is read on mount). */}
                      {tags.map((tag, index) => (
                        <Link key={index} href={`/?tags=${encodeURIComponent(tag)}`}>
                          <Badge
                            variant="outline"
                            className="text-xs border-primary/30 text-primary cursor-pointer hover:bg-primary/10"
                            data-testid={`tag-link-${index}`}
                          >
                            #{tag}
                          </Badge>
                        </Link>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <Separator />
              
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-sm text-muted-foreground">
                {resource.createdAt && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {/* BUG-027 (run19): one site-wide date style ("Jul 18, 2026")
                        shared with the admin tables via lib/utils. */}
                    <span>Added on {formatAdminDate(resource.createdAt)}</span>
                  </div>
                )}
                {urlScraped && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>Metadata fetched</span>
                  </div>
                )}
              </div>

              {user?.role === 'admin' && (
                <>
                  <Separator />
                  <div className="flex flex-wrap items-center gap-4 pt-2">
                    {/* NEW-013: deep-link straight to this resource's edit
                        dialog in the admin Resources tab, not the bare
                        dashboard (which lands on Approvals). */}
                    {/* Run17 BUG-058: asChild — one anchor, one tab stop (was a
                        button nested inside an anchor: invalid + double stop). */}
                    <Button asChild variant="outline" data-testid="button-edit-admin">
                      <Link href={`/admin/resources?resourceId=${resource.id}`}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit in Admin
                      </Link>
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Resource ID: {resource.id}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* BUG-034 (run19): the "Quick Actions" card was removed — it held a
              single "Visit Resource" button duplicating the header CTA, so the
              page offered the same P0 action twice. The header button is now
              the one and only Visit control. */}

          {/* BUG-011: always render the Related section. When the related
              endpoint returns no matches, show an explicit empty state instead
              of dropping the whole card (which read as a broken/missing section
              in the QA audit). */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FolderTree className="h-4 w-4 text-primary" />
                Related Resources
              </CardTitle>
              <CardDescription>
                Resources you might find interesting
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {filteredRelatedResources.length === 0 && (
                <p
                  className="text-sm text-muted-foreground"
                  data-testid="related-empty-state"
                >
                  No related resources yet. Explore more in this category below.
                </p>
              )}
              {filteredRelatedResources.map((related) => (
                  <a
                    key={related.id}
                    href={`/resource/${related.id}`}
                    className="block p-3 border border-border hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none cursor-pointer transition-colors group min-h-[44px]"
                    onClick={(e) => handleRelatedResourceClick(e, related)}
                    data-testid={`related-resource-${related.id}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm line-clamp-1 flex-1">
                        {related.title}
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </div>
                    {related.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {related.description}
                      </p>
                    )}
                    {related.score !== undefined && (
                      <div className="mt-2">
                        <Badge variant="secondary" className="text-xs">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          {related.score}% match
                        </Badge>
                      </div>
                    )}
                    {related.reasons && related.reasons.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <div className="text-xs text-muted-foreground">Why recommended:</div>
                        <div className="flex flex-wrap gap-1">
                          {related.reasons.slice(0, 2).map((reason, index) => (
                            <span key={index} className="text-xs bg-muted text-muted-foreground px-2 py-0.5">
                              {reason}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </a>
                ))}
                {resource.category && (
                  /* Run16 BUG-057: the inline wouter <Link> wrapping a Button
                     produced a 20px-tall anchor box (< 24px WCAG 2.5.8).
                     asChild makes the anchor itself the ≥44px button. */
                  <Button asChild variant="ghost" size="sm" className="w-full mt-2 min-h-[44px]">
                    <Link href={`/category/${slugify(resource.category)}`} data-testid="link-view-all-category">
                      View all in {resource.category}
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>

          {scrapedTitle && (
            <Card className="bg-[var(--surface-2)]">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                  <ImageIcon className="h-4 w-4" />
                  Page Metadata
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {scrapedTitle && scrapedTitle !== resource.title && (
                  <div>
                    <span className="text-muted-foreground">Title:</span>
                    <p className="text-foreground">{scrapedTitle}</p>
                  </div>
                )}
                {metadata?.twitterCard && (
                  <div>
                    <span className="text-muted-foreground">Twitter Card:</span>
                    <p className="text-foreground">{metadata.twitterCard}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <SuggestEditDialog
        resource={resource}
        open={suggestEditOpen}
        onOpenChange={setSuggestEditOpen}
      />
    </div>
  );
}

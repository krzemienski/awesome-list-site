import { useParams, Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
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
  ChevronRight
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { slugify } from "@/lib/utils";
import type { Resource } from "@shared/schema";

export default function ResourceDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [suggestEditOpen, setSuggestEditOpen] = useState(false);

  const { data: resource, isLoading, error } = useQuery<Resource>({
    queryKey: ['/api/resources', id],
    queryFn: async () => {
      const response = await fetch(`/api/resources/${id}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Resource not found');
      return response.json();
    },
    enabled: !!id
  });

  const { data: favorites } = useQuery<{resourceIds: number[]}>({
    queryKey: ['/api/favorites'],
    enabled: isAuthenticated
  });

  const { data: bookmarks } = useQuery<{resourceIds: number[]}>({
    queryKey: ['/api/bookmarks'],
    enabled: isAuthenticated
  });

  const { data: relatedResources } = useQuery<{resources: Resource[]}>({
    queryKey: ['/api/resources', { category: resource?.category, limit: 6 }],
    enabled: !!resource?.category
  });

  const isFavorite = favorites?.resourceIds?.includes(parseInt(id || '0')) ?? false;
  const isBookmarked = bookmarks?.resourceIds?.includes(parseInt(id || '0')) ?? false;

  const favoriteMutation = useMutation({
    mutationFn: async () => {
      if (isFavorite) {
        return apiRequest(`/api/favorites/${id}`, { method: 'DELETE' });
      }
      return apiRequest('/api/favorites', {
        method: 'POST',
        body: JSON.stringify({ resourceId: parseInt(id || '0') })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/favorites'] });
      toast({
        title: isFavorite ? "Removed from favorites" : "Added to favorites",
        description: isFavorite ? "Resource removed from your favorites" : "Resource saved to your favorites"
      });
    }
  });

  const bookmarkMutation = useMutation({
    mutationFn: async () => {
      if (isBookmarked) {
        return apiRequest(`/api/bookmarks/${id}`, { method: 'DELETE' });
      }
      return apiRequest('/api/bookmarks', {
        method: 'POST',
        body: JSON.stringify({ resourceId: parseInt(id || '0') })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bookmarks'] });
      toast({
        title: isBookmarked ? "Removed from bookmarks" : "Added to bookmarks",
        description: isBookmarked ? "Resource removed from your bookmarks" : "Resource saved to your bookmarks"
      });
    }
  });

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
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

  const handleVisitResource = () => {
    window.open(resource?.url, '_blank', 'noopener,noreferrer');
    toast({
      title: "Opening resource",
      description: "Opening in a new tab"
    });
  };

  const handleRelatedResourceClick = (relatedResource: Resource) => {
    setLocation(`/resource/${relatedResource.id}`);
  };

  const metadata = resource?.metadata as Record<string, any> | undefined;
  const hasOgImage = metadata?.ogImage;
  const hasFavicon = metadata?.favicon;
  const scrapedTitle = metadata?.scrapedTitle || metadata?.ogTitle;
  const scrapedDescription = metadata?.scrapedDescription || metadata?.ogDescription;
  const urlScraped = metadata?.urlScraped;
  const tags = metadata?.tags as string[] | undefined;

  const filteredRelatedResources = relatedResources?.resources
    ?.filter(r => r.id !== resource?.id && r.status === 'approved')
    ?.slice(0, 5) || [];

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto px-4">
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
    return (
      <div className="space-y-6 max-w-4xl mx-auto px-4">
        <SEOHead title="Resource Not Found" />
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-4">Resource Not Found</h2>
          <p className="text-muted-foreground mb-6">The resource you're looking for doesn't exist or has been removed.</p>
          <Link href="/">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4">
      <SEOHead 
        title={`${resource.title} - Awesome Video`}
        description={resource.description || scrapedDescription || `View details for ${resource.title}`}
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </Link>
        
        <div className="flex flex-wrap items-center gap-2">
          {isAuthenticated && (
            <>
              <Button
                variant={isFavorite ? "default" : "outline"}
                size="sm"
                onClick={() => favoriteMutation.mutate()}
                disabled={favoriteMutation.isPending}
                data-testid="button-favorite"
                className="min-h-[44px] px-4"
              >
                <Heart className={`h-4 w-4 mr-2 ${isFavorite ? 'fill-current' : ''}`} />
                <span className="hidden sm:inline">{isFavorite ? 'Favorited' : 'Favorite'}</span>
              </Button>
              <Button
                variant={isBookmarked ? "default" : "outline"}
                size="sm"
                onClick={() => bookmarkMutation.mutate()}
                disabled={bookmarkMutation.isPending}
                data-testid="button-bookmark"
                className="min-h-[44px] px-4"
              >
                <Bookmark className={`h-4 w-4 mr-2 ${isBookmarked ? 'fill-current' : ''}`} />
                <span className="hidden sm:inline">{isBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
              </Button>
            </>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleShare} 
            data-testid="button-share"
            className="min-h-[44px] px-4"
          >
            <Share2 className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Share</span>
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setSuggestEditOpen(true)} 
            data-testid="button-suggest-edit"
            className="min-h-[44px] px-4"
          >
            <Edit className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Suggest Edit</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-pink-500/20 bg-black overflow-hidden">
            {hasOgImage && (
              <div className="relative w-full h-48 md:h-64 overflow-hidden bg-gradient-to-b from-pink-500/10 to-transparent">
                <img 
                  src={metadata.ogImage} 
                  alt={resource.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
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
                      <CardTitle className="text-2xl md:text-3xl" data-testid="text-resource-title">
                        {resource.title}
                      </CardTitle>
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
                        <Badge variant="outline">
                          {resource.subcategory}
                        </Badge>
                      )}
                      {resource.subSubcategory && (
                        <Badge variant="outline">
                          {resource.subSubcategory}
                        </Badge>
                      )}
                      <Badge 
                        variant={resource.status === 'approved' ? 'default' : 'secondary'}
                        className={resource.status === 'approved' ? 'bg-green-500/20 text-green-400 border-green-500/30' : ''}
                      >
                        {resource.status}
                      </Badge>
                    </div>
                  </div>
                  
                  <Button
                    className="bg-pink-500 hover:bg-pink-600 flex-shrink-0 min-h-[44px]"
                    onClick={handleVisitResource}
                    data-testid="button-visit"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Visit Resource</span>
                    <span className="sm:hidden">Visit</span>
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <Separator />
            
            <CardContent className="pt-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <Globe className="h-4 w-4 text-pink-500" />
                  Description
                </h3>
                <CardDescription className="text-base leading-relaxed" data-testid="text-description">
                  {resource.description || 'No description available for this resource.'}
                </CardDescription>
              </div>

              {scrapedDescription && scrapedDescription !== resource.description && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-sm font-semibold mb-2 text-muted-foreground flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" />
                      Page Description
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {scrapedDescription}
                    </p>
                  </div>
                </>
              )}

              <Separator />

              <div>
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-cyan-500" />
                  URL
                </h3>
                <a 
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:underline break-all flex items-center gap-2 text-sm md:text-base"
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
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <Tag className="h-4 w-4 text-pink-500" />
                      Tags
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag, index) => (
                        <Badge 
                          key={index} 
                          variant="outline" 
                          className="text-xs border-pink-500/30 text-pink-400"
                        >
                          #{tag}
                        </Badge>
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
                    <span>Added on {new Date(resource.createdAt).toLocaleDateString()}</span>
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
                    <Link href="/admin">
                      <Button variant="outline" data-testid="button-edit-admin">
                        <Edit className="h-4 w-4 mr-2" />
                        Edit in Admin
                      </Button>
                    </Link>
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
          <Card className="border-cyan-500/20 bg-black">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ExternalLink className="h-4 w-4 text-cyan-500" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                className="w-full bg-pink-500 hover:bg-pink-600 min-h-[44px]" 
                onClick={handleVisitResource}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Resource
              </Button>
              <Button 
                variant="outline" 
                className="w-full min-h-[44px]" 
                onClick={handleShare}
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share This Page
              </Button>
              {isAuthenticated && (
                <>
                  <Button 
                    variant={isFavorite ? "default" : "outline"}
                    className="w-full min-h-[44px]" 
                    onClick={() => favoriteMutation.mutate()}
                    disabled={favoriteMutation.isPending}
                  >
                    <Heart className={`h-4 w-4 mr-2 ${isFavorite ? 'fill-current' : ''}`} />
                    {isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                  </Button>
                  <Button 
                    variant={isBookmarked ? "default" : "outline"}
                    className="w-full min-h-[44px]" 
                    onClick={() => bookmarkMutation.mutate()}
                    disabled={bookmarkMutation.isPending}
                  >
                    <Bookmark className={`h-4 w-4 mr-2 ${isBookmarked ? 'fill-current' : ''}`} />
                    {isBookmarked ? 'Remove Bookmark' : 'Add to Bookmarks'}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {filteredRelatedResources.length > 0 && (
            <Card className="border-pink-500/20 bg-black">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FolderTree className="h-4 w-4 text-pink-500" />
                  Related Resources
                </CardTitle>
                <CardDescription>
                  More from {resource.category}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {filteredRelatedResources.map((related) => (
                  <div
                    key={related.id}
                    className="p-3 rounded border border-border hover:border-pink-500/50 hover:bg-pink-500/5 cursor-pointer transition-all group"
                    onClick={() => handleRelatedResourceClick(related)}
                    data-testid={`related-resource-${related.id}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm line-clamp-1 flex-1 group-hover:text-pink-400 transition-colors">
                        {related.title}
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-pink-500 transition-colors flex-shrink-0" />
                    </div>
                    {related.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {related.description}
                      </p>
                    )}
                  </div>
                ))}
                {resource.category && (
                  <Link href={`/category/${slugify(resource.category)}`}>
                    <Button variant="ghost" size="sm" className="w-full mt-2">
                      View all in {resource.category}
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          )}

          {scrapedTitle && (
            <Card className="border-border bg-black/50">
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

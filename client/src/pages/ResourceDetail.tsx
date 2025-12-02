import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import SEOHead from "@/components/layout/SEOHead";
import { 
  ArrowLeft, 
  ExternalLink, 
  Calendar, 
  FolderTree,
  Bookmark,
  Heart,
  Share2,
  Edit
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Resource } from "@shared/schema";

interface ResourceDetailData {
  resource: Resource;
}

export default function ResourceDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<ResourceDetailData>({
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

  const isFavorite = favorites?.resourceIds?.includes(parseInt(id || '0'));
  const isBookmarked = bookmarks?.resourceIds?.includes(parseInt(id || '0'));

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
          title: data?.resource.title,
          url: url
        });
      } catch (err) {
        // User cancelled or share failed
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast({
        title: "Link copied",
        description: "Resource link copied to clipboard"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !data?.resource) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
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

  const resource = data.resource;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <SEOHead 
        title={`${resource.title} - Awesome Video`}
        description={resource.description || `View details for ${resource.title}`}
      />

      <div className="flex items-center justify-between">
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </Link>
        
        <div className="flex items-center gap-2">
          {isAuthenticated && (
            <>
              <Button
                variant={isFavorite ? "default" : "outline"}
                size="sm"
                onClick={() => favoriteMutation.mutate()}
                disabled={favoriteMutation.isPending}
                data-testid="button-favorite"
              >
                <Heart className={`h-4 w-4 mr-2 ${isFavorite ? 'fill-current' : ''}`} />
                {isFavorite ? 'Favorited' : 'Favorite'}
              </Button>
              <Button
                variant={isBookmarked ? "default" : "outline"}
                size="sm"
                onClick={() => bookmarkMutation.mutate()}
                disabled={bookmarkMutation.isPending}
                data-testid="button-bookmark"
              >
                <Bookmark className={`h-4 w-4 mr-2 ${isBookmarked ? 'fill-current' : ''}`} />
                {isBookmarked ? 'Bookmarked' : 'Bookmark'}
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" onClick={handleShare} data-testid="button-share">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>
      </div>

      <Card className="border-pink-500/20 bg-black">
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <CardTitle className="text-2xl md:text-3xl" data-testid="text-resource-title">
                  {resource.title}
                </CardTitle>
                <div className="flex flex-wrap gap-2">
                  {resource.category && (
                    <Badge variant="secondary" data-testid="badge-category">
                      <FolderTree className="h-3 w-3 mr-1" />
                      {resource.category}
                    </Badge>
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
                    className={resource.status === 'approved' ? 'bg-green-500/20 text-green-400' : ''}
                  >
                    {resource.status}
                  </Badge>
                </div>
              </div>
              
              <Button
                className="bg-pink-500 hover:bg-pink-600"
                onClick={() => window.open(resource.url, '_blank', 'noopener,noreferrer')}
                data-testid="button-visit"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Visit Resource
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <Separator />
        
        <CardContent className="pt-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Description</h3>
            <CardDescription className="text-base leading-relaxed" data-testid="text-description">
              {resource.description || 'No description available for this resource.'}
            </CardDescription>
          </div>

          <Separator />

          <div>
            <h3 className="text-lg font-semibold mb-2">URL</h3>
            <a 
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:underline break-all flex items-center gap-2"
              data-testid="link-url"
            >
              {resource.url}
              <ExternalLink className="h-4 w-4 flex-shrink-0" />
            </a>
          </div>

          {resource.createdAt && (
            <>
              <Separator />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Added on {new Date(resource.createdAt).toLocaleDateString()}</span>
              </div>
            </>
          )}

          {user?.role === 'admin' && (
            <>
              <Separator />
              <div className="flex items-center gap-4 pt-4">
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
  );
}

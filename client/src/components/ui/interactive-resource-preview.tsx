import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { 
  ExternalLink, 
  Star, 
  GitFork, 
  Eye, 
  Calendar, 
  Users,
  Code,
  Globe,
  Heart,
  Bookmark,
  Share2,
  Clock,
  Activity
} from "lucide-react";
import { Resource } from "@/types/awesome-list";
import { useToast } from "@/hooks/use-toast";

interface InteractiveResourcePreviewProps {
  resource: Resource;
  children: React.ReactNode;
  showMetrics?: boolean;
  enableActions?: boolean;
}

interface ResourceMetrics {
  stars?: number;
  forks?: number;
  watchers?: number;
  lastUpdated?: string;
  language?: string;
  license?: string;
  issues?: number;
  contributors?: number;
  size?: string;
  isArchived?: boolean;
  isPrivate?: boolean;
}

export default function InteractiveResourcePreview({ 
  resource, 
  children, 
  showMetrics = true,
  enableActions = true
}: InteractiveResourcePreviewProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [metrics, setMetrics] = useState<ResourceMetrics | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [viewCount, setViewCount] = useState(0);
  const { toast } = useToast();

  // Load bookmark status and view count
  useEffect(() => {
    const bookmarks = JSON.parse(localStorage.getItem('bookmarked-resources') || '[]');
    setIsBookmarked(bookmarks.includes(resource.id));
    
    const views = JSON.parse(localStorage.getItem('resource-views') || '{}');
    setViewCount(views[resource.id] || 0);
  }, [resource.id]);

  // Generate mock metrics based on resource (in real app, this would fetch from GitHub API)
  useEffect(() => {
    if (isHovered && resource.url.includes('github.com')) {
      // Simulate GitHub API data based on the resource
      const mockMetrics: ResourceMetrics = {
        stars: Math.floor(Math.random() * 50000) + 100,
        forks: Math.floor(Math.random() * 5000) + 10,
        watchers: Math.floor(Math.random() * 1000) + 5,
        lastUpdated: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
        language: ['JavaScript', 'Python', 'Go', 'TypeScript', 'Rust', 'Java'][Math.floor(Math.random() * 6)],
        license: ['MIT', 'Apache-2.0', 'GPL-3.0', 'BSD-3-Clause'][Math.floor(Math.random() * 4)],
        issues: Math.floor(Math.random() * 100),
        contributors: Math.floor(Math.random() * 200) + 1,
        size: `${Math.floor(Math.random() * 50) + 1} MB`,
        isArchived: Math.random() > 0.95,
        isPrivate: false
      };
      
      setMetrics(mockMetrics);
    }
  }, [isHovered, resource.url]);

  // Track resource view
  const trackView = () => {
    const views = JSON.parse(localStorage.getItem('resource-views') || '{}');
    views[resource.id] = (views[resource.id] || 0) + 1;
    localStorage.setItem('resource-views', JSON.stringify(views));
    setViewCount(views[resource.id]);
  };

  // Toggle bookmark
  const toggleBookmark = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const bookmarks = JSON.parse(localStorage.getItem('bookmarked-resources') || '[]');
    let updatedBookmarks;
    
    if (isBookmarked) {
      updatedBookmarks = bookmarks.filter((id: string) => id !== resource.id);
      toast({
        title: "Bookmark Removed",
        description: `${resource.title} removed from bookmarks`,
      });
    } else {
      updatedBookmarks = [...bookmarks, resource.id];
      toast({
        title: "Bookmark Added",
        description: `${resource.title} added to bookmarks`,
      });
    }
    
    localStorage.setItem('bookmarked-resources', JSON.stringify(updatedBookmarks));
    setIsBookmarked(!isBookmarked);
  };

  // Share resource
  const shareResource = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: resource.title,
          text: resource.description,
          url: resource.url,
        });
      } catch (error) {
        // Fallback to clipboard
        copyToClipboard();
      }
    } else {
      copyToClipboard();
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(resource.url);
    toast({
      title: "Link Copied",
      description: "Resource URL copied to clipboard",
    });
  };

  // Format numbers with K/M suffix
  const formatNumber = (num?: number) => {
    if (!num) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // Format relative time
  const formatRelativeTime = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;
    return `${Math.floor(diffInDays / 365)} years ago`;
  };

  return (
    <HoverCard openDelay={300} closeDelay={100}>
      <HoverCardTrigger asChild>
        <div 
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={trackView}
          className="cursor-pointer"
        >
          {children}
        </div>
      </HoverCardTrigger>
      
      <HoverCardContent 
        className="w-96 p-0 overflow-hidden" 
        side="right" 
        align="start"
        sideOffset={10}
      >
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg leading-tight mb-1">
                  {resource.title}
                </CardTitle>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className="text-xs">
                    {resource.category}
                  </Badge>
                  {resource.subcategory && (
                    <Badge variant="outline" className="text-xs">
                      {resource.subcategory}
                    </Badge>
                  )}
                </div>
              </div>
              
              {enableActions && (
                <div className="flex gap-1 ml-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleBookmark}
                    className="h-8 w-8 p-0"
                  >
                    <Bookmark 
                      className={`h-4 w-4 ${isBookmarked ? 'fill-current text-yellow-500' : ''}`} 
                    />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={shareResource}
                    className="h-8 w-8 p-0"
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            
            <CardDescription className="text-sm line-clamp-3">
              {resource.description}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* GitHub Metrics */}
            {showMetrics && metrics && resource.url.includes('github.com') && (
              <>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <span className="font-medium">{formatNumber(metrics.stars)}</span>
                    <span className="text-muted-foreground">stars</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <GitFork className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">{formatNumber(metrics.forks)}</span>
                    <span className="text-muted-foreground">forks</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-green-500" />
                    <span className="font-medium">{formatNumber(metrics.watchers)}</span>
                    <span className="text-muted-foreground">watching</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-purple-500" />
                    <span className="font-medium">{formatNumber(metrics.contributors)}</span>
                    <span className="text-muted-foreground">contributors</span>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Language:</span>
                    <div className="flex items-center gap-1">
                      <Code className="h-3 w-3" />
                      <span className="font-medium">{metrics.language}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">License:</span>
                    <span className="font-medium">{metrics.license}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Size:</span>
                    <span className="font-medium">{metrics.size}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Last updated:</span>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span className="font-medium">{formatRelativeTime(metrics.lastUpdated)}</span>
                    </div>
                  </div>
                </div>
                
                {metrics.isArchived && (
                  <div className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-sm">
                    <Activity className="h-4 w-4 text-yellow-600" />
                    <span className="text-yellow-700 dark:text-yellow-300">This repository is archived</span>
                  </div>
                )}
              </>
            )}
            
            {/* View Statistics */}
            <div className="flex items-center justify-between text-sm pt-2 border-t">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Activity className="h-3 w-3" />
                <span>{viewCount} views</span>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(resource.url, '_blank');
                    trackView();
                  }}
                  className="h-8"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Visit
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </HoverCardContent>
    </HoverCard>
  );
}
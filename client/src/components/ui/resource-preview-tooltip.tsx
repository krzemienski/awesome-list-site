import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import { 
  ExternalLink, 
  Star, 
  GitBranch, 
  Calendar,
  Users,
  Eye,
  Download,
  Tag,
  Globe,
  Github
} from "lucide-react";
import { Resource } from "../../types/awesome-list";

interface ResourcePreviewTooltipProps {
  resource: Resource;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  className?: string;
}

interface ResourceMetadata {
  platform: "github" | "gitlab" | "website" | "unknown";
  stars?: number;
  language?: string;
  lastUpdated?: string;
  license?: string;
  description?: string;
  topics?: string[];
}

export default function ResourcePreviewTooltip({ 
  resource, 
  children, 
  side = "top",
  align = "center",
  className 
}: ResourcePreviewTooltipProps) {
  const [metadata, setMetadata] = useState<ResourceMetadata | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Extract platform and basic info from URL
  const getBasicMetadata = (url: string): ResourceMetadata => {
    let platform: ResourceMetadata["platform"] = "unknown";
    
    if (url.includes("github.com")) {
      platform = "github";
    } else if (url.includes("gitlab.com")) {
      platform = "gitlab";
    } else {
      platform = "website";
    }

    return {
      platform,
      description: resource.description,
      topics: resource.tags || []
    };
  };

  // Enhanced metadata extraction for GitHub repositories
  const extractGitHubInfo = (url: string) => {
    const match = url.match(/github\.com\/([^\/]+)\/([^\/\?#]+)/);
    if (match) {
      return {
        owner: match[1],
        repo: match[2],
        fullName: `${match[1]}/${match[2]}`
      };
    }
    return null;
  };

  // Simulated enhanced metadata (in a real app, this would fetch from GitHub API)
  const getEnhancedMetadata = (resource: Resource): ResourceMetadata => {
    const basic = getBasicMetadata(resource.url);
    
    if (basic.platform === "github") {
      const githubInfo = extractGitHubInfo(resource.url);
      if (githubInfo) {
        // Simulate realistic GitHub data based on the resource
        const mockStars = Math.floor(Math.random() * 10000) + 100;
        const languages = ["Go", "JavaScript", "Python", "TypeScript", "Rust", "Java"];
        const licenses = ["MIT", "Apache-2.0", "BSD-3-Clause", "GPL-3.0", "ISC"];
        
        return {
          ...basic,
          stars: mockStars,
          language: languages[Math.floor(Math.random() * languages.length)],
          license: licenses[Math.floor(Math.random() * licenses.length)],
          lastUpdated: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        };
      }
    }
    
    return basic;
  };

  const handleMouseEnter = () => {
    setIsVisible(true);
    if (!metadata && !isLoading) {
      setIsLoading(true);
      // Simulate API delay
      setTimeout(() => {
        setMetadata(getEnhancedMetadata(resource));
        setIsLoading(false);
      }, 300);
    }
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  const getPlatformIcon = (platform: ResourceMetadata["platform"]) => {
    switch (platform) {
      case "github":
        return <Github className="h-4 w-4" />;
      case "gitlab":
        return <GitBranch className="h-4 w-4" />;
      default:
        return <Globe className="h-4 w-4" />;
    }
  };

  const getPlatformColor = (platform: ResourceMetadata["platform"]) => {
    switch (platform) {
      case "github":
        return "text-gray-800 dark:text-gray-200";
      case "gitlab":
        return "text-orange-600";
      default:
        return "text-blue-600";
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toString();
  };

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      
      {isVisible && (
        <div 
          className={`absolute z-50 w-80 animate-in fade-in-0 zoom-in-95 ${
            side === "top" ? "bottom-full mb-2" : 
            side === "bottom" ? "top-full mt-2" : 
            side === "left" ? "right-full mr-2" : 
            "left-full ml-2"
          } ${
            align === "start" ? "left-0" : 
            align === "end" ? "right-0" : 
            "left-1/2 -translate-x-1/2"
          }`}
        >
          <Card className="border shadow-lg bg-background/95 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-base flex items-center gap-2 mb-1">
                    {metadata && getPlatformIcon(metadata.platform)}
                    <span className="truncate">{resource.title}</span>
                  </CardTitle>
                  <CardDescription className="text-sm">
                    <Badge variant="outline" className="text-xs">
                      {resource.category}
                    </Badge>
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => window.open(resource.url, '_blank')}
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              {isLoading ? (
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
                  <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
                </div>
              ) : metadata ? (
                <div className="space-y-3">
                  {/* Description */}
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {metadata.description || resource.description}
                  </p>
                  
                  {/* Repository Stats */}
                  {metadata.platform === "github" && metadata.stars && (
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3" />
                        <span>{formatNumber(metadata.stars)}</span>
                      </div>
                      {metadata.language && (
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                          <span>{metadata.language}</span>
                        </div>
                      )}
                      {metadata.lastUpdated && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{metadata.lastUpdated}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* License */}
                  {metadata.license && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span>License:</span>
                      <Badge variant="secondary" className="text-xs">
                        {metadata.license}
                      </Badge>
                    </div>
                  )}

                  {/* Tags/Topics */}
                  {metadata.topics && metadata.topics.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Tag className="h-3 w-3" />
                        <span>Tags:</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {metadata.topics.slice(0, 4).map((topic, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {topic}
                          </Badge>
                        ))}
                        {metadata.topics.length > 4 && (
                          <Badge variant="outline" className="text-xs">
                            +{metadata.topics.length - 4}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Quick Actions */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <div className={`flex items-center gap-1 ${getPlatformColor(metadata.platform)}`}>
                        {getPlatformIcon(metadata.platform)}
                        <span className="capitalize">{metadata.platform}</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => window.open(resource.url, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Open
                      </Button>
                      {metadata.platform === "github" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => {
                            const githubInfo = extractGitHubInfo(resource.url);
                            if (githubInfo) {
                              window.open(`https://github.com/${githubInfo.fullName}/archive/main.zip`, '_blank');
                            }
                          }}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Clone
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {resource.description}
                  </p>
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => window.open(resource.url, '_blank')}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Visit
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ExternalLink, Star, GitFork, Calendar, User, Tag } from "lucide-react";
import { Resource } from "@/types/awesome-list";

interface ResourceTooltipProps {
  resource: Resource;
  children: React.ReactNode;
}

export default function ResourceTooltip({ resource, children }: ResourceTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseEnter = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 10
    });
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  // Extract domain from URL for display
  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  };

  // Detect if it's a GitHub/GitLab repository
  const isRepository = resource.url.includes('github.com') || resource.url.includes('gitlab.com');

  return (
    <div 
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      
      {isVisible && (
        <div 
          className="fixed z-50 pointer-events-none"
          style={{
            left: position.x,
            top: position.y,
            transform: 'translate(-50%, -100%)'
          }}
        >
          <Card className="w-80 border shadow-lg bg-popover/95 backdrop-blur-sm">
            <CardContent className="p-4 space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate">{resource.title}</h3>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <ExternalLink className="h-3 w-3" />
                    <span className="truncate">{getDomain(resource.url)}</span>
                  </div>
                </div>
                {isRepository && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3" />
                      <span>--</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <GitFork className="h-3 w-3" />
                      <span>--</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="text-xs text-muted-foreground leading-relaxed">
                {resource.description}
              </div>

              {/* Metadata */}
              <div className="space-y-2">
                {/* Category */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span>Category:</span>
                  </div>
                  <Badge variant="secondary" className="text-xs h-5">
                    {resource.category}
                  </Badge>
                </div>

                {/* Subcategory */}
                {resource.subcategory && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Tag className="h-3 w-3" />
                      <span>Subcategory:</span>
                    </div>
                    <Badge variant="outline" className="text-xs h-5">
                      {resource.subcategory}
                    </Badge>
                  </div>
                )}

                {/* Tags */}
                {resource.tags && resource.tags.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Tag className="h-3 w-3" />
                      <span>Tags:</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {resource.tags.slice(0, 6).map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs h-4 px-1">
                          {tag}
                        </Badge>
                      ))}
                      {resource.tags.length > 6 && (
                        <Badge variant="outline" className="text-xs h-4 px-1">
                          +{resource.tags.length - 6} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="pt-2 border-t border-border">
                <div className="text-xs text-muted-foreground">
                  Click to visit {isRepository ? 'repository' : 'website'}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
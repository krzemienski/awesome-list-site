import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Brain, TrendingUp, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface Resource {
  id: string;
  name: string;
  url: string;
  description?: string;
  category: string;
  tags?: string[];
  confidence?: number;
  matchReason?: string;
  isAIBased?: boolean;
}

interface RecommendationCardProps {
  resource: Resource;
  onClick?: () => void;
  className?: string;
}

export default function RecommendationCard({ 
  resource, 
  onClick,
  className 
}: RecommendationCardProps) {
  const confidence = resource.confidence || 0;
  
  // Determine confidence level
  const getConfidenceLevel = (conf: number) => {
    if (conf >= 80) return { label: "High", color: "text-green-500", bgColor: "bg-green-500/10" };
    if (conf >= 50) return { label: "Medium", color: "text-yellow-500", bgColor: "bg-yellow-500/10" };
    return { label: "Low", color: "text-orange-500", bgColor: "bg-orange-500/10" };
  };

  const confidenceLevel = getConfidenceLevel(confidence);

  return (
    <Card 
      className={cn(
        "overflow-hidden transition-all hover:border-pink-500/50 cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex flex-col gap-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base truncate">{resource.name}</h3>
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {resource.description || "No description available"}
              </p>
            </div>
          </div>

          {/* Match Reason */}
          {resource.matchReason && (
            <div className="text-sm text-muted-foreground italic">
              "{resource.matchReason}"
            </div>
          )}

          {/* Badges Row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Category Badge */}
            <Badge variant="secondary" className="text-xs">
              {resource.category}
            </Badge>

            {/* Confidence Score */}
            <Badge 
              variant="outline" 
              className={cn("text-xs", confidenceLevel.bgColor, confidenceLevel.color)}
            >
              <TrendingUp className="h-3 w-3 mr-1" />
              {confidence}% - {confidenceLevel.label}
            </Badge>

            {/* AI/Rule Based Indicator */}
            <Badge 
              variant="outline"
              className={cn(
                "text-xs",
                resource.isAIBased 
                  ? "bg-gradient-to-r from-pink-500/10 to-cyan-500/10 text-pink-500 border-pink-500/30" 
                  : "bg-muted text-muted-foreground"
              )}
            >
              {resource.isAIBased ? (
                <>
                  <Brain className="h-3 w-3 mr-1" />
                  AI-Based
                </>
              ) : (
                <>
                  <Sparkles className="h-3 w-3 mr-1" />
                  Rule-Based
                </>
              )}
            </Badge>
          </div>

          {/* Tags */}
          {resource.tags && resource.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {resource.tags.slice(0, 3).map((tag) => (
                <span 
                  key={tag} 
                  className="text-xs px-2 py-1 bg-muted rounded-md"
                >
                  #{tag}
                </span>
              ))}
              {resource.tags.length > 3 && (
                <span className="text-xs px-2 py-1 text-muted-foreground">
                  +{resource.tags.length - 3} more
                </span>
              )}
            </div>
          )}

          {/* Action Button */}
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full mt-2 border-cyan-500/50 hover:bg-cyan-500/10 hover:border-cyan-500"
            onClick={(e) => {
              e.stopPropagation();
              onClick && onClick();
            }}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View Resource
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
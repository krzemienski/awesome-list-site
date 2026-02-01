import { memo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Brain, TrendingUp, Sparkles, ThumbsUp, ThumbsDown } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

/**
 * RecommendationCard - AI-based resource recommendation display component
 *
 * IMPORTANT: This component is wrapped with React.memo using custom comparison.
 * When using this component, avoid creating new object references for the
 * `resource` prop on every render. Use useMemo or pass stable references.
 *
 * @example
 * // ❌ BAD - Creates new object every render
 * <RecommendationCard resource={{ ...data, extra: true }} />
 *
 * // ✅ GOOD - Stable reference from query/state
 * <RecommendationCard resource={recommendation} />
 */

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
  userFeedback?: 'helpful' | 'not_helpful' | null;
}

interface RecommendationCardProps {
  resource: Resource;
  onClick?: () => void;
  className?: string;
}

function RecommendationCard({
  resource,
  onClick,
  className
}: RecommendationCardProps) {
  const [feedback, setFeedback] = useState<'helpful' | 'not_helpful' | null>(
    resource.userFeedback || null
  );
  const { toast } = useToast();
  const confidence = resource.confidence || 0;

  // Determine confidence level
  const getConfidenceLevel = (conf: number) => {
    if (conf >= 80) return { label: "High", color: "text-green-500", bgColor: "bg-green-500/10" };
    if (conf >= 50) return { label: "Medium", color: "text-yellow-500", bgColor: "bg-yellow-500/10" };
    return { label: "Low", color: "text-orange-500", bgColor: "bg-orange-500/10" };
  };

  const confidenceLevel = getConfidenceLevel(confidence);

  const feedbackMutation = useMutation({
    mutationFn: async (feedbackType: 'helpful' | 'not_helpful') => {
      return await apiRequest(`/api/recommendations/${resource.id}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ feedback: feedbackType })
      });
    },
    onMutate: async (feedbackType) => {
      // Optimistic update
      setFeedback(feedbackType);
    },
    onSuccess: (data, feedbackType) => {
      // Invalidate recommendations queries
      queryClient.invalidateQueries({ queryKey: ['/api/recommendations'] });

      toast({
        description: feedbackType === 'helpful'
          ? "Thanks for your feedback! This helps improve recommendations."
          : "Feedback recorded. We'll improve our recommendations.",
        duration: 2000
      });
    },
    onError: (error, feedbackType) => {
      // Revert optimistic update
      setFeedback(resource.userFeedback || null);

      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive"
      });
    }
  });

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

          {/* Feedback Buttons */}
          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <span className="text-xs text-muted-foreground mr-1">Was this helpful?</span>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 px-3",
                feedback === 'helpful' && "text-green-500 hover:text-green-600 bg-green-500/10"
              )}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                feedbackMutation.mutate('helpful');
              }}
              disabled={feedbackMutation.isPending}
              aria-label="Mark as helpful"
            >
              <ThumbsUp
                className={cn(
                  "h-4 w-4 mr-1.5",
                  feedback === 'helpful' && "fill-current"
                )}
              />
              <span className="text-xs">Helpful</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 px-3",
                feedback === 'not_helpful' && "text-red-500 hover:text-red-600 bg-red-500/10"
              )}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                feedbackMutation.mutate('not_helpful');
              }}
              disabled={feedbackMutation.isPending}
              aria-label="Mark as not helpful"
            >
              <ThumbsDown
                className={cn(
                  "h-4 w-4 mr-1.5",
                  feedback === 'not_helpful' && "fill-current"
                )}
              />
              <span className="text-xs">Not Helpful</span>
            </Button>
          </div>

          {/* Action Button */}
          <Button
            variant="outline"
            size="sm"
            className="w-full border-cyan-500/50 hover:bg-cyan-500/10 hover:border-cyan-500"
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

export default memo(RecommendationCard, (prevProps, nextProps) => {
  const prevRes = prevProps.resource;
  const nextRes = nextProps.resource;

  return (
    prevRes.id === nextRes.id &&
    prevRes.name === nextRes.name &&
    prevRes.url === nextRes.url &&
    prevRes.description === nextRes.description &&
    prevRes.category === nextRes.category &&
    prevRes.confidence === nextRes.confidence &&
    prevRes.matchReason === nextRes.matchReason &&
    prevRes.isAIBased === nextRes.isAIBased &&
    prevRes.userFeedback === nextRes.userFeedback &&
    JSON.stringify(prevRes.tags || []) === JSON.stringify(nextRes.tags || []) &&
    prevProps.onClick === nextProps.onClick &&
    prevProps.className === nextProps.className
  );
});
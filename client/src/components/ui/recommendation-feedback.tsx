import { useState, memo } from "react";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface RecommendationFeedbackProps {
  resourceId: number;
  userId?: string;
  className?: string;
  size?: "sm" | "default" | "lg";
  showCount?: boolean;
  onFeedbackChange?: (feedback: 'helpful' | 'not_helpful' | null) => void;
}

function RecommendationFeedback({
  resourceId,
  userId,
  className,
  size = "sm",
  showCount = false,
  onFeedbackChange
}: RecommendationFeedbackProps) {
  const [feedback, setFeedback] = useState<'helpful' | 'not_helpful' | null>(null);
  const { toast } = useToast();

  const feedbackMutation = useMutation({
    mutationFn: async (newFeedback: 'helpful' | 'not_helpful') => {
      if (!userId) {
        throw new Error("User must be logged in to provide feedback");
      }

      return await apiRequest('/api/recommendations/feedback', {
        method: 'POST',
        body: JSON.stringify({
          userId,
          resourceId,
          feedback: newFeedback === 'helpful' ? 'clicked' : 'dismissed',
          rating: newFeedback === 'helpful' ? 5 : 1
        }),
        credentials: 'include'
      });
    },
    onMutate: async (newFeedback) => {
      // Optimistic update
      const previousFeedback = feedback;
      setFeedback(newFeedback);
      return { previousFeedback };
    },
    onSuccess: (data, newFeedback) => {
      // Invalidate recommendations cache to improve future recommendations
      queryClient.invalidateQueries({ queryKey: ['/api/recommendations'] });

      // Notify parent component
      onFeedbackChange?.(newFeedback);

      toast({
        description: newFeedback === 'helpful'
          ? "Thanks! We'll recommend more like this."
          : "Thanks for the feedback. We'll improve your recommendations.",
        duration: 2000
      });
    },
    onError: (error, newFeedback, context) => {
      // Revert optimistic update
      setFeedback(context?.previousFeedback || null);

      toast({
        title: "Error",
        description: "Failed to record feedback. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleThumbsUp = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Toggle feedback if clicking the same button
    const newFeedback = feedback === 'helpful' ? null : 'helpful';

    if (newFeedback === null) {
      setFeedback(null);
      onFeedbackChange?.(null);
      return;
    }

    feedbackMutation.mutate('helpful');
  };

  const handleThumbsDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Toggle feedback if clicking the same button
    const newFeedback = feedback === 'not_helpful' ? null : 'not_helpful';

    if (newFeedback === null) {
      setFeedback(null);
      onFeedbackChange?.(null);
      return;
    }

    feedbackMutation.mutate('not_helpful');
  };

  const iconSize = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-6 w-6" : "h-5 w-5";

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {/* Thumbs Up Button */}
      <Button
        variant="ghost"
        size={size}
        className={cn(
          "group relative",
          feedback === 'helpful' && "text-green-500 hover:text-green-600",
          !userId && "opacity-50 cursor-not-allowed"
        )}
        onClick={handleThumbsUp}
        disabled={feedbackMutation.isPending || !userId}
        aria-label={feedback === 'helpful' ? "Remove helpful feedback" : "Mark as helpful"}
        data-testid="button-thumbs-up"
      >
        <div className="flex items-center gap-1.5">
          <ThumbsUp
            className={cn(
              iconSize,
              "transition-all duration-200",
              feedback === 'helpful' ? "fill-current" : "",
              "group-hover:scale-110"
            )}
          />
        </div>

        {/* Ripple effect on click */}
        {feedbackMutation.isPending && feedback === 'helpful' && (
          <span className="absolute inset-0 animate-ping rounded-full bg-green-500 opacity-20" />
        )}
      </Button>

      {/* Thumbs Down Button */}
      <Button
        variant="ghost"
        size={size}
        className={cn(
          "group relative",
          feedback === 'not_helpful' && "text-red-500 hover:text-red-600",
          !userId && "opacity-50 cursor-not-allowed"
        )}
        onClick={handleThumbsDown}
        disabled={feedbackMutation.isPending || !userId}
        aria-label={feedback === 'not_helpful' ? "Remove not helpful feedback" : "Mark as not helpful"}
        data-testid="button-thumbs-down"
      >
        <div className="flex items-center gap-1.5">
          <ThumbsDown
            className={cn(
              iconSize,
              "transition-all duration-200",
              feedback === 'not_helpful' ? "fill-current" : "",
              "group-hover:scale-110"
            )}
          />
        </div>

        {/* Ripple effect on click */}
        {feedbackMutation.isPending && feedback === 'not_helpful' && (
          <span className="absolute inset-0 animate-ping rounded-full bg-red-500 opacity-20" />
        )}
      </Button>
    </div>
  );
}

export default memo(RecommendationFeedback);

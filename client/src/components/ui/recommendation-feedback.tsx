import { memo, useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  BookCheck,
  EyeOff,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ToastAction } from "@/components/ui/toast";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useRecommendationFeedback } from "@/hooks/useRecommendationFeedback";
import { cn } from "@/lib/utils";
import type { RecommendationFeedbackValue } from "@shared/recommendations";

interface RecommendationFeedbackProps {
  resourceId: number;
  initialFeedback?: RecommendationFeedbackValue | null;
  className?: string;
  onFeedbackChange?: (feedback: RecommendationFeedbackValue | null) => void;
}

const FEEDBACK_OPTIONS: {
  value: RecommendationFeedbackValue;
  label: string;
  activeClass: string;
  icon: typeof ThumbsUp;
}[] = [
  {
    value: "helpful",
    label: "Helpful",
    activeClass: "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    icon: ThumbsUp,
  },
  {
    value: "not_for_me",
    label: "Not for me",
    activeClass: "border-amber-500/50 bg-amber-500/10 text-amber-800 dark:text-amber-200",
    icon: ThumbsDown,
  },
  {
    value: "already_known",
    label: "Already know this",
    activeClass: "border-sky-500/50 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    icon: BookCheck,
  },
  {
    value: "hidden",
    label: "Hide",
    activeClass: "border-muted-foreground/50 bg-muted text-foreground",
    icon: EyeOff,
  },
];

function RecommendationFeedback({
  resourceId,
  initialFeedback = null,
  className,
  onFeedbackChange,
}: RecommendationFeedbackProps) {
  const [feedback, setFeedback] =
    useState<RecommendationFeedbackValue | null>(initialFeedback);
  const { recordFeedbackAsync, isLoading } = useRecommendationFeedback();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  useEffect(() => {
    setFeedback(initialFeedback);
  }, [initialFeedback]);

  const save = async (
    next: RecommendationFeedbackValue | null,
    previous: RecommendationFeedbackValue | null,
  ) => {
    setFeedback(next);
    onFeedbackChange?.(next);
    try {
      await recordFeedbackAsync({ resourceId, feedback: next });
      if (next === "hidden") {
        toast({
          title: "Recommendation hidden",
          description: "It will stay out of future recommendations until restored.",
          action: (
            <ToastAction
              altText="Undo hiding this recommendation"
              onClick={() => {
                void save(null, "hidden");
              }}
            >
              Undo
            </ToastAction>
          ),
        });
      } else {
        toast({
          description: next
            ? "Feedback saved. It will shape future recommendations."
            : "Feedback removed.",
          duration: 2500,
        });
      }
    } catch {
      setFeedback(previous);
      onFeedbackChange?.(previous);
      toast({
        title: "Feedback wasn’t saved",
        description: "Your previous choice was restored. Please try again.",
        variant: "destructive",
      });
    }
  };

  const choose = (next: RecommendationFeedbackValue) => {
    if (!isAuthenticated) {
      toast({
        title: "Sign in to save feedback",
        description: "Recommendation controls are available for signed-in members.",
        action: (
          <ToastAction
            altText="Sign in"
            onClick={() =>
              setLocation(
                `/sign-in?redirect_url=${encodeURIComponent(window.location.pathname + window.location.search)}`,
              )
            }
          >
            Sign in
          </ToastAction>
        ),
      });
      return;
    }
    const selected = feedback === next ? null : next;
    void save(selected, feedback);
  };

  const selectedLabel = FEEDBACK_OPTIONS.find(
    (option) => option.value === feedback,
  )?.label;

  return (
    <div className={cn("space-y-2", className)}>
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Recommendation feedback"
      >
        {FEEDBACK_OPTIONS.map((option) => {
          const Icon = option.icon;
          const selected = feedback === option.value;
          return (
            <Button
              key={option.value}
              type="button"
              variant="outline"
              size="sm"
              className={cn(
                "h-9 min-h-9 whitespace-nowrap",
                selected && option.activeClass,
              )}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                choose(option.value);
              }}
              disabled={isLoading}
              aria-pressed={selected}
              data-testid={`recommendation-feedback-${option.value}-${resourceId}`}
            >
              <Icon className={cn("mr-1.5 h-4 w-4", selected && "fill-current")} />
              {option.label}
            </Button>
          );
        })}
      </div>
      {selectedLabel ? (
        <Badge variant="secondary" aria-live="polite">
          Saved: {selectedLabel}
        </Badge>
      ) : null}
    </div>
  );
}

export default memo(RecommendationFeedback);
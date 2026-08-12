import { memo } from "react";
import {
  Brain,
  ExternalLink,
  Lightbulb,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import RecommendationFeedback from "@/components/ui/recommendation-feedback";
import { cn } from "@/lib/utils";
import type {
  RecommendationExplanation,
  RecommendationFeedbackValue,
} from "@shared/recommendations";

export interface RecommendationCardResource {
  id: string;
  name: string;
  url: string;
  description?: string;
  category: string;
  tags?: string[];
  confidence?: number;
  isAIBased?: boolean;
  personalized?: boolean;
  explanation: RecommendationExplanation;
  feedback?: RecommendationFeedbackValue | null;
}

interface RecommendationCardProps {
  resource: RecommendationCardResource;
  className?: string;
  onFeedbackChange?: (feedback: RecommendationFeedbackValue | null) => void;
}

function RecommendationCard({
  resource,
  className,
  onFeedbackChange,
}: RecommendationCardProps) {
  const confidence = Math.max(0, Math.min(100, resource.confidence ?? 0));
  const confidenceLabel =
    confidence >= 80 ? "High" : confidence >= 60 ? "Medium" : "Exploratory";

  return (
    <Card className={cn("h-full overflow-hidden transition-colors hover:border-primary/50", className)}>
      <CardContent className="flex h-full flex-col gap-4 p-4">
        <div className="min-w-0">
          <h3 className="line-clamp-2 break-words text-base font-semibold" title={resource.name}>
            {resource.name}
          </h3>
          <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">
            {resource.description ?? "No description available"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="max-w-full truncate text-xs">
            {resource.category}
          </Badge>
          <Badge variant="outline" className="text-xs">
            <TrendingUp className="mr-1 h-3 w-3" />
            {Math.round(confidence)}% · {confidenceLabel}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {resource.isAIBased ? (
              <Brain className="mr-1 h-3 w-3" />
            ) : (
              <Sparkles className="mr-1 h-3 w-3" />
            )}
            {resource.isAIBased ? "AI ranked" : "Rule ranked"}
          </Badge>
        </div>

        <details
          className="rounded-md border bg-muted/25 px-3 py-2 text-sm"
          data-testid={`recommendation-explanation-${resource.id}`}
        >
          <summary className="cursor-pointer list-none font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <span className="inline-flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary" />
              Why this?
            </span>
          </summary>
          <p className="mt-2 text-muted-foreground">
            {resource.explanation.summary}
          </p>
          {resource.explanation.signals.length > 0 ? (
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              {resource.explanation.signals.map((signal) => (
                <li key={`${signal.code}:${signal.evidence ?? signal.label}`}>
                  <span className="font-medium text-foreground">{signal.label}</span>
                  {signal.evidence ? `: ${signal.evidence}` : ""}
                </li>
              ))}
            </ul>
          ) : null}
        </details>

        {resource.tags && resource.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {resource.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="rounded-md bg-muted px-2 py-1 text-xs">
                #{tag}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-auto space-y-3">
          {resource.personalized ? (
            <div className="no-print border-t pt-3">
              <p className="mb-2 text-xs text-muted-foreground">
                Shape future recommendations
              </p>
              <RecommendationFeedback
                resourceId={Number(resource.id)}
                initialFeedback={resource.feedback}
                onFeedbackChange={onFeedbackChange}
              />
            </div>
          ) : null}

          <Button asChild variant="outline" size="sm" className="w-full">
            <a href={resource.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              View resource
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default memo(RecommendationCard, (previous, next) =>
  previous.resource.id === next.resource.id
  && previous.resource.name === next.resource.name
  && previous.resource.url === next.resource.url
  && previous.resource.description === next.resource.description
  && previous.resource.category === next.resource.category
  && previous.resource.confidence === next.resource.confidence
  && previous.resource.isAIBased === next.resource.isAIBased
  && previous.resource.personalized === next.resource.personalized
  && previous.resource.feedback === next.resource.feedback
  && JSON.stringify(previous.resource.explanation) === JSON.stringify(next.resource.explanation)
  && JSON.stringify(previous.resource.tags ?? []) === JSON.stringify(next.resource.tags ?? [])
  && previous.className === next.className
  && previous.onFeedbackChange === next.onFeedbackChange
);
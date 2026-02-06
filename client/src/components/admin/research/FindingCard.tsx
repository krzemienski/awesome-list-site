import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Link2Off,
  Sparkles,
  Plus,
  FolderTree,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import { useApplyFinding, useDismissFinding } from "./hooks/useResearchJobs";
import type { ResearchFinding } from "./types";

interface FindingCardProps {
  finding: ResearchFinding;
}

const FINDING_TYPE_CONFIG = {
  dead_link: {
    icon: Link2Off,
    label: "Dead Link",
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/20",
  },
  enrichment: {
    icon: Sparkles,
    label: "Enrichment",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
  },
  new_resource: {
    icon: Plus,
    label: "New Resource",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/20",
  },
  category_change: {
    icon: FolderTree,
    label: "Category Change",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/20",
  },
};

const SEVERITY_CONFIG = {
  low: { color: "text-gray-500", bgColor: "bg-gray-500" },
  medium: { color: "text-yellow-500", bgColor: "bg-yellow-500" },
  high: { color: "text-orange-500", bgColor: "bg-orange-500" },
  critical: { color: "text-red-500", bgColor: "bg-red-500" },
};

export default function FindingCard({ finding }: FindingCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const applyMutation = useApplyFinding();
  const dismissMutation = useDismissFinding();

  const typeConfig = FINDING_TYPE_CONFIG[finding.type];
  const severityConfig = SEVERITY_CONFIG[finding.severity];
  const TypeIcon = typeConfig.icon;

  const handleApply = () => {
    if (confirm("Are you sure you want to apply this finding? This will modify the data.")) {
      applyMutation.mutate(finding.id);
    }
  };

  const handleDismiss = () => {
    dismissMutation.mutate(finding.id);
  };

  const renderFindingContent = () => {
    switch (finding.type) {
      case "dead_link":
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">URL:</span>
              <a
                href={finding.targetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline font-mono text-xs flex items-center gap-1"
              >
                {finding.targetUrl}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            {finding.metadata?.httpStatus && (
              <div className="text-sm">
                <span className="text-muted-foreground">HTTP Status:</span>{" "}
                <Badge variant="destructive" className="font-mono">
                  {finding.metadata.httpStatus}
                </Badge>
              </div>
            )}
            {finding.suggestedValue && (
              <Alert className="border-green-500/20 bg-green-500/5">
                <AlertDescription className="text-sm">
                  <strong>Suggested:</strong> {finding.suggestedValue}
                </AlertDescription>
              </Alert>
            )}
          </div>
        );

      case "enrichment":
        return (
          <div className="space-y-2">
            {finding.metadata?.field && (
              <div className="text-sm">
                <span className="text-muted-foreground">Field:</span>{" "}
                <Badge variant="outline" className="font-mono">
                  {finding.metadata.field}
                </Badge>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground mb-1">Current:</div>
                <div className="p-2 border rounded bg-card font-mono text-xs">
                  {finding.currentValue || "(empty)"}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground mb-1">Suggested:</div>
                <div className="p-2 border border-green-500/20 rounded bg-green-500/5 font-mono text-xs">
                  {finding.suggestedValue}
                </div>
              </div>
            </div>
          </div>
        );

      case "new_resource":
        return (
          <div className="space-y-2">
            {finding.suggestedValue && (
              <div className="p-3 border border-green-500/20 rounded bg-green-500/5">
                <div className="font-medium mb-1">{finding.metadata?.title || "New Resource"}</div>
                <div className="text-sm text-muted-foreground mb-2">
                  {finding.metadata?.description}
                </div>
                {finding.metadata?.url && (
                  <a
                    href={finding.metadata.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-500 hover:underline font-mono flex items-center gap-1"
                  >
                    {finding.metadata.url}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            )}
          </div>
        );

      case "category_change":
        return (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground mb-1">Current Category:</div>
                <Badge variant="outline">{finding.currentValue}</Badge>
              </div>
              <div>
                <div className="text-muted-foreground mb-1">Suggested Category:</div>
                <Badge className="bg-purple-500 hover:bg-purple-600">
                  {finding.suggestedValue}
                </Badge>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className={`${typeConfig.borderColor}`}>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className={`p-2 rounded ${typeConfig.bgColor}`}>
                <TypeIcon className={`h-4 w-4 ${typeConfig.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Badge variant="outline" className={typeConfig.color}>
                    {typeConfig.label}
                  </Badge>
                  <Badge
                    variant="secondary"
                    className={`${severityConfig.color} uppercase text-xs`}
                  >
                    {finding.severity}
                  </Badge>
                  {finding.status === "applied" && (
                    <Badge className="bg-green-500 hover:bg-green-600">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Applied
                    </Badge>
                  )}
                  {finding.status === "dismissed" && (
                    <Badge variant="secondary">
                      <XCircle className="h-3 w-3 mr-1" />
                      Dismissed
                    </Badge>
                  )}
                </div>
                {finding.targetTitle && (
                  <div className="text-sm font-medium mb-1 truncate">
                    {finding.targetTitle}
                  </div>
                )}
                <div className="text-sm text-muted-foreground">
                  {finding.details}
                </div>
              </div>
            </div>

            {/* Confidence */}
            <div className="flex-shrink-0 text-right">
              <div className="text-xs text-muted-foreground mb-1">Confidence</div>
              <div className="font-mono font-bold text-sm">{finding.confidence}%</div>
              <Progress value={finding.confidence} className="h-1 w-16 mt-1" />
            </div>
          </div>

          {/* Expandable Details */}
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-6 text-xs"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  Hide Details
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  Show Details
                </>
              )}
            </Button>

            {isExpanded && (
              <div className="mt-3 pt-3 border-t">
                {renderFindingContent()}
              </div>
            )}
          </div>

          {/* Actions */}
          {finding.status === "pending" && (
            <div className="flex items-center gap-2 pt-2 border-t">
              <Button
                onClick={handleApply}
                size="sm"
                className="bg-green-500 hover:bg-green-600"
                disabled={applyMutation.isPending}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Apply
              </Button>
              <Button
                onClick={handleDismiss}
                size="sm"
                variant="outline"
                disabled={dismissMutation.isPending}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Dismiss
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

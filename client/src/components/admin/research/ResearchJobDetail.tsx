import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
  Activity,
  Sparkles,
  AlertTriangle,
  Info,
  Terminal,
  ChevronLeft,
} from "lucide-react";
import FindingsList from "./FindingsList";
import { useResearchJob, useCancelResearchJob, useRetryResearchJob } from "./hooks/useResearchJobs";
import { formatDistanceToNow } from "date-fns";
import type { AgentLog } from "./types";

interface ResearchJobDetailProps {
  jobId: string;
  onBack: () => void;
}

const LOG_LEVEL_CONFIG = {
  info: { color: "text-blue-500", icon: Info },
  warn: { color: "text-yellow-500", icon: AlertTriangle },
  error: { color: "text-red-500", icon: AlertCircle },
  success: { color: "text-green-500", icon: CheckCircle2 },
};

export default function ResearchJobDetail({ jobId, onBack }: ResearchJobDetailProps) {
  const [activeTab, setActiveTab] = useState<"findings" | "logs">("findings");
  const { data: jobData, isLoading } = useResearchJob(jobId, true);
  const cancelMutation = useCancelResearchJob();
  const retryMutation = useRetryResearchJob();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!jobData?.job) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Job not found</AlertDescription>
      </Alert>
    );
  }

  const job = jobData.job;
  const isActive = job.status === "processing";
  const progress = job.duration && job.completedAt
    ? 100
    : isActive
    ? 50
    : job.status === "completed"
    ? 100
    : 0;

  const handleCancel = () => {
    if (confirm("Are you sure you want to cancel this research job?")) {
      cancelMutation.mutate(jobId);
    }
  };

  const handleRetry = () => {
    retryMutation.mutate(jobId);
  };

  const formatDuration = (duration: number | null) => {
    if (!duration) return "-";
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const renderAgentLogs = (logs: AgentLog[]) => {
    const groupedLogs = logs.reduce((acc, log) => {
      if (!acc[log.agentId]) {
        acc[log.agentId] = {
          agentName: log.agentName,
          logs: [],
        };
      }
      acc[log.agentId].logs.push(log);
      return acc;
    }, {} as Record<string, { agentName: string; logs: AgentLog[] }>);

    return (
      <Accordion type="multiple" className="w-full">
        {Object.entries(groupedLogs).map(([agentId, { agentName, logs }]) => (
          <AccordionItem key={agentId} value={agentId}>
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3 flex-1">
                <Terminal className="h-4 w-4 text-pink-500" />
                <span className="font-medium">{agentName}</span>
                <Badge variant="outline" className="ml-auto mr-2">
                  {logs.length} logs
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <ScrollArea className="h-[300px] rounded border bg-black/50 p-4">
                <div className="space-y-2 font-mono text-xs">
                  {logs.map((log) => {
                    const levelConfig = LOG_LEVEL_CONFIG[log.level];
                    const LevelIcon = levelConfig.icon;
                    return (
                      <div key={log.id} className="flex items-start gap-2">
                        <span className="text-muted-foreground">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        <LevelIcon className={`h-3 w-3 mt-0.5 ${levelConfig.color}`} />
                        <span className={levelConfig.color}>[{log.level.toUpperCase()}]</span>
                        <span className="flex-1">{log.message}</span>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button onClick={onBack} variant="ghost" size="sm">
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Jobs
        </Button>
      </div>

      <Card className={isActive ? "border-blue-500/20" : ""}>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-pink-500" />
                Research Job Details
              </CardTitle>
              <CardDescription className="space-y-1">
                <div className="font-mono text-xs">{job.id}</div>
                <div>{job.awesomeListName}</div>
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {job.status === "processing" && (
                <Button
                  onClick={handleCancel}
                  variant="destructive"
                  size="sm"
                  disabled={cancelMutation.isPending}
                >
                  {cancelMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Cancelling...
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancel
                    </>
                  )}
                </Button>
              )}
              {job.status === "failed" && (
                <Button
                  onClick={handleRetry}
                  variant="outline"
                  size="sm"
                  disabled={retryMutation.isPending}
                >
                  {retryMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Retrying...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Retry
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress */}
          {isActive && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Processing...</span>
                <span className="font-mono font-semibold animate-pulse text-blue-500">
                  {progress}%
                </span>
              </div>
              <Progress value={progress} className="h-2 animate-pulse" />
            </div>
          )}

          {/* Config Summary */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Configuration
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground mb-1">Job Type</div>
                <Badge>{job.jobType}</Badge>
              </div>
              <div>
                <div className="text-muted-foreground mb-1">Depth</div>
                <Badge variant="outline">{job.depth}</Badge>
              </div>
              <div>
                <div className="text-muted-foreground mb-1">Agents</div>
                <Badge variant="outline">{job.agentCount}</Badge>
              </div>
              <div>
                <div className="text-muted-foreground mb-1">Status</div>
                <Badge
                  className={
                    job.status === "completed"
                      ? "bg-green-500"
                      : job.status === "failed"
                      ? "bg-red-500"
                      : job.status === "processing"
                      ? "bg-blue-500 animate-pulse"
                      : ""
                  }
                >
                  {job.status}
                </Badge>
              </div>
            </div>
            {job.focusAreas.length > 0 && (
              <div className="mt-4">
                <div className="text-muted-foreground text-sm mb-2">Focus Areas</div>
                <div className="flex flex-wrap gap-2">
                  {job.focusAreas.map((area) => (
                    <Badge key={area} variant="secondary">
                      {area}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Stats */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Statistics
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold font-mono">{job.findingsCount}</div>
                  <div className="text-xs text-muted-foreground">Total Findings</div>
                </CardContent>
              </Card>
              <Card className="border-red-500/20">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold font-mono text-red-500">
                    {job.findingsBySeverity.critical}
                  </div>
                  <div className="text-xs text-muted-foreground">Critical</div>
                </CardContent>
              </Card>
              <Card className="border-orange-500/20">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold font-mono text-orange-500">
                    {job.findingsBySeverity.high}
                  </div>
                  <div className="text-xs text-muted-foreground">High</div>
                </CardContent>
              </Card>
              <Card className="border-yellow-500/20">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold font-mono text-yellow-500">
                    {job.findingsBySeverity.medium}
                  </div>
                  <div className="text-xs text-muted-foreground">Medium</div>
                </CardContent>
              </Card>
              <Card className="border-gray-500/20">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold font-mono text-gray-500">
                    {job.findingsBySeverity.low}
                  </div>
                  <div className="text-xs text-muted-foreground">Low</div>
                </CardContent>
              </Card>
            </div>
          </div>

          <Separator />

          {/* Timing */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground mb-1">Started</div>
              <div className="font-mono">
                {job.startedAt
                  ? formatDistanceToNow(new Date(job.startedAt), { addSuffix: true })
                  : "-"}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground mb-1">Completed</div>
              <div className="font-mono">
                {job.completedAt
                  ? formatDistanceToNow(new Date(job.completedAt), { addSuffix: true })
                  : job.status === "processing"
                  ? "In progress..."
                  : "-"}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground mb-1">Duration</div>
              <div className="font-mono">
                {job.status === "processing" && job.startedAt
                  ? formatDuration(Date.now() - new Date(job.startedAt).getTime())
                  : formatDuration(job.duration)}
              </div>
            </div>
          </div>

          {job.errorMessage && (
            <>
              <Separator />
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="font-mono text-sm">
                  {job.errorMessage}
                </AlertDescription>
              </Alert>
            </>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b">
        <Button
          variant={activeTab === "findings" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("findings")}
          className={activeTab === "findings" ? "bg-pink-500 hover:bg-pink-600" : ""}
        >
          Findings ({job.findingsCount})
        </Button>
        <Button
          variant={activeTab === "logs" ? "default" : "ghost"}
          size="sm"
          onClick={() => setActiveTab("logs")}
          className={activeTab === "logs" ? "bg-pink-500 hover:bg-pink-600" : ""}
        >
          Agent Logs ({job.agentLogs.length})
        </Button>
      </div>

      {/* Tab Content */}
      {activeTab === "findings" ? (
        <FindingsList jobId={jobId} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5" />
              Agent Logs
            </CardTitle>
            <CardDescription>
              Real-time logs from AI research agents
            </CardDescription>
          </CardHeader>
          <CardContent>
            {job.agentLogs.length === 0 ? (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>No logs available yet.</AlertDescription>
              </Alert>
            ) : (
              renderAgentLogs(job.agentLogs)
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
  Eye,
  Search,
  ExternalLink,
} from "lucide-react";
import { useCancelResearchJob, useRetryResearchJob } from "./hooks/useResearchJobs";
import type { ResearchJob, ResearchJobStatus, ResearchJobType } from "./types";
import { formatDistanceToNow } from "date-fns";

interface ResearchJobsTableProps {
  jobs: ResearchJob[];
  onViewDetails: (jobId: string) => void;
}

const STATUS_CONFIG = {
  pending: {
    variant: "outline" as const,
    className: "border-yellow-500 text-yellow-500",
    icon: Clock,
  },
  processing: {
    variant: "default" as const,
    className: "bg-blue-500 hover:bg-blue-600 animate-pulse",
    icon: RefreshCw,
  },
  completed: {
    variant: "default" as const,
    className: "bg-green-500 hover:bg-green-600",
    icon: CheckCircle2,
  },
  failed: {
    variant: "destructive" as const,
    className: "bg-red-500 hover:bg-red-600",
    icon: AlertCircle,
  },
  cancelled: {
    variant: "secondary" as const,
    className: "bg-gray-500 hover:bg-gray-600",
    icon: XCircle,
  },
};

const JOB_TYPE_CONFIG = {
  comprehensive: { label: "Comprehensive", color: "bg-purple-500" },
  dead_link_check: { label: "Dead Link Check", color: "bg-red-500" },
  enrichment_suggestions: { label: "Enrichment", color: "bg-blue-500" },
  category_review: { label: "Category Review", color: "bg-green-500" },
};

export default function ResearchJobsTable({ jobs, onViewDetails }: ResearchJobsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<ResearchJobStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<ResearchJobType | "all">("all");

  const cancelMutation = useCancelResearchJob();
  const retryMutation = useRetryResearchJob();

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.awesomeListName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || job.status === statusFilter;
    const matchesType = typeFilter === "all" || job.jobType === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const handleCancel = (jobId: string) => {
    if (confirm("Are you sure you want to cancel this research job?")) {
      cancelMutation.mutate(jobId);
    }
  };

  const handleRetry = (jobId: string) => {
    retryMutation.mutate(jobId);
  };

  const formatDuration = (duration: number | null) => {
    if (!duration) return "-";
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const truncateId = (id: string) => {
    return id.length > 8 ? `${id.substring(0, 8)}...` : id;
  };

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search jobs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as ResearchJobStatus | "all")}
        >
          <SelectTrigger>
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={typeFilter}
          onValueChange={(value) => setTypeFilter(value as ResearchJobType | "all")}
        >
          <SelectTrigger>
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="comprehensive">Comprehensive</SelectItem>
            <SelectItem value="dead_link_check">Dead Link Check</SelectItem>
            <SelectItem value="enrichment_suggestions">Enrichment</SelectItem>
            <SelectItem value="category_review">Category Review</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Badge variant="outline">{filteredJobs.length} jobs</Badge>
        </div>
      </div>

      {/* Table */}
      <ScrollArea className="h-[500px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">ID</TableHead>
              <TableHead>Awesome List</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Findings</TableHead>
              <TableHead>Started</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredJobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No jobs found
                </TableCell>
              </TableRow>
            ) : (
              filteredJobs.map((job) => {
                const statusConfig = STATUS_CONFIG[job.status];
                const StatusIcon = statusConfig.icon;
                const typeConfig = JOB_TYPE_CONFIG[job.jobType];

                return (
                  <TableRow
                    key={job.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => onViewDetails(job.id)}
                  >
                    <TableCell className="font-mono text-xs" title={job.id}>
                      {truncateId(job.id)}
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{job.awesomeListName}</span>
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge className={typeConfig.color}>
                        {typeConfig.label}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant={statusConfig.variant}
                        className={statusConfig.className}
                      >
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {job.status}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        <div className="font-mono font-bold">{job.findingsCount}</div>
                        {job.findingsCount > 0 && (
                          <div className="flex items-center gap-1 text-xs">
                            {job.findingsBySeverity.critical > 0 && (
                              <Badge variant="destructive" className="h-4 px-1 text-xs">
                                {job.findingsBySeverity.critical}
                              </Badge>
                            )}
                            {job.findingsBySeverity.high > 0 && (
                              <Badge className="bg-orange-500 h-4 px-1 text-xs">
                                {job.findingsBySeverity.high}
                              </Badge>
                            )}
                            {job.findingsBySeverity.medium > 0 && (
                              <Badge className="bg-yellow-500 h-4 px-1 text-xs">
                                {job.findingsBySeverity.medium}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="text-sm text-muted-foreground">
                      {job.startedAt
                        ? formatDistanceToNow(new Date(job.startedAt), { addSuffix: true })
                        : "-"}
                    </TableCell>

                    <TableCell className="text-sm font-mono">
                      {job.status === "processing" && job.startedAt ? (
                        <span className="text-blue-500">
                          {formatDuration(Date.now() - new Date(job.startedAt).getTime())}
                        </span>
                      ) : (
                        formatDuration(job.duration)
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewDetails(job.id);
                          }}
                          variant="ghost"
                          size="sm"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>

                        {job.status === "processing" && (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancel(job.id);
                            }}
                            variant="ghost"
                            size="sm"
                            disabled={cancelMutation.isPending}
                          >
                            <XCircle className="h-4 w-4 text-red-500" />
                          </Button>
                        )}

                        {job.status === "failed" && (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRetry(job.id);
                            }}
                            variant="ghost"
                            size="sm"
                            disabled={retryMutation.isPending}
                          >
                            <RefreshCw className="h-4 w-4 text-blue-500" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}

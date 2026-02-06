import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type {
  ResearchJob,
  ResearchFinding,
  ResearchStats,
  AwesomeList,
  ResearchJobFilters,
  FindingFilters,
  CreateResearchJobPayload,
} from "../types";

interface JobsResponse {
  success: boolean;
  jobs: ResearchJob[];
  total: number;
}

interface JobResponse {
  success: boolean;
  job: ResearchJob;
}

interface FindingsResponse {
  success: boolean;
  findings: ResearchFinding[];
  total: number;
}

interface StatsResponse {
  success: boolean;
  stats: ResearchStats;
}

interface ListsResponse {
  success: boolean;
  lists: AwesomeList[];
}

// Fetch all research jobs with optional filters
export function useResearchJobs(filters?: ResearchJobFilters, page: number = 1, limit: number = 20) {
  const queryParams = new URLSearchParams();
  if (filters?.status) queryParams.set('status', filters.status);
  if (filters?.type) queryParams.set('type', filters.type);
  if (filters?.awesomeListId) queryParams.set('awesomeListId', filters.awesomeListId.toString());
  if (filters?.dateFrom) queryParams.set('dateFrom', filters.dateFrom);
  if (filters?.dateTo) queryParams.set('dateTo', filters.dateTo);
  if (filters?.search) queryParams.set('search', filters.search);
  queryParams.set('page', page.toString());
  queryParams.set('limit', limit.toString());

  return useQuery<JobsResponse>({
    queryKey: ['/api/research/jobs', filters, page, limit],
    queryFn: () => apiRequest(`/api/research/jobs?${queryParams.toString()}`),
    refetchInterval: 5000, // Poll every 5 seconds for updates
  });
}

// Fetch single research job
export function useResearchJob(jobId: string | null, enabled: boolean = true) {
  return useQuery<JobResponse>({
    queryKey: ['/api/research/jobs', jobId],
    queryFn: () => apiRequest(`/api/research/jobs/${jobId}`),
    enabled: !!jobId && enabled,
    refetchInterval: enabled ? 5000 : false,
  });
}

// Fetch findings for a job
export function useResearchFindings(
  jobId: string | null,
  filters?: FindingFilters,
  page: number = 1,
  limit: number = 20
) {
  const queryParams = new URLSearchParams();
  if (filters?.type) queryParams.set('type', filters.type);
  if (filters?.severity) queryParams.set('severity', filters.severity);
  if (filters?.status) queryParams.set('status', filters.status);
  queryParams.set('page', page.toString());
  queryParams.set('limit', limit.toString());

  return useQuery<FindingsResponse>({
    queryKey: ['/api/research/jobs', jobId, 'findings', filters, page, limit],
    queryFn: () => apiRequest(`/api/research/jobs/${jobId}/findings?${queryParams.toString()}`),
    enabled: !!jobId,
    refetchInterval: 5000,
  });
}

// Fetch research statistics
export function useResearchStats() {
  return useQuery<StatsResponse>({
    queryKey: ['/api/research/stats'],
    refetchInterval: 10000, // Poll every 10 seconds
  });
}

// Fetch available awesome lists
export function useAwesomeLists() {
  return useQuery<ListsResponse>({
    queryKey: ['/api/awesome-lists'],
  });
}

// Create new research job
export function useCreateResearchJob() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateResearchJobPayload) => {
      return await apiRequest('/api/research/jobs', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/research/jobs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/research/stats'] });
      toast({
        title: "Research job created",
        description: "AI research job has been queued successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create research job",
        description: error.message || "An error occurred while creating the job.",
        variant: "destructive",
      });
    },
  });
}

// Cancel research job
export function useCancelResearchJob() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (jobId: string) => {
      return await apiRequest(`/api/research/jobs/${jobId}/cancel`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/research/jobs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/research/stats'] });
      toast({
        title: "Job cancelled",
        description: "Research job has been cancelled.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to cancel job",
        description: error.message || "An error occurred while cancelling the job.",
        variant: "destructive",
      });
    },
  });
}

// Retry failed research job
export function useRetryResearchJob() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (jobId: string) => {
      return await apiRequest(`/api/research/jobs/${jobId}/retry`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/research/jobs'] });
      toast({
        title: "Job retried",
        description: "Research job has been queued for retry.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to retry job",
        description: error.message || "An error occurred while retrying the job.",
        variant: "destructive",
      });
    },
  });
}

// Apply finding
export function useApplyFinding() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (findingId: string) => {
      return await apiRequest(`/api/research/findings/${findingId}/apply`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/research/jobs'] });
      toast({
        title: "Finding applied",
        description: "The finding has been applied successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to apply finding",
        description: error.message || "An error occurred while applying the finding.",
        variant: "destructive",
      });
    },
  });
}

// Dismiss finding
export function useDismissFinding() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (findingId: string) => {
      return await apiRequest(`/api/research/findings/${findingId}/dismiss`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/research/jobs'] });
      toast({
        title: "Finding dismissed",
        description: "The finding has been dismissed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to dismiss finding",
        description: error.message || "An error occurred while dismissing the finding.",
        variant: "destructive",
      });
    },
  });
}

// Bulk apply findings
export function useBulkApplyFindings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (findingIds: string[]) => {
      return await apiRequest('/api/research/findings/bulk-apply', {
        method: 'POST',
        body: JSON.stringify({ findingIds }),
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/research/jobs'] });
      toast({
        title: "Findings applied",
        description: `${data.applied || 0} findings have been applied successfully.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to apply findings",
        description: error.message || "An error occurred while applying the findings.",
        variant: "destructive",
      });
    },
  });
}

// Bulk dismiss findings
export function useBulkDismissFindings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (findingIds: string[]) => {
      return await apiRequest('/api/research/findings/bulk-dismiss', {
        method: 'POST',
        body: JSON.stringify({ findingIds }),
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/research/jobs'] });
      toast({
        title: "Findings dismissed",
        description: `${data.dismissed || 0} findings have been dismissed.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to dismiss findings",
        description: error.message || "An error occurred while dismissing the findings.",
        variant: "destructive",
      });
    },
  });
}

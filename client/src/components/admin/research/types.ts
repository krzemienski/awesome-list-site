// Research job types and interfaces

export type ResearchJobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type ResearchJobType = 'comprehensive' | 'dead_link_check' | 'enrichment_suggestions' | 'category_review';
export type ResearchDepth = 'shallow' | 'medium' | 'deep';
export type FindingType = 'dead_link' | 'enrichment' | 'new_resource' | 'category_change';
export type FindingSeverity = 'low' | 'medium' | 'high' | 'critical';
export type FindingStatus = 'pending' | 'applied' | 'dismissed';

export interface ResearchJob {
  id: string;
  awesomeListId: number;
  awesomeListName: string;
  jobType: ResearchJobType;
  status: ResearchJobStatus;
  depth: ResearchDepth;
  focusAreas: string[];
  agentCount: number;
  startedAt: string | null;
  completedAt: string | null;
  duration: number | null;
  findingsCount: number;
  findingsBySeverity: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  agentLogs: AgentLog[];
  errorMessage?: string;
}

export interface AgentLog {
  id: string;
  timestamp: string;
  agentId: string;
  agentName: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
}

export interface ResearchFinding {
  id: string;
  jobId: string;
  type: FindingType;
  severity: FindingSeverity;
  status: FindingStatus;
  confidence: number;
  targetType: 'resource' | 'category';
  targetId: number;
  targetTitle?: string;
  targetUrl?: string;
  currentValue?: string;
  suggestedValue?: string;
  details: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface AwesomeList {
  id: number;
  name: string;
  slug: string;
  description: string;
  resourceCount: number;
  categoryCount: number;
}

export interface ResearchJobFilters {
  status?: ResearchJobStatus;
  type?: ResearchJobType;
  awesomeListId?: number;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface FindingFilters {
  type?: FindingType;
  severity?: FindingSeverity;
  status?: FindingStatus;
}

export interface ResearchStats {
  totalJobs: number;
  activeJobs: number;
  pendingFindings: number;
  successRate: number;
  avgDuration: number;
  recentActivity: {
    date: string;
    jobs: number;
    findings: number;
  }[];
}

export interface CreateResearchJobPayload {
  awesomeListId: number;
  jobType: ResearchJobType;
  depth: ResearchDepth;
  focusAreas: string[];
  agentCount: number;
}

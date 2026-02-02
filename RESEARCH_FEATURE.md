# AI Research Feature Specification

## 1. Overview

The AI Research Feature provides automated, intelligent analysis of awesome lists through multi-agent orchestration powered by Claude Opus 4.5. This feature enables administrators to run comprehensive research jobs that validate links, enrich resource metadata, discover new resources, and optimize category structures.

### Goals

- **Automated Link Validation**: Detect dead links, redirects, and accessibility issues across all resources in an awesome list
- **Content Enrichment**: Generate improved descriptions, tags, and metadata for resources lacking detail
- **Resource Discovery**: Identify new, high-quality resources that align with the list's focus areas
- **Category Optimization**: Analyze resource distribution and suggest reorganization for better discoverability
- **Trend Analysis**: Identify emerging technologies and outdated resources based on content analysis

### Target Users

Admin users managing awesome lists who need to maintain content quality at scale. The feature reduces manual curation effort by surfacing actionable findings that can be reviewed and applied with a single click.

### Key Differentiators

Unlike the existing enrichment system which processes individual resources, the Research Feature operates at the list level, using specialized AI agents that understand the context of the entire collection. Each agent produces typed findings that admins can review, apply, or dismiss through a unified dashboard.

---

## 2. Architecture

### Integration with Existing Systems

The Research Feature builds on established patterns in the codebase:

- **Job-Queue Pattern**: Mirrors `enrichmentJobs` + `enrichmentQueue` tables with status flow (pending -> processing -> completed/failed)
- **AI Service Pattern**: Extends `ClaudeService` singleton with SSRF protection and response caching
- **Admin Route Pattern**: Uses `isAuthenticated` + `isAdmin` middleware with consistent JSON responses
- **Frontend Pattern**: TanStack Query with polling, mutation hooks, and progress visualization

### Multi-Agent Orchestration

```
┌─────────────────────────────────────────────────────────────────────┐
│                     ResearchOrchestrator                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐│
│  │ Validation  │  │ Enrichment  │  │  Discovery  │  │  Category   ││
│  │   Agent     │  │   Agent     │  │   Agent     │  │   Agent     ││
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘│
│         │                │                │                │       │
│         └────────────────┼────────────────┼────────────────┘       │
│                          ▼                                          │
│                   ┌─────────────┐                                   │
│                   │  Findings   │                                   │
│                   │   Store     │                                   │
│                   └─────────────┘                                   │
└─────────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      ClaudeService                                   │
│  - Claude Opus 4.5 for complex reasoning                            │
│  - SSRF protection via domain allowlist                             │
│  - Response caching (1hr) + Analysis caching (24hr)                 │
│  - Rate limiting (1s between requests)                              │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. Admin creates a research job for an awesome list
2. `ResearchOrchestrator` spawns appropriate agents based on job type
3. Each agent processes resources/categories and generates typed findings
4. Findings are stored with confidence scores and severity levels
5. Admin reviews findings in dashboard and applies/dismisses them
6. Applied findings trigger updates to resources/categories tables

### Singleton Service Pattern

Following the existing `ClaudeService` and `EnrichmentService` patterns, the `ResearchOrchestrator` is implemented as a singleton to manage concurrent job execution and shared state.

---

## 3. Database Schema

### Research Jobs Table

```typescript
// /shared/schema.ts

export const researchJobs = pgTable(
  'research_jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    awesomeListId: integer('awesome_list_id').references(() => awesomeLists.id).notNull(),
    jobType: text('job_type').notNull(), // 'validation', 'enrichment', 'discovery', 'category_analysis', 'trend'
    status: text('status').default('pending').notNull(), // pending, processing, completed, failed, cancelled
    config: jsonb('config').default({}).notNull(),
    results: jsonb('results'),
    agentLogs: jsonb('agent_logs').default([]).notNull(),
    totalFindings: integer('total_findings').default(0).notNull(),
    appliedFindings: integer('applied_findings').default(0).notNull(),
    startedBy: varchar('started_by').references(() => users.id),
    startedAt: timestamp('started_at'),
    completedAt: timestamp('completed_at'),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_research_jobs_status').on(table.status),
    index('idx_research_jobs_awesome_list_id').on(table.awesomeListId),
    index('idx_research_jobs_started_by').on(table.startedBy),
  ]
);

export type ResearchJob = typeof researchJobs.$inferSelect;
export type InsertResearchJob = typeof researchJobs.$inferInsert;
```

### Research Findings Table

```typescript
export const researchFindings = pgTable(
  'research_findings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    jobId: uuid('job_id').references(() => researchJobs.id, { onDelete: 'cascade' }).notNull(),
    findingType: text('finding_type').notNull(), // 'dead_link', 'redirect', 'enrichment', 'suggestion', 'category_change', 'new_resource', 'outdated'
    targetResourceId: integer('target_resource_id').references(() => resources.id, { onDelete: 'set null' }),
    targetCategoryId: integer('target_category_id').references(() => categories.id, { onDelete: 'set null' }),
    data: jsonb('data').notNull(),
    confidence: real('confidence'), // 0.0 - 1.0
    severity: text('severity').default('info'), // 'info', 'warning', 'critical'
    applied: boolean('applied').default(false).notNull(),
    appliedAt: timestamp('applied_at'),
    appliedBy: varchar('applied_by').references(() => users.id),
    dismissed: boolean('dismissed').default(false).notNull(),
    dismissedAt: timestamp('dismissed_at'),
    dismissedBy: varchar('dismissed_by').references(() => users.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_research_findings_job_applied').on(table.jobId, table.applied),
    index('idx_research_findings_type').on(table.findingType),
    index('idx_research_findings_severity').on(table.severity),
  ]
);

export type ResearchFinding = typeof researchFindings.$inferSelect;
export type InsertResearchFinding = typeof researchFindings.$inferInsert;
```

### Zod Validation Schemas

```typescript
// Job config schemas by job type
export const validationJobConfigSchema = z.object({
  checkRedirects: z.boolean().default(true),
  timeout: z.number().min(1000).max(30000).default(10000),
  concurrency: z.number().min(1).max(10).default(5),
});

export const enrichmentJobConfigSchema = z.object({
  minConfidence: z.number().min(0).max(1).default(0.7),
  overwriteExisting: z.boolean().default(false),
  fieldsToEnrich: z.array(z.enum(['description', 'tags', 'category'])).default(['description', 'tags']),
});

export const discoveryJobConfigSchema = z.object({
  maxSuggestions: z.number().min(1).max(50).default(20),
  focusAreas: z.array(z.string()).optional(),
  excludeDomains: z.array(z.string()).default([]),
});

export const categoryJobConfigSchema = z.object({
  minResourcesPerCategory: z.number().min(1).default(3),
  suggestMerges: z.boolean().default(true),
  suggestSplits: z.boolean().default(true),
});

// Finding data schemas by finding type
export const deadLinkFindingDataSchema = z.object({
  url: z.string().url(),
  statusCode: z.number().optional(),
  errorMessage: z.string().optional(),
  lastChecked: z.string().datetime(),
});

export const redirectFindingDataSchema = z.object({
  originalUrl: z.string().url(),
  finalUrl: z.string().url(),
  redirectChain: z.array(z.string()).optional(),
});

export const enrichmentFindingDataSchema = z.object({
  currentTitle: z.string().optional(),
  suggestedTitle: z.string().optional(),
  currentDescription: z.string().optional(),
  suggestedDescription: z.string().optional(),
  suggestedTags: z.array(z.string()).optional(),
  reasoning: z.string().optional(),
});

export const newResourceFindingDataSchema = z.object({
  url: z.string().url(),
  suggestedTitle: z.string(),
  suggestedDescription: z.string(),
  suggestedCategory: z.string(),
  suggestedSubcategory: z.string().optional(),
  suggestedTags: z.array(z.string()).optional(),
  sourceContext: z.string().optional(), // Where the AI found this resource
});

export const categoryChangeFindingDataSchema = z.object({
  currentCategory: z.string(),
  currentSubcategory: z.string().optional(),
  suggestedCategory: z.string(),
  suggestedSubcategory: z.string().optional(),
  reasoning: z.string(),
});
```

---

## 4. API Specification

### Create Research Job

```
POST /api/admin/research/jobs
```

**Request Body:**
```typescript
{
  awesomeListId: number;
  jobType: 'validation' | 'enrichment' | 'discovery' | 'category_analysis' | 'trend';
  config?: Record<string, any>; // Job-type-specific config
}
```

**Response:**
```typescript
{
  success: boolean;
  job: ResearchJob;
  message: string;
}
```

### List Research Jobs

```
GET /api/admin/research/jobs
```

**Query Parameters:**
- `awesomeListId` (optional): Filter by list
- `status` (optional): Filter by status
- `limit` (optional, default: 50): Max results
- `offset` (optional, default: 0): Pagination offset

**Response:**
```typescript
{
  success: boolean;
  jobs: ResearchJob[];
  total: number;
}
```

### Get Research Job

```
GET /api/admin/research/jobs/:id
```

**Response:**
```typescript
{
  success: boolean;
  job: ResearchJob;
}
```

### Cancel Research Job

```
POST /api/admin/research/jobs/:id/cancel
```

**Response:**
```typescript
{
  success: boolean;
  message: string;
}
```

### Retry Research Job

```
POST /api/admin/research/jobs/:id/retry
```

**Response:**
```typescript
{
  success: boolean;
  job: ResearchJob;
  message: string;
}
```

### Get Job Findings

```
GET /api/admin/research/jobs/:id/findings
```

**Query Parameters:**
- `type` (optional): Filter by finding type
- `severity` (optional): Filter by severity
- `applied` (optional): Filter by applied status
- `limit` (optional, default: 50): Max results
- `offset` (optional, default: 0): Pagination offset

**Response:**
```typescript
{
  success: boolean;
  findings: ResearchFinding[];
  total: number;
}
```

### Get Job Logs

```
GET /api/admin/research/jobs/:id/logs
```

**Response:**
```typescript
{
  success: boolean;
  logs: Array<{
    timestamp: string;
    agent: string;
    level: 'info' | 'warn' | 'error';
    message: string;
    metadata?: Record<string, any>;
  }>;
}
```

### Apply Finding

```
POST /api/admin/research/findings/:id/apply
```

**Response:**
```typescript
{
  success: boolean;
  message: string;
  changes?: Record<string, any>; // What was changed
}
```

### Dismiss Finding

```
POST /api/admin/research/findings/:id/dismiss
```

**Request Body (optional):**
```typescript
{
  reason?: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  message: string;
}
```

### Bulk Apply Findings

```
POST /api/admin/research/findings/bulk-apply
```

**Request Body:**
```typescript
{
  findingIds: string[];
}
```

**Response:**
```typescript
{
  success: boolean;
  applied: number;
  failed: number;
  errors?: Array<{ id: string; error: string }>;
}
```

### Bulk Dismiss Findings

```
POST /api/admin/research/findings/bulk-dismiss
```

**Request Body:**
```typescript
{
  findingIds: string[];
  reason?: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  dismissed: number;
  failed: number;
  errors?: Array<{ id: string; error: string }>;
}
```

### Get Research Stats

```
GET /api/admin/research/stats
```

**Response:**
```typescript
{
  success: boolean;
  stats: {
    totalJobs: number;
    jobsByStatus: Record<string, number>;
    totalFindings: number;
    findingsByType: Record<string, number>;
    findingsBySeverity: Record<string, number>;
    appliedFindings: number;
    dismissedFindings: number;
    pendingFindings: number;
  };
}
```

### List Awesome Lists for Research

```
GET /api/admin/research/awesome-lists
```

**Response:**
```typescript
{
  success: boolean;
  lists: Array<{
    id: number;
    title: string;
    resourceCount: number;
    lastResearchedAt?: string;
  }>;
}
```

---

## 5. Service Design

### ResearchOrchestrator

```typescript
// /server/ai/researchOrchestrator.ts

import { ClaudeService } from './claudeService';
import { storage } from '../storage';
import type { ResearchJob, ResearchFinding, Resource } from '@shared/schema';

interface CreateJobParams {
  awesomeListId: number;
  jobType: string;
  config?: Record<string, any>;
  startedBy?: string;
}

interface ListContext {
  awesomeList: AwesomeList;
  resources: Resource[];
  categories: Category[];
  subcategories: Subcategory[];
}

interface ValidationFinding {
  type: 'dead_link' | 'redirect';
  resourceId: number;
  data: Record<string, any>;
  severity: 'info' | 'warning' | 'critical';
}

interface EnrichmentFinding {
  type: 'enrichment';
  resourceId: number;
  data: Record<string, any>;
  confidence: number;
}

interface DiscoveryFinding {
  type: 'new_resource';
  data: Record<string, any>;
  confidence: number;
}

interface CategoryFinding {
  type: 'category_change';
  resourceId?: number;
  categoryId?: number;
  data: Record<string, any>;
  confidence: number;
}

interface BulkResult {
  applied: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
}

export class ResearchOrchestrator {
  private static instance: ResearchOrchestrator;
  private claudeService: ClaudeService;
  private processingJobs: Set<string> = new Set();
  private readonly MAX_CONCURRENT_JOBS_PER_USER = 3;

  private constructor() {
    this.claudeService = ClaudeService.getInstance();
  }

  public static getInstance(): ResearchOrchestrator {
    if (!ResearchOrchestrator.instance) {
      ResearchOrchestrator.instance = new ResearchOrchestrator();
    }
    return ResearchOrchestrator.instance;
  }

  async createJob(params: CreateJobParams): Promise<ResearchJob> {
    // Validate concurrent job limit
    if (params.startedBy) {
      const activeJobs = await this.getActiveJobCountForUser(params.startedBy);
      if (activeJobs >= this.MAX_CONCURRENT_JOBS_PER_USER) {
        throw new Error(`Maximum ${this.MAX_CONCURRENT_JOBS_PER_USER} concurrent jobs per user`);
      }
    }

    const job = await storage.createResearchJob({
      awesomeListId: params.awesomeListId,
      jobType: params.jobType,
      config: params.config || {},
      startedBy: params.startedBy,
      status: 'pending',
    });

    // Start processing asynchronously
    this.processJob(job.id).catch(error => {
      console.error(`Error processing research job ${job.id}:`, error);
      storage.updateResearchJob(job.id, {
        status: 'failed',
        errorMessage: error.message,
        completedAt: new Date(),
      });
    });

    return job;
  }

  async processJob(jobId: string): Promise<void> {
    if (this.processingJobs.has(jobId)) {
      return;
    }

    this.processingJobs.add(jobId);

    try {
      const job = await storage.getResearchJob(jobId);
      if (!job || job.status === 'cancelled') {
        return;
      }

      await storage.updateResearchJob(jobId, {
        status: 'processing',
        startedAt: new Date(),
      });

      const context = await this.buildListContext(job.awesomeListId);
      let findings: ResearchFinding[] = [];

      switch (job.jobType) {
        case 'validation':
          findings = await this.runValidationAgent(context.resources, job.config);
          break;
        case 'enrichment':
          findings = await this.runEnrichmentAgent(context.resources, job.config);
          break;
        case 'discovery':
          findings = await this.runDiscoveryAgent(context, job.config);
          break;
        case 'category_analysis':
          findings = await this.runCategoryAgent(context, job.config);
          break;
        case 'trend':
          findings = await this.runTrendAgent(context, job.config);
          break;
      }

      // Store findings
      for (const finding of findings) {
        await storage.createResearchFinding({
          jobId,
          ...finding,
        });
      }

      await storage.updateResearchJob(jobId, {
        status: 'completed',
        totalFindings: findings.length,
        completedAt: new Date(),
      });

    } finally {
      this.processingJobs.delete(jobId);
    }
  }

  async cancelJob(jobId: string): Promise<void> {
    await storage.updateResearchJob(jobId, {
      status: 'cancelled',
      completedAt: new Date(),
    });
  }

  async retryJob(jobId: string): Promise<ResearchJob> {
    const originalJob = await storage.getResearchJob(jobId);
    if (!originalJob) {
      throw new Error('Job not found');
    }

    return this.createJob({
      awesomeListId: originalJob.awesomeListId,
      jobType: originalJob.jobType,
      config: originalJob.config,
      startedBy: originalJob.startedBy,
    });
  }

  // Agent methods
  private async runValidationAgent(
    resources: Resource[],
    config: Record<string, any>
  ): Promise<ValidationFinding[]> {
    const findings: ValidationFinding[] = [];
    const { timeout = 10000, concurrency = 5 } = config;

    // Reuse existing LinkChecker logic
    const { LinkChecker } = await import('./linkChecker');
    const checker = new LinkChecker({ timeout, concurrency });

    for (const resource of resources) {
      const result = await checker.check(resource.url);

      if (!result.isValid) {
        findings.push({
          type: 'dead_link',
          resourceId: resource.id,
          data: {
            url: resource.url,
            statusCode: result.statusCode,
            errorMessage: result.error,
            lastChecked: new Date().toISOString(),
          },
          severity: 'critical',
        });
      } else if (result.redirectUrl && result.redirectUrl !== resource.url) {
        findings.push({
          type: 'redirect',
          resourceId: resource.id,
          data: {
            originalUrl: resource.url,
            finalUrl: result.redirectUrl,
            redirectChain: result.redirectChain,
          },
          severity: 'warning',
        });
      }

      this.logAgent(jobId, 'validation', 'info', `Checked ${resource.url}`);
    }

    return findings;
  }

  private async runEnrichmentAgent(
    resources: Resource[],
    config: Record<string, any>
  ): Promise<EnrichmentFinding[]> {
    const findings: EnrichmentFinding[] = [];
    const { minConfidence = 0.7, fieldsToEnrich = ['description', 'tags'] } = config;

    for (const resource of resources) {
      const needsEnrichment = !resource.description || resource.description.trim() === '';
      if (!needsEnrichment) continue;

      const prompt = `Analyze this resource and suggest improvements:
Title: ${resource.title}
URL: ${resource.url}
Current Description: ${resource.description || 'None'}
Current Category: ${resource.category}

Provide:
1. An improved description (2-3 sentences)
2. Suggested tags (3-5 relevant technical tags)
3. Confidence score (0-1)

Return JSON: { suggestedDescription, suggestedTags, confidence, reasoning }`;

      const response = await this.claudeService.generateResponse(prompt, 1000);
      if (!response) continue;

      try {
        const parsed = JSON.parse(response.match(/\{[\s\S]*\}/)?.[0] || '{}');
        if (parsed.confidence >= minConfidence) {
          findings.push({
            type: 'enrichment',
            resourceId: resource.id,
            data: {
              currentDescription: resource.description,
              suggestedDescription: parsed.suggestedDescription,
              suggestedTags: parsed.suggestedTags,
              reasoning: parsed.reasoning,
            },
            confidence: parsed.confidence,
          });
        }
      } catch (e) {
        // Skip malformed responses
      }
    }

    return findings;
  }

  private async runDiscoveryAgent(
    context: ListContext,
    config: Record<string, any>
  ): Promise<DiscoveryFinding[]> {
    const findings: DiscoveryFinding[] = [];
    const { maxSuggestions = 20, focusAreas = [] } = config;

    const existingUrls = new Set(context.resources.map(r => r.url));
    const categories = context.categories.map(c => c.name).join(', ');

    const prompt = `You are analyzing an awesome list about: ${context.awesomeList.title}
Description: ${context.awesomeList.description}
Categories: ${categories}
${focusAreas.length ? `Focus areas: ${focusAreas.join(', ')}` : ''}

The list currently has ${context.resources.length} resources.

Suggest ${maxSuggestions} new high-quality resources that would complement this list.
Consider: GitHub repos, documentation, tutorials, tools, and libraries.

Return JSON array: [{ url, suggestedTitle, suggestedDescription, suggestedCategory, confidence }]`;

    const response = await this.claudeService.generateResponse(prompt, 4000);
    if (!response) return findings;

    try {
      const parsed = JSON.parse(response.match(/\[[\s\S]*\]/)?.[0] || '[]');
      for (const suggestion of parsed) {
        if (!existingUrls.has(suggestion.url)) {
          findings.push({
            type: 'new_resource',
            data: {
              url: suggestion.url,
              suggestedTitle: suggestion.suggestedTitle,
              suggestedDescription: suggestion.suggestedDescription,
              suggestedCategory: suggestion.suggestedCategory,
              sourceContext: 'AI Discovery Agent',
            },
            confidence: suggestion.confidence || 0.7,
          });
        }
      }
    } catch (e) {
      // Skip malformed responses
    }

    return findings;
  }

  private async runCategoryAgent(
    context: ListContext,
    config: Record<string, any>
  ): Promise<CategoryFinding[]> {
    const findings: CategoryFinding[] = [];
    const { minResourcesPerCategory = 3, suggestMerges = true } = config;

    // Analyze category distribution
    const categoryStats = new Map<string, number>();
    for (const resource of context.resources) {
      const count = categoryStats.get(resource.category) || 0;
      categoryStats.set(resource.category, count + 1);
    }

    // Find resources that might be miscategorized
    for (const resource of context.resources) {
      const prompt = `Resource: "${resource.title}"
URL: ${resource.url}
Description: ${resource.description}
Current Category: ${resource.category}
Current Subcategory: ${resource.subcategory || 'None'}

Available Categories: ${Array.from(categoryStats.keys()).join(', ')}

Is this resource in the best category? If not, suggest a better one.
Return JSON: { isCorrect: boolean, suggestedCategory?, suggestedSubcategory?, reasoning, confidence }`;

      const response = await this.claudeService.generateResponse(prompt, 500);
      if (!response) continue;

      try {
        const parsed = JSON.parse(response.match(/\{[\s\S]*\}/)?.[0] || '{}');
        if (!parsed.isCorrect && parsed.confidence >= 0.7) {
          findings.push({
            type: 'category_change',
            resourceId: resource.id,
            data: {
              currentCategory: resource.category,
              currentSubcategory: resource.subcategory,
              suggestedCategory: parsed.suggestedCategory,
              suggestedSubcategory: parsed.suggestedSubcategory,
              reasoning: parsed.reasoning,
            },
            confidence: parsed.confidence,
          });
        }
      } catch (e) {
        // Skip malformed responses
      }
    }

    return findings;
  }

  // Finding management
  async applyFinding(findingId: string, userId: string): Promise<void> {
    const finding = await storage.getResearchFinding(findingId);
    if (!finding || finding.applied) {
      throw new Error('Finding not found or already applied');
    }

    // Apply changes based on finding type
    switch (finding.findingType) {
      case 'dead_link':
        // Archive or flag the resource
        if (finding.targetResourceId) {
          await storage.updateResource(finding.targetResourceId, {
            status: 'archived',
            metadata: { archivedReason: 'dead_link', ...finding.data },
          });
        }
        break;

      case 'redirect':
        // Update resource URL
        if (finding.targetResourceId && finding.data.finalUrl) {
          await storage.updateResource(finding.targetResourceId, {
            url: finding.data.finalUrl,
          });
        }
        break;

      case 'enrichment':
        // Update resource metadata
        if (finding.targetResourceId) {
          const updates: any = {};
          if (finding.data.suggestedDescription) {
            updates.description = finding.data.suggestedDescription;
          }
          await storage.updateResource(finding.targetResourceId, updates);
        }
        break;

      case 'new_resource':
        // Create new resource
        await storage.createResource({
          title: finding.data.suggestedTitle,
          url: finding.data.url,
          description: finding.data.suggestedDescription,
          category: finding.data.suggestedCategory,
          subcategory: finding.data.suggestedSubcategory,
          status: 'approved',
        });
        break;

      case 'category_change':
        // Update resource category
        if (finding.targetResourceId) {
          await storage.updateResource(finding.targetResourceId, {
            category: finding.data.suggestedCategory,
            subcategory: finding.data.suggestedSubcategory,
          });
        }
        break;
    }

    await storage.updateResearchFinding(findingId, {
      applied: true,
      appliedAt: new Date(),
      appliedBy: userId,
    });

    // Update job applied count
    await storage.incrementResearchJobAppliedFindings(finding.jobId);
  }

  async dismissFinding(findingId: string, userId: string): Promise<void> {
    await storage.updateResearchFinding(findingId, {
      dismissed: true,
      dismissedAt: new Date(),
      dismissedBy: userId,
    });
  }

  async bulkApplyFindings(findingIds: string[], userId: string): Promise<BulkResult> {
    const result: BulkResult = { applied: 0, failed: 0, errors: [] };

    for (const id of findingIds) {
      try {
        await this.applyFinding(id, userId);
        result.applied++;
      } catch (error: any) {
        result.failed++;
        result.errors.push({ id, error: error.message });
      }
    }

    return result;
  }

  private async buildListContext(awesomeListId: number): Promise<ListContext> {
    const awesomeList = await storage.getAwesomeList(awesomeListId);
    if (!awesomeList) {
      throw new Error('Awesome list not found');
    }

    const { resources } = await storage.listResources({ status: 'approved', limit: 10000 });
    const categories = await storage.listCategories();
    const subcategories = await storage.listSubcategories();

    return { awesomeList, resources, categories, subcategories };
  }

  private async getActiveJobCountForUser(userId: string): Promise<number> {
    return storage.countActiveResearchJobsForUser(userId);
  }

  private logAgent(jobId: string, agent: string, level: string, message: string): void {
    storage.appendResearchJobLog(jobId, { timestamp: new Date().toISOString(), agent, level, message });
  }
}

export const researchOrchestrator = ResearchOrchestrator.getInstance();
```

---

## 6. Frontend Design

### Component Hierarchy

```
ResearchDashboard
├── ResearchStatsCards (overview metrics)
├── NewResearchJobDialog
│   ├── AwesomeListSelector
│   ├── JobTypeSelector
│   └── JobConfigForm (dynamic based on type)
├── ResearchJobsTable
│   ├── JobStatusBadge
│   ├── JobProgressBar
│   └── JobActions (view, cancel, retry)
└── ResearchJobDetail (when job selected)
    ├── JobMetadataCard
    ├── JobProgressSection
    ├── FindingsList
    │   ├── FindingFilters (type, severity, status)
    │   ├── FindingCard
    │   │   ├── FindingSeverityBadge
    │   │   ├── FindingContent (type-specific)
    │   │   └── FindingActions (apply, dismiss)
    │   └── BulkActionsBar
    └── JobLogsViewer
```

### Key Component Props

```typescript
// ResearchDashboard.tsx
interface ResearchDashboardProps {
  defaultAwesomeListId?: number;
}

// ResearchJobsTable.tsx
interface ResearchJobsTableProps {
  jobs: ResearchJob[];
  isLoading: boolean;
  onSelectJob: (job: ResearchJob) => void;
  onCancelJob: (jobId: string) => void;
}

// FindingCard.tsx
interface FindingCardProps {
  finding: ResearchFinding;
  onApply: (id: string) => void;
  onDismiss: (id: string) => void;
  isApplying?: boolean;
  isDismissing?: boolean;
}

// NewResearchJobDialog.tsx
interface NewResearchJobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateJobParams) => void;
  isSubmitting: boolean;
}
```

### TanStack Query Hooks

```typescript
// useResearchJobs.ts
export function useResearchJobs(awesomeListId?: number) {
  return useQuery({
    queryKey: ['/api/admin/research/jobs', { awesomeListId }],
    refetchInterval: 5000, // Poll for updates
  });
}

// useResearchJob.ts
export function useResearchJob(jobId: string | null) {
  return useQuery({
    queryKey: ['/api/admin/research/jobs', jobId],
    enabled: !!jobId,
    refetchInterval: (data) =>
      data?.job?.status === 'processing' ? 2000 : false,
  });
}

// useResearchFindings.ts
export function useResearchFindings(jobId: string, filters?: FindingFilters) {
  return useQuery({
    queryKey: ['/api/admin/research/jobs', jobId, 'findings', filters],
    enabled: !!jobId,
  });
}

// useCreateResearchJob.ts
export function useCreateResearchJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateJobParams) =>
      apiRequest('/api/admin/research/jobs', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/research/jobs'] });
    },
  });
}

// useApplyFinding.ts
export function useApplyFinding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (findingId: string) =>
      apiRequest(`/api/admin/research/findings/${findingId}/apply`, { method: 'POST' }),
    onSuccess: (_, findingId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/research/jobs'] });
    },
  });
}
```

---

## 7. Implementation Plan

### Phase 1: Database Layer (Day 1)
- [ ] Add `researchJobs` and `researchFindings` tables to `shared/schema.ts`
- [ ] Create Drizzle migration
- [ ] Run migration and verify schema
- **Validation Gate**: Tables exist, can insert/query test data

### Phase 2: Repository Layer (Day 2)
- [ ] Add research job CRUD methods to `IStorage` interface
- [ ] Implement methods in `storage.ts`
- [ ] Add finding CRUD methods
- **Validation Gate**: All storage methods work with unit tests

### Phase 3: ResearchOrchestrator Core (Days 3-4)
- [ ] Create `/server/ai/researchOrchestrator.ts`
- [ ] Implement validation agent (reuse LinkChecker)
- [ ] Add job lifecycle management (create, process, cancel)
- **Validation Gate**: Can create job, run validation, see findings

### Phase 4: Remaining Agents (Days 5-6)
- [ ] Implement enrichment agent
- [ ] Implement discovery agent
- [ ] Implement category analysis agent
- [ ] Add trend analysis agent
- **Validation Gate**: All job types produce valid findings

### Phase 5: API Routes (Day 7)
- [ ] Create `/server/routes/admin/research.ts`
- [ ] Register all endpoints
- [ ] Add input validation with Zod
- **Validation Gate**: All endpoints return correct responses

### Phase 6: Frontend Dashboard (Days 8-10)
- [ ] Create `ResearchDashboard` component
- [ ] Implement `ResearchJobsTable` with polling
- [ ] Build `FindingsList` with filters
- [ ] Add `NewResearchJobDialog`
- [ ] Implement apply/dismiss actions
- **Validation Gate**: Can create job, view findings, apply changes in UI

### Phase 7: Bulk Operations & Polish (Days 11-12)
- [ ] Implement bulk apply/dismiss
- [ ] Add stats dashboard
- [ ] Performance optimization
- [ ] Error handling improvements
- **Validation Gate**: Bulk operations work, stats accurate

---

## 8. Integration Points

### EnrichmentService Patterns

The Research Feature reuses patterns from `/server/ai/enrichmentService.ts`:

- Singleton pattern for job management
- `processingJobs` Set to track in-flight jobs
- Batch processing with configurable concurrency
- Retry logic with exponential backoff
- Status updates via storage layer

### ClaudeService for AI

All agents use `ClaudeService.getInstance()`:

```typescript
const claudeService = ClaudeService.getInstance();
const response = await claudeService.generateResponse(prompt, maxTokens, systemPrompt);
```

Benefits:
- Automatic caching (1hr response, 24hr analysis)
- Rate limiting (1s between requests)
- SSRF protection via domain allowlist
- Connection validation

### Storage Layer (IStorage)

Add new methods to interface:

```typescript
interface IStorage {
  // Existing methods...

  // Research Jobs
  createResearchJob(job: InsertResearchJob): Promise<ResearchJob>;
  getResearchJob(id: string): Promise<ResearchJob | undefined>;
  updateResearchJob(id: string, updates: Partial<ResearchJob>): Promise<ResearchJob>;
  listResearchJobs(options: ListResearchJobsOptions): Promise<{ jobs: ResearchJob[]; total: number }>;
  countActiveResearchJobsForUser(userId: string): Promise<number>;
  appendResearchJobLog(jobId: string, log: any): Promise<void>;
  incrementResearchJobAppliedFindings(jobId: string): Promise<void>;

  // Research Findings
  createResearchFinding(finding: InsertResearchFinding): Promise<ResearchFinding>;
  getResearchFinding(id: string): Promise<ResearchFinding | undefined>;
  updateResearchFinding(id: string, updates: Partial<ResearchFinding>): Promise<ResearchFinding>;
  listResearchFindings(jobId: string, options: ListFindingsOptions): Promise<{ findings: ResearchFinding[]; total: number }>;
}
```

### Admin Routes Middleware

Follow existing pattern from `/server/routes/admin/enrichment.ts`:

```typescript
import { isAuthenticated } from '../../replitAuth';
import { isAdmin } from '../auth';

app.post('/api/admin/research/jobs', isAuthenticated, isAdmin, async (req, res) => {
  // Handler
});
```

### Frontend TanStack Query

Follow existing pattern from `BatchEnrichmentPanel.tsx`:

```typescript
const { data, isLoading } = useQuery({
  queryKey: ['/api/admin/research/jobs'],
  refetchInterval: 5000,
});

const mutation = useMutation({
  mutationFn: async (data) => apiRequest('/api/admin/research/jobs', { method: 'POST', body: JSON.stringify(data) }),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/admin/research/jobs'] }),
});
```

---

## 9. Testing Strategy

### Unit Tests

```typescript
// __tests__/researchOrchestrator.test.ts
describe('ResearchOrchestrator', () => {
  describe('createJob', () => {
    it('should create a job with pending status', async () => {});
    it('should enforce concurrent job limit per user', async () => {});
    it('should validate job type', async () => {});
  });

  describe('runValidationAgent', () => {
    it('should detect dead links', async () => {});
    it('should detect redirects', async () => {});
    it('should respect timeout config', async () => {});
  });

  describe('applyFinding', () => {
    it('should update resource for enrichment finding', async () => {});
    it('should create resource for new_resource finding', async () => {});
    it('should archive resource for dead_link finding', async () => {});
  });
});
```

### Integration Tests

```typescript
// __tests__/integration/research-api.test.ts
describe('Research API', () => {
  it('POST /api/admin/research/jobs creates job', async () => {});
  it('GET /api/admin/research/jobs/:id returns job with findings', async () => {});
  it('POST /api/admin/research/findings/:id/apply updates resource', async () => {});
  it('requires admin authentication', async () => {});
});
```

### E2E Tests

```typescript
// e2e/research-workflow.spec.ts
describe('Research Workflow', () => {
  it('admin can create validation job and apply findings', async () => {
    // 1. Login as admin
    // 2. Navigate to research dashboard
    // 3. Create validation job
    // 4. Wait for completion
    // 5. Apply a finding
    // 6. Verify resource updated
  });
});
```

### Mock Strategies

```typescript
// Mock ClaudeService for deterministic tests
jest.mock('../ai/claudeService', () => ({
  ClaudeService: {
    getInstance: () => ({
      generateResponse: jest.fn().mockResolvedValue(JSON.stringify({
        suggestedDescription: 'Mocked description',
        confidence: 0.9,
      })),
      isAvailable: () => true,
    }),
  },
}));

// Mock LinkChecker for validation tests
jest.mock('../ai/linkChecker', () => ({
  LinkChecker: jest.fn().mockImplementation(() => ({
    check: jest.fn().mockResolvedValue({ isValid: true }),
  })),
}));
```

---

## 10. Security Considerations

### Admin-Only Access

All research endpoints require both authentication and admin role:

```typescript
app.use('/api/admin/research', isAuthenticated, isAdmin);
```

### Rate Limiting

Enforce maximum concurrent jobs per user to prevent resource exhaustion:

```typescript
const MAX_CONCURRENT_JOBS_PER_USER = 3;

async createJob(params) {
  const activeJobs = await this.getActiveJobCountForUser(params.startedBy);
  if (activeJobs >= MAX_CONCURRENT_JOBS_PER_USER) {
    throw new Error('Maximum concurrent jobs reached');
  }
}
```

### SSRF Protection

Discovery agent must validate suggested URLs:

```typescript
const ALLOWED_DOMAINS = [
  'github.com', 'youtube.com', 'npmjs.com', // ... etc
];

function isUrlAllowed(url: string): boolean {
  const hostname = new URL(url).hostname.toLowerCase();
  return ALLOWED_DOMAINS.some(d =>
    hostname === d || hostname.endsWith(`.${d}`)
  );
}
```

### Input Sanitization

All AI-generated content must be sanitized before storage:

```typescript
function sanitizeAIOutput(output: any): any {
  return {
    title: (output.title || '').substring(0, 200),
    description: (output.description || '').substring(0, 2000),
    tags: (output.tags || []).slice(0, 20).map(t => String(t).substring(0, 50)),
  };
}
```

### Audit Logging

All finding applications are logged:

```typescript
await storage.logResourceAudit(
  resourceId,
  'research_finding_applied',
  userId,
  { findingId, findingType, changes },
  `Applied ${findingType} finding from research job ${jobId}`
);
```

### Data Validation

All API inputs validated with Zod schemas:

```typescript
const createJobSchema = z.object({
  awesomeListId: z.number().int().positive(),
  jobType: z.enum(['validation', 'enrichment', 'discovery', 'category_analysis', 'trend']),
  config: z.record(z.any()).optional(),
});

app.post('/api/admin/research/jobs', async (req, res) => {
  const parsed = createJobSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, errors: parsed.error.issues });
  }
  // ...
});
```

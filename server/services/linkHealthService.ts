import type { LinkHealthJob, LinkHealthCheck } from "@shared/schema";
import { storage } from "../storage";
import { checkResourceLinks, type LinkCheckResult } from "../validation/linkChecker";

let jobIdCounter = 0;
const jobs: LinkHealthJob[] = [];
const checks: LinkHealthCheck[] = [];
let checkIdCounter = 0;

function mapResultToStatus(result: LinkCheckResult): LinkHealthCheck['status'] {
  if (result.valid) return 'healthy';
  if (result.statusText === 'Timeout') return 'timeout';
  if (result.statusText === 'DNS Not Found') return 'dns_failure';
  if (result.redirectUrl) return 'redirect';
  return 'broken';
}

export const linkHealthService = {
  getLatestJob(): LinkHealthJob | null {
    return jobs.length > 0 ? jobs[jobs.length - 1] : null;
  },

  getJobHistory(): LinkHealthJob[] {
    return [...jobs].reverse();
  },

  getBrokenLinks(filter?: string): (LinkHealthCheck & { resource?: { id: number; title: string; category: string } })[] {
    let filtered = checks.filter(c => c.status !== 'healthy');
    if (filter && filter !== 'all') {
      filtered = filtered.filter(c => c.status === filter);
    }
    return filtered;
  },

  async startCheck(): Promise<LinkHealthJob> {
    const activeJob = jobs.find(j => j.status === 'processing');
    if (activeJob) {
      throw new Error('A link health check is already running');
    }

    const job: LinkHealthJob = {
      id: ++jobIdCounter,
      status: 'processing',
      totalLinks: 0,
      checkedLinks: 0,
      healthyLinks: 0,
      brokenLinks: 0,
      redirectLinks: 0,
      timeoutLinks: 0,
      startedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    jobs.push(job);

    this.runCheckInBackground(job).catch(err => {
      console.error('[LinkHealth] Background check failed:', err);
      job.status = 'failed';
      job.errorMessage = err.message;
      job.completedAt = new Date().toISOString();
    });

    return job;
  },

  async runCheckInBackground(job: LinkHealthJob): Promise<void> {
    try {
      const resources = await storage.getAllApprovedResources();
      const resourcesToCheck = resources.map(r => ({
        id: r.id,
        title: r.title,
        url: r.url
      }));

      job.totalLinks = resourcesToCheck.length;

      const report = await checkResourceLinks(resourcesToCheck, {
        timeout: 15000,
        concurrent: 10,
        retryCount: 1
      });

      checks.length = 0;
      checkIdCounter = 0;

      for (const result of report.results) {
        const status = mapResultToStatus(result);
        const check: LinkHealthCheck = {
          id: ++checkIdCounter,
          resourceId: result.resourceId || 0,
          url: result.url,
          status,
          httpStatus: result.status,
          responseTime: result.responseTime,
          redirectUrl: result.redirectUrl,
          errorMessage: result.error,
          consecutiveFailures: status === 'healthy' ? 0 : 1,
          flaggedForReview: status === 'broken' || status === 'dns_failure',
          lastCheckedAt: new Date().toISOString(),
        };
        checks.push(check);
      }

      job.checkedLinks = report.totalLinks;
      job.healthyLinks = report.validLinks;
      job.brokenLinks = report.brokenLinks;
      job.redirectLinks = report.redirects;
      job.timeoutLinks = report.results.filter(r => r.statusText === 'Timeout').length;
      job.status = 'completed';
      job.completedAt = new Date().toISOString();

      console.log(`[LinkHealth] Check completed: ${job.healthyLinks} healthy, ${job.brokenLinks} broken, ${job.redirectLinks} redirects, ${job.timeoutLinks} timeouts out of ${job.totalLinks} total`);
    } catch (err: any) {
      job.status = 'failed';
      job.errorMessage = err.message;
      job.completedAt = new Date().toISOString();
      throw err;
    }
  },

  cancelJob(jobId: number): void {
    const job = jobs.find(j => j.id === jobId);
    if (job && job.status === 'processing') {
      job.status = 'cancelled';
      job.completedAt = new Date().toISOString();
    }
  }
};

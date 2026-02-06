import { storage } from '../storage';
import { LinkChecker, type LinkCheckResult } from '../validation/linkChecker';
import type { LinkHealthJob, Resource } from '@shared/schema';
import { notificationService } from './notificationService';

type LinkHealthStatus = 'healthy' | 'redirect' | 'broken' | 'timeout' | 'dns_failure';

interface JobStatus {
  id: number;
  status: string;
  totalLinks: number;
  checkedLinks: number;
  healthyLinks: number;
  brokenLinks: number;
  redirectLinks: number;
  timeoutLinks: number;
  dnsFailureLinks: number;
  progress: number;
  errorMessage?: string;
  startedAt?: Date;
  completedAt?: Date;
  estimatedTimeRemaining?: string;
}

export class LinkHealthMonitor {
  private static instance: LinkHealthMonitor;
  private processingJobs: Set<number> = new Set();
  private linkChecker: LinkChecker;

  private constructor() {
    this.linkChecker = new LinkChecker({
      timeout: 10000,
      followRedirects: true,
      concurrent: 5,
      retryCount: 1
    });
  }

  public static getInstance(): LinkHealthMonitor {
    if (!LinkHealthMonitor.instance) {
      LinkHealthMonitor.instance = new LinkHealthMonitor();
    }
    return LinkHealthMonitor.instance;
  }

  async runHealthCheck(startedBy?: string): Promise<number> {
    const { resources } = await storage.listResources({
      status: 'approved',
      limit: 10000
    });

    const job = await storage.createLinkHealthJob({
      startedBy: startedBy || undefined
    });

    await storage.updateLinkHealthJob(job.id, {
      totalLinks: resources.length,
      status: 'pending'
    });

    this.startProcessing(job.id, resources).catch(error => {
      storage.updateLinkHealthJob(job.id, {
        status: 'failed',
        errorMessage: error.message,
        completedAt: new Date()
      });
    });

    return job.id;
  }

  private async startProcessing(jobId: number, resources: Resource[]): Promise<void> {
    if (this.processingJobs.has(jobId)) {
      return;
    }

    this.processingJobs.add(jobId);

    try {
      const job = await storage.getLinkHealthJob(jobId);
      if (!job) {
        throw new Error(`Job ${jobId} not found`);
      }

      await storage.updateLinkHealthJob(jobId, {
        status: 'processing',
        startedAt: new Date()
      });

      await this.checkAllLinks(jobId, resources);

      const updatedJob = await storage.getLinkHealthJob(jobId);
      if (updatedJob && updatedJob.status !== 'cancelled') {
        await storage.updateLinkHealthJob(jobId, {
          status: 'completed',
          completedAt: new Date()
        });

        // Send notification if broken link threshold exceeded
        try {
          await notificationService.sendBrokenLinksAlert(jobId);
        } catch (notificationError: any) {
          console.error('[LinkHealthMonitor] Failed to send notification:', notificationError);
          // Don't throw - notification failure shouldn't affect job completion
        }
      }
    } catch (error: any) {
      await storage.updateLinkHealthJob(jobId, {
        status: 'failed',
        errorMessage: error.message,
        completedAt: new Date()
      });
    } finally {
      this.processingJobs.delete(jobId);
    }
  }

  private async checkAllLinks(jobId: number, resources: Resource[]): Promise<void> {
    const links = resources.map(r => ({
      url: r.url,
      title: r.title,
      id: r.id
    }));

    const report = await this.linkChecker.checkLinks(links);

    let checkedCount = 0;
    let healthyCount = 0;
    let brokenCount = 0;
    let redirectCount = 0;
    let timeoutCount = 0;
    let dnsFailureCount = 0;

    for (const result of report.results) {
      const status = this.categorizeStatus(result);
      const resource = resources.find(r => r.id === result.resourceId);

      if (!resource) continue;

      const shouldFlag = await this.shouldFlagForReview(resource.id, status);

      await storage.createLinkHealthCheck({
        jobId,
        resourceId: resource.id,
        url: result.url,
        status,
        httpStatus: result.status,
        responseTime: result.responseTime,
        redirectUrl: result.redirectUrl || null,
        errorMessage: result.error || null,
        flaggedForReview: shouldFlag,
        checkedAt: new Date()
      });

      checkedCount++;
      if (status === 'healthy') healthyCount++;
      else if (status === 'redirect') redirectCount++;
      else if (status === 'broken') brokenCount++;
      else if (status === 'timeout') timeoutCount++;
      else if (status === 'dns_failure') dnsFailureCount++;

      await storage.updateLinkHealthJob(jobId, {
        checkedLinks: checkedCount,
        healthyLinks: healthyCount,
        brokenLinks: brokenCount,
        redirectLinks: redirectCount,
        timeoutLinks: timeoutCount,
        dnsFailureLinks: dnsFailureCount
      });
    }
  }

  private categorizeStatus(result: LinkCheckResult): LinkHealthStatus {
    if (result.error) {
      if (result.statusText === 'Timeout') {
        return 'timeout';
      } else if (result.statusText === 'DNS Not Found') {
        return 'dns_failure';
      } else if (result.status === 0) {
        return 'dns_failure';
      }
    }

    if (result.status >= 400) {
      return 'broken';
    }

    if (result.status >= 300 && result.status < 400) {
      return 'redirect';
    }

    if (result.valid && result.status >= 200 && result.status < 300) {
      return 'healthy';
    }

    return 'broken';
  }

  private async shouldFlagForReview(resourceId: number, currentStatus: LinkHealthStatus): Promise<boolean> {
    if (currentStatus === 'healthy' || currentStatus === 'redirect') {
      return false;
    }

    const history = await storage.getLinkHealthHistory(resourceId, 2);

    if (history.length < 1) {
      return false;
    }

    const previousCheck = history[0];
    const isPreviousFailed =
      previousCheck.status === 'broken' ||
      previousCheck.status === 'timeout' ||
      previousCheck.status === 'dns_failure';

    return isPreviousFailed;
  }

  async getJobStatus(jobId: number): Promise<JobStatus> {
    const job = await storage.getLinkHealthJob(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    const totalLinks = job.totalLinks || 0;
    const checkedLinks = job.checkedLinks || 0;

    const progress = totalLinks > 0
      ? Math.round((checkedLinks / totalLinks) * 100)
      : 0;

    let estimatedTimeRemaining: string | undefined;
    if (job.status === 'processing' && job.startedAt && checkedLinks > 0) {
      const elapsedMs = Date.now() - new Date(job.startedAt).getTime();
      const avgTimePerLink = elapsedMs / checkedLinks;
      const remainingLinks = totalLinks - checkedLinks;
      const estimatedRemainingMs = avgTimePerLink * remainingLinks;

      const minutes = Math.floor(estimatedRemainingMs / 60000);
      const seconds = Math.floor((estimatedRemainingMs % 60000) / 1000);
      estimatedTimeRemaining = `${minutes}m ${seconds}s`;
    }

    return {
      id: job.id,
      status: job.status || 'unknown',
      totalLinks: job.totalLinks || 0,
      checkedLinks: job.checkedLinks || 0,
      healthyLinks: job.healthyLinks || 0,
      brokenLinks: job.brokenLinks || 0,
      redirectLinks: job.redirectLinks || 0,
      timeoutLinks: job.timeoutLinks || 0,
      dnsFailureLinks: job.dnsFailureLinks || 0,
      progress,
      errorMessage: job.errorMessage || undefined,
      startedAt: job.startedAt || undefined,
      completedAt: job.completedAt || undefined,
      estimatedTimeRemaining
    };
  }

  async getLatestJob(): Promise<LinkHealthJob | undefined> {
    const jobs = await storage.listLinkHealthJobs(1);
    return jobs[0];
  }
}

export const linkHealthMonitor = LinkHealthMonitor.getInstance();

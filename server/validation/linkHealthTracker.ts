/**
 * Link Health Tracker for User-Facing Status Indicators
 *
 * Provides background link checking with health status mapping for resources.
 * Maps HTTP status codes to user-friendly health levels (verified, warning, broken, unknown).
 */

import { LinkChecker, type LinkCheckResult, type LinkCheckOptions } from './linkChecker';

export type LinkHealthStatus = 'verified' | 'warning' | 'broken' | 'unknown';

export interface ResourceLinkHealth {
  resourceId: number;
  url: string;
  healthStatus: LinkHealthStatus;
  lastCheck: Date;
  responseTime: number;
  statusCode: number;
  error?: string;
}

export interface LinkHealthCheckResult {
  resourceId: number;
  healthStatus: LinkHealthStatus;
  lastCheck: Date;
  responseTime: number;
  statusCode: number;
  error?: string;
}

export interface LinkHealthTrackerOptions extends LinkCheckOptions {
  // Inherit all LinkChecker options
}

export class LinkHealthTracker {
  private linkChecker: LinkChecker;

  constructor(options: LinkHealthTrackerOptions = {}) {
    this.linkChecker = new LinkChecker(options);
  }

  /**
   * Map HTTP status code and check result to health status
   *
   * Health Status Mapping:
   * - verified: 200-299 (successful response)
   * - warning: 300-399 (redirect) or slow response
   * - broken: 400+ (client/server error) or connection failure
   * - unknown: no check performed or non-HTTP URL
   */
  private mapToHealthStatus(result: LinkCheckResult): LinkHealthStatus {
    // Handle errors and connection failures
    if (result.error || result.status === 0) {
      return 'broken';
    }

    // Map by status code range
    if (result.status >= 200 && result.status < 300) {
      return 'verified';
    }

    if (result.status >= 300 && result.status < 400) {
      return 'warning';
    }

    if (result.status >= 400) {
      return 'broken';
    }

    // Unknown status
    return 'unknown';
  }

  /**
   * Check health of a single resource
   */
  async checkResourceHealth(resource: {
    id: number;
    url: string;
    title?: string;
  }): Promise<LinkHealthCheckResult> {
    const checkResult = await this.linkChecker.checkLinks([{
      url: resource.url,
      title: resource.title,
      id: resource.id
    }]);

    const result = checkResult.results[0];
    const healthStatus = this.mapToHealthStatus(result);

    return {
      resourceId: resource.id,
      healthStatus,
      lastCheck: new Date(),
      responseTime: result.responseTime,
      statusCode: result.status,
      error: result.error
    };
  }

  /**
   * Check health of multiple resources
   */
  async checkMultipleResourcesHealth(resources: Array<{
    id: number;
    url: string;
    title?: string;
  }>): Promise<LinkHealthCheckResult[]> {
    const links = resources.map(r => ({
      url: r.url,
      title: r.title,
      id: r.id
    }));

    const checkReport = await this.linkChecker.checkLinks(links);

    return checkReport.results.map(result => {
      const healthStatus = this.mapToHealthStatus(result);

      return {
        resourceId: result.resourceId!,
        healthStatus,
        lastCheck: new Date(),
        responseTime: result.responseTime,
        statusCode: result.status,
        error: result.error
      };
    });
  }

  /**
   * Check all resources and return health data suitable for database updates
   */
  async checkAllResources(resources: Array<{
    id: number;
    url: string;
    title: string;
  }>): Promise<{
    results: LinkHealthCheckResult[];
    summary: {
      total: number;
      verified: number;
      warning: number;
      broken: number;
      unknown: number;
    };
  }> {
    const results = await this.checkMultipleResourcesHealth(resources);

    const summary = {
      total: results.length,
      verified: results.filter(r => r.healthStatus === 'verified').length,
      warning: results.filter(r => r.healthStatus === 'warning').length,
      broken: results.filter(r => r.healthStatus === 'broken').length,
      unknown: results.filter(r => r.healthStatus === 'unknown').length
    };

    return { results, summary };
  }

  /**
   * Get resources that need health check (never checked or stale)
   *
   * Note: This is a utility method - actual filtering should be done at database level
   * to avoid loading all resources into memory.
   */
  static filterResourcesNeedingCheck(
    resources: Array<{
      id: number;
      url: string;
      title: string;
      lastLinkCheck?: Date | null;
    }>,
    staleThresholdHours: number = 168 // 7 days default
  ): Array<{ id: number; url: string; title: string }> {
    const now = Date.now();
    const staleThreshold = staleThresholdHours * 60 * 60 * 1000;

    return resources
      .filter(r => {
        // Include if never checked
        if (!r.lastLinkCheck) {
          return true;
        }

        // Include if stale
        const lastCheckTime = new Date(r.lastLinkCheck).getTime();
        return (now - lastCheckTime) > staleThreshold;
      })
      .map(r => ({
        id: r.id,
        url: r.url,
        title: r.title
      }));
  }
}

/**
 * Create a link health tracker instance with default options
 */
export function createLinkHealthTracker(options?: LinkHealthTrackerOptions): LinkHealthTracker {
  return new LinkHealthTracker(options);
}

/**
 * Check a single resource and return health data
 */
export async function checkResourceLinkHealth(
  resource: { id: number; url: string; title?: string },
  options?: LinkHealthTrackerOptions
): Promise<LinkHealthCheckResult> {
  const tracker = new LinkHealthTracker(options);
  return tracker.checkResourceHealth(resource);
}

/**
 * Check multiple resources and return health data
 */
export async function checkMultipleResourcesLinkHealth(
  resources: Array<{ id: number; url: string; title?: string }>,
  options?: LinkHealthTrackerOptions
): Promise<LinkHealthCheckResult[]> {
  const tracker = new LinkHealthTracker(options);
  return tracker.checkMultipleResourcesHealth(resources);
}

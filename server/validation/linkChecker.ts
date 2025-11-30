/**
 * Link Checker for Awesome Lists
 * Validates all URLs in resources similar to awesome_bot
 */

import fetch from 'node-fetch';

export interface LinkCheckResult {
  url: string;
  status: number;
  statusText: string;
  valid: boolean;
  redirectUrl?: string;
  responseTime: number;
  error?: string;
  resourceTitle?: string;
  resourceId?: string;
}

export interface LinkCheckReport {
  totalLinks: number;
  validLinks: number;
  brokenLinks: number;
  redirects: number;
  errors: number;
  results: LinkCheckResult[];
  summary: {
    byStatus: { [status: string]: number };
    averageResponseTime: number;
  };
  timestamp: string;
}

export interface LinkCheckOptions {
  timeout?: number; // Default 10 seconds
  followRedirects?: boolean; // Default true
  userAgent?: string;
  concurrent?: number; // Number of concurrent checks, default 5
  retryCount?: number; // Number of retries for failed checks, default 1
}

export class LinkChecker {
  private options: Required<LinkCheckOptions>;

  constructor(options: LinkCheckOptions = {}) {
    this.options = {
      timeout: options.timeout || 10000,
      followRedirects: options.followRedirects !== false,
      userAgent: options.userAgent || 'Mozilla/5.0 (compatible; AwesomeListBot/1.0)',
      concurrent: options.concurrent || 5,
      retryCount: options.retryCount || 1
    };
  }

  /**
   * Check all links in the provided resources
   */
  async checkLinks(links: Array<{ url: string; title?: string; id?: string }>): Promise<LinkCheckReport> {
    const startTime = Date.now();
    const results: LinkCheckResult[] = [];
    
    // Process links in batches for concurrent checking
    const batches = this.createBatches(links, this.options.concurrent);
    
    for (const batch of batches) {
      const batchResults = await Promise.all(
        batch.map(link => this.checkSingleLink(link))
      );
      results.push(...batchResults);
    }

    // Calculate statistics
    const validLinks = results.filter(r => r.valid).length;
    const brokenLinks = results.filter(r => !r.valid && r.status >= 400).length;
    const redirects = results.filter(r => r.status >= 300 && r.status < 400).length;
    const errors = results.filter(r => r.error).length;
    
    const byStatus: { [status: string]: number } = {};
    results.forEach(r => {
      const statusGroup = r.status ? `${Math.floor(r.status / 100)}xx` : 'error';
      byStatus[statusGroup] = (byStatus[statusGroup] || 0) + 1;
    });

    const totalResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0);
    const averageResponseTime = results.length > 0 ? totalResponseTime / results.length : 0;

    return {
      totalLinks: links.length,
      validLinks,
      brokenLinks,
      redirects,
      errors,
      results,
      summary: {
        byStatus,
        averageResponseTime
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Check a single link
   */
  private async checkSingleLink(link: { url: string; title?: string; id?: string }): Promise<LinkCheckResult> {
    let attempts = 0;
    let lastError: Error | undefined;
    let result: LinkCheckResult | undefined;

    while (attempts <= this.options.retryCount) {
      try {
        result = await this.performCheck(link);
        if (result.valid || result.status < 500) {
          // Don't retry client errors (4xx) or successful responses
          break;
        }
      } catch (error) {
        lastError = error as Error;
      }
      attempts++;
      
      // Wait before retry (exponential backoff)
      if (attempts <= this.options.retryCount) {
        await this.sleep(Math.pow(2, attempts) * 1000);
      }
    }

    if (!result) {
      return {
        url: link.url,
        status: 0,
        statusText: 'Connection Failed',
        valid: false,
        responseTime: 0,
        error: lastError?.message || 'Unknown error',
        resourceTitle: link.title,
        resourceId: link.id
      };
    }

    return result;
  }

  /**
   * Perform the actual HTTP check
   */
  private async performCheck(link: { url: string; title?: string; id?: string }): Promise<LinkCheckResult> {
    const startTime = Date.now();
    
    try {
      // Skip non-HTTP URLs
      if (!link.url.startsWith('http://') && !link.url.startsWith('https://')) {
        return {
          url: link.url,
          status: 0,
          statusText: 'Non-HTTP URL',
          valid: true, // Consider non-HTTP URLs as valid (e.g., mailto:, ftp:)
          responseTime: 0,
          resourceTitle: link.title,
          resourceId: link.id
        };
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.options.timeout);

      try {
        const response = await fetch(link.url, {
          method: 'HEAD', // Use HEAD to avoid downloading content
          signal: controller.signal,
          headers: {
            'User-Agent': this.options.userAgent,
            'Accept': '*/*'
          },
          redirect: this.options.followRedirects ? 'follow' : 'manual'
        });

        clearTimeout(timeout);
        const responseTime = Date.now() - startTime;

        // Check for redirects
        let redirectUrl: string | undefined;
        if (response.status >= 300 && response.status < 400) {
          redirectUrl = response.headers.get('location') || undefined;
        }

        const valid = response.status >= 200 && response.status < 400;

        return {
          url: link.url,
          status: response.status,
          statusText: response.statusText,
          valid,
          redirectUrl,
          responseTime,
          resourceTitle: link.title,
          resourceId: link.id
        };
      } catch (fetchError: any) {
        clearTimeout(timeout);
        
        // If HEAD fails, try GET (some servers don't support HEAD)
        if (fetchError.name !== 'AbortError') {
          const getResponse = await this.tryGetRequest(link.url, controller.signal);
          if (getResponse) {
            const responseTime = Date.now() - startTime;
            return {
              ...getResponse,
              responseTime,
              resourceTitle: link.title,
              resourceId: link.id
            };
          }
        }
        
        throw fetchError;
      }
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      // Handle specific error types
      let statusText = 'Connection Error';
      if (error.name === 'AbortError') {
        statusText = 'Timeout';
      } else if (error.code === 'ENOTFOUND') {
        statusText = 'DNS Not Found';
      } else if (error.code === 'ECONNREFUSED') {
        statusText = 'Connection Refused';
      } else if (error.code === 'CERT_HAS_EXPIRED') {
        statusText = 'SSL Certificate Expired';
      }

      return {
        url: link.url,
        status: 0,
        statusText,
        valid: false,
        responseTime,
        error: error.message,
        resourceTitle: link.title,
        resourceId: link.id
      };
    }
  }

  /**
   * Try a GET request if HEAD fails
   */
  private async tryGetRequest(url: string, signal: AbortSignal): Promise<Omit<LinkCheckResult, 'responseTime' | 'resourceTitle' | 'resourceId'> | null> {
    try {
      const response = await fetch(url, {
        method: 'GET',
        signal,
        headers: {
          'User-Agent': this.options.userAgent,
          'Accept': '*/*'
        },
        redirect: this.options.followRedirects ? 'follow' : 'manual'
      });

      const valid = response.status >= 200 && response.status < 400;
      let redirectUrl: string | undefined;
      
      if (response.status >= 300 && response.status < 400) {
        redirectUrl = response.headers.get('location') || undefined;
      }

      return {
        url,
        status: response.status,
        statusText: response.statusText,
        valid,
        redirectUrl
      };
    } catch {
      return null;
    }
  }

  /**
   * Create batches for concurrent processing
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Sleep for the specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Format link check report as markdown
 */
export function formatLinkCheckReport(report: LinkCheckReport): string {
  const lines: string[] = [];
  
  lines.push('# Link Check Report');
  lines.push('');
  lines.push(`Generated: ${new Date(report.timestamp).toLocaleString()}`);
  lines.push('');
  
  lines.push('## Summary');
  lines.push(`- Total Links: ${report.totalLinks}`);
  lines.push(`- ✅ Valid Links: ${report.validLinks} (${((report.validLinks / report.totalLinks) * 100).toFixed(1)}%)`);
  lines.push(`- ❌ Broken Links: ${report.brokenLinks} (${((report.brokenLinks / report.totalLinks) * 100).toFixed(1)}%)`);
  lines.push(`- 🔀 Redirects: ${report.redirects}`);
  lines.push(`- ⚠️ Errors: ${report.errors}`);
  lines.push(`- Average Response Time: ${report.summary.averageResponseTime.toFixed(0)}ms`);
  lines.push('');
  
  lines.push('## Status Distribution');
  for (const [status, count] of Object.entries(report.summary.byStatus)) {
    lines.push(`- ${status}: ${count} links`);
  }
  lines.push('');
  
  // Show broken links
  const brokenLinks = report.results.filter(r => !r.valid && r.status >= 400);
  if (brokenLinks.length > 0) {
    lines.push('## Broken Links');
    lines.push('');
    lines.push('| Resource | URL | Status | Error |');
    lines.push('|----------|-----|--------|-------|');
    for (const link of brokenLinks) {
      const resource = link.resourceTitle || 'Unknown';
      const status = `${link.status} ${link.statusText}`;
      const error = link.error || '-';
      lines.push(`| ${resource} | ${link.url} | ${status} | ${error} |`);
    }
    lines.push('');
  }
  
  // Show redirects
  const redirectedLinks = report.results.filter(r => r.redirectUrl);
  if (redirectedLinks.length > 0) {
    lines.push('## Redirected Links');
    lines.push('');
    lines.push('| Resource | Original URL | Redirect To |');
    lines.push('|----------|--------------|-------------|');
    for (const link of redirectedLinks) {
      const resource = link.resourceTitle || 'Unknown';
      lines.push(`| ${resource} | ${link.url} | ${link.redirectUrl || 'N/A'} |`);
    }
    lines.push('');
  }
  
  // Show slow links
  const slowLinks = report.results
    .filter(r => r.responseTime > 5000)
    .sort((a, b) => b.responseTime - a.responseTime)
    .slice(0, 10);
    
  if (slowLinks.length > 0) {
    lines.push('## Slowest Links (>5s)');
    lines.push('');
    lines.push('| Resource | URL | Response Time |');
    lines.push('|----------|-----|---------------|');
    for (const link of slowLinks) {
      const resource = link.resourceTitle || 'Unknown';
      lines.push(`| ${resource} | ${link.url} | ${(link.responseTime / 1000).toFixed(1)}s |`);
    }
  }
  
  return lines.join('\n');
}

/**
 * Check links from resource objects
 */
export async function checkResourceLinks(
  resources: Array<{ id: string; title: string; url: string }>,
  options?: LinkCheckOptions
): Promise<LinkCheckReport> {
  const checker = new LinkChecker(options);
  const links = resources.map(r => ({
    url: r.url,
    title: r.title,
    id: r.id
  }));
  
  return checker.checkLinks(links);
}
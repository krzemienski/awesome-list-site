/**
 * Validation type interfaces shared across admin components
 */

export interface ValidationResult {
  valid: boolean;
  errors: Array<{
    line: number;
    rule: string;
    message: string;
    severity: 'error' | 'warning';
  }>;
  warnings: Array<{
    line: number;
    rule: string;
    message: string;
    severity: 'error' | 'warning';
  }>;
  stats: {
    totalLines: number;
    totalResources: number;
    totalCategories: number;
  };
  report?: string;
}

export interface LinkCheckResult {
  totalLinks: number;
  validLinks: number;
  brokenLinks: number;
  redirects: number;
  errors: number;
  summary: {
    byStatus: { [key: string]: number };
    averageResponseTime: number;
  };
  report?: string;
  brokenResources?: Array<{
    url: string;
    status: number;
    statusText: string;
    resourceTitle?: string;
    error?: string;
  }>;
}

export interface ValidationStatus {
  awesomeLint?: ValidationResult;
  linkCheck?: LinkCheckResult;
  lastUpdated?: string;
}

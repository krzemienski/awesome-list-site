/**
 * Performance Monitoring Utilities
 *
 * Simple performance monitoring for tracking slow operations
 * and gathering performance metrics across the application.
 */

export interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 1000; // Keep last 1000 metrics in memory

  /**
   * Start timing an operation
   */
  startTimer(operation: string): (metadata?: Record<string, any>) => void {
    const start = performance.now();
    const timestamp = new Date();

    return (metadata?: Record<string, any>) => {
      const duration = performance.now() - start;
      this.recordMetric({
        operation,
        duration,
        timestamp,
        metadata
      });

      // Log slow operations (>1000ms)
      if (duration > 1000) {
        console.warn(`[Performance] Slow operation detected: ${operation} took ${duration.toFixed(2)}ms`, metadata);
      } else if (duration > 500) {
        console.log(`[Performance] ${operation} took ${duration.toFixed(2)}ms`, metadata);
      }
    };
  }

  /**
   * Record a metric manually
   */
  recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);

    // Keep only the last N metrics to prevent memory bloat
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }
  }

  /**
   * Get metrics for a specific operation
   */
  getMetrics(operation?: string): PerformanceMetric[] {
    if (operation) {
      return this.metrics.filter(m => m.operation === operation);
    }
    return [...this.metrics];
  }

  /**
   * Get average duration for an operation
   */
  getAverageDuration(operation: string): number {
    const metrics = this.getMetrics(operation);
    if (metrics.length === 0) return 0;

    const total = metrics.reduce((sum, m) => sum + m.duration, 0);
    return total / metrics.length;
  }

  /**
   * Get percentile duration for an operation
   */
  getPercentile(operation: string, percentile: number): number {
    const metrics = this.getMetrics(operation);
    if (metrics.length === 0) return 0;

    const sorted = metrics.map(m => m.duration).sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }

  /**
   * Get performance summary for all operations
   */
  getSummary(): Record<string, {
    count: number;
    avg: number;
    min: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
  }> {
    const operations = new Set(this.metrics.map(m => m.operation));
    const summary: Record<string, any> = {};

    for (const operation of Array.from(operations)) {
      const metrics = this.getMetrics(operation);
      const durations = metrics.map(m => m.duration).sort((a, b) => a - b);

      summary[operation] = {
        count: metrics.length,
        avg: durations.reduce((sum, d) => sum + d, 0) / durations.length,
        min: durations[0],
        max: durations[durations.length - 1],
        p50: durations[Math.floor(durations.length * 0.5)],
        p95: durations[Math.floor(durations.length * 0.95)],
        p99: durations[Math.floor(durations.length * 0.99)]
      };
    }

    return summary;
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
  }

  /**
   * Export metrics to JSON
   */
  export(): string {
    return JSON.stringify({
      summary: this.getSummary(),
      metrics: this.metrics
    }, null, 2);
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Decorator for timing async functions
 */
export function timed(operation: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const endTimer = performanceMonitor.startTimer(operation);
      try {
        const result = await originalMethod.apply(this, args);
        endTimer({ success: true });
        return result;
      } catch (error) {
        endTimer({ success: false, error: error instanceof Error ? error.message : String(error) });
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Express middleware for request timing
 */
export function requestTimingMiddleware(req: any, res: any, next: any) {
  const endTimer = performanceMonitor.startTimer(`HTTP ${req.method} ${req.path}`);

  // Capture response finish event
  res.on('finish', () => {
    endTimer({
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      contentLength: res.get('content-length')
    });
  });

  next();
}

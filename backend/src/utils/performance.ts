/**
 * Performance testing utilities for validating caching improvements
 */

export interface PerformanceMetrics {
  operation: string;
  duration: number;
  cacheHit: boolean;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private maxMetrics: number = 1000;

  /**
   * Measure the performance of an async operation
   */
  async measure<T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<{ result: T; metrics: PerformanceMetrics }> {
    const startTime = Date.now();
    
    try {
      const result = await fn();
      const duration = Date.now() - startTime;
      
      const metrics: PerformanceMetrics = {
        operation,
        duration,
        cacheHit: false, // Will be updated by cache-aware operations
        timestamp: new Date(),
        metadata,
      };

      this.addMetrics(metrics);
      
      return { result, metrics };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      const metrics: PerformanceMetrics = {
        operation: `${operation}_ERROR`,
        duration,
        cacheHit: false,
        timestamp: new Date(),
        metadata: { ...metadata, error: error instanceof Error ? error.message : 'Unknown error' },
      };

      this.addMetrics(metrics);
      throw error;
    }
  }

  /**
   * Measure cache-aware operations
   */
  async measureCacheOperation<T>(
    operation: string,
    cacheKey: string,
    cacheGet: () => Promise<T | null>,
    fetchFn: () => Promise<T>,
    cacheSet: (value: T) => Promise<void>,
    metadata?: Record<string, any>
  ): Promise<{ result: T; metrics: PerformanceMetrics }> {
    const startTime = Date.now();
    
    try {
      // Try cache first
      const cachedResult = await cacheGet();
      
      if (cachedResult !== null) {
        const duration = Date.now() - startTime;
        const metrics: PerformanceMetrics = {
          operation: `${operation}_CACHE_HIT`,
          duration,
          cacheHit: true,
          timestamp: new Date(),
          metadata: { ...metadata, cacheKey },
        };

        this.addMetrics(metrics);
        return { result: cachedResult, metrics };
      }

      // Cache miss - fetch from source
      const result = await fetchFn();
      
      // Store in cache
      await cacheSet(result);
      
      const duration = Date.now() - startTime;
      const metrics: PerformanceMetrics = {
        operation: `${operation}_CACHE_MISS`,
        duration,
        cacheHit: false,
        timestamp: new Date(),
        metadata: { ...metadata, cacheKey },
      };

      this.addMetrics(metrics);
      return { result, metrics };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      const metrics: PerformanceMetrics = {
        operation: `${operation}_ERROR`,
        duration,
        cacheHit: false,
        timestamp: new Date(),
        metadata: { 
          ...metadata, 
          cacheKey,
          error: error instanceof Error ? error.message : 'Unknown error' 
        },
      };

      this.addMetrics(metrics);
      throw error;
    }
  }

  /**
   * Add metrics to the collection
   */
  private addMetrics(metrics: PerformanceMetrics): void {
    this.metrics.push(metrics);
    
    // Keep only the most recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  /**
   * Get performance statistics for an operation
   */
  getStats(operation?: string): {
    totalOperations: number;
    averageDuration: number;
    minDuration: number;
    maxDuration: number;
    cacheHitRate: number;
    recentOperations: PerformanceMetrics[];
  } {
    const filteredMetrics = operation 
      ? this.metrics.filter(m => m.operation.includes(operation))
      : this.metrics;

    if (filteredMetrics.length === 0) {
      return {
        totalOperations: 0,
        averageDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        cacheHitRate: 0,
        recentOperations: [],
      };
    }

    const durations = filteredMetrics.map(m => m.duration);
    const cacheHits = filteredMetrics.filter(m => m.cacheHit).length;

    return {
      totalOperations: filteredMetrics.length,
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      cacheHitRate: cacheHits / filteredMetrics.length,
      recentOperations: filteredMetrics.slice(-10),
    };
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }
}

// Singleton instance
let performanceMonitorInstance: PerformanceMonitor | null = null;

export const getPerformanceMonitor = (): PerformanceMonitor => {
  if (!performanceMonitorInstance) {
    performanceMonitorInstance = new PerformanceMonitor();
  }
  return performanceMonitorInstance;
};

/**
 * Decorator for measuring method performance
 */
export function measurePerformance(operation: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const monitor = getPerformanceMonitor();
      const { result } = await monitor.measure(
        `${target.constructor.name}.${propertyName}`,
        () => method.apply(this, args),
        { operation, args: args.length }
      );
      return result;
    };
  };
}
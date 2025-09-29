/**
 * Frontend performance monitoring utilities
 */

export interface PerformanceMetrics {
  name: string;
  duration: number;
  timestamp: number;
  type: 'navigation' | 'resource' | 'measure' | 'custom';
  metadata?: Record<string, any>;
}

export class FrontendPerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private observers: PerformanceObserver[] = [];

  constructor() {
    this.initializeObservers();
  }

  private initializeObservers() {
    // Observe navigation timing
    if ('PerformanceObserver' in window) {
      try {
        const navObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'navigation') {
              const navEntry = entry as PerformanceNavigationTiming;
              this.addMetric({
                name: 'page-load',
                duration: navEntry.loadEventEnd - navEntry.navigationStart,
                timestamp: navEntry.navigationStart,
                type: 'navigation',
                metadata: {
                  domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.navigationStart,
                  firstPaint: this.getFirstPaint(),
                  firstContentfulPaint: this.getFirstContentfulPaint(),
                },
              });
            }
          }
        });
        navObserver.observe({ entryTypes: ['navigation'] });
        this.observers.push(navObserver);

        // Observe resource timing
        const resourceObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'resource') {
              const resourceEntry = entry as PerformanceResourceTiming;
              this.addMetric({
                name: `resource-${resourceEntry.name.split('/').pop() || 'unknown'}`,
                duration: resourceEntry.responseEnd - resourceEntry.requestStart,
                timestamp: resourceEntry.startTime,
                type: 'resource',
                metadata: {
                  url: resourceEntry.name,
                  size: resourceEntry.transferSize,
                  type: resourceEntry.initiatorType,
                },
              });
            }
          }
        });
        resourceObserver.observe({ entryTypes: ['resource'] });
        this.observers.push(resourceObserver);

        // Observe user timing measures
        const measureObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'measure') {
              this.addMetric({
                name: entry.name,
                duration: entry.duration,
                timestamp: entry.startTime,
                type: 'measure',
              });
            }
          }
        });
        measureObserver.observe({ entryTypes: ['measure'] });
        this.observers.push(measureObserver);
      } catch (error) {
        console.warn('Performance Observer not fully supported:', error);
      }
    }
  }

  private getFirstPaint(): number | undefined {
    const paintEntries = performance.getEntriesByType('paint');
    const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
    return firstPaint?.startTime;
  }

  private getFirstContentfulPaint(): number | undefined {
    const paintEntries = performance.getEntriesByType('paint');
    const firstContentfulPaint = paintEntries.find(entry => entry.name === 'first-contentful-paint');
    return firstContentfulPaint?.startTime;
  }

  /**
   * Measure a custom operation
   */
  measure<T>(name: string, fn: () => T): T;
  measure<T>(name: string, fn: () => Promise<T>): Promise<T>;
  measure<T>(name: string, fn: () => T | Promise<T>): T | Promise<T> {
    const startTime = performance.now();
    const startMark = `${name}-start`;
    const endMark = `${name}-end`;
    const measureName = `${name}-measure`;

    performance.mark(startMark);

    const result = fn();

    if (result instanceof Promise) {
      return result.finally(() => {
        performance.mark(endMark);
        performance.measure(measureName, startMark, endMark);
      });
    } else {
      performance.mark(endMark);
      performance.measure(measureName, startMark, endMark);
      return result;
    }
  }

  /**
   * Add a custom metric
   */
  addMetric(metric: PerformanceMetrics): void {
    this.metrics.push(metric);
    
    // Keep only the last 100 metrics to prevent memory leaks
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }
  }

  /**
   * Get performance metrics
   */
  getMetrics(type?: PerformanceMetrics['type']): PerformanceMetrics[] {
    return type ? this.metrics.filter(m => m.type === type) : [...this.metrics];
  }

  /**
   * Get Core Web Vitals
   */
  getCoreWebVitals(): {
    lcp?: number; // Largest Contentful Paint
    fid?: number; // First Input Delay
    cls?: number; // Cumulative Layout Shift
    fcp?: number; // First Contentful Paint
    ttfb?: number; // Time to First Byte
  } {
    const vitals: any = {};

    // Get LCP
    const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
    if (lcpEntries.length > 0) {
      vitals.lcp = lcpEntries[lcpEntries.length - 1].startTime;
    }

    // Get FCP
    vitals.fcp = this.getFirstContentfulPaint();

    // Get TTFB
    const navEntries = performance.getEntriesByType('navigation');
    if (navEntries.length > 0) {
      const navEntry = navEntries[0] as PerformanceNavigationTiming;
      vitals.ttfb = navEntry.responseStart - navEntry.requestStart;
    }

    // FID and CLS require special handling and are typically measured by libraries like web-vitals
    return vitals;
  }

  /**
   * Get performance summary
   */
  getSummary(): {
    totalMetrics: number;
    averageResourceLoadTime: number;
    pageLoadTime?: number;
    coreWebVitals: ReturnType<typeof this.getCoreWebVitals>;
  } {
    const resourceMetrics = this.getMetrics('resource');
    const navigationMetrics = this.getMetrics('navigation');

    return {
      totalMetrics: this.metrics.length,
      averageResourceLoadTime: resourceMetrics.length > 0 
        ? resourceMetrics.reduce((sum, m) => sum + m.duration, 0) / resourceMetrics.length 
        : 0,
      pageLoadTime: navigationMetrics[0]?.duration,
      coreWebVitals: this.getCoreWebVitals(),
    };
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
  }

  /**
   * Disconnect all observers
   */
  disconnect(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Singleton instance
let performanceMonitorInstance: FrontendPerformanceMonitor | null = null;

export const getPerformanceMonitor = (): FrontendPerformanceMonitor => {
  if (!performanceMonitorInstance) {
    performanceMonitorInstance = new FrontendPerformanceMonitor();
  }
  return performanceMonitorInstance;
};

/**
 * React hook for performance monitoring
 */
export const usePerformanceMonitor = () => {
  const monitor = getPerformanceMonitor();

  const measureComponent = (name: string) => {
    return {
      start: () => performance.mark(`${name}-start`),
      end: () => {
        performance.mark(`${name}-end`);
        performance.measure(`${name}-render`, `${name}-start`, `${name}-end`);
      },
    };
  };

  return {
    monitor,
    measureComponent,
    measure: monitor.measure.bind(monitor),
    getMetrics: monitor.getMetrics.bind(monitor),
    getSummary: monitor.getSummary.bind(monitor),
  };
};

/**
 * Performance monitoring decorator for React components
 */
export const withPerformanceMonitoring = <P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
) => {
  const WrappedComponent = (props: P) => {
    const monitor = getPerformanceMonitor();
    const name = componentName || Component.displayName || Component.name || 'Component';

    React.useEffect(() => {
      const startTime = performance.now();
      
      return () => {
        const endTime = performance.now();
        monitor.addMetric({
          name: `${name}-mount`,
          duration: endTime - startTime,
          timestamp: startTime,
          type: 'custom',
          metadata: { component: name },
        });
      };
    }, []);

    return React.createElement(Component, props);
  };

  WrappedComponent.displayName = `withPerformanceMonitoring(${Component.displayName || Component.name})`;
  return WrappedComponent;
};
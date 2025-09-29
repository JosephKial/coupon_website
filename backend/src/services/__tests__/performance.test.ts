import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CacheService } from '../CacheService.js';
import { getPerformanceMonitor } from '../../utils/performance.js';

describe('Performance Tests - Caching Strategies', () => {
  let mockCacheService: CacheService;

  beforeEach(() => {
    // Mock the cache service for testing
    mockCacheService = {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      deletePattern: vi.fn(),
      exists: vi.fn(),
      getOrSet: vi.fn(),
      increment: vi.fn(),
      expire: vi.fn(),
      ttl: vi.fn(),
      clear: vi.fn(),
      disconnect: vi.fn(),
    } as any;

    getPerformanceMonitor().clear();
  });

  describe('Cache Service Performance', () => {
    it('should provide fast cache operations', async () => {
      const monitor = getPerformanceMonitor();
      
      // Mock cache operations to return quickly
      vi.mocked(mockCacheService.get).mockResolvedValue(null);
      vi.mocked(mockCacheService.set).mockResolvedValue(true);

      // Test cache miss scenario
      const { metrics: cacheMissMetrics } = await monitor.measureCacheOperation(
        'test_operation',
        'test_key',
        () => mockCacheService.get('test_key'),
        async () => ({ data: 'test_data' }),
        (value) => mockCacheService.set('test_key', value)
      );

      expect(cacheMissMetrics.cacheHit).toBe(false);
      expect(cacheMissMetrics.operation).toBe('test_operation_CACHE_MISS');

      // Test cache hit scenario
      vi.mocked(mockCacheService.get).mockResolvedValue({ data: 'cached_data' });

      const { metrics: cacheHitMetrics } = await monitor.measureCacheOperation(
        'test_operation',
        'test_key',
        () => mockCacheService.get('test_key'),
        async () => ({ data: 'test_data' }),
        (value) => mockCacheService.set('test_key', value)
      );

      expect(cacheHitMetrics.cacheHit).toBe(true);
      expect(cacheHitMetrics.operation).toBe('test_operation_CACHE_HIT');
    });

    it('should track performance metrics correctly', async () => {
      const monitor = getPerformanceMonitor();

      // Simulate multiple operations
      for (let i = 0; i < 5; i++) {
        await monitor.measure(`operation_${i}`, async () => {
          // Simulate some work
          await new Promise(resolve => setTimeout(resolve, 10));
          return `result_${i}`;
        });
      }

      const stats = monitor.getStats('operation');
      expect(stats.totalOperations).toBe(5);
      expect(stats.averageDuration).toBeGreaterThan(0);
      expect(stats.minDuration).toBeGreaterThan(0);
      expect(stats.maxDuration).toBeGreaterThan(0);
    });
  });

  describe('Cache Key Generation', () => {
    it('should generate consistent cache keys', () => {
      const userKey1 = CacheService.getUserKey('user123', 'stats');
      const userKey2 = CacheService.getUserKey('user123', 'stats');
      expect(userKey1).toBe(userKey2);
      expect(userKey1).toBe('user:user123:stats');

      const globalKey = CacheService.getGlobalKey('stats');
      expect(globalKey).toBe('global:stats');
    });

    it('should generate search keys with filters', () => {
      const searchKey1 = CacheService.getSearchKey('test query', { status: 'active', limit: 10 });
      const searchKey2 = CacheService.getSearchKey('test query', { status: 'active', limit: 10 });
      expect(searchKey1).toBe(searchKey2);

      // Different filters should generate different keys
      const searchKey3 = CacheService.getSearchKey('test query', { status: 'expired', limit: 10 });
      expect(searchKey1).not.toBe(searchKey3);
    });

    it('should handle long search keys by hashing', () => {
      const longQuery = 'a'.repeat(100);
      const complexFilters = {
        status: 'active',
        discountType: 'percentage',
        minValue: 10,
        maxValue: 50,
        tags: ['tag1', 'tag2', 'tag3'],
        expirationDateFrom: new Date(),
        expirationDateTo: new Date(),
      };

      const searchKey = CacheService.getSearchKey(longQuery, complexFilters);
      expect(searchKey).toBeDefined();
      expect(searchKey.length).toBeLessThan(250); // Should be hashed if too long
    });
  });

  describe('Performance Monitoring', () => {
    it('should measure operation performance', async () => {
      const monitor = getPerformanceMonitor();

      const { result, metrics } = await monitor.measure(
        'test_operation',
        async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
          return 'test_result';
        },
        { testMetadata: 'value' }
      );

      expect(result).toBe('test_result');
      expect(metrics.operation).toBe('test_operation');
      expect(metrics.duration).toBeGreaterThan(40);
      expect(metrics.metadata?.testMetadata).toBe('value');
    });

    it('should handle errors in measured operations', async () => {
      const monitor = getPerformanceMonitor();

      await expect(
        monitor.measure('failing_operation', async () => {
          throw new Error('Test error');
        })
      ).rejects.toThrow('Test error');

      const stats = monitor.getStats('failing_operation');
      expect(stats.totalOperations).toBe(1);
    });
  });

  describe('Cache Statistics', () => {
    it('should calculate performance statistics correctly', () => {
      const monitor = getPerformanceMonitor();

      // Add some mock metrics
      monitor['metrics'] = [
        { operation: 'test_op', duration: 100, cacheHit: false, timestamp: new Date() },
        { operation: 'test_op', duration: 50, cacheHit: true, timestamp: new Date() },
        { operation: 'test_op', duration: 25, cacheHit: true, timestamp: new Date() },
        { operation: 'other_op', duration: 200, cacheHit: false, timestamp: new Date() },
      ];

      const testOpStats = monitor.getStats('test_op');
      expect(testOpStats.totalOperations).toBe(3);
      expect(testOpStats.averageDuration).toBe((100 + 50 + 25) / 3);
      expect(testOpStats.minDuration).toBe(25);
      expect(testOpStats.maxDuration).toBe(100);
      expect(testOpStats.cacheHitRate).toBe(2 / 3); // 2 cache hits out of 3 operations

      const allStats = monitor.getStats();
      expect(allStats.totalOperations).toBe(4);
    });

    it('should clear metrics correctly', () => {
      const monitor = getPerformanceMonitor();
      
      // Add some metrics
      monitor['metrics'] = [
        { operation: 'test', duration: 100, cacheHit: false, timestamp: new Date() },
      ];

      expect(monitor.getAllMetrics()).toHaveLength(1);
      
      monitor.clear();
      expect(monitor.getAllMetrics()).toHaveLength(0);
    });
  });
});
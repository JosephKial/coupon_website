import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CacheService } from '../CacheService.js';

// Mock redis
const mockRedis = {
  get: vi.fn(),
  setEx: vi.fn(),
  del: vi.fn(),
  keys: vi.fn(),
  exists: vi.fn(),
  incrBy: vi.fn(),
  expire: vi.fn(),
  ttl: vi.fn(),
  quit: vi.fn(),
  on: vi.fn(),
  connect: vi.fn().mockResolvedValue(undefined),
};

vi.mock('redis', () => ({
  createClient: vi.fn(() => mockRedis),
}));

describe('CacheService', () => {
  let cacheService: CacheService;

  beforeEach(() => {
    vi.clearAllMocks();
    cacheService = new CacheService('redis://localhost:6379');
  });

  afterEach(async () => {
    await cacheService.disconnect();
  });

  describe('get', () => {
    it('should return parsed value when key exists', async () => {
      const testData = { id: 1, name: 'test' };
      mockRedis.get.mockResolvedValue(JSON.stringify(testData));

      const result = await cacheService.get('test-key');

      expect(result).toEqual(testData);
      expect(mockRedis.get).toHaveBeenCalledWith('coupon-manager:test-key');
    });

    it('should return null when key does not exist', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await cacheService.get('non-existent-key');

      expect(result).toBeNull();
    });

    it('should return null when Redis throws an error', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis error'));

      const result = await cacheService.get('error-key');

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should set value with default TTL', async () => {
      const testData = { id: 1, name: 'test' };
      mockRedis.setEx.mockResolvedValue('OK');

      const result = await cacheService.set('test-key', testData);

      expect(result).toBe(true);
      expect(mockRedis.setEx).toHaveBeenCalledWith(
        'coupon-manager:test-key',
        300, // default TTL
        JSON.stringify(testData)
      );
    });

    it('should set value with custom TTL', async () => {
      const testData = { id: 1, name: 'test' };
      mockRedis.setEx.mockResolvedValue('OK');

      const result = await cacheService.set('test-key', testData, { ttl: 600 });

      expect(result).toBe(true);
      expect(mockRedis.setEx).toHaveBeenCalledWith(
        'coupon-manager:test-key',
        600,
        JSON.stringify(testData)
      );
    });

    it('should return false when Redis throws an error', async () => {
      mockRedis.setEx.mockRejectedValue(new Error('Redis error'));

      const result = await cacheService.set('error-key', 'test');

      expect(result).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete key and return true when key exists', async () => {
      mockRedis.del.mockResolvedValue(1);

      const result = await cacheService.delete('test-key');

      expect(result).toBe(true);
      expect(mockRedis.del).toHaveBeenCalledWith('coupon-manager:test-key');
    });

    it('should return false when key does not exist', async () => {
      mockRedis.del.mockResolvedValue(0);

      const result = await cacheService.delete('non-existent-key');

      expect(result).toBe(false);
    });

    it('should return false when Redis throws an error', async () => {
      mockRedis.del.mockRejectedValue(new Error('Redis error'));

      const result = await cacheService.delete('error-key');

      expect(result).toBe(false);
    });
  });

  describe('deletePattern', () => {
    it('should delete multiple keys matching pattern', async () => {
      const keys = ['coupon-manager:user:1:stats', 'coupon-manager:user:2:stats'];
      mockRedis.keys.mockResolvedValue(keys);
      mockRedis.del.mockResolvedValue(2);

      const result = await cacheService.deletePattern('user:*:stats');

      expect(result).toBe(2);
      expect(mockRedis.keys).toHaveBeenCalledWith('coupon-manager:user:*:stats');
      expect(mockRedis.del).toHaveBeenCalledWith(...keys);
    });

    it('should return 0 when no keys match pattern', async () => {
      mockRedis.keys.mockResolvedValue([]);

      const result = await cacheService.deletePattern('non-existent:*');

      expect(result).toBe(0);
      expect(mockRedis.del).not.toHaveBeenCalled();
    });
  });

  describe('exists', () => {
    it('should return true when key exists', async () => {
      mockRedis.exists.mockResolvedValue(1);

      const result = await cacheService.exists('test-key');

      expect(result).toBe(true);
      expect(mockRedis.exists).toHaveBeenCalledWith('coupon-manager:test-key');
    });

    it('should return false when key does not exist', async () => {
      mockRedis.exists.mockResolvedValue(0);

      const result = await cacheService.exists('non-existent-key');

      expect(result).toBe(false);
    });
  });

  describe('getOrSet', () => {
    it('should return cached value when key exists', async () => {
      const cachedData = { id: 1, name: 'cached' };
      mockRedis.get.mockResolvedValue(JSON.stringify(cachedData));

      const fetchFunction = vi.fn().mockResolvedValue({ id: 1, name: 'fresh' });
      const result = await cacheService.getOrSet('test-key', fetchFunction);

      expect(result).toEqual(cachedData);
      expect(fetchFunction).not.toHaveBeenCalled();
    });

    it('should fetch and cache value when key does not exist', async () => {
      const freshData = { id: 1, name: 'fresh' };
      mockRedis.get.mockResolvedValue(null);
      mockRedis.setex.mockResolvedValue('OK');

      const fetchFunction = vi.fn().mockResolvedValue(freshData);
      const result = await cacheService.getOrSet('test-key', fetchFunction, { ttl: 600 });

      expect(result).toEqual(freshData);
      expect(fetchFunction).toHaveBeenCalledOnce();
      expect(mockRedis.setEx).toHaveBeenCalledWith(
        'coupon-manager:test-key',
        600,
        JSON.stringify(freshData)
      );
    });
  });

  describe('increment', () => {
    it('should increment value by default amount', async () => {
      mockRedis.incrby.mockResolvedValue(5);

      const result = await cacheService.increment('counter-key');

      expect(result).toBe(5);
      expect(mockRedis.incrBy).toHaveBeenCalledWith('coupon-manager:counter-key', 1);
    });

    it('should increment value by custom amount', async () => {
      mockRedis.incrby.mockResolvedValue(15);

      const result = await cacheService.increment('counter-key', 10);

      expect(result).toBe(15);
      expect(mockRedis.incrBy).toHaveBeenCalledWith('coupon-manager:counter-key', 10);
    });
  });

  describe('expire', () => {
    it('should set expiration time for key', async () => {
      mockRedis.expire.mockResolvedValue(1);

      const result = await cacheService.expire('test-key', 300);

      expect(result).toBe(true);
      expect(mockRedis.expire).toHaveBeenCalledWith('coupon-manager:test-key', 300);
    });

    it('should return false when key does not exist', async () => {
      mockRedis.expire.mockResolvedValue(0);

      const result = await cacheService.expire('non-existent-key', 300);

      expect(result).toBe(false);
    });
  });

  describe('ttl', () => {
    it('should return time to live for key', async () => {
      mockRedis.ttl.mockResolvedValue(120);

      const result = await cacheService.ttl('test-key');

      expect(result).toBe(120);
      expect(mockRedis.ttl).toHaveBeenCalledWith('coupon-manager:test-key');
    });
  });

  describe('clear', () => {
    it('should clear all keys with prefix', async () => {
      const keys = ['coupon-manager:key1', 'coupon-manager:key2'];
      mockRedis.keys.mockResolvedValue(keys);
      mockRedis.del.mockResolvedValue(2);

      const result = await cacheService.clear();

      expect(result).toBe(2);
      expect(mockRedis.keys).toHaveBeenCalledWith('coupon-manager:*');
      expect(mockRedis.del).toHaveBeenCalledWith(...keys);
    });

    it('should return 0 when no keys exist', async () => {
      mockRedis.keys.mockResolvedValue([]);

      const result = await cacheService.clear();

      expect(result).toBe(0);
      expect(mockRedis.del).not.toHaveBeenCalled();
    });
  });

  describe('static helper methods', () => {
    it('should generate user-specific cache key', () => {
      const key = CacheService.getUserKey('user123', 'stats');
      expect(key).toBe('user:user123:stats');
    });

    it('should generate global cache key', () => {
      const key = CacheService.getGlobalKey('stats');
      expect(key).toBe('global:stats');
    });

    it('should generate search cache key', () => {
      const query = 'test';
      const filters = { status: 'active', limit: 10 };
      const key = CacheService.getSearchKey(query, filters);
      expect(key).toBe('search:test:limit:"10"|status:"active"');
    });

    it('should generate hashed search key for long queries', () => {
      const query = 'a'.repeat(100);
      const filters = { status: 'active', limit: 10, tags: ['a'.repeat(50)] };
      const key = CacheService.getSearchKey(query, filters);
      expect(key).toMatch(/^search:[a-f0-9]{32}$/);
    });
  });
});
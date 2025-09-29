import { createClient, RedisClientType } from 'redis';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
}

export class CacheService {
  private redis: RedisClientType;
  private defaultTTL: number = 300; // 5 minutes default
  private keyPrefix: string = 'coupon-manager:';

  constructor(redisUrl?: string) {
    this.redis = createClient({
      url: redisUrl || process.env.REDIS_URL || 'redis://localhost:6379',
    });

    this.redis.on('error', (error) => {
      console.error('Redis connection error:', error);
    });

    this.redis.on('connect', () => {
      console.log('Connected to Redis');
    });

    // Connect to Redis (only in production, not in tests)
    if (process.env.NODE_ENV !== 'test') {
      this.redis.connect().catch(console.error);
    }
  }

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(this.getKey(key));
      if (value === null) {
        return null;
      }
      return JSON.parse(value);
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set a value in cache
   */
  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<boolean> {
    try {
      const ttl = options.ttl || this.defaultTTL;
      const serializedValue = JSON.stringify(value);
      
      const result = await this.redis.setEx(this.getKey(key), ttl, serializedValue);
      return result === 'OK';
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  /**
   * Delete a value from cache
   */
  async delete(key: string): Promise<boolean> {
    try {
      const result = await this.redis.del(this.getKey(key));
      return result > 0;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  /**
   * Delete multiple keys matching a pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    try {
      const keys = await this.redis.keys(this.getKey(pattern));
      if (keys.length === 0) {
        return 0;
      }
      return await this.redis.del(keys);
    } catch (error) {
      console.error('Cache delete pattern error:', error);
      return 0;
    }
  }

  /**
   * Check if a key exists in cache
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(this.getKey(key));
      return result === 1;
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }

  /**
   * Get or set a value in cache (cache-aside pattern)
   */
  async getOrSet<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    // Try to get from cache first
    const cachedValue = await this.get<T>(key);
    if (cachedValue !== null) {
      return cachedValue;
    }

    // If not in cache, fetch the value
    const value = await fetchFunction();
    
    // Store in cache for next time
    await this.set(key, value, options);
    
    return value;
  }

  /**
   * Increment a numeric value in cache
   */
  async increment(key: string, amount: number = 1): Promise<number> {
    try {
      return await this.redis.incrBy(this.getKey(key), amount);
    } catch (error) {
      console.error('Cache increment error:', error);
      return 0;
    }
  }

  /**
   * Set expiration time for a key
   */
  async expire(key: string, ttl: number): Promise<boolean> {
    try {
      const result = await this.redis.expire(this.getKey(key), ttl);
      return result === 1;
    } catch (error) {
      console.error('Cache expire error:', error);
      return false;
    }
  }

  /**
   * Get time to live for a key
   */
  async ttl(key: string): Promise<number> {
    try {
      return await this.redis.ttl(this.getKey(key));
    } catch (error) {
      console.error('Cache TTL error:', error);
      return -1;
    }
  }

  /**
   * Clear all cache entries with the configured prefix
   */
  async clear(): Promise<number> {
    try {
      const keys = await this.redis.keys(`${this.keyPrefix}*`);
      if (keys.length === 0) {
        return 0;
      }
      return await this.redis.del(keys);
    } catch (error) {
      console.error('Cache clear error:', error);
      return 0;
    }
  }

  /**
   * Close the Redis connection
   */
  async disconnect(): Promise<void> {
    try {
      await this.redis.quit();
    } catch (error) {
      console.error('Cache disconnect error:', error);
    }
  }

  /**
   * Get the full cache key with prefix
   */
  private getKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  /**
   * Generate a cache key for user-specific data
   */
  static getUserKey(userId: string, resource: string): string {
    return `user:${userId}:${resource}`;
  }

  /**
   * Generate a cache key for global data
   */
  static getGlobalKey(resource: string): string {
    return `global:${resource}`;
  }

  /**
   * Generate a cache key for search results
   */
  static getSearchKey(query: string, filters: Record<string, any>): string {
    const filterString = Object.keys(filters)
      .sort()
      .map(key => `${key}:${JSON.stringify(filters[key])}`)
      .join('|');
    
    const searchString = `search:${query}:${filterString}`;
    
    // Create a hash of the search string if it's too long
    if (searchString.length > 200) {
      const crypto = require('crypto');
      return `search:${crypto.createHash('md5').update(searchString).digest('hex')}`;
    }
    
    return searchString;
  }
}

// Singleton instance
let cacheServiceInstance: CacheService | null = null;

export const getCacheService = (): CacheService => {
  if (!cacheServiceInstance) {
    cacheServiceInstance = new CacheService();
  }
  return cacheServiceInstance;
};

export const setCacheService = (service: CacheService): void => {
  cacheServiceInstance = service;
};
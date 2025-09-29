import { createClient, RedisClientType } from 'redis';
import { logger } from './logger.js';

class RedisClient {
  private client: RedisClientType;
  private isConnected: boolean = false;

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    this.client = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error('Redis connection failed after 10 retries');
            return false;
          }
          return Math.min(retries * 50, 1000);
        },
      },
    });

    this.client.on('error', (err) => {
      logger.error('Redis Client Error:', err);
      this.isConnected = false;
    });

    this.client.on('connect', () => {
      logger.info('Redis Client Connected');
      this.isConnected = true;
    });

    this.client.on('disconnect', () => {
      logger.warn('Redis Client Disconnected');
      this.isConnected = false;
    });
  }

  async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.client.connect();
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.disconnect();
    }
  }

  async set(key: string, value: string, expireInSeconds?: number): Promise<void> {
    await this.ensureConnected();
    if (expireInSeconds) {
      await this.client.setEx(key, expireInSeconds, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    await this.ensureConnected();
    return this.client.get(key);
  }

  async del(key: string): Promise<number> {
    await this.ensureConnected();
    return this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    await this.ensureConnected();
    const result = await this.client.exists(key);
    return result === 1;
  }

  async setJson(key: string, value: any, expireInSeconds?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), expireInSeconds);
  }

  async getJson<T>(key: string): Promise<T | null> {
    const value = await this.get(key);
    if (!value) return null;
    
    try {
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error('Failed to parse JSON from Redis:', error);
      return null;
    }
  }

  async flushAll(): Promise<void> {
    await this.ensureConnected();
    await this.client.flushAll();
  }

  private async ensureConnected(): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }
  }

  getClient(): RedisClientType {
    return this.client;
  }
}

// Create singleton instance
export const redisClient = new RedisClient();

// Helper functions for common operations
export const setCache = (key: string, value: string, expireInSeconds?: number) => 
  redisClient.set(key, value, expireInSeconds);

export const getCache = (key: string) => 
  redisClient.get(key);

export const delCache = (key: string) => 
  redisClient.del(key);

export const setCacheJson = (key: string, value: any, expireInSeconds?: number) => 
  redisClient.setJson(key, value, expireInSeconds);

export const getCacheJson = <T>(key: string) => 
  redisClient.getJson<T>(key);

export default redisClient;
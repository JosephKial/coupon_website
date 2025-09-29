import { vi } from 'vitest';

// Mock Redis client for tests
export const mockRedisClient = {
  connect: vi.fn().mockResolvedValue(undefined),
  disconnect: vi.fn().mockResolvedValue(undefined),
  set: vi.fn().mockResolvedValue('OK'),
  setEx: vi.fn().mockResolvedValue('OK'),
  get: vi.fn().mockResolvedValue(null),
  del: vi.fn().mockResolvedValue(1),
  exists: vi.fn().mockResolvedValue(0),
  flushAll: vi.fn().mockResolvedValue('OK'),
  on: vi.fn(),
  isConnected: true,
};

export const createMockRedisClient = () => mockRedisClient;

// Mock the entire redis module
vi.mock('redis', () => ({
  createClient: vi.fn(() => mockRedisClient),
}));

// Mock redis utility functions
export const mockRedisUtils = {
  setCache: vi.fn().mockResolvedValue(undefined),
  getCache: vi.fn().mockResolvedValue(null),
  delCache: vi.fn().mockResolvedValue(1),
  setCacheJson: vi.fn().mockResolvedValue(undefined),
  getCacheJson: vi.fn().mockResolvedValue(null),
};
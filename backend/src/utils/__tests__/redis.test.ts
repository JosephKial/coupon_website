import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock redis and logger before importing
const mockRedisClient = {
  connect: vi.fn(),
  disconnect: vi.fn(),
  set: vi.fn(),
  setEx: vi.fn(),
  get: vi.fn(),
  del: vi.fn(),
  exists: vi.fn(),
  flushAll: vi.fn(),
  on: vi.fn(),
};

const mockCreateClient = vi.fn(() => mockRedisClient);

vi.mock('redis', () => ({
  createClient: mockCreateClient,
}));

vi.mock('../logger.js', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('RedisClient', () => {
  let RedisClient: any;
  let redisClient: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Reset the module cache to get fresh instances
    delete require.cache[require.resolve('../redis.js')];
    
    // Import after mocks are set up
    const redisModule = await import('../redis.js');
    RedisClient = redisModule.default;
    redisClient = redisModule.redisClient;
  });

  afterEach(() => {
    delete process.env.REDIS_URL;
  });

  describe('constructor', () => {
    it('should create redis client with default URL', () => {
      expect(mockCreateClient).toHaveBeenCalledWith({
        url: 'redis://localhost:6379',
        socket: {
          reconnectStrategy: expect.any(Function),
        },
      });
    });

    it('should create redis client with custom URL from environment', async () => {
      process.env.REDIS_URL = 'redis://custom:6380';
      
      delete require.cache[require.resolve('../redis.js')];
      await import('../redis.js');

      expect(mockCreateClient).toHaveBeenCalledWith({
        url: 'redis://custom:6380',
        socket: {
          reconnectStrategy: expect.any(Function),
        },
      });
    });

    it('should set up event listeners', () => {
      expect(mockRedisClient.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockRedisClient.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockRedisClient.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
    });
  });

  describe('connect', () => {
    it('should connect when not already connected', async () => {
      await redisClient.connect();

      expect(mockRedisClient.connect).toHaveBeenCalled();
    });

    it('should not connect when already connected', async () => {
      // Simulate connected state
      redisClient.isConnected = true;

      await redisClient.connect();

      expect(mockRedisClient.connect).not.toHaveBeenCalled();
    });
  });

  describe('disconnect', () => {
    it('should disconnect when connected', async () => {
      redisClient.isConnected = true;

      await redisClient.disconnect();

      expect(mockRedisClient.disconnect).toHaveBeenCalled();
    });

    it('should not disconnect when not connected', async () => {
      redisClient.isConnected = false;

      await redisClient.disconnect();

      expect(mockRedisClient.disconnect).not.toHaveBeenCalled();
    });
  });

  describe('set', () => {
    it('should set value without expiration', async () => {
      mockRedisClient.connect.mockResolvedValue(undefined);
      mockRedisClient.set.mockResolvedValue('OK');

      await redisClient.set('key', 'value');

      expect(mockRedisClient.set).toHaveBeenCalledWith('key', 'value');
    });

    it('should set value with expiration', async () => {
      mockRedisClient.connect.mockResolvedValue(undefined);
      mockRedisClient.setEx.mockResolvedValue('OK');

      await redisClient.set('key', 'value', 3600);

      expect(mockRedisClient.setEx).toHaveBeenCalledWith('key', 3600, 'value');
    });
  });

  describe('get', () => {
    it('should get value', async () => {
      mockRedisClient.connect.mockResolvedValue(undefined);
      mockRedisClient.get.mockResolvedValue('value');

      const result = await redisClient.get('key');

      expect(mockRedisClient.get).toHaveBeenCalledWith('key');
      expect(result).toBe('value');
    });

    it('should return null for non-existent key', async () => {
      mockRedisClient.connect.mockResolvedValue(undefined);
      mockRedisClient.get.mockResolvedValue(null);

      const result = await redisClient.get('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('del', () => {
    it('should delete key', async () => {
      mockRedisClient.connect.mockResolvedValue(undefined);
      mockRedisClient.del.mockResolvedValue(1);

      const result = await redisClient.del('key');

      expect(mockRedisClient.del).toHaveBeenCalledWith('key');
      expect(result).toBe(1);
    });
  });

  describe('exists', () => {
    it('should return true when key exists', async () => {
      mockRedisClient.connect.mockResolvedValue(undefined);
      mockRedisClient.exists.mockResolvedValue(1);

      const result = await redisClient.exists('key');

      expect(mockRedisClient.exists).toHaveBeenCalledWith('key');
      expect(result).toBe(true);
    });

    it('should return false when key does not exist', async () => {
      mockRedisClient.connect.mockResolvedValue(undefined);
      mockRedisClient.exists.mockResolvedValue(0);

      const result = await redisClient.exists('key');

      expect(result).toBe(false);
    });
  });

  describe('setJson', () => {
    it('should set JSON value', async () => {
      mockRedisClient.connect.mockResolvedValue(undefined);
      mockRedisClient.set.mockResolvedValue('OK');

      const obj = { test: 'value' };
      await redisClient.setJson('key', obj);

      expect(mockRedisClient.set).toHaveBeenCalledWith('key', JSON.stringify(obj));
    });

    it('should set JSON value with expiration', async () => {
      mockRedisClient.connect.mockResolvedValue(undefined);
      mockRedisClient.setEx.mockResolvedValue('OK');

      const obj = { test: 'value' };
      await redisClient.setJson('key', obj, 3600);

      expect(mockRedisClient.setEx).toHaveBeenCalledWith('key', 3600, JSON.stringify(obj));
    });
  });

  describe('getJson', () => {
    it('should get and parse JSON value', async () => {
      mockRedisClient.connect.mockResolvedValue(undefined);
      const obj = { test: 'value' };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(obj));

      const result = await redisClient.getJson('key');

      expect(mockRedisClient.get).toHaveBeenCalledWith('key');
      expect(result).toEqual(obj);
    });

    it('should return null for non-existent key', async () => {
      mockRedisClient.connect.mockResolvedValue(undefined);
      mockRedisClient.get.mockResolvedValue(null);

      const result = await redisClient.getJson('key');

      expect(result).toBeNull();
    });

    it('should return null for invalid JSON', async () => {
      mockRedisClient.connect.mockResolvedValue(undefined);
      mockRedisClient.get.mockResolvedValue('invalid json');

      const result = await redisClient.getJson('key');

      expect(result).toBeNull();
    });
  });

  describe('flushAll', () => {
    it('should flush all keys', async () => {
      mockRedisClient.connect.mockResolvedValue(undefined);
      mockRedisClient.flushAll.mockResolvedValue('OK');

      await redisClient.flushAll();

      expect(mockRedisClient.flushAll).toHaveBeenCalled();
    });
  });

  describe('helper functions', () => {
    it('should export helper functions', async () => {
      const redisModule = await import('../redis.js');
      
      expect(redisModule.setCache).toBeDefined();
      expect(redisModule.getCache).toBeDefined();
      expect(redisModule.delCache).toBeDefined();
      expect(redisModule.setCacheJson).toBeDefined();
      expect(redisModule.getCacheJson).toBeDefined();
    });
  });

  describe('reconnect strategy', () => {
    it('should return false after 10 retries', async () => {
      const redisModule = await import('../redis.js');
      
      // Get the reconnect strategy function from the createClient call
      const createClientCall = mockCreateClient.mock.calls[0][0];
      const reconnectStrategy = createClientCall.socket.reconnectStrategy;

      const result = reconnectStrategy(11);
      expect(result).toBe(false);
    });

    it('should return delay for retries under 10', async () => {
      const redisModule = await import('../redis.js');
      
      const createClientCall = mockCreateClient.mock.calls[0][0];
      const reconnectStrategy = createClientCall.socket.reconnectStrategy;

      const result = reconnectStrategy(5);
      expect(result).toBe(250); // Math.min(5 * 50, 1000)
    });

    it('should cap delay at 1000ms', async () => {
      const redisModule = await import('../redis.js');
      
      const createClientCall = mockCreateClient.mock.calls[0][0];
      const reconnectStrategy = createClientCall.socket.reconnectStrategy;

      const result = reconnectStrategy(25);
      expect(result).toBe(1000); // Math.min(25 * 50, 1000)
    });
  });
});
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import winston from 'winston';

// Mock winston before importing logger
vi.mock('winston', () => ({
  default: {
    createLogger: vi.fn(),
    format: {
      combine: vi.fn(),
      timestamp: vi.fn(),
      errors: vi.fn(),
      json: vi.fn(),
      colorize: vi.fn(),
      simple: vi.fn(),
    },
    transports: {
      Console: vi.fn(),
    },
  },
}));

describe('Logger', () => {
  let mockLogger: any;
  let mockConsoleTransport: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Setup mock logger
    mockLogger = {
      add: vi.fn(),
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    };

    mockConsoleTransport = vi.fn();

    // Setup winston mocks
    (winston.createLogger as any).mockReturnValue(mockLogger);
    (winston.transports.Console as any).mockImplementation(mockConsoleTransport);
    (winston.format.combine as any).mockReturnValue('combined-format');
    (winston.format.timestamp as any).mockReturnValue('timestamp-format');
    (winston.format.errors as any).mockReturnValue('errors-format');
    (winston.format.json as any).mockReturnValue('json-format');
    (winston.format.colorize as any).mockReturnValue('colorize-format');
    (winston.format.simple as any).mockReturnValue('simple-format');
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.LOG_LEVEL;
    delete process.env.NODE_ENV;
  });

  it('should create logger with default info level', async () => {
    // Import logger after mocks are set up
    const { logger } = await import('../logger.js');

    expect(winston.createLogger).toHaveBeenCalledWith({
      level: 'info',
      format: 'combined-format',
      defaultMeta: { service: 'family-coupon-manager' },
      transports: expect.any(Array),
    });
  });

  it('should use custom log level from environment', async () => {
    process.env.LOG_LEVEL = 'debug';

    // Re-import to get fresh instance with new env var
    delete require.cache[require.resolve('../logger.js')];
    const { logger } = await import('../logger.js');

    expect(winston.createLogger).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'debug',
      })
    );
  });

  it('should add console transport in non-production environment', async () => {
    process.env.NODE_ENV = 'development';

    delete require.cache[require.resolve('../logger.js')];
    const { logger } = await import('../logger.js');

    expect(mockLogger.add).toHaveBeenCalledWith(
      expect.any(Object) // Console transport instance
    );
  });

  it('should not add extra console transport in production', async () => {
    process.env.NODE_ENV = 'production';

    delete require.cache[require.resolve('../logger.js')];
    const { logger } = await import('../logger.js');

    expect(mockLogger.add).not.toHaveBeenCalled();
  });

  it('should configure winston format correctly', async () => {
    const { logger } = await import('../logger.js');

    expect(winston.format.combine).toHaveBeenCalled();
    expect(winston.format.timestamp).toHaveBeenCalled();
    expect(winston.format.errors).toHaveBeenCalledWith({ stack: true });
    expect(winston.format.json).toHaveBeenCalled();
  });

  it('should configure console transport with colorize and simple format', async () => {
    const { logger } = await import('../logger.js');

    expect(winston.transports.Console).toHaveBeenCalledWith({
      format: 'combined-format',
    });
  });

  it('should set correct default meta', async () => {
    const { logger } = await import('../logger.js');

    expect(winston.createLogger).toHaveBeenCalledWith(
      expect.objectContaining({
        defaultMeta: { service: 'family-coupon-manager' },
      })
    );
  });
});
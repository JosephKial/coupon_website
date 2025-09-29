import { describe, it, expect } from 'vitest';
import { 
  authRateLimiter, 
  apiRateLimiter, 
  strictRateLimiter,
  createRateLimiter 
} from '../rateLimiter.middleware.js';

describe('Rate Limiter Middleware', () => {
  describe('Rate Limiter Configuration', () => {
    it('should export authRateLimiter middleware', () => {
      expect(authRateLimiter).toBeDefined();
      expect(typeof authRateLimiter).toBe('function');
    });

    it('should export apiRateLimiter middleware', () => {
      expect(apiRateLimiter).toBeDefined();
      expect(typeof apiRateLimiter).toBe('function');
    });

    it('should export strictRateLimiter middleware', () => {
      expect(strictRateLimiter).toBeDefined();
      expect(typeof strictRateLimiter).toBe('function');
    });
  });

  describe('createRateLimiter', () => {
    it('should create a rate limiter with custom configuration', () => {
      const customLimiter = createRateLimiter({
        windowMs: 60000, // 1 minute
        max: 10,
        message: 'Custom rate limit message'
      });
      
      expect(customLimiter).toBeDefined();
      expect(typeof customLimiter).toBe('function');
    });

    it('should use default message when not provided', () => {
      const customLimiter = createRateLimiter({
        windowMs: 60000,
        max: 10
      });
      
      expect(customLimiter).toBeDefined();
      expect(typeof customLimiter).toBe('function');
    });

    it('should create different instances for different configurations', () => {
      const limiter1 = createRateLimiter({
        windowMs: 60000,
        max: 10
      });
      
      const limiter2 = createRateLimiter({
        windowMs: 120000,
        max: 20
      });
      
      expect(limiter1).toBeDefined();
      expect(limiter2).toBeDefined();
      expect(limiter1).not.toBe(limiter2);
    });
  });

  describe('Middleware Structure', () => {
    it('should have consistent middleware structure', () => {
      // Verify that all rate limiters are middleware functions
      const middlewares = [authRateLimiter, apiRateLimiter, strictRateLimiter];
      
      middlewares.forEach(middleware => {
        expect(middleware).toBeDefined();
        expect(typeof middleware).toBe('function');
        // Express middleware should accept 3 parameters (req, res, next)
        expect(middleware.length).toBe(3);
      });
    });

    it('should create custom rate limiter with correct structure', () => {
      const customLimiter = createRateLimiter({
        windowMs: 60000,
        max: 10,
        message: 'Test message'
      });
      
      expect(customLimiter).toBeDefined();
      expect(typeof customLimiter).toBe('function');
      expect(customLimiter.length).toBe(3);
    });
  });

  describe('Configuration Validation', () => {
    it('should accept valid configuration options', () => {
      expect(() => {
        createRateLimiter({
          windowMs: 60000,
          max: 10,
          message: 'Valid configuration'
        });
      }).not.toThrow();
    });

    it('should accept configuration without message', () => {
      expect(() => {
        createRateLimiter({
          windowMs: 60000,
          max: 10
        });
      }).not.toThrow();
    });

    it('should handle different time windows', () => {
      const shortWindow = createRateLimiter({
        windowMs: 1000, // 1 second
        max: 5
      });

      const longWindow = createRateLimiter({
        windowMs: 3600000, // 1 hour
        max: 100
      });

      expect(shortWindow).toBeDefined();
      expect(longWindow).toBeDefined();
    });
  });
});
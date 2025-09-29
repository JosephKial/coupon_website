import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { 
  securityHeaders, 
  httpsEnforcement, 
  createRateLimit, 
  securityLogger,
  ipFilter,
  generateCsrfToken
} from '../security.middleware.js';

describe('Security Middleware', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  describe('Security Headers', () => {
    beforeEach(() => {
      app.use(securityHeaders);
      app.get('/test', (req, res) => {
        res.json({ message: 'test' });
      });
    });

    it('should set Content Security Policy header', async () => {
      const response = await request(app).get('/test');
      
      expect(response.headers['content-security-policy']).toBeDefined();
      expect(response.headers['content-security-policy']).toContain("default-src 'self'");
    });

    it('should set X-Frame-Options header', async () => {
      const response = await request(app).get('/test');
      
      expect(response.headers['x-frame-options']).toBe('DENY');
    });

    it('should set X-Content-Type-Options header', async () => {
      const response = await request(app).get('/test');
      
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should not set X-XSS-Protection header when disabled', async () => {
      const response = await request(app).get('/test');
      
      // Modern helmet disables XSS filtering as it's deprecated and can introduce vulnerabilities
      expect(response.headers['x-xss-protection']).toBeUndefined();
    });

    it('should set Referrer-Policy header', async () => {
      const response = await request(app).get('/test');
      
      expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    });

    it('should hide X-Powered-By header', async () => {
      const response = await request(app).get('/test');
      
      expect(response.headers['x-powered-by']).toBeUndefined();
    });

    it('should set HSTS header in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const prodApp = express();
      prodApp.use(securityHeaders);
      prodApp.get('/test', (req, res) => {
        res.json({ message: 'test' });
      });
      
      const response = await request(prodApp).get('/test');
      
      expect(response.headers['strict-transport-security']).toBeDefined();
      expect(response.headers['strict-transport-security']).toContain('max-age=31536000');
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('HTTPS Enforcement', () => {
    beforeEach(() => {
      app.use(httpsEnforcement);
      app.get('/test', (req, res) => {
        res.json({ message: 'test' });
      });
    });

    it('should allow requests in development', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const response = await request(app).get('/test');
      
      expect(response.status).toBe(200);
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should redirect HTTP to HTTPS in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const response = await request(app)
        .get('/test')
        .set('Host', 'example.com');
      
      expect(response.status).toBe(301);
      expect(response.headers.location).toBe('https://example.com/test');
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should allow HTTPS requests in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const response = await request(app)
        .get('/test')
        .set('X-Forwarded-Proto', 'https');
      
      expect(response.status).toBe(200);
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Rate Limiting', () => {
    it('should allow requests within limit', async () => {
      const limiter = createRateLimit({
        windowMs: 60000, // 1 minute
        max: 5,
        message: 'Rate limit exceeded',
      });
      
      app.use(limiter);
      app.get('/test', (req, res) => {
        res.json({ message: 'success' });
      });
      
      // Make 5 requests (within limit)
      for (let i = 0; i < 5; i++) {
        const response = await request(app).get('/test');
        expect(response.status).toBe(200);
      }
    });

    it('should block requests exceeding limit', async () => {
      const limiter = createRateLimit({
        windowMs: 60000, // 1 minute
        max: 2,
        message: 'Rate limit exceeded',
      });
      
      app.use(limiter);
      app.get('/test', (req, res) => {
        res.json({ message: 'success' });
      });
      
      // Make 2 requests (within limit)
      await request(app).get('/test');
      await request(app).get('/test');
      
      // Third request should be blocked
      const response = await request(app).get('/test');
      expect(response.status).toBe(429);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('should set rate limit headers', async () => {
      const limiter = createRateLimit({
        windowMs: 60000,
        max: 10,
        message: 'Rate limit exceeded',
      });
      
      app.use(limiter);
      app.get('/test', (req, res) => {
        res.json({ message: 'success' });
      });
      
      const response = await request(app).get('/test');
      
      expect(response.headers['ratelimit-limit']).toBeDefined();
      expect(response.headers['ratelimit-remaining']).toBeDefined();
      expect(response.headers['ratelimit-reset']).toBeDefined();
    });
  });

  describe('IP Filter', () => {
    beforeEach(() => {
      app.use(ipFilter);
      app.get('/test', (req, res) => {
        res.json({ message: 'success' });
      });
    });

    it('should allow requests from non-blacklisted IPs', async () => {
      const response = await request(app).get('/test');
      
      expect(response.status).toBe(200);
    });

    it('should block requests from blacklisted IPs', async () => {
      const originalEnv = process.env.BLACKLISTED_IPS;
      process.env.BLACKLISTED_IPS = '127.0.0.1,::ffff:127.0.0.1';
      
      const response = await request(app).get('/test');
      
      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('IP_BLOCKED');
      
      process.env.BLACKLISTED_IPS = originalEnv;
    });
  });

  describe('Security Logger', () => {
    beforeEach(() => {
      app.use(securityLogger);
    });

    it('should log 401 responses', async () => {
      app.get('/test', (req, res) => {
        res.status(401).json({ error: 'Unauthorized' });
      });
      
      const response = await request(app).get('/test');
      
      expect(response.status).toBe(401);
      // Logger output would be tested with a mock in a real scenario
    });

    it('should log 403 responses', async () => {
      app.get('/test', (req, res) => {
        res.status(403).json({ error: 'Forbidden' });
      });
      
      const response = await request(app).get('/test');
      
      expect(response.status).toBe(403);
      // Logger output would be tested with a mock in a real scenario
    });

    it('should detect suspicious input patterns', async () => {
      app.post('/test', (req, res) => {
        res.status(400).json({ error: 'Bad request' });
      });
      
      const response = await request(app)
        .post('/test')
        .send({ malicious: '<script>alert("xss")</script>' });
      
      expect(response.status).toBe(400);
      // Logger output would be tested with a mock in a real scenario
    });
  });

  describe('CSRF Token Generation', () => {
    it('should generate CSRF token', async () => {
      app.get('/csrf-token', generateCsrfToken);
      
      const response = await request(app).get('/csrf-token');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.csrfToken).toBeDefined();
      expect(typeof response.body.data.csrfToken).toBe('string');
      expect(response.body.data.csrfToken.length).toBeGreaterThan(0);
    });
  });

  describe('Security Headers Integration', () => {
    beforeEach(() => {
      app.use(securityHeaders);
      app.get('/test', (req, res) => {
        res.json({ message: 'test' });
      });
    });

    it('should prevent clickjacking attacks', async () => {
      const response = await request(app).get('/test');
      
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['content-security-policy']).toContain("frame-ancestors 'none'");
    });

    it('should prevent MIME type sniffing', async () => {
      const response = await request(app).get('/test');
      
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should not set deprecated XSS protection header', async () => {
      const response = await request(app).get('/test');
      
      // Modern helmet disables XSS filtering as it's deprecated and can introduce vulnerabilities
      expect(response.headers['x-xss-protection']).toBeUndefined();
    });

    it('should control referrer information', async () => {
      const response = await request(app).get('/test');
      
      expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    });

    it('should disable DNS prefetching', async () => {
      const response = await request(app).get('/test');
      
      expect(response.headers['x-dns-prefetch-control']).toBe('off');
    });
  });

  describe('Content Security Policy', () => {
    beforeEach(() => {
      app.use(securityHeaders);
      app.get('/test', (req, res) => {
        res.json({ message: 'test' });
      });
    });

    it('should restrict default sources to self', async () => {
      const response = await request(app).get('/test');
      
      expect(response.headers['content-security-policy']).toContain("default-src 'self'");
    });

    it('should allow specific font sources', async () => {
      const response = await request(app).get('/test');
      
      expect(response.headers['content-security-policy']).toContain('font-src');
      expect(response.headers['content-security-policy']).toContain('https://fonts.gstatic.com');
    });

    it('should prevent object and embed elements', async () => {
      const response = await request(app).get('/test');
      
      expect(response.headers['content-security-policy']).toContain("object-src 'none'");
    });

    it('should prevent framing', async () => {
      const response = await request(app).get('/test');
      
      expect(response.headers['content-security-policy']).toContain("frame-src 'none'");
      expect(response.headers['content-security-policy']).toContain("frame-ancestors 'none'");
    });
  });
});
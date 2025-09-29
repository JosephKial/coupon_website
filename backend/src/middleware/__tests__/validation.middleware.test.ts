import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { sanitizeInput, sanitizeString, sanitizeObject, validate, validationChains } from '../validation.middleware.js';
import { errorHandler } from '../error.middleware.js';

describe('Validation Middleware', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  describe('sanitizeString', () => {
    it('should remove XSS attempts', () => {
      const maliciousInput = '<script>alert("xss")</script>Hello';
      const sanitized = sanitizeString(maliciousInput);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('alert');
      expect(sanitized).toContain('Hello');
    });

    it('should escape HTML entities', () => {
      const input = '<div>Hello & "World"</div>';
      const sanitized = sanitizeString(input);
      expect(sanitized).not.toContain('<div>');
      expect(sanitized).toContain('&amp;');
      expect(sanitized).toContain('&quot;');
    });

    it('should remove null bytes and control characters', () => {
      const input = 'Hello\x00World\x1F';
      const sanitized = sanitizeString(input);
      expect(sanitized).toBe('HelloWorld');
    });

    it('should trim whitespace', () => {
      const input = '  Hello World  ';
      const sanitized = sanitizeString(input);
      expect(sanitized).toBe('Hello World');
    });
  });

  describe('sanitizeObject', () => {
    it('should sanitize nested objects', () => {
      const input = {
        name: '<script>alert("xss")</script>John',
        details: {
          description: '<img src="x" onerror="alert(1)">',
          tags: ['<script>', 'normal-tag']
        }
      };
      
      const sanitized = sanitizeObject(input);
      expect(sanitized.name).not.toContain('<script>');
      expect(sanitized.details.description).not.toContain('onerror');
      expect(sanitized.details.tags[0]).not.toContain('<script>');
      expect(sanitized.details.tags[1]).toBe('normal-tag');
    });

    it('should handle arrays', () => {
      const input = ['<script>alert(1)</script>', 'normal', '<img src="x">'];
      const sanitized = sanitizeObject(input);
      expect(sanitized[0]).not.toContain('<script>');
      expect(sanitized[1]).toBe('normal');
      expect(sanitized[2]).not.toContain('<img>');
    });

    it('should preserve non-string values', () => {
      const input = {
        number: 123,
        boolean: true,
        null: null,
        undefined: undefined
      };
      
      const sanitized = sanitizeObject(input);
      expect(sanitized.number).toBe(123);
      expect(sanitized.boolean).toBe(true);
      expect(sanitized.null).toBe(null);
      expect(sanitized.undefined).toBe(undefined);
    });
  });

  describe('sanitizeInput middleware', () => {
    it('should sanitize request body', async () => {
      app.use(sanitizeInput);
      app.post('/test', (req, res) => {
        res.json(req.body);
      });

      const response = await request(app)
        .post('/test')
        .send({
          name: '<script>alert("xss")</script>John',
          description: '<img src="x" onerror="alert(1)">'
        });

      expect(response.body.name).not.toContain('<script>');
      expect(response.body.description).not.toContain('onerror');
    });

    it('should sanitize query parameters', async () => {
      app.use(sanitizeInput);
      app.get('/test', (req, res) => {
        res.json(req.query);
      });

      const response = await request(app)
        .get('/test?search=<script>alert(1)</script>&normal=test');

      expect(response.body.search).not.toContain('<script>');
      expect(response.body.normal).toBe('test');
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should sanitize SQL injection attempts in strings', () => {
      const sqlInjection = "'; DROP TABLE users; --";
      const sanitized = sanitizeString(sqlInjection);
      expect(sanitized).not.toContain('DROP TABLE');
      expect(sanitized).not.toContain('--');
    });

    it('should handle UNION-based SQL injection', () => {
      const unionInjection = "1' UNION SELECT * FROM users --";
      const sanitized = sanitizeString(unionInjection);
      expect(sanitized).not.toContain('UNION');
      expect(sanitized).not.toContain('SELECT');
    });
  });

  describe('NoSQL Injection Prevention', () => {
    it('should handle MongoDB injection attempts', () => {
      const input = {
        email: { $ne: null },
        password: { $regex: '.*' }
      };
      
      const sanitized = sanitizeObject(input);
      // Objects with $ operators should be converted to strings
      expect(typeof sanitized.email).toBe('string');
      expect(typeof sanitized.password).toBe('string');
    });
  });

  describe('User Registration Validation', () => {
    beforeEach(() => {
      app.use(validate(validationChains.registerUser));
      app.post('/register', (req, res) => {
        res.json({ success: true, data: req.body });
      });
      app.use(errorHandler);
    });

    it('should accept valid registration data', async () => {
      const validData = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe'
      };

      const response = await request(app)
        .post('/register')
        .send(validData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject invalid email', async () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe'
      };

      const response = await request(app)
        .post('/register')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Invalid email format');
    });

    it('should reject weak password', async () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'weak',
        firstName: 'John',
        lastName: 'Doe'
      };

      const response = await request(app)
        .post('/register')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Password must');
    });

    it('should sanitize and reject malicious names', async () => {
      const maliciousData = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        firstName: '<script>alert("xss")</script>',
        lastName: 'Doe'
      };

      const response = await request(app)
        .post('/register')
        .send(maliciousData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Coupon Creation Validation', () => {
    beforeEach(() => {
      app.use(validate(validationChains.createCoupon));
      app.post('/coupons', (req, res) => {
        res.json({ success: true, data: req.body });
      });
      app.use(errorHandler);
    });

    it('should accept valid coupon data', async () => {
      const validData = {
        code: 'SAVE20',
        description: 'Save 20% on your order',
        discountType: 'PERCENTAGE',
        faceValue: 20,
        expirationDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        usageLimit: 100,
        tags: ['sale', 'discount']
      };

      const response = await request(app)
        .post('/coupons')
        .send(validData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject invalid coupon code', async () => {
      const invalidData = {
        code: 'SAVE 20%', // Contains space and %
        discountType: 'PERCENTAGE',
        faceValue: 20
      };

      const response = await request(app)
        .post('/coupons')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Coupon code can only contain');
    });

    it('should reject percentage over 100%', async () => {
      const invalidData = {
        code: 'SAVE150',
        discountType: 'PERCENTAGE',
        faceValue: 150
      };

      const response = await request(app)
        .post('/coupons')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Percentage discount cannot exceed 100%');
    });

    it('should reject past expiration date', async () => {
      const invalidData = {
        code: 'EXPIRED',
        discountType: 'AMOUNT',
        faceValue: 10,
        expirationDate: new Date(Date.now() - 86400000).toISOString() // Yesterday
      };

      const response = await request(app)
        .post('/coupons')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('must be in the future');
    });

    it('should sanitize malicious description', async () => {
      const maliciousData = {
        code: 'SAVE20',
        description: '<script>alert("xss")</script>Great deal!',
        discountType: 'PERCENTAGE',
        faceValue: 20
      };

      const response = await request(app)
        .post('/coupons')
        .send(maliciousData);

      expect(response.status).toBe(200);
      expect(response.body.data.description).not.toContain('<script>');
      expect(response.body.data.description).toContain('Great deal!');
    });
  });

  describe('Query Parameter Validation', () => {
    beforeEach(() => {
      app.use(validate(validationChains.couponFilters));
      app.get('/coupons', (req, res) => {
        res.json({ success: true, query: req.query });
      });
      app.use(errorHandler);
    });

    it('should accept valid query parameters', async () => {
      const response = await request(app)
        .get('/coupons?search=test&page=1&limit=20&sortBy=createdAt&sortOrder=desc');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should reject invalid page number', async () => {
      const response = await request(app)
        .get('/coupons?page=0');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('page must be a valid integer greater than 1');
    });

    it('should reject invalid limit', async () => {
      const response = await request(app)
        .get('/coupons?limit=200');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('limit must be a valid integer');
    });

    it('should sanitize search parameter', async () => {
      const response = await request(app)
        .get('/coupons?search=<script>alert(1)</script>test');

      expect(response.status).toBe(200);
      expect(response.body.query.search).not.toContain('<script>');
      expect(response.body.query.search).toContain('test');
    });
  });

  describe('LDAP Injection Prevention', () => {
    it('should sanitize LDAP injection attempts', () => {
      const ldapInjection = 'admin)(|(password=*))';
      const sanitized = sanitizeString(ldapInjection);
      expect(sanitized).not.toContain('|(password=*');
    });
  });

  describe('Command Injection Prevention', () => {
    it('should sanitize command injection attempts', () => {
      const commandInjection = 'test; rm -rf /';
      const sanitized = sanitizeString(commandInjection);
      expect(sanitized).not.toContain('rm -rf');
    });
  });

  describe('Path Traversal Prevention', () => {
    it('should sanitize path traversal attempts', () => {
      const pathTraversal = '../../../etc/passwd';
      const sanitized = sanitizeString(pathTraversal);
      expect(sanitized).not.toContain('../');
    });
  });
});
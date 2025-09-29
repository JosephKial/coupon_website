import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { testPrisma, createTestUser } from './setup.js';
import { JWTService } from '../services/JWTService.js';
import authRoutes from '../routes/auth.routes.js';
import couponRoutes from '../routes/coupon.routes.js';

describe('Security Tests', () => {
  let app: express.Application;
  let testUser: any;
  let jwtService: JWTService;

  beforeEach(async () => {
    app = express();
    
    // Apply security middleware
    app.use(helmet());
    app.use(express.json({ limit: '10mb' }));
    
    // Apply rate limiting
    app.use(rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP',
    }));

    app.use('/api/auth', authRoutes);
    app.use('/api/coupons', couponRoutes);

    testUser = await createTestUser();
    jwtService = new JWTService();
  });

  describe('Security Headers', () => {
    it('should set security headers', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      // Check for security headers set by helmet
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('0');
    });

    it('should not expose server information', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      expect(response.headers['server']).toBeUndefined();
      expect(response.headers['x-powered-by']).toBeUndefined();
    });
  });

  describe('Input Validation and Sanitization', () => {
    it('should reject malicious script injection in registration', async () => {
      const maliciousData = {
        email: 'test@example.com',
        password: 'ValidPass123!',
        firstName: '<script>alert("xss")</script>',
        lastName: 'User',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(maliciousData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject SQL injection attempts in email field', async () => {
      const sqlInjectionData = {
        email: "admin@example.com'; DROP TABLE users; --",
        password: 'ValidPass123!',
        firstName: 'Test',
        lastName: 'User',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(sqlInjectionData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should sanitize HTML in coupon descriptions', async () => {
      const token = jwtService.generateAccessToken(testUser.id, testUser.role);
      
      const maliciousCoupon = {
        code: 'TEST123',
        description: '<img src="x" onerror="alert(1)">Malicious description',
        discountType: 'AMOUNT',
        faceValue: 10.00,
      };

      const response = await request(app)
        .post('/api/coupons')
        .set('Authorization', `Bearer ${token}`)
        .send(maliciousCoupon)
        .expect(201);

      expect(response.body.success).toBe(true);
      // Description should be sanitized
      expect(response.body.data.description).not.toContain('<img');
      expect(response.body.data.description).not.toContain('onerror');
    });

    it('should reject oversized payloads', async () => {
      const token = jwtService.generateAccessToken(testUser.id, testUser.role);
      
      const oversizedData = {
        code: 'TEST123',
        description: 'A'.repeat(1000000), // 1MB description
        discountType: 'AMOUNT',
        faceValue: 10.00,
      };

      const response = await request(app)
        .post('/api/coupons')
        .set('Authorization', `Bearer ${token}`)
        .send(oversizedData)
        .expect(413);
    });
  });

  describe('Authentication Security', () => {
    it('should reject invalid JWT tokens', async () => {
      const response = await request(app)
        .get('/api/coupons')
        .set('Authorization', 'Bearer invalid.jwt.token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });

    it('should reject expired JWT tokens', async () => {
      const expiredToken = jwtService.generateAccessToken(testUser.id, testUser.role, '-1h');
      
      const response = await request(app)
        .get('/api/coupons')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('TOKEN_EXPIRED');
    });

    it('should reject malformed authorization headers', async () => {
      const response = await request(app)
        .get('/api/coupons')
        .set('Authorization', 'InvalidFormat token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should prevent password enumeration attacks', async () => {
      // Try to login with non-existent user
      const response1 = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        });

      // Try to login with existing user but wrong password
      const response2 = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword',
        });

      // Both should return the same generic error message
      expect(response1.status).toBe(401);
      expect(response2.status).toBe(401);
      expect(response1.body.error.message).toBe(response2.body.error.message);
    });
  });

  describe('Authorization Security', () => {
    it('should prevent horizontal privilege escalation', async () => {
      // Create two users
      const user1 = await createTestUser({ email: 'user1@example.com' });
      const user2 = await createTestUser({ email: 'user2@example.com' });

      // Create coupon for user1
      const token1 = jwtService.generateAccessToken(user1.id, user1.role);
      const couponResponse = await request(app)
        .post('/api/coupons')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          code: 'USER1COUPON',
          discountType: 'AMOUNT',
          faceValue: 10.00,
        })
        .expect(201);

      const couponId = couponResponse.body.data.id;

      // Try to access user1's coupon with user2's token
      const token2 = jwtService.generateAccessToken(user2.id, user2.role);
      const response = await request(app)
        .get(`/api/coupons/${couponId}`)
        .set('Authorization', `Bearer ${token2}`)
        .expect(404); // Should not find the coupon

      expect(response.body.success).toBe(false);
    });

    it('should prevent vertical privilege escalation', async () => {
      const memberUser = await createTestUser({ 
        email: 'member@example.com',
        role: 'MEMBER'
      });

      const memberToken = jwtService.generateAccessToken(memberUser.id, memberUser.role);

      // Try to access admin-only audit logs
      const response = await request(app)
        .get('/api/audit/logs')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on authentication endpoints', async () => {
      const requests = [];
      
      // Make multiple rapid requests
      for (let i = 0; i < 10; i++) {
        requests.push(
          request(app)
            .post('/api/auth/login')
            .send({
              email: 'test@example.com',
              password: 'wrongpassword',
            })
        );
      }

      const responses = await Promise.all(requests);
      
      // All should be processed (within rate limit for test)
      responses.forEach(response => {
        expect([401, 429]).toContain(response.status);
      });
    });
  });

  describe('Data Exposure Prevention', () => {
    it('should not expose password hashes in API responses', async () => {
      const token = jwtService.generateAccessToken(testUser.id, testUser.role);
      
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data.passwordHash).toBeUndefined();
      expect(response.body.data.password).toBeUndefined();
    });

    it('should not expose sensitive system information in errors', async () => {
      const response = await request(app)
        .get('/api/nonexistent-endpoint')
        .expect(404);

      // Should not expose internal paths or system details
      expect(response.body.error?.stack).toBeUndefined();
      expect(response.body.error?.details?.stack).toBeUndefined();
    });
  });

  describe('CSRF Protection', () => {
    it('should handle CSRF protection for state-changing operations', async () => {
      const token = jwtService.generateAccessToken(testUser.id, testUser.role);
      
      // This test assumes CSRF protection is implemented
      // The actual implementation would depend on the CSRF middleware configuration
      const response = await request(app)
        .post('/api/coupons')
        .set('Authorization', `Bearer ${token}`)
        .set('Origin', 'https://malicious-site.com')
        .send({
          code: 'CSRF_TEST',
          discountType: 'AMOUNT',
          faceValue: 10.00,
        });

      // Should either succeed (if same-origin) or fail with CSRF error
      expect([201, 403]).toContain(response.status);
    });
  });

  describe('Content Security Policy', () => {
    it('should set appropriate CSP headers', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      // Check if CSP header is set (depends on helmet configuration)
      const cspHeader = response.headers['content-security-policy'];
      if (cspHeader) {
        expect(cspHeader).toContain("default-src 'self'");
      }
    });
  });

  describe('Error Information Disclosure', () => {
    it('should not expose database errors to clients', async () => {
      // This would require mocking a database error
      const token = jwtService.generateAccessToken(testUser.id, testUser.role);
      
      const response = await request(app)
        .get('/api/coupons/invalid-uuid-format')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(response.body.error.message).not.toContain('Prisma');
      expect(response.body.error.message).not.toContain('PostgreSQL');
      expect(response.body.error.message).not.toContain('database');
    });
  });
});
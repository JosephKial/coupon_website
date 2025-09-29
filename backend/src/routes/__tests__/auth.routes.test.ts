import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../../server.js';
import { redisClient } from '../../utils/redis.js';

// Mock Redis client
vi.mock('../../utils/redis.js', () => ({
  redisClient: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    flushAll: vi.fn(),
    set: vi.fn(),
    get: vi.fn(),
    del: vi.fn(),
    exists: vi.fn().mockResolvedValue(true),
    setJson: vi.fn(),
    getJson: vi.fn(),
  },
}));

// Mock Prisma client
const mockPrisma = {
  user: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    deleteMany: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
    findMany: vi.fn(),
    deleteMany: vi.fn(),
  },
  coupon: {
    deleteMany: vi.fn(),
  },
  $disconnect: vi.fn(),
};

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => mockPrisma),
}));

const prisma = new PrismaClient();

describe('Authentication Routes', () => {
  beforeAll(async () => {
    // Mock implementations are already set up
  });

  afterAll(async () => {
    // Clean up mocks
    vi.clearAllMocks();
  });

  beforeEach(async () => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      const mockUser = {
        id: 'user-123',
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: 'MEMBER',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        passwordHash: 'hashed-password',
      };

      // Mock user doesn't exist
      mockPrisma.user.findUnique.mockResolvedValue(null);
      // Mock user creation
      mockPrisma.user.create.mockResolvedValue(mockUser);
      // Mock audit log creation
      mockPrisma.auditLog.create.mockResolvedValue({});

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toMatchObject({
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: 'MEMBER',
        isActive: true,
      });
      expect(response.body.data.user.id).toBeDefined();
      expect(response.body.data.user.passwordHash).toBeUndefined();
    });

    it('should reject registration with invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'TestPassword123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('Invalid email format');
    });

    it('should reject registration with weak password', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'weak',
        firstName: 'John',
        lastName: 'Doe',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('Password must');
    });

    it('should reject registration with missing required fields', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
        // Missing firstName and lastName
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject registration with duplicate email', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      // Register first user
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Try to register with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CONFLICT');
      expect(response.body.error.message).toContain('already exists');
    });

    it('should create audit log for registration', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      const auditLogs = await prisma.auditLog.findMany({
        where: { action: 'USER_REGISTERED' },
      });

      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].resourceType).toBe('USER');
      expect(auditLogs[0].details).toMatchObject({
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
      });
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create a test user for login tests
      const userData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData);
    });

    it('should login successfully with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toMatchObject({
        email: loginData.email,
        firstName: 'John',
        lastName: 'Doe',
      });
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.headers['set-cookie']).toBeDefined();
      
      // Check that refresh token cookie is set
      const cookies = response.headers['set-cookie'];
      const refreshTokenCookie = cookies.find((cookie: string) => 
        cookie.startsWith('refreshToken=')
      );
      expect(refreshTokenCookie).toBeDefined();
      expect(refreshTokenCookie).toContain('HttpOnly');
    });

    it('should reject login with invalid email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'TestPassword123!',
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTHENTICATION_ERROR');
      expect(response.body.error.message).toContain('Invalid email or password');
    });

    it('should reject login with invalid password', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'WrongPassword123!',
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTHENTICATION_ERROR');
      expect(response.body.error.message).toContain('Invalid email or password');
    });

    it('should reject login with malformed request', async () => {
      const loginData = {
        email: 'invalid-email',
        password: 'TestPassword123!',
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should create audit log for successful login', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
      };

      await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      const auditLogs = await prisma.auditLog.findMany({
        where: { action: 'LOGIN_SUCCESS' },
      });

      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].resourceType).toBe('USER');
      expect(auditLogs[0].details).toMatchObject({
        email: loginData.email,
      });
    });

    it('should create audit log for failed login', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'WrongPassword123!',
      };

      await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      const auditLogs = await prisma.auditLog.findMany({
        where: { action: 'LOGIN_FAILED' },
      });

      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].resourceType).toBe('USER');
      expect(auditLogs[0].details).toMatchObject({
        email: loginData.email,
        reason: 'Invalid password',
      });
    });
  });

  describe('POST /api/auth/logout', () => {
    let accessToken: string;
    let refreshTokenCookie: string;

    beforeEach(async () => {
      // Create and login a test user
      const userData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData);

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
        });

      accessToken = loginResponse.body.data.accessToken;
      refreshTokenCookie = loginResponse.headers['set-cookie']
        .find((cookie: string) => cookie.startsWith('refreshToken='));
    });

    it('should logout successfully with valid token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Cookie', refreshTokenCookie)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Logout successful');
      
      // Check that refresh token cookie is cleared
      const cookies = response.headers['set-cookie'];
      const clearedCookie = cookies?.find((cookie: string) => 
        cookie.startsWith('refreshToken=;')
      );
      expect(clearedCookie).toBeDefined();
    });

    it('should reject logout without authentication', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTHENTICATION_ERROR');
    });

    it('should create audit log for logout', async () => {
      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Cookie', refreshTokenCookie)
        .expect(200);

      const auditLogs = await prisma.auditLog.findMany({
        where: { action: 'LOGOUT' },
      });

      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].resourceType).toBe('USER');
    });
  });

  describe('POST /api/auth/refresh', () => {
    let refreshTokenCookie: string;

    beforeEach(async () => {
      // Create and login a test user
      const userData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData);

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
        });

      refreshTokenCookie = loginResponse.headers['set-cookie']
        .find((cookie: string) => cookie.startsWith('refreshToken='));
    });

    it('should refresh tokens successfully with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', refreshTokenCookie)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.message).toBe('Tokens refreshed successfully');
      
      // Check that new refresh token cookie is set
      const cookies = response.headers['set-cookie'];
      const newRefreshTokenCookie = cookies?.find((cookie: string) => 
        cookie.startsWith('refreshToken=')
      );
      expect(newRefreshTokenCookie).toBeDefined();
    });

    it('should reject refresh without refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toContain('Refresh token not provided');
    });
  });

  describe('GET /api/auth/profile', () => {
    let accessToken: string;

    beforeEach(async () => {
      // Create and login a test user
      const userData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData);

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
        });

      accessToken = loginResponse.body.data.accessToken;
    });

    it('should get user profile successfully with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toMatchObject({
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'MEMBER',
        isActive: true,
      });
      expect(response.body.data.user.passwordHash).toBeUndefined();
    });

    it('should reject profile request without authentication', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTHENTICATION_ERROR');
    });

    it('should reject profile request with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTHENTICATION_ERROR');
    });
  });
});
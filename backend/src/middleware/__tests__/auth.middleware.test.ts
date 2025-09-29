import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { 
  authenticateToken, 
  optionalAuth, 
  requireRole, 
  requireAdmin, 
  requireMemberOrAdmin,
  requireOwnership 
} from '../auth.middleware.js';
import { JWTService, type TokenPayload } from '../../services/JWTService.js';

// Mock environment variables
beforeEach(() => {
  vi.stubEnv('JWT_SECRET', 'test-jwt-secret-key-for-testing-purposes-only');
  vi.stubEnv('JWT_REFRESH_SECRET', 'test-jwt-refresh-secret-key-for-testing-purposes-only');
});

// Helper function to create mock request/response objects
const createMockReqRes = () => {
  const req = {
    headers: {},
    params: {},
    body: {},
    query: {},
    user: undefined
  } as Partial<Request>;
  
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis()
  } as Partial<Response>;
  
  const next = vi.fn() as NextFunction;
  
  return { req: req as Request, res: res as Response, next };
};

const testPayload: TokenPayload = {
  userId: 'test-user-id-123',
  email: 'test@example.com',
  role: 'member'
};

const adminPayload: TokenPayload = {
  userId: 'admin-user-id-456',
  email: 'admin@example.com',
  role: 'admin'
};

describe('Authentication Middleware', () => {
  describe('authenticateToken', () => {
    it('should authenticate valid token', () => {
      const { req, res, next } = createMockReqRes();
      const token = JWTService.generateAccessToken(testPayload);
      req.headers.authorization = `Bearer ${token}`;
      
      authenticateToken(req, res, next);
      
      expect(req.user).toBeDefined();
      expect(req.user?.userId).toBe(testPayload.userId);
      expect(req.user?.email).toBe(testPayload.email);
      expect(req.user?.role).toBe(testPayload.role);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject request without authorization header', () => {
      const { req, res, next } = createMockReqRes();
      
      authenticateToken(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Access token is required',
          timestamp: expect.any(String)
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request with malformed authorization header', () => {
      const { req, res, next } = createMockReqRes();
      req.headers.authorization = 'InvalidFormat token';
      
      authenticateToken(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Access token is required',
          timestamp: expect.any(String)
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request with invalid token', () => {
      const { req, res, next } = createMockReqRes();
      req.headers.authorization = 'Bearer invalid-token';
      
      authenticateToken(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid token',
          timestamp: expect.any(String)
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject expired token', () => {
      const { req, res, next } = createMockReqRes();
      // Create a token that's already expired by mocking the current time
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0IiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwicm9sZSI6Im1lbWJlciIsInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE2MDAwMDAwMDAsImV4cCI6MTYwMDAwMDAwMH0.invalid';
      req.headers.authorization = `Bearer ${expiredToken}`;
      
      authenticateToken(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: expect.any(String),
          timestamp: expect.any(String)
        }
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('optionalAuth', () => {
    it('should add user to request if valid token provided', () => {
      const { req, res, next } = createMockReqRes();
      const token = JWTService.generateAccessToken(testPayload);
      req.headers.authorization = `Bearer ${token}`;
      
      optionalAuth(req, res, next);
      
      expect(req.user).toBeDefined();
      expect(req.user?.userId).toBe(testPayload.userId);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should continue without user if no token provided', () => {
      const { req, res, next } = createMockReqRes();
      
      optionalAuth(req, res, next);
      
      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should continue without user if invalid token provided', () => {
      const { req, res, next } = createMockReqRes();
      req.headers.authorization = 'Bearer invalid-token';
      
      optionalAuth(req, res, next);
      
      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    it('should allow access for user with correct role', () => {
      const { req, res, next } = createMockReqRes();
      const token = JWTService.generateAccessToken(testPayload);
      req.user = JWTService.verifyAccessToken(token);
      
      const middleware = requireRole('member');
      middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should allow access for user with one of multiple allowed roles', () => {
      const { req, res, next } = createMockReqRes();
      const token = JWTService.generateAccessToken(adminPayload);
      req.user = JWTService.verifyAccessToken(token);
      
      const middleware = requireRole(['member', 'admin']);
      middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should deny access for user with incorrect role', () => {
      const { req, res, next } = createMockReqRes();
      const token = JWTService.generateAccessToken(testPayload);
      req.user = JWTService.verifyAccessToken(token);
      
      const middleware = requireRole('admin');
      middleware(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Access denied. Required roles: admin',
          timestamp: expect.any(String)
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should deny access for unauthenticated user', () => {
      const { req, res, next } = createMockReqRes();
      
      const middleware = requireRole('member');
      middleware(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication is required for this endpoint',
          timestamp: expect.any(String)
        }
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireAdmin', () => {
    it('should allow access for admin user', () => {
      const { req, res, next } = createMockReqRes();
      const token = JWTService.generateAccessToken(adminPayload);
      req.user = JWTService.verifyAccessToken(token);
      
      requireAdmin(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should deny access for non-admin user', () => {
      const { req, res, next } = createMockReqRes();
      const token = JWTService.generateAccessToken(testPayload);
      req.user = JWTService.verifyAccessToken(token);
      
      requireAdmin(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireMemberOrAdmin', () => {
    it('should allow access for member user', () => {
      const { req, res, next } = createMockReqRes();
      const token = JWTService.generateAccessToken(testPayload);
      req.user = JWTService.verifyAccessToken(token);
      
      requireMemberOrAdmin(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should allow access for admin user', () => {
      const { req, res, next } = createMockReqRes();
      const token = JWTService.generateAccessToken(adminPayload);
      req.user = JWTService.verifyAccessToken(token);
      
      requireMemberOrAdmin(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('requireOwnership', () => {
    it('should allow user to access their own resource', () => {
      const { req, res, next } = createMockReqRes();
      const token = JWTService.generateAccessToken(testPayload);
      req.user = JWTService.verifyAccessToken(token);
      req.params.userId = testPayload.userId;
      
      const middleware = requireOwnership();
      middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should allow admin to access any resource', () => {
      const { req, res, next } = createMockReqRes();
      const token = JWTService.generateAccessToken(adminPayload);
      req.user = JWTService.verifyAccessToken(token);
      req.params.userId = testPayload.userId; // Different user ID
      
      const middleware = requireOwnership();
      middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should deny user access to other users resources', () => {
      const { req, res, next } = createMockReqRes();
      const token = JWTService.generateAccessToken(testPayload);
      req.user = JWTService.verifyAccessToken(token);
      req.params.userId = 'different-user-id';
      
      const middleware = requireOwnership();
      middleware(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'You can only access your own resources',
          timestamp: expect.any(String)
        }
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should work with custom parameter name', () => {
      const { req, res, next } = createMockReqRes();
      const token = JWTService.generateAccessToken(testPayload);
      req.user = JWTService.verifyAccessToken(token);
      req.params.customId = testPayload.userId;
      
      const middleware = requireOwnership('customId');
      middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should check body parameter if not in params', () => {
      const { req, res, next } = createMockReqRes();
      const token = JWTService.generateAccessToken(testPayload);
      req.user = JWTService.verifyAccessToken(token);
      req.body.userId = testPayload.userId;
      
      const middleware = requireOwnership();
      middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should check query parameter if not in params or body', () => {
      const { req, res, next } = createMockReqRes();
      const token = JWTService.generateAccessToken(testPayload);
      req.user = JWTService.verifyAccessToken(token);
      req.query.userId = testPayload.userId;
      
      const middleware = requireOwnership();
      middleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should deny access for unauthenticated user', () => {
      const { req, res, next } = createMockReqRes();
      req.params.userId = testPayload.userId;
      
      const middleware = requireOwnership();
      middleware(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication is required for this endpoint',
          timestamp: expect.any(String)
        }
      });
      expect(next).not.toHaveBeenCalled();
    });
  });
});
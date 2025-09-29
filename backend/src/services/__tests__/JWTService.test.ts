import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JWTService, type TokenPayload } from '../JWTService.js';

// Mock environment variables
const mockEnv = {
  JWT_SECRET: 'test-jwt-secret-key-for-testing-purposes-only',
  JWT_REFRESH_SECRET: 'test-jwt-refresh-secret-key-for-testing-purposes-only'
};

describe('JWTService', () => {
  const testPayload: TokenPayload = {
    userId: 'test-user-id-123',
    email: 'test@example.com',
    role: 'member'
  };

  beforeEach(() => {
    // Set up environment variables for each test
    vi.stubEnv('JWT_SECRET', mockEnv.JWT_SECRET);
    vi.stubEnv('JWT_REFRESH_SECRET', mockEnv.JWT_REFRESH_SECRET);
  });

  describe('generateAccessToken', () => {
    it('should generate a valid access token', () => {
      const token = JWTService.generateAccessToken(testPayload);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should include correct payload in access token', () => {
      const token = JWTService.generateAccessToken(testPayload);
      const decoded = JWTService.decodeToken(token);
      
      expect(decoded.userId).toBe(testPayload.userId);
      expect(decoded.email).toBe(testPayload.email);
      expect(decoded.role).toBe(testPayload.role);
      expect(decoded.type).toBe('access');
    });

    it('should throw error when JWT_SECRET is missing', () => {
      vi.stubEnv('JWT_SECRET', '');
      
      expect(() => JWTService.generateAccessToken(testPayload)).toThrow();
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token', () => {
      const token = JWTService.generateRefreshToken(testPayload);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should include correct payload in refresh token', () => {
      const token = JWTService.generateRefreshToken(testPayload);
      const decoded = JWTService.decodeToken(token);
      
      expect(decoded.userId).toBe(testPayload.userId);
      expect(decoded.email).toBe(testPayload.email);
      expect(decoded.role).toBe(testPayload.role);
      expect(decoded.type).toBe('refresh');
    });

    it('should use JWT_SECRET when JWT_REFRESH_SECRET is not set', () => {
      vi.stubEnv('JWT_REFRESH_SECRET', '');
      
      const token = JWTService.generateRefreshToken(testPayload);
      expect(token).toBeDefined();
    });
  });

  describe('generateTokenPair', () => {
    it('should generate both access and refresh tokens', () => {
      const tokenPair = JWTService.generateTokenPair(testPayload);
      
      expect(tokenPair.accessToken).toBeDefined();
      expect(tokenPair.refreshToken).toBeDefined();
      expect(tokenPair.accessToken).not.toBe(tokenPair.refreshToken);
    });

    it('should generate tokens with correct types', () => {
      const tokenPair = JWTService.generateTokenPair(testPayload);
      
      const accessDecoded = JWTService.decodeToken(tokenPair.accessToken);
      const refreshDecoded = JWTService.decodeToken(tokenPair.refreshToken);
      
      expect(accessDecoded.type).toBe('access');
      expect(refreshDecoded.type).toBe('refresh');
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify valid access token', () => {
      const token = JWTService.generateAccessToken(testPayload);
      const decoded = JWTService.verifyAccessToken(token);
      
      expect(decoded.userId).toBe(testPayload.userId);
      expect(decoded.email).toBe(testPayload.email);
      expect(decoded.role).toBe(testPayload.role);
      expect(decoded.type).toBe('access');
    });

    it('should throw error for empty token', () => {
      expect(() => JWTService.verifyAccessToken('')).toThrow('Token must be a non-empty string');
    });

    it('should throw error for null token', () => {
      expect(() => JWTService.verifyAccessToken(null as any)).toThrow('Token must be a non-empty string');
    });

    it('should throw error for invalid token format', () => {
      expect(() => JWTService.verifyAccessToken('invalid-token')).toThrow('Invalid token');
    });

    it('should throw error for refresh token used as access token', () => {
      const refreshToken = JWTService.generateRefreshToken(testPayload);
      expect(() => JWTService.verifyAccessToken(refreshToken)).toThrow('Invalid token');
    });

    it('should throw error for token with wrong secret', () => {
      // Generate token with different secret
      vi.stubEnv('JWT_SECRET', 'different-secret');
      const token = JWTService.generateAccessToken(testPayload);
      
      // Try to verify with original secret
      vi.stubEnv('JWT_SECRET', mockEnv.JWT_SECRET);
      expect(() => JWTService.verifyAccessToken(token)).toThrow('Invalid token');
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify valid refresh token', () => {
      const token = JWTService.generateRefreshToken(testPayload);
      const decoded = JWTService.verifyRefreshToken(token);
      
      expect(decoded.userId).toBe(testPayload.userId);
      expect(decoded.email).toBe(testPayload.email);
      expect(decoded.role).toBe(testPayload.role);
      expect(decoded.type).toBe('refresh');
    });

    it('should throw error for empty token', () => {
      expect(() => JWTService.verifyRefreshToken('')).toThrow('Token must be a non-empty string');
    });

    it('should throw error for access token used as refresh token', () => {
      const accessToken = JWTService.generateAccessToken(testPayload);
      expect(() => JWTService.verifyRefreshToken(accessToken)).toThrow('Invalid token');
    });

    it('should throw error for invalid token format', () => {
      expect(() => JWTService.verifyRefreshToken('invalid-token')).toThrow('Invalid token');
    });
  });

  describe('refreshTokens', () => {
    it('should generate new token pair from valid refresh token', async () => {
      const originalTokens = JWTService.generateTokenPair(testPayload);
      // Small delay to ensure different timestamps and jti values
      await new Promise(resolve => setTimeout(resolve, 1));
      const newTokens = JWTService.refreshTokens(originalTokens.refreshToken);
      
      expect(newTokens.accessToken).toBeDefined();
      expect(newTokens.refreshToken).toBeDefined();
      expect(newTokens.accessToken).not.toBe(originalTokens.accessToken);
      expect(newTokens.refreshToken).not.toBe(originalTokens.refreshToken);
    });

    it('should preserve user information in refreshed tokens', () => {
      const originalTokens = JWTService.generateTokenPair(testPayload);
      const newTokens = JWTService.refreshTokens(originalTokens.refreshToken);
      
      const newAccessDecoded = JWTService.verifyAccessToken(newTokens.accessToken);
      const newRefreshDecoded = JWTService.verifyRefreshToken(newTokens.refreshToken);
      
      expect(newAccessDecoded.userId).toBe(testPayload.userId);
      expect(newAccessDecoded.email).toBe(testPayload.email);
      expect(newAccessDecoded.role).toBe(testPayload.role);
      
      expect(newRefreshDecoded.userId).toBe(testPayload.userId);
      expect(newRefreshDecoded.email).toBe(testPayload.email);
      expect(newRefreshDecoded.role).toBe(testPayload.role);
    });

    it('should throw error for invalid refresh token', () => {
      expect(() => JWTService.refreshTokens('invalid-token')).toThrow('Invalid token');
    });

    it('should throw error for access token used for refresh', () => {
      const accessToken = JWTService.generateAccessToken(testPayload);
      expect(() => JWTService.refreshTokens(accessToken)).toThrow('Invalid token');
    });
  });

  describe('decodeToken', () => {
    it('should decode valid token without verification', () => {
      const token = JWTService.generateAccessToken(testPayload);
      const decoded = JWTService.decodeToken(token);
      
      expect(decoded.userId).toBe(testPayload.userId);
      expect(decoded.email).toBe(testPayload.email);
      expect(decoded.role).toBe(testPayload.role);
    });

    it('should return null for invalid token', () => {
      const decoded = JWTService.decodeToken('invalid-token');
      expect(decoded).toBeNull();
    });

    it('should return null for empty token', () => {
      const decoded = JWTService.decodeToken('');
      expect(decoded).toBeNull();
    });

    it('should return null for null token', () => {
      const decoded = JWTService.decodeToken(null as any);
      expect(decoded).toBeNull();
    });
  });

  describe('getTokenExpiration', () => {
    it('should return expiration date for valid token', () => {
      const token = JWTService.generateAccessToken(testPayload);
      const expiration = JWTService.getTokenExpiration(token);
      
      expect(expiration).toBeInstanceOf(Date);
      expect(expiration!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should return null for invalid token', () => {
      const expiration = JWTService.getTokenExpiration('invalid-token');
      expect(expiration).toBeNull();
    });

    it('should return null for empty token', () => {
      const expiration = JWTService.getTokenExpiration('');
      expect(expiration).toBeNull();
    });
  });

  describe('isTokenExpired', () => {
    it('should return false for valid non-expired token', () => {
      const token = JWTService.generateAccessToken(testPayload);
      const isExpired = JWTService.isTokenExpired(token);
      
      expect(isExpired).toBe(false);
    });

    it('should return true for invalid token', () => {
      const isExpired = JWTService.isTokenExpired('invalid-token');
      expect(isExpired).toBe(true);
    });

    it('should return true for empty token', () => {
      const isExpired = JWTService.isTokenExpired('');
      expect(isExpired).toBe(true);
    });
  });

  describe('extractUserId', () => {
    it('should extract user ID from valid token', () => {
      const token = JWTService.generateAccessToken(testPayload);
      const userId = JWTService.extractUserId(token);
      
      expect(userId).toBe(testPayload.userId);
    });

    it('should return null for invalid token', () => {
      const userId = JWTService.extractUserId('invalid-token');
      expect(userId).toBeNull();
    });

    it('should return null for empty token', () => {
      const userId = JWTService.extractUserId('');
      expect(userId).toBeNull();
    });

    it('should return null for token without userId', () => {
      // This would be a malformed token, but we should handle it gracefully
      const userId = JWTService.extractUserId('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub3RVc2VySWQiOiJ0ZXN0In0.invalid');
      expect(userId).toBeNull();
    });
  });

  describe('integration tests', () => {
    it('should handle complete token lifecycle', () => {
      // Generate initial tokens
      const initialTokens = JWTService.generateTokenPair(testPayload);
      
      // Verify access token
      const accessDecoded = JWTService.verifyAccessToken(initialTokens.accessToken);
      expect(accessDecoded.userId).toBe(testPayload.userId);
      
      // Verify refresh token
      const refreshDecoded = JWTService.verifyRefreshToken(initialTokens.refreshToken);
      expect(refreshDecoded.userId).toBe(testPayload.userId);
      
      // Refresh tokens
      const newTokens = JWTService.refreshTokens(initialTokens.refreshToken);
      
      // Verify new tokens work
      const newAccessDecoded = JWTService.verifyAccessToken(newTokens.accessToken);
      const newRefreshDecoded = JWTService.verifyRefreshToken(newTokens.refreshToken);
      
      expect(newAccessDecoded.userId).toBe(testPayload.userId);
      expect(newRefreshDecoded.userId).toBe(testPayload.userId);
    });

    it('should generate unique tokens for same payload', async () => {
      const tokens1 = JWTService.generateTokenPair(testPayload);
      // Small delay to ensure different jti values
      await new Promise(resolve => setTimeout(resolve, 1));
      const tokens2 = JWTService.generateTokenPair(testPayload);
      
      expect(tokens1.accessToken).not.toBe(tokens2.accessToken);
      expect(tokens1.refreshToken).not.toBe(tokens2.refreshToken);
    });

    it('should maintain token type separation', () => {
      const tokenPair = JWTService.generateTokenPair(testPayload);
      
      // Access token should not work as refresh token
      expect(() => JWTService.verifyRefreshToken(tokenPair.accessToken)).toThrow('Invalid token');
      
      // Refresh token should not work as access token
      expect(() => JWTService.verifyAccessToken(tokenPair.refreshToken)).toThrow('Invalid token');
    });
  });
});
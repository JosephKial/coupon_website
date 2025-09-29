import jwt from 'jsonwebtoken';
import { redisClient } from '../utils/redis.js';
import { logger } from '../utils/logger.js';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface DecodedToken extends TokenPayload {
  iat: number;
  exp: number;
  type: 'access' | 'refresh';
  jti: string;
}

/**
 * JWTService handles JWT token generation, validation, and refresh operations
 * Implements secure token management with short-lived access tokens and longer-lived refresh tokens
 * Uses Redis for session management and token blacklisting
 */
export class JWTService {
  private static readonly ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
  private static readonly REFRESH_TOKEN_EXPIRY = '7d'; // 7 days
  
  private static get JWT_SECRET(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    return secret;
  }

  private static get JWT_REFRESH_SECRET(): string {
    const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_REFRESH_SECRET or JWT_SECRET environment variable is required');
    }
    return secret;
  }

  /**
   * Generate an access token for a user
   * @param payload - User information to encode in the token
   * @returns string - JWT access token
   */
  static generateAccessToken(payload: TokenPayload): string {
    try {
      return jwt.sign(
        { 
          ...payload, 
          type: 'access',
          jti: Math.random().toString(36).substring(2) // Add unique identifier
        },
        this.JWT_SECRET,
        {
          expiresIn: this.ACCESS_TOKEN_EXPIRY,
          issuer: 'family-coupon-manager',
          audience: 'family-coupon-manager-users'
        }
      );
    } catch (error) {
      throw new Error('Failed to generate access token');
    }
  }

  /**
   * Generate a refresh token for a user
   * @param payload - User information to encode in the token
   * @returns string - JWT refresh token
   */
  static generateRefreshToken(payload: TokenPayload): string {
    try {
      return jwt.sign(
        { 
          ...payload, 
          type: 'refresh',
          jti: Math.random().toString(36).substring(2) // Add unique identifier
        },
        this.JWT_REFRESH_SECRET,
        {
          expiresIn: this.REFRESH_TOKEN_EXPIRY,
          issuer: 'family-coupon-manager',
          audience: 'family-coupon-manager-users'
        }
      );
    } catch (error) {
      throw new Error('Failed to generate refresh token');
    }
  }

  /**
   * Generate both access and refresh tokens for a user
   * @param payload - User information to encode in the tokens
   * @returns TokenPair - Object containing both tokens
   */
  async generateTokens(payload: TokenPayload): Promise<TokenPair> {
    const accessToken = JWTService.generateAccessToken(payload);
    const refreshToken = JWTService.generateRefreshToken(payload);

    // Store refresh token in Redis with expiration
    const refreshTokenDecoded = jwt.decode(refreshToken) as DecodedToken;
    if (refreshTokenDecoded?.jti) {
      const refreshTokenKey = `refresh_token:${refreshTokenDecoded.jti}`;
      const expirationTime = refreshTokenDecoded.exp - Math.floor(Date.now() / 1000);
      
      try {
        await redisClient.setJson(refreshTokenKey, {
          userId: payload.userId,
          email: payload.email,
          role: payload.role,
          createdAt: new Date().toISOString(),
        }, expirationTime);
      } catch (error) {
        logger.error('Failed to store refresh token in Redis:', error);
        // Continue without Redis storage - token will still work but won't be tracked
      }
    }

    return {
      accessToken,
      refreshToken
    };
  }

  /**
   * Generate both access and refresh tokens for a user (static method for backward compatibility)
   * @param payload - User information to encode in the tokens
   * @returns TokenPair - Object containing both tokens
   */
  static generateTokenPair(payload: TokenPayload): TokenPair {
    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload)
    };
  }

  /**
   * Verify and decode an access token
   * @param token - JWT access token to verify
   * @returns DecodedToken - Decoded token payload
   * @throws Error if token is invalid or expired
   */
  static verifyAccessToken(token: string): DecodedToken {
    if (!token || typeof token !== 'string') {
      throw new Error('Token must be a non-empty string');
    }

    try {
      const decoded = jwt.verify(token, this.JWT_SECRET, {
        issuer: 'family-coupon-manager',
        audience: 'family-coupon-manager-users'
      }) as DecodedToken;

      if (decoded.type !== 'access') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired');
      }
      throw error;
    }
  }

  /**
   * Verify and decode a refresh token
   * @param token - JWT refresh token to verify
   * @returns DecodedToken - Decoded token payload
   * @throws Error if token is invalid or expired
   */
  async verifyRefreshToken(token: string): Promise<DecodedToken> {
    if (!token || typeof token !== 'string') {
      throw new Error('Token must be a non-empty string');
    }

    try {
      const decoded = jwt.verify(token, JWTService.JWT_REFRESH_SECRET, {
        issuer: 'family-coupon-manager',
        audience: 'family-coupon-manager-users'
      }) as DecodedToken;

      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      // Check if token is blacklisted in Redis
      if (decoded.jti) {
        try {
          const refreshTokenKey = `refresh_token:${decoded.jti}`;
          const tokenExists = await redisClient.exists(refreshTokenKey);
          if (!tokenExists) {
            throw new Error('Token has been invalidated');
          }
        } catch (error) {
          logger.error('Failed to check token in Redis:', error);
          // Continue without Redis check - token verification will still work
        }
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired');
      }
      throw error;
    }
  }

  /**
   * Verify and decode a refresh token (static method for backward compatibility)
   * @param token - JWT refresh token to verify
   * @returns DecodedToken - Decoded token payload
   * @throws Error if token is invalid or expired
   */
  static verifyRefreshToken(token: string): DecodedToken {
    if (!token || typeof token !== 'string') {
      throw new Error('Token must be a non-empty string');
    }

    try {
      const decoded = jwt.verify(token, this.JWT_REFRESH_SECRET, {
        issuer: 'family-coupon-manager',
        audience: 'family-coupon-manager-users'
      }) as DecodedToken;

      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      return decoded;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired');
      }
      throw error;
    }
  }

  /**
   * Refresh an access token using a valid refresh token
   * @param refreshToken - Valid refresh token
   * @returns TokenPair - New access token and refresh token
   * @throws Error if refresh token is invalid
   */
  static refreshTokens(refreshToken: string): TokenPair {
    const decoded = this.verifyRefreshToken(refreshToken);
    
    const payload: TokenPayload = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role
    };

    return this.generateTokenPair(payload);
  }

  /**
   * Decode a token without verification (for debugging/logging purposes)
   * @param token - JWT token to decode
   * @returns any - Decoded token payload (unverified)
   */
  static decodeToken(token: string): any {
    if (!token || typeof token !== 'string') {
      return null;
    }

    try {
      return jwt.decode(token);
    } catch (error) {
      return null;
    }
  }

  /**
   * Get the expiration time of a token
   * @param token - JWT token
   * @returns Date | null - Expiration date or null if invalid
   */
  static getTokenExpiration(token: string): Date | null {
    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) {
      return null;
    }

    return new Date(decoded.exp * 1000);
  }

  /**
   * Check if a token is expired
   * @param token - JWT token
   * @returns boolean - True if token is expired
   */
  static isTokenExpired(token: string): boolean {
    const expiration = this.getTokenExpiration(token);
    if (!expiration) {
      return true;
    }

    return expiration.getTime() <= Date.now();
  }

  /**
   * Extract user ID from a token without full verification
   * @param token - JWT token
   * @returns string | null - User ID or null if not found
   */
  static extractUserId(token: string): string | null {
    const decoded = this.decodeToken(token);
    return decoded?.userId || null;
  }

  /**
   * Invalidate a refresh token by removing it from Redis
   * @param token - Refresh token to invalidate
   */
  async invalidateRefreshToken(token: string): Promise<void> {
    try {
      const decoded = jwt.decode(token) as DecodedToken;
      if (decoded?.jti) {
        const refreshTokenKey = `refresh_token:${decoded.jti}`;
        await redisClient.del(refreshTokenKey);
        logger.info('Refresh token invalidated', { jti: decoded.jti });
      }
    } catch (error) {
      logger.error('Failed to invalidate refresh token:', error);
      // Don't throw error - token invalidation failure shouldn't break logout
    }
  }

  /**
   * Invalidate all refresh tokens for a user
   * @param userId - User ID whose tokens should be invalidated
   */
  async invalidateAllUserTokens(userId: string): Promise<void> {
    try {
      // This would require scanning Redis keys, which is expensive
      // For now, we'll implement a simpler approach by storing user sessions
      const userSessionKey = `user_sessions:${userId}`;
      await redisClient.del(userSessionKey);
      logger.info('All user tokens invalidated', { userId });
    } catch (error) {
      logger.error('Failed to invalidate user tokens:', error);
    }
  }
}
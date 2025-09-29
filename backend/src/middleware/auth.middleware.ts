import { Request, Response, NextFunction } from 'express';
import { JWTService, type DecodedToken } from '../services/JWTService.js';

// Extend Express Request interface to include user information
declare global {
  namespace Express {
    interface Request {
      user?: DecodedToken;
    }
  }
}

/**
 * Authentication middleware that validates JWT tokens
 * Adds user information to request object if token is valid
 */
export const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!token) {
    res.status(401).json({
      success: false,
      error: {
        code: 'MISSING_TOKEN',
        message: 'Access token is required',
        timestamp: new Date().toISOString()
      }
    });
    return;
  }

  try {
    const decoded = JWTService.verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Invalid token';
    
    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: errorMessage,
        timestamp: new Date().toISOString()
      }
    });
  }
};

/**
 * Optional authentication middleware that adds user info if token is present
 * Does not reject requests without tokens
 */
export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!token) {
    next();
    return;
  }

  try {
    const decoded = JWTService.verifyAccessToken(token);
    req.user = decoded;
  } catch (error) {
    // Silently ignore invalid tokens for optional auth
    // This allows the request to continue without user context
  }

  next();
};

/**
 * Role-based authorization middleware
 * Requires authentication middleware to run first
 */
export const requireRole = (allowedRoles: string | string[]) => {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication is required for this endpoint',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `Access denied. Required roles: ${roles.join(', ')}`,
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    next();
  };
};

/**
 * Admin-only authorization middleware
 * Shorthand for requireRole('admin')
 */
export const requireAdmin = requireRole('admin');

/**
 * Member or admin authorization middleware
 * Allows both member and admin roles
 */
export const requireMemberOrAdmin = requireRole(['member', 'admin']);

/**
 * User ownership validation middleware
 * Ensures user can only access their own resources
 */
export const requireOwnership = (userIdParam: string = 'userId') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication is required for this endpoint',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    const requestedUserId = req.params[userIdParam] || req.body[userIdParam] || req.query[userIdParam];
    
    // Admin users can access any resource
    if (req.user.role === 'admin') {
      next();
      return;
    }

    // Regular users can only access their own resources
    if (req.user.userId !== requestedUserId) {
      res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'You can only access your own resources',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    next();
  };
};

// Alias for authenticateToken for backward compatibility
export const authMiddleware = authenticateToken;
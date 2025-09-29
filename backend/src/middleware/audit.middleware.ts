import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuditService } from '../services/AuditService.js';
import { AuthenticatedRequest } from '../types/common.types.js';
import { logger } from '../utils/logger.js';

// Global audit service instance
let auditService: AuditService;

/**
 * Initialize audit service
 */
export const initializeAuditService = (prisma: PrismaClient) => {
  auditService = new AuditService(prisma);
  return auditService;
};

/**
 * Get audit service instance
 */
export const getAuditService = (): AuditService => {
  if (!auditService) {
    throw new Error('Audit service not initialized');
  }
  return auditService;
};

/**
 * Middleware to automatically log API requests
 */
export const auditLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const originalSend = res.send;

  // Override res.send to capture response
  res.send = function(data) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    const success = res.statusCode < 400;

    // Log the request/response
    setImmediate(async () => {
      try {
        const authenticatedReq = req as AuthenticatedRequest;
        const userId = authenticatedReq.user?.id;

        // Determine action and resource type from the request
        const { action, resourceType, resourceId } = parseRequestDetails(req);

        if (action && resourceType) {
          await auditService.logEvent({
            userId,
            action,
            resourceType,
            resourceId,
            success,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            details: {
              method: req.method,
              url: req.url,
              statusCode: res.statusCode,
              duration,
              ...(req.body && Object.keys(req.body).length > 0 && {
                requestBody: sanitizeRequestBody(req.body),
              }),
              ...(req.query && Object.keys(req.query).length > 0 && {
                queryParams: req.query,
              }),
            },
            ...((!success && data) && {
              errorMessage: extractErrorMessage(data),
            }),
          });
        }
      } catch (error) {
        logger.error('Failed to log audit event', {
          error: error instanceof Error ? error.message : 'Unknown error',
          url: req.url,
          method: req.method,
        });
      }
    });

    return originalSend.call(this, data);
  };

  next();
};

/**
 * Parse request details to determine action and resource type
 */
function parseRequestDetails(req: Request): {
  action?: string;
  resourceType?: string;
  resourceId?: string;
} {
  const { method, path } = req;
  const pathParts = path.split('/').filter(Boolean);

  // Skip health checks and non-API endpoints
  if (path === '/health' || !path.startsWith('/api/')) {
    return {};
  }

  // Authentication endpoints
  if (path.startsWith('/api/auth/')) {
    const authAction = pathParts[2]; // register, login, logout, etc.
    return {
      action: authAction?.toUpperCase(),
      resourceType: 'USER',
    };
  }

  // Coupon endpoints
  if (path.startsWith('/api/coupons')) {
    let action: string;
    let resourceId: string | undefined;

    if (method === 'GET') {
      if (pathParts.length === 2) {
        // GET /api/coupons
        action = 'SEARCH';
      } else if (pathParts[2] === 'stats') {
        // GET /api/coupons/stats
        action = 'VIEW_STATS';
      } else {
        // GET /api/coupons/:id
        action = 'VIEW';
        resourceId = pathParts[2];
      }
    } else if (method === 'POST') {
      action = 'CREATE';
    } else if (method === 'PUT') {
      action = 'UPDATE';
      resourceId = pathParts[2];
    } else if (method === 'DELETE') {
      action = 'DELETE';
      resourceId = pathParts[2];
    } else {
      return {};
    }

    return {
      action,
      resourceType: 'COUPON',
      resourceId,
    };
  }

  return {};
}

/**
 * Sanitize request body for logging (remove sensitive data)
 */
function sanitizeRequestBody(body: any): any {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
  const sanitized = { ...body };

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
}

/**
 * Extract error message from response data
 */
function extractErrorMessage(data: any): string | undefined {
  try {
    if (typeof data === 'string') {
      const parsed = JSON.parse(data);
      return parsed.error?.message || parsed.message;
    } else if (typeof data === 'object' && data !== null) {
      return data.error?.message || data.message;
    }
  } catch {
    // If parsing fails, return undefined
  }
  return undefined;
}

/**
 * Middleware specifically for authentication events
 */
export const auditAuthEvent = (action: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;

    res.send = function(data) {
      const success = res.statusCode < 400;
      const authenticatedReq = req as AuthenticatedRequest;

      setImmediate(async () => {
        try {
          let userId: string | undefined;
          
          // Try to extract user ID from response or request
          if (success && data) {
            try {
              const responseData = typeof data === 'string' ? JSON.parse(data) : data;
              userId = responseData.data?.user?.id || authenticatedReq.user?.id;
            } catch {
              userId = authenticatedReq.user?.id;
            }
          }

          await auditService.logAuthEvent(
            action as any,
            userId,
            success,
            req.ip,
            req.get('User-Agent'),
            success ? undefined : extractErrorMessage(data),
            {
              method: req.method,
              url: req.url,
              statusCode: res.statusCode,
            }
          );
        } catch (error) {
          logger.error('Failed to log auth audit event', {
            error: error instanceof Error ? error.message : 'Unknown error',
            action,
            url: req.url,
          });
        }
      });

      return originalSend.call(this, data);
    };

    next();
  };
};

/**
 * Middleware for security events
 */
export const auditSecurityEvent = (action: string, details?: Record<string, any>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authenticatedReq = req as AuthenticatedRequest;
      
      await auditService.logSecurityEvent(
        action as any,
        authenticatedReq.user?.id,
        req.ip,
        req.get('User-Agent'),
        {
          method: req.method,
          url: req.url,
          ...details,
        }
      );
    } catch (error) {
      logger.error('Failed to log security audit event', {
        error: error instanceof Error ? error.message : 'Unknown error',
        action,
        url: req.url,
      });
    }

    next();
  };
};
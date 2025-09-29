import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import csrf from 'csrf';
import { logger } from '../utils/logger.js';

// CSRF token generator
const csrfTokens = new csrf();

/**
 * Enhanced Helmet configuration with strict security headers
 */
export const securityHeaders = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // Allow inline styles for Material-UI
        "https://fonts.googleapis.com"
      ],
      scriptSrc: [
        "'self'",
        // Add specific script sources if needed
      ],
      imgSrc: [
        "'self'",
        "data:",
        "https:"
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com"
      ],
      connectSrc: [
        "'self'",
        // Add API endpoints if needed
      ],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      manifestSrc: ["'self'"],
      workerSrc: ["'self'"],
      childSrc: ["'none'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    },
    reportOnly: false,
  },
  
  // HTTP Strict Transport Security
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  
  // X-Frame-Options
  frameguard: {
    action: 'deny',
  },
  
  // X-Content-Type-Options
  noSniff: true,
  
  // X-XSS-Protection (disabled as it's deprecated and can introduce vulnerabilities)
  xssFilter: false,
  
  // Referrer Policy
  referrerPolicy: {
    policy: ['strict-origin-when-cross-origin'],
  },
  
  // X-Permitted-Cross-Domain-Policies
  permittedCrossDomainPolicies: false,
  
  // X-DNS-Prefetch-Control
  dnsPrefetchControl: {
    allow: false,
  },
  
  // Expect-CT
  expectCt: {
    maxAge: 86400, // 24 hours
    enforce: true,
  },
  
  // Hide X-Powered-By header
  hidePoweredBy: true,
});

/**
 * HTTPS enforcement middleware
 */
export const httpsEnforcement = (req: Request, res: Response, next: NextFunction) => {
  // Skip HTTPS enforcement in development
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }
  
  // Check if request is secure
  const isSecure = req.secure || 
                   req.get('X-Forwarded-Proto') === 'https' ||
                   req.get('X-Forwarded-Ssl') === 'on';
  
  if (!isSecure) {
    logger.warn('Insecure HTTP request redirected to HTTPS', {
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });
    
    return res.redirect(301, `https://${req.get('Host')}${req.url}`);
  }
  
  next();
};

/**
 * CSRF protection middleware
 */
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  // Skip CSRF for GET, HEAD, OPTIONS requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  // Skip CSRF for API endpoints using JWT authentication
  // CSRF is primarily for browser-based attacks, JWT provides sufficient protection
  if (req.path.startsWith('/api/')) {
    return next();
  }
  
  const secret = process.env.CSRF_SECRET || 'default-csrf-secret';
  const token = req.get('X-CSRF-Token') || req.body._csrf;
  
  if (!token) {
    logger.warn('CSRF token missing', {
      url: req.url,
      method: req.method,
      ip: req.ip,
    });
    
    return res.status(403).json({
      success: false,
      error: {
        code: 'CSRF_TOKEN_MISSING',
        message: 'CSRF token is required',
        timestamp: new Date().toISOString(),
      },
    });
  }
  
  try {
    if (!csrfTokens.verify(secret, token)) {
      logger.warn('Invalid CSRF token', {
        url: req.url,
        method: req.method,
        ip: req.ip,
      });
      
      return res.status(403).json({
        success: false,
        error: {
          code: 'CSRF_TOKEN_INVALID',
          message: 'Invalid CSRF token',
          timestamp: new Date().toISOString(),
        },
      });
    }
  } catch (error) {
    logger.error('CSRF token verification error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      url: req.url,
      method: req.method,
      ip: req.ip,
    });
    
    return res.status(403).json({
      success: false,
      error: {
        code: 'CSRF_TOKEN_ERROR',
        message: 'CSRF token verification failed',
        timestamp: new Date().toISOString(),
      },
    });
  }
  
  next();
};

/**
 * Generate CSRF token endpoint
 */
export const generateCsrfToken = (req: Request, res: Response) => {
  const secret = process.env.CSRF_SECRET || 'default-csrf-secret';
  const token = csrfTokens.create(secret);
  
  res.json({
    success: true,
    data: {
      csrfToken: token,
    },
  });
};

/**
 * Enhanced rate limiting for different endpoint types
 */
export const createRateLimit = (options: {
  windowMs: number;
  max: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
}) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: options.message || 'Too many requests, please try again later.',
        timestamp: new Date().toISOString(),
      },
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        url: req.url,
        method: req.method,
        userAgent: req.get('User-Agent'),
      });
      
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: options.message || 'Too many requests, please try again later.',
          timestamp: new Date().toISOString(),
        },
      });
    },
  });
};

/**
 * Rate limiting configurations for different endpoints
 */
export const rateLimits = {
  // General API rate limit
  general: createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // 1000 requests per 15 minutes
    message: 'Too many API requests, please try again later.',
  }),
  
  // Authentication endpoints (stricter)
  auth: createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 attempts per 15 minutes
    message: 'Too many authentication attempts, please try again later.',
    skipSuccessfulRequests: true,
  }),
  
  // Password reset (very strict)
  passwordReset: createRateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 attempts per hour
    message: 'Too many password reset attempts, please try again later.',
  }),
  
  // Registration (moderate)
  registration: createRateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 registrations per hour
    message: 'Too many registration attempts, please try again later.',
  }),
  
  // CRUD operations (moderate)
  crud: createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // 200 operations per 15 minutes
    message: 'Too many operations, please try again later.',
  }),
  
  // Search operations (lenient)
  search: createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // 500 searches per 15 minutes
    message: 'Too many search requests, please try again later.',
  }),
};

/**
 * Security event logging middleware
 */
export const securityLogger = (req: Request, res: Response, next: NextFunction) => {
  // Log security-relevant events
  const originalSend = res.send;
  
  res.send = function(data) {
    // Log failed authentication attempts
    if (res.statusCode === 401 || res.statusCode === 403) {
      logger.warn('Security event: Access denied', {
        statusCode: res.statusCode,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString(),
      });
    }
    
    // Log suspicious activity patterns
    if (res.statusCode === 400 && req.body) {
      const suspiciousPatterns = [
        /<script/i,
        /javascript:/i,
        /on\w+\s*=/i,
        /union\s+select/i,
        /drop\s+table/i,
        /\|\(/,
        /\)\|/,
      ];
      
      const bodyString = JSON.stringify(req.body);
      const hasSuspiciousContent = suspiciousPatterns.some(pattern => 
        pattern.test(bodyString)
      );
      
      if (hasSuspiciousContent) {
        logger.warn('Security event: Suspicious input detected', {
          url: req.url,
          method: req.method,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          timestamp: new Date().toISOString(),
        });
      }
    }
    
    return originalSend.call(this, data);
  };
  
  next();
};

/**
 * IP whitelist/blacklist middleware
 */
export const ipFilter = (req: Request, res: Response, next: NextFunction) => {
  const clientIp = req.ip;
  
  // Blacklisted IPs (could be loaded from database or config)
  const blacklistedIPs = process.env.BLACKLISTED_IPS?.split(',') || [];
  
  if (blacklistedIPs.includes(clientIp)) {
    logger.warn('Blocked request from blacklisted IP', {
      ip: clientIp,
      url: req.url,
      method: req.method,
      userAgent: req.get('User-Agent'),
    });
    
    return res.status(403).json({
      success: false,
      error: {
        code: 'IP_BLOCKED',
        message: 'Access denied',
        timestamp: new Date().toISOString(),
      },
    });
  }
  
  next();
};
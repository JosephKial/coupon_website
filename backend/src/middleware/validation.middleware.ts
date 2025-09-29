import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult, ValidationChain } from 'express-validator';
import validator from 'validator';
import xss from 'xss';
import { ValidationError } from './error.middleware.js';
import { logger } from '../utils/logger.js';

// XSS sanitization options
const xssOptions = {
  whiteList: {}, // No HTML tags allowed
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script'],
};

/**
 * Sanitize string input to prevent XSS attacks
 */
export const sanitizeString = (input: string): string => {
  if (typeof input !== 'string') return input;
  
  // Remove XSS attempts
  let sanitized = xss(input, xssOptions);
  
  // Additional sanitization
  sanitized = validator.escape(sanitized);
  
  // Remove null bytes and control characters
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
  
  // Remove SQL injection patterns
  sanitized = sanitized.replace(/\b(DROP|DELETE|INSERT|UPDATE|SELECT|UNION|ALTER|CREATE|EXEC|EXECUTE)\b/gi, '');
  sanitized = sanitized.replace(/--/g, '');
  sanitized = sanitized.replace(/\/\*/g, '');
  sanitized = sanitized.replace(/\*\//g, '');
  
  // Remove LDAP injection patterns
  sanitized = sanitized.replace(/\|\(/g, '');
  sanitized = sanitized.replace(/\)\|/g, '');
  
  // Remove command injection patterns
  sanitized = sanitized.replace(/;\s*(rm|del|format|shutdown|reboot|halt)/gi, '');
  
  return sanitized.trim();
};

/**
 * Sanitize object recursively
 */
export const sanitizeObject = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  if (typeof obj === 'object') {
    // Convert NoSQL injection objects to strings
    if (Object.keys(obj).some(key => key.startsWith('$'))) {
      return JSON.stringify(obj);
    }
    
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[sanitizeString(key)] = sanitizeObject(value);
    }
    return sanitized;
  }
  
  return obj;
};

/**
 * Middleware to sanitize request body, query, and params
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Sanitize body
    if (req.body) {
      req.body = sanitizeObject(req.body);
    }
    
    // Sanitize query parameters
    if (req.query) {
      req.query = sanitizeObject(req.query);
    }
    
    // Sanitize URL parameters
    if (req.params) {
      req.params = sanitizeObject(req.params);
    }
    
    next();
  } catch (error) {
    logger.error('Error sanitizing input:', error);
    next(new ValidationError('Invalid input data'));
  }
};

/**
 * Middleware to handle validation results
 */
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.type === 'field' ? error.path : 'unknown',
      message: error.msg,
      value: error.type === 'field' ? error.value : undefined,
    }));
    
    logger.warn('Validation errors:', {
      errors: errorMessages,
      url: req.url,
      method: req.method,
      ip: req.ip,
    });
    
    throw new ValidationError(`Validation failed: ${errorMessages.map(e => e.message).join(', ')}`);
  }
  
  next();
};

/**
 * Common validation rules
 */
export const commonValidations = {
  // Email validation
  email: () => body('email')
    .isEmail()
    .withMessage('Invalid email format')
    .isLength({ max: 255 })
    .withMessage('Email must be less than 255 characters')
    .normalizeEmail(),
  
  // Password validation
  password: () => body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'),
  
  // Name validation
  name: (field: string) => body(field)
    .isLength({ min: 1, max: 100 })
    .withMessage(`${field} must be between 1 and 100 characters`)
    .matches(/^[a-zA-Z\s\-'\.]+$/)
    .withMessage(`${field} can only contain letters, spaces, hyphens, apostrophes, and periods`)
    .trim(),
  
  // UUID validation
  uuid: (field: string = 'id') => param(field)
    .isUUID()
    .withMessage(`Invalid ${field} format`),
  
  // Coupon code validation
  couponCode: () => body('code')
    .isLength({ min: 1, max: 100 })
    .withMessage('Coupon code must be between 1 and 100 characters')
    .matches(/^[A-Za-z0-9\-_]+$/)
    .withMessage('Coupon code can only contain letters, numbers, hyphens, and underscores')
    .trim(),
  
  // Description validation
  description: () => body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters')
    .trim(),
  
  // Numeric value validation
  positiveNumber: (field: string, max?: number) => body(field)
    .isFloat({ min: 0.01 })
    .withMessage(`${field} must be a positive number`)
    .custom((value) => {
      if (max && value > max) {
        throw new Error(`${field} must be less than ${max}`);
      }
      // Check decimal places
      const decimalPlaces = (value.toString().split('.')[1] || '').length;
      if (decimalPlaces > 2) {
        throw new Error(`${field} can have at most 2 decimal places`);
      }
      return true;
    }),
  
  // Integer validation
  positiveInteger: (field: string, max?: number) => body(field)
    .optional()
    .isInt({ min: 1 })
    .withMessage(`${field} must be a positive integer`)
    .custom((value) => {
      if (max && value > max) {
        throw new Error(`${field} must be less than ${max}`);
      }
      return true;
    }),
  
  // Date validation
  futureDate: (field: string) => body(field)
    .optional()
    .isISO8601()
    .withMessage(`${field} must be a valid date`)
    .custom((value) => {
      const date = new Date(value);
      if (date <= new Date()) {
        throw new Error(`${field} must be in the future`);
      }
      return true;
    }),
  
  // Array validation
  stringArray: (field: string, maxItems?: number, maxLength?: number) => body(field)
    .optional()
    .isArray()
    .withMessage(`${field} must be an array`)
    .custom((value) => {
      if (maxItems && value.length > maxItems) {
        throw new Error(`${field} can have at most ${maxItems} items`);
      }
      if (maxLength) {
        for (const item of value) {
          if (typeof item !== 'string' || item.length > maxLength) {
            throw new Error(`Each ${field} item must be a string with at most ${maxLength} characters`);
          }
        }
      }
      return true;
    }),
  
  // Query parameter validations
  queryString: (field: string) => query(field)
    .optional()
    .isLength({ max: 255 })
    .withMessage(`${field} must be less than 255 characters`)
    .trim(),
  
  queryNumber: (field: string, min?: number, max?: number) => query(field)
    .optional()
    .isFloat({ min, max })
    .withMessage(`${field} must be a valid number${min ? ` greater than ${min}` : ''}${max ? ` less than ${max}` : ''}`)
    .toFloat(),
  
  queryInteger: (field: string, min?: number, max?: number) => query(field)
    .optional()
    .isInt({ min, max })
    .withMessage(`${field} must be a valid integer${min ? ` greater than ${min}` : ''}${max ? ` less than ${max}` : ''}`)
    .toInt(),
  
  queryArray: (field: string) => query(field)
    .optional()
    .custom((value) => {
      // Handle both single values and arrays
      if (typeof value === 'string') {
        return true;
      }
      if (Array.isArray(value)) {
        return value.every(item => typeof item === 'string');
      }
      throw new Error(`${field} must be a string or array of strings`);
    }),
};

/**
 * Validation chains for specific endpoints
 */
export const validationChains = {
  // User registration
  registerUser: [
    commonValidations.email(),
    commonValidations.password(),
    commonValidations.name('firstName'),
    commonValidations.name('lastName'),
    body('role')
      .optional()
      .isIn(['ADMIN', 'MEMBER'])
      .withMessage('Role must be either ADMIN or MEMBER'),
  ],
  
  // User login
  loginUser: [
    commonValidations.email(),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
      .isLength({ max: 128 })
      .withMessage('Password must be less than 128 characters'),
  ],
  
  // Create coupon
  createCoupon: [
    commonValidations.couponCode(),
    commonValidations.description(),
    body('discountType')
      .isIn(['AMOUNT', 'PERCENTAGE'])
      .withMessage('Discount type must be either AMOUNT or PERCENTAGE'),
    commonValidations.positiveNumber('faceValue', 999999.99),
    commonValidations.futureDate('expirationDate'),
    commonValidations.positiveInteger('usageLimit', 1000000),
    commonValidations.stringArray('tags', 10, 50),
    // Custom validation for percentage discounts
    body().custom((body) => {
      if (body.discountType === 'PERCENTAGE' && body.faceValue > 100) {
        throw new Error('Percentage discount cannot exceed 100%');
      }
      return true;
    }),
  ],
  
  // Update coupon
  updateCoupon: [
    commonValidations.uuid(),
    commonValidations.couponCode().optional(),
    commonValidations.description(),
    body('discountType')
      .optional()
      .isIn(['AMOUNT', 'PERCENTAGE'])
      .withMessage('Discount type must be either AMOUNT or PERCENTAGE'),
    body('faceValue')
      .optional()
      .custom((value) => {
        if (value !== undefined) {
          return commonValidations.positiveNumber('faceValue', 999999.99).run({ body: { faceValue: value } } as any);
        }
        return true;
      }),
    body('expirationDate')
      .optional()
      .custom((value) => {
        if (value === null) return true; // Allow null to clear date
        if (value) {
          return commonValidations.futureDate('expirationDate').run({ body: { expirationDate: value } } as any);
        }
        return true;
      }),
    commonValidations.positiveInteger('usageLimit', 1000000),
    body('status')
      .optional()
      .isIn(['ACTIVE', 'EXPIRED', 'USED', 'DISABLED'])
      .withMessage('Status must be one of: ACTIVE, EXPIRED, USED, DISABLED'),
    commonValidations.stringArray('tags', 10, 50),
    // Custom validation for percentage discounts
    body().custom((body) => {
      if (body.discountType === 'PERCENTAGE' && body.faceValue > 100) {
        throw new Error('Percentage discount cannot exceed 100%');
      }
      return true;
    }),
  ],
  
  // Get coupon by ID
  getCoupon: [
    commonValidations.uuid(),
  ],
  
  // Delete coupon
  deleteCoupon: [
    commonValidations.uuid(),
  ],
  
  // Coupon filters
  couponFilters: [
    commonValidations.queryString('search'),
    commonValidations.queryArray('status'),
    commonValidations.queryArray('discountType'),
    commonValidations.queryNumber('minValue', 0),
    commonValidations.queryNumber('maxValue', 0),
    query('expirationDateFrom')
      .optional()
      .isISO8601()
      .withMessage('expirationDateFrom must be a valid date'),
    query('expirationDateTo')
      .optional()
      .isISO8601()
      .withMessage('expirationDateTo must be a valid date'),
    commonValidations.queryArray('tags'),
    query('createdBy')
      .optional()
      .isUUID()
      .withMessage('createdBy must be a valid UUID'),
    commonValidations.queryInteger('page', 1),
    commonValidations.queryInteger('limit', 1, 100),
    query('sortBy')
      .optional()
      .isIn(['createdAt', 'updatedAt', 'expirationDate', 'faceValue', 'code'])
      .withMessage('sortBy must be one of: createdAt, updatedAt, expirationDate, faceValue, code'),
    query('sortOrder')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('sortOrder must be either asc or desc'),
    // Custom validation for date ranges
    query().custom((query) => {
      if (query.minValue && query.maxValue && parseFloat(query.minValue) > parseFloat(query.maxValue)) {
        throw new Error('minValue must be less than or equal to maxValue');
      }
      if (query.expirationDateFrom && query.expirationDateTo) {
        const fromDate = new Date(query.expirationDateFrom);
        const toDate = new Date(query.expirationDateTo);
        if (fromDate > toDate) {
          throw new Error('expirationDateFrom must be less than or equal to expirationDateTo');
        }
      }
      return true;
    }),
  ],
};

/**
 * Create validation middleware for a specific endpoint
 */
export const validate = (validations: ValidationChain[]) => {
  return [
    sanitizeInput,
    ...validations,
    handleValidationErrors,
  ];
};
import { z } from 'zod';

// Audit Log Interface
export interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

// Audit Log creation interface
export interface CreateAuditLogData {
  userId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

// Audit Log response interface (with user info)
export interface AuditLogResponse extends Omit<AuditLog, 'userId'> {
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

// Audit Log filters interface
export interface AuditLogFilters {
  userId?: string;
  action?: string[];
  resourceType?: string[];
  resourceId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  ipAddress?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'action' | 'resourceType';
  sortOrder?: 'asc' | 'desc';
}

// Common audit actions
export enum AuditAction {
  // Authentication actions
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  LOGIN_FAILED = 'LOGIN_FAILED',
  REGISTER = 'REGISTER',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  TOKEN_REFRESH = 'TOKEN_REFRESH',
  
  // User management actions
  USER_CREATE = 'USER_CREATE',
  USER_UPDATE = 'USER_UPDATE',
  USER_DELETE = 'USER_DELETE',
  USER_ACTIVATE = 'USER_ACTIVATE',
  USER_DEACTIVATE = 'USER_DEACTIVATE',
  
  // Coupon management actions
  COUPON_CREATE = 'COUPON_CREATE',
  COUPON_UPDATE = 'COUPON_UPDATE',
  COUPON_DELETE = 'COUPON_DELETE',
  COUPON_VIEW = 'COUPON_VIEW',
  COUPON_SEARCH = 'COUPON_SEARCH',
  COUPON_USE = 'COUPON_USE',
  COUPON_ACTIVATE = 'COUPON_ACTIVATE',
  COUPON_DEACTIVATE = 'COUPON_DEACTIVATE',
  
  // Security actions
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  INVALID_TOKEN = 'INVALID_TOKEN',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY'
}

// Resource types
export enum ResourceType {
  USER = 'USER',
  COUPON = 'COUPON',
  AUTH = 'AUTH',
  SYSTEM = 'SYSTEM'
}

// Zod validation schemas
export const createAuditLogSchema = z.object({
  userId: z.string().uuid().optional(),
  action: z.string()
    .min(1, 'Action is required')
    .max(50, 'Action must be less than 50 characters'),
  resourceType: z.string()
    .min(1, 'Resource type is required')
    .max(50, 'Resource type must be less than 50 characters'),
  resourceId: z.string().uuid().optional(),
  details: z.record(z.any()).optional(),
  ipAddress: z.string()
    .ip('Invalid IP address format')
    .optional(),
  userAgent: z.string()
    .max(1000, 'User agent must be less than 1000 characters')
    .optional()
});

export const auditLogFiltersSchema = z.object({
  userId: z.string().uuid().optional(),
  action: z.array(z.string()).optional(),
  resourceType: z.array(z.string()).optional(),
  resourceId: z.string().uuid().optional(),
  dateFrom: z.string().datetime().transform((str) => new Date(str)).optional(),
  dateTo: z.string().datetime().transform((str) => new Date(str)).optional(),
  ipAddress: z.string().ip().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  sortBy: z.enum(['createdAt', 'action', 'resourceType']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
}).refine((data) => {
  if (data.dateFrom && data.dateTo) {
    return data.dateFrom <= data.dateTo;
  }
  return true;
}, {
  message: 'From date must be less than or equal to to date',
  path: ['dateFrom']
});

// Helper function to create audit log entries
export const createAuditLogEntry = (
  action: AuditAction,
  resourceType: ResourceType,
  options: {
    userId?: string;
    resourceId?: string;
    details?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
  } = {}
): CreateAuditLogData => ({
  action,
  resourceType,
  ...options
});

// Type inference from Zod schemas
export type CreateAuditLogInput = z.infer<typeof createAuditLogSchema>;
export type AuditLogFiltersInput = z.infer<typeof auditLogFiltersSchema>;
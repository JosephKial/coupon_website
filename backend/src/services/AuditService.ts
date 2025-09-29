import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

export interface AuditLogEntry {
  userId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
  timestamp?: Date;
}

export interface AuditLogFilter {
  userId?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  success?: boolean;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export class AuditService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Log an audit event
   */
  async logEvent(entry: AuditLogEntry): Promise<void> {
    try {
      // Log to database
      await this.prisma.auditLog.create({
        data: {
          userId: entry.userId || null,
          action: entry.action,
          resourceType: entry.resourceType,
          resourceId: entry.resourceId || null,
          details: entry.details || {},
          ipAddress: entry.ipAddress || null,
          userAgent: entry.userAgent || null,
          success: entry.success,
          errorMessage: entry.errorMessage || null,
          createdAt: entry.timestamp || new Date(),
        },
      });

      // Also log to application logger for immediate visibility
      const logLevel = entry.success ? 'info' : 'warn';
      logger[logLevel]('Audit event', {
        userId: entry.userId,
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        success: entry.success,
        ipAddress: entry.ipAddress,
        timestamp: entry.timestamp || new Date(),
        ...(entry.errorMessage && { error: entry.errorMessage }),
        ...(entry.details && { details: entry.details }),
      });
    } catch (error) {
      // If database logging fails, at least log to application logger
      logger.error('Failed to log audit event to database', {
        error: error instanceof Error ? error.message : 'Unknown error',
        auditEntry: entry,
      });
    }
  }

  /**
   * Log authentication events
   */
  async logAuthEvent(
    action: 'LOGIN' | 'LOGOUT' | 'REGISTER' | 'TOKEN_REFRESH' | 'PASSWORD_CHANGE',
    userId?: string,
    success: boolean = true,
    ipAddress?: string,
    userAgent?: string,
    errorMessage?: string,
    details?: Record<string, any>
  ): Promise<void> {
    await this.logEvent({
      userId,
      action,
      resourceType: 'USER',
      success,
      ipAddress,
      userAgent,
      errorMessage,
      details,
    });
  }

  /**
   * Log coupon-related events
   */
  async logCouponEvent(
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW' | 'SEARCH',
    couponId?: string,
    userId?: string,
    success: boolean = true,
    ipAddress?: string,
    userAgent?: string,
    errorMessage?: string,
    details?: Record<string, any>
  ): Promise<void> {
    await this.logEvent({
      userId,
      action,
      resourceType: 'COUPON',
      resourceId: couponId,
      success,
      ipAddress,
      userAgent,
      errorMessage,
      details,
    });
  }

  /**
   * Log security events
   */
  async logSecurityEvent(
    action: 'RATE_LIMIT_EXCEEDED' | 'INVALID_TOKEN' | 'SUSPICIOUS_ACTIVITY' | 'IP_BLOCKED' | 'CSRF_VIOLATION',
    userId?: string,
    ipAddress?: string,
    userAgent?: string,
    details?: Record<string, any>
  ): Promise<void> {
    await this.logEvent({
      userId,
      action,
      resourceType: 'SECURITY',
      success: false,
      ipAddress,
      userAgent,
      details,
    });
  }

  /**
   * Log system events
   */
  async logSystemEvent(
    action: 'STARTUP' | 'SHUTDOWN' | 'ERROR' | 'MAINTENANCE',
    success: boolean = true,
    errorMessage?: string,
    details?: Record<string, any>
  ): Promise<void> {
    await this.logEvent({
      action,
      resourceType: 'SYSTEM',
      success,
      errorMessage,
      details,
    });
  }

  /**
   * Get audit logs with filtering and pagination
   */
  async getAuditLogs(filter: AuditLogFilter = {}) {
    const {
      userId,
      action,
      resourceType,
      resourceId,
      success,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = filter;

    const where: any = {};

    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (resourceType) where.resourceType = resourceType;
    if (resourceId) where.resourceId = resourceId;
    if (success !== undefined) where.success = success;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get audit statistics
   */
  async getAuditStats(startDate?: Date, endDate?: Date) {
    const where: any = {};

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [
      totalEvents,
      successfulEvents,
      failedEvents,
      authEvents,
      couponEvents,
      securityEvents,
      systemEvents,
      eventsByAction,
      eventsByUser,
    ] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.count({ where: { ...where, success: true } }),
      this.prisma.auditLog.count({ where: { ...where, success: false } }),
      this.prisma.auditLog.count({ where: { ...where, resourceType: 'USER' } }),
      this.prisma.auditLog.count({ where: { ...where, resourceType: 'COUPON' } }),
      this.prisma.auditLog.count({ where: { ...where, resourceType: 'SECURITY' } }),
      this.prisma.auditLog.count({ where: { ...where, resourceType: 'SYSTEM' } }),
      this.prisma.auditLog.groupBy({
        by: ['action'],
        where,
        _count: { action: true },
        orderBy: { _count: { action: 'desc' } },
        take: 10,
      }),
      this.prisma.auditLog.groupBy({
        by: ['userId'],
        where: { ...where, userId: { not: null } },
        _count: { userId: true },
        orderBy: { _count: { userId: 'desc' } },
        take: 10,
      }),
    ]);

    return {
      totalEvents,
      successfulEvents,
      failedEvents,
      successRate: totalEvents > 0 ? (successfulEvents / totalEvents) * 100 : 0,
      eventsByResourceType: {
        auth: authEvents,
        coupon: couponEvents,
        security: securityEvents,
        system: systemEvents,
      },
      topActions: eventsByAction.map(item => ({
        action: item.action,
        count: item._count.action,
      })),
      topUsers: eventsByUser.map(item => ({
        userId: item.userId,
        count: item._count.userId,
      })),
    };
  }

  /**
   * Clean up old audit logs (for maintenance)
   */
  async cleanupOldLogs(olderThanDays: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.prisma.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    logger.info('Audit log cleanup completed', {
      deletedCount: result.count,
      cutoffDate,
    });

    return result.count;
  }

  /**
   * Get recent security events
   */
  async getRecentSecurityEvents(limit: number = 100) {
    return this.prisma.auditLog.findMany({
      where: {
        OR: [
          { resourceType: 'SECURITY' },
          { success: false },
          {
            action: {
              in: ['LOGIN', 'REGISTER', 'TOKEN_REFRESH'],
            },
            success: false,
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  /**
   * Detect suspicious activity patterns
   */
  async detectSuspiciousActivity(timeWindowMinutes: number = 15) {
    const cutoffTime = new Date();
    cutoffTime.setMinutes(cutoffTime.getMinutes() - timeWindowMinutes);

    // Multiple failed login attempts from same IP
    const failedLogins = await this.prisma.auditLog.groupBy({
      by: ['ipAddress'],
      where: {
        action: 'LOGIN',
        success: false,
        createdAt: { gte: cutoffTime },
        ipAddress: { not: null },
      },
      _count: { ipAddress: true },
      having: {
        ipAddress: { _count: { gte: 5 } },
      },
    });

    // Multiple different users from same IP
    const multipleUsersFromSameIP = await this.prisma.auditLog.groupBy({
      by: ['ipAddress'],
      where: {
        action: { in: ['LOGIN', 'REGISTER'] },
        createdAt: { gte: cutoffTime },
        ipAddress: { not: null },
        userId: { not: null },
      },
      _count: { userId: true },
      having: {
        userId: { _count: { gte: 3 } },
      },
    });

    // High volume of requests from single IP
    const highVolumeIPs = await this.prisma.auditLog.groupBy({
      by: ['ipAddress'],
      where: {
        createdAt: { gte: cutoffTime },
        ipAddress: { not: null },
      },
      _count: { ipAddress: true },
      having: {
        ipAddress: { _count: { gte: 100 } },
      },
    });

    return {
      failedLoginsByIP: failedLogins.map(item => ({
        ipAddress: item.ipAddress,
        failedAttempts: item._count.ipAddress,
      })),
      multipleUsersFromSameIP: multipleUsersFromSameIP.map(item => ({
        ipAddress: item.ipAddress,
        userCount: item._count.userId,
      })),
      highVolumeIPs: highVolumeIPs.map(item => ({
        ipAddress: item.ipAddress,
        requestCount: item._count.ipAddress,
      })),
    };
  }
}
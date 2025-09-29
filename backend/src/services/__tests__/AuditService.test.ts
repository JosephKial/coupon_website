import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { AuditService } from '../AuditService.js';

// Mock Prisma
const mockPrisma = {
  auditLog: {
    create: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
    deleteMany: vi.fn(),
  },
} as unknown as PrismaClient;

describe('AuditService', () => {
  let auditService: AuditService;

  beforeEach(() => {
    auditService = new AuditService(mockPrisma);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('logEvent', () => {
    it('should log an audit event to database', async () => {
      const mockCreate = vi.fn().mockResolvedValue({});
      (mockPrisma.auditLog.create as any) = mockCreate;

      const entry = {
        userId: 'user-123',
        action: 'LOGIN',
        resourceType: 'USER',
        success: true,
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      };

      await auditService.logEvent(entry);

      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          action: 'LOGIN',
          resourceType: 'USER',
          resourceId: null,
          details: {},
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
          success: true,
          errorMessage: null,
          createdAt: expect.any(Date),
        },
      });
    });

    it('should handle database errors gracefully', async () => {
      const mockCreate = vi.fn().mockRejectedValue(new Error('Database error'));
      (mockPrisma.auditLog.create as any) = mockCreate;

      const entry = {
        action: 'LOGIN',
        resourceType: 'USER',
        success: true,
      };

      // Should not throw
      await expect(auditService.logEvent(entry)).resolves.toBeUndefined();
    });
  });

  describe('logAuthEvent', () => {
    it('should log authentication events', async () => {
      const mockCreate = vi.fn().mockResolvedValue({});
      (mockPrisma.auditLog.create as any) = mockCreate;

      await auditService.logAuthEvent(
        'LOGIN',
        'user-123',
        true,
        '127.0.0.1',
        'test-agent'
      );

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-123',
          action: 'LOGIN',
          resourceType: 'USER',
          success: true,
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
        }),
      });
    });

    it('should log failed authentication events', async () => {
      const mockCreate = vi.fn().mockResolvedValue({});
      (mockPrisma.auditLog.create as any) = mockCreate;

      await auditService.logAuthEvent(
        'LOGIN',
        undefined,
        false,
        '127.0.0.1',
        'test-agent',
        'Invalid credentials'
      );

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: null,
          action: 'LOGIN',
          resourceType: 'USER',
          success: false,
          errorMessage: 'Invalid credentials',
        }),
      });
    });
  });

  describe('logCouponEvent', () => {
    it('should log coupon events', async () => {
      const mockCreate = vi.fn().mockResolvedValue({});
      (mockPrisma.auditLog.create as any) = mockCreate;

      await auditService.logCouponEvent(
        'CREATE',
        'coupon-123',
        'user-123',
        true,
        '127.0.0.1',
        'test-agent'
      );

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-123',
          action: 'CREATE',
          resourceType: 'COUPON',
          resourceId: 'coupon-123',
          success: true,
        }),
      });
    });
  });

  describe('logSecurityEvent', () => {
    it('should log security events', async () => {
      const mockCreate = vi.fn().mockResolvedValue({});
      (mockPrisma.auditLog.create as any) = mockCreate;

      await auditService.logSecurityEvent(
        'RATE_LIMIT_EXCEEDED',
        'user-123',
        '127.0.0.1',
        'test-agent',
        { attempts: 5 }
      );

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-123',
          action: 'RATE_LIMIT_EXCEEDED',
          resourceType: 'SECURITY',
          success: false,
          details: { attempts: 5 },
        }),
      });
    });
  });

  describe('logSystemEvent', () => {
    it('should log system events', async () => {
      const mockCreate = vi.fn().mockResolvedValue({});
      (mockPrisma.auditLog.create as any) = mockCreate;

      await auditService.logSystemEvent(
        'STARTUP',
        true,
        undefined,
        { port: 3001 }
      );

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: null,
          action: 'STARTUP',
          resourceType: 'SYSTEM',
          success: true,
          details: { port: 3001 },
        }),
      });
    });
  });

  describe('getAuditLogs', () => {
    it('should retrieve audit logs with pagination', async () => {
      const mockLogs = [
        {
          id: '1',
          action: 'LOGIN',
          resourceType: 'USER',
          success: true,
          createdAt: new Date(),
          user: { id: 'user-1', email: 'test@example.com' },
        },
      ];

      const mockFindMany = vi.fn().mockResolvedValue(mockLogs);
      const mockCount = vi.fn().mockResolvedValue(1);
      
      (mockPrisma.auditLog.findMany as any) = mockFindMany;
      (mockPrisma.auditLog.count as any) = mockCount;

      const result = await auditService.getAuditLogs({
        page: 1,
        limit: 10,
      });

      expect(result).toEqual({
        logs: mockLogs,
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          pages: 1,
        },
      });

      expect(mockFindMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
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
    });

    it('should filter audit logs by criteria', async () => {
      const mockFindMany = vi.fn().mockResolvedValue([]);
      const mockCount = vi.fn().mockResolvedValue(0);
      
      (mockPrisma.auditLog.findMany as any) = mockFindMany;
      (mockPrisma.auditLog.count as any) = mockCount;

      await auditService.getAuditLogs({
        userId: 'user-123',
        action: 'LOGIN',
        success: true,
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-12-31'),
      });

      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          action: 'LOGIN',
          success: true,
          createdAt: {
            gte: new Date('2023-01-01'),
            lte: new Date('2023-12-31'),
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 50,
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
    });
  });

  describe('getAuditStats', () => {
    it('should return audit statistics', async () => {
      const mockCount = vi.fn()
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(80)  // successful
        .mockResolvedValueOnce(20)  // failed
        .mockResolvedValueOnce(30)  // auth
        .mockResolvedValueOnce(50)  // coupon
        .mockResolvedValueOnce(10)  // security
        .mockResolvedValueOnce(10); // system

      const mockGroupBy = vi.fn()
        .mockResolvedValueOnce([
          { action: 'LOGIN', _count: { action: 25 } },
          { action: 'CREATE', _count: { action: 20 } },
        ])
        .mockResolvedValueOnce([
          { userId: 'user-1', _count: { userId: 15 } },
          { userId: 'user-2', _count: { userId: 10 } },
        ]);

      (mockPrisma.auditLog.count as any) = mockCount;
      (mockPrisma.auditLog.groupBy as any) = mockGroupBy;

      const stats = await auditService.getAuditStats();

      expect(stats).toEqual({
        totalEvents: 100,
        successfulEvents: 80,
        failedEvents: 20,
        successRate: 80,
        eventsByResourceType: {
          auth: 30,
          coupon: 50,
          security: 10,
          system: 10,
        },
        topActions: [
          { action: 'LOGIN', count: 25 },
          { action: 'CREATE', count: 20 },
        ],
        topUsers: [
          { userId: 'user-1', count: 15 },
          { userId: 'user-2', count: 10 },
        ],
      });
    });
  });

  describe('cleanupOldLogs', () => {
    it('should delete old audit logs', async () => {
      const mockDeleteMany = vi.fn().mockResolvedValue({ count: 50 });
      (mockPrisma.auditLog.deleteMany as any) = mockDeleteMany;

      const deletedCount = await auditService.cleanupOldLogs(90);

      expect(deletedCount).toBe(50);
      expect(mockDeleteMany).toHaveBeenCalledWith({
        where: {
          createdAt: {
            lt: expect.any(Date),
          },
        },
      });
    });
  });

  describe('detectSuspiciousActivity', () => {
    it('should detect suspicious activity patterns', async () => {
      const mockGroupBy = vi.fn()
        .mockResolvedValueOnce([
          { ipAddress: '192.168.1.1', _count: { ipAddress: 10 } },
        ])
        .mockResolvedValueOnce([
          { ipAddress: '192.168.1.2', _count: { userId: 5 } },
        ])
        .mockResolvedValueOnce([
          { ipAddress: '192.168.1.3', _count: { ipAddress: 150 } },
        ]);

      (mockPrisma.auditLog.groupBy as any) = mockGroupBy;

      const suspiciousActivity = await auditService.detectSuspiciousActivity(15);

      expect(suspiciousActivity).toEqual({
        failedLoginsByIP: [
          { ipAddress: '192.168.1.1', failedAttempts: 10 },
        ],
        multipleUsersFromSameIP: [
          { ipAddress: '192.168.1.2', userCount: 5 },
        ],
        highVolumeIPs: [
          { ipAddress: '192.168.1.3', requestCount: 150 },
        ],
      });
    });
  });
});
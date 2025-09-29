import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import auditRoutes from '../audit.routes.js';
import { testPrisma, createTestUser } from '../../test/setup.js';
import { JWTService } from '../../services/JWTService.js';

// Mock the audit middleware
vi.mock('../middleware/audit.middleware.js', () => ({
  getAuditService: () => ({
    getAuditLogs: vi.fn(),
    getAuditStats: vi.fn(),
    getRecentSecurityEvents: vi.fn(),
    detectSuspiciousActivity: vi.fn(),
    cleanupOldLogs: vi.fn(),
    logSystemEvent: vi.fn(),
  }),
}));

describe('Audit Routes', () => {
  let app: express.Application;
  let adminUser: any;
  let memberUser: any;
  let adminToken: string;
  let memberToken: string;
  let jwtService: JWTService;
  let mockAuditService: any;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    app.use('/api/audit', auditRoutes);

    // Create test users
    adminUser = await createTestUser({
      email: 'admin@example.com',
      role: 'ADMIN',
    });

    memberUser = await createTestUser({
      email: 'member@example.com',
      role: 'MEMBER',
    });

    // Create JWT tokens
    jwtService = new JWTService();
    adminToken = jwtService.generateAccessToken(adminUser.id, adminUser.role);
    memberToken = jwtService.generateAccessToken(memberUser.id, memberUser.role);

    // Get mock audit service
    const { getAuditService } = await import('../middleware/audit.middleware.js');
    mockAuditService = getAuditService();
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for all routes', async () => {
      const response = await request(app)
        .get('/api/audit/logs')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should require admin role for audit access', async () => {
      const response = await request(app)
        .get('/api/audit/logs')
        .set('Authorization', `Bearer ${memberToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should allow admin access to audit routes', async () => {
      mockAuditService.getAuditLogs.mockResolvedValue({
        logs: [],
        pagination: { page: 1, limit: 50, total: 0, totalPages: 0 },
      });

      const response = await request(app)
        .get('/api/audit/logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/audit/logs', () => {
    it('should get audit logs with default parameters', async () => {
      const mockResult = {
        logs: [
          {
            id: '1',
            action: 'LOGIN',
            resourceType: 'USER',
            createdAt: new Date(),
          },
        ],
        pagination: { page: 1, limit: 50, total: 1, totalPages: 1 },
      };

      mockAuditService.getAuditLogs.mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/audit/logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockResult);
      expect(mockAuditService.getAuditLogs).toHaveBeenCalledWith({
        userId: undefined,
        action: undefined,
        resourceType: undefined,
        resourceId: undefined,
        success: undefined,
        startDate: undefined,
        endDate: undefined,
        page: undefined,
        limit: undefined,
      });
    });

    it('should filter audit logs by parameters', async () => {
      const mockResult = {
        logs: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      };

      mockAuditService.getAuditLogs.mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/audit/logs')
        .query({
          userId: adminUser.id,
          action: 'LOGIN',
          resourceType: 'USER',
          success: 'true',
          page: '1',
          limit: '10',
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(mockAuditService.getAuditLogs).toHaveBeenCalledWith({
        userId: adminUser.id,
        action: 'LOGIN',
        resourceType: 'USER',
        resourceId: undefined,
        success: true,
        startDate: undefined,
        endDate: undefined,
        page: 1,
        limit: 10,
      });
    });

    it('should validate query parameters', async () => {
      const response = await request(app)
        .get('/api/audit/logs')
        .query({
          userId: 'invalid-uuid',
          page: '0',
          limit: '101',
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/audit/stats', () => {
    it('should get audit statistics', async () => {
      const mockStats = {
        totalEvents: 100,
        successfulEvents: 95,
        failedEvents: 5,
        topActions: [
          { action: 'LOGIN', count: 50 },
          { action: 'CREATE_COUPON', count: 30 },
        ],
        topUsers: [
          { userId: adminUser.id, count: 25 },
        ],
      };

      mockAuditService.getAuditStats.mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/audit/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockStats);
      expect(mockAuditService.getAuditStats).toHaveBeenCalledWith(undefined, undefined);
    });

    it('should get audit statistics with date range', async () => {
      const startDate = '2023-01-01T00:00:00.000Z';
      const endDate = '2023-12-31T23:59:59.999Z';

      mockAuditService.getAuditStats.mockResolvedValue({});

      const response = await request(app)
        .get('/api/audit/stats')
        .query({ startDate, endDate })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(mockAuditService.getAuditStats).toHaveBeenCalledWith(
        new Date(startDate),
        new Date(endDate)
      );
    });
  });

  describe('GET /api/audit/security-events', () => {
    it('should get recent security events', async () => {
      const mockEvents = [
        {
          id: '1',
          action: 'FAILED_LOGIN',
          resourceType: 'USER',
          success: false,
          createdAt: new Date(),
        },
      ];

      mockAuditService.getRecentSecurityEvents.mockResolvedValue(mockEvents);

      const response = await request(app)
        .get('/api/audit/security-events')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockEvents);
      expect(mockAuditService.getRecentSecurityEvents).toHaveBeenCalledWith(100);
    });

    it('should get security events with custom limit', async () => {
      mockAuditService.getRecentSecurityEvents.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/audit/security-events')
        .query({ limit: '50' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(mockAuditService.getRecentSecurityEvents).toHaveBeenCalledWith(50);
    });
  });

  describe('GET /api/audit/suspicious-activity', () => {
    it('should detect suspicious activity', async () => {
      const mockActivity = {
        suspiciousUsers: [
          {
            userId: memberUser.id,
            failedAttempts: 5,
            timeWindow: 15,
          },
        ],
        suspiciousIPs: [
          {
            ipAddress: '192.168.1.100',
            failedAttempts: 10,
            timeWindow: 15,
          },
        ],
      };

      mockAuditService.detectSuspiciousActivity.mockResolvedValue(mockActivity);

      const response = await request(app)
        .get('/api/audit/suspicious-activity')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockActivity);
      expect(mockAuditService.detectSuspiciousActivity).toHaveBeenCalledWith(15);
    });

    it('should use custom time window', async () => {
      mockAuditService.detectSuspiciousActivity.mockResolvedValue({});

      const response = await request(app)
        .get('/api/audit/suspicious-activity')
        .query({ timeWindow: '30' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(mockAuditService.detectSuspiciousActivity).toHaveBeenCalledWith(30);
    });
  });

  describe('POST /api/audit/cleanup', () => {
    it('should cleanup old audit logs', async () => {
      const deletedCount = 150;
      mockAuditService.cleanupOldLogs.mockResolvedValue(deletedCount);
      mockAuditService.logSystemEvent.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/audit/cleanup')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ olderThanDays: 60 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.deletedCount).toBe(deletedCount);
      expect(response.body.data.olderThanDays).toBe(60);

      expect(mockAuditService.cleanupOldLogs).toHaveBeenCalledWith(60);
      expect(mockAuditService.logSystemEvent).toHaveBeenCalledWith(
        'MAINTENANCE',
        true,
        undefined,
        {
          operation: 'audit_log_cleanup',
          deletedCount,
          olderThanDays: 60,
          performedBy: adminUser.id,
        }
      );
    });

    it('should use default retention period', async () => {
      mockAuditService.cleanupOldLogs.mockResolvedValue(50);
      mockAuditService.logSystemEvent.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/audit/cleanup')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(200);

      expect(mockAuditService.cleanupOldLogs).toHaveBeenCalledWith(90);
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      mockAuditService.getAuditLogs.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/audit/logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });
});
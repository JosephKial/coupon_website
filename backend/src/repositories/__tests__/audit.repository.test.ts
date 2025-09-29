import { describe, it, expect, beforeEach } from 'vitest';
import { AuditRepository } from '../audit.repository.js';
import { testPrisma, createTestUser, createTestAuditLog } from '../../test/setup.js';

describe('AuditRepository', () => {
  let auditRepository: AuditRepository;
  let testUser: any;

  beforeEach(async () => {
    auditRepository = new AuditRepository(testPrisma);
    testUser = await createTestUser();
  });

  describe('create', () => {
    it('should create an audit log entry', async () => {
      const auditData = {
        userId: testUser.id,
        action: 'CREATE_COUPON',
        resourceType: 'COUPON',
        resourceId: 'coupon-123',
        details: { couponCode: 'TEST123' },
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };

      const auditLog = await auditRepository.create(auditData);

      expect(auditLog).toBeDefined();
      expect(auditLog.userId).toBe(testUser.id);
      expect(auditLog.action).toBe('CREATE_COUPON');
      expect(auditLog.resourceType).toBe('COUPON');
      expect(auditLog.resourceId).toBe('coupon-123');
      expect(auditLog.details).toEqual({ couponCode: 'TEST123' });
      expect(auditLog.ipAddress).toBe('192.168.1.1');
      expect(auditLog.userAgent).toBe('Mozilla/5.0');
      expect(auditLog.createdAt).toBeInstanceOf(Date);
    });

    it('should create audit log without optional fields', async () => {
      const auditData = {
        action: 'SYSTEM_ACTION',
        resourceType: 'SYSTEM',
      };

      const auditLog = await auditRepository.create(auditData);

      expect(auditLog).toBeDefined();
      expect(auditLog.userId).toBeNull();
      expect(auditLog.action).toBe('SYSTEM_ACTION');
      expect(auditLog.resourceType).toBe('SYSTEM');
      expect(auditLog.resourceId).toBeNull();
    });
  });

  describe('findByUserId', () => {
    it('should find audit logs by user ID', async () => {
      // Create multiple audit logs for the user
      await createTestAuditLog({ userId: testUser.id, action: 'ACTION_1' });
      await createTestAuditLog({ userId: testUser.id, action: 'ACTION_2' });
      await createTestAuditLog({ action: 'ACTION_3' }); // Different user

      const auditLogs = await auditRepository.findByUserId(testUser.id);

      expect(auditLogs).toHaveLength(2);
      expect(auditLogs[0].userId).toBe(testUser.id);
      expect(auditLogs[1].userId).toBe(testUser.id);
    });

    it('should limit results when specified', async () => {
      // Create multiple audit logs
      for (let i = 0; i < 5; i++) {
        await createTestAuditLog({ userId: testUser.id, action: `ACTION_${i}` });
      }

      const auditLogs = await auditRepository.findByUserId(testUser.id, 3);

      expect(auditLogs).toHaveLength(3);
    });

    it('should return empty array for non-existent user', async () => {
      const auditLogs = await auditRepository.findByUserId('non-existent-id');

      expect(auditLogs).toHaveLength(0);
    });
  });

  describe('findByAction', () => {
    it('should find audit logs by action', async () => {
      await createTestAuditLog({ action: 'LOGIN' });
      await createTestAuditLog({ action: 'LOGIN' });
      await createTestAuditLog({ action: 'LOGOUT' });

      const auditLogs = await auditRepository.findByAction('LOGIN');

      expect(auditLogs).toHaveLength(2);
      expect(auditLogs[0].action).toBe('LOGIN');
      expect(auditLogs[1].action).toBe('LOGIN');
    });

    it('should limit results when specified', async () => {
      for (let i = 0; i < 5; i++) {
        await createTestAuditLog({ action: 'BULK_ACTION' });
      }

      const auditLogs = await auditRepository.findByAction('BULK_ACTION', 2);

      expect(auditLogs).toHaveLength(2);
    });
  });

  describe('findByResourceType', () => {
    it('should find audit logs by resource type', async () => {
      await createTestAuditLog({ resourceType: 'COUPON' });
      await createTestAuditLog({ resourceType: 'COUPON' });
      await createTestAuditLog({ resourceType: 'USER' });

      const auditLogs = await auditRepository.findByResourceType('COUPON');

      expect(auditLogs).toHaveLength(2);
      expect(auditLogs[0].resourceType).toBe('COUPON');
      expect(auditLogs[1].resourceType).toBe('COUPON');
    });

    it('should return results ordered by creation date descending', async () => {
      const first = await createTestAuditLog({ resourceType: 'TEST', action: 'FIRST' });
      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
      const second = await createTestAuditLog({ resourceType: 'TEST', action: 'SECOND' });

      const auditLogs = await auditRepository.findByResourceType('TEST');

      expect(auditLogs).toHaveLength(2);
      expect(auditLogs[0].action).toBe('SECOND'); // Most recent first
      expect(auditLogs[1].action).toBe('FIRST');
    });
  });
});
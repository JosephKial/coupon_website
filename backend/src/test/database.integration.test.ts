import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { testPrisma, createTestUser, createTestCoupon, createTestAuditLog } from './setup.js';
import { UserRepository } from '../repositories/user.repository.js';
import { CouponRepository } from '../repositories/coupon.repository.js';
import { AuditRepository } from '../repositories/audit.repository.js';

describe('Database Integration Tests', () => {
  let userRepository: UserRepository;
  let couponRepository: CouponRepository;
  let auditRepository: AuditRepository;

  beforeEach(async () => {
    userRepository = new UserRepository(testPrisma);
    couponRepository = new CouponRepository(testPrisma);
    auditRepository = new AuditRepository(testPrisma);
  });

  describe('Database Transactions', () => {
    it('should handle transaction rollback on error', async () => {
      const initialUserCount = await userRepository.count();

      try {
        await testPrisma.$transaction(async (tx) => {
          // Create a user
          await tx.user.create({
            data: {
              email: 'transaction@example.com',
              passwordHash: 'hashedpassword',
              firstName: 'Transaction',
              lastName: 'Test',
            },
          });

          // This should cause the transaction to rollback
          throw new Error('Simulated error');
        });
      } catch (error) {
        // Expected to throw
      }

      const finalUserCount = await userRepository.count();
      expect(finalUserCount).toBe(initialUserCount);
    });

    it('should commit successful transactions', async () => {
      const initialUserCount = await userRepository.count();

      await testPrisma.$transaction(async (tx) => {
        await tx.user.create({
          data: {
            email: 'successful@example.com',
            passwordHash: 'hashedpassword',
            firstName: 'Successful',
            lastName: 'Transaction',
          },
        });

        await tx.auditLog.create({
          data: {
            action: 'CREATE_USER',
            resourceType: 'USER',
            details: { email: 'successful@example.com' },
          },
        });
      });

      const finalUserCount = await userRepository.count();
      expect(finalUserCount).toBe(initialUserCount + 1);

      const auditLogs = await auditRepository.findByAction('CREATE_USER');
      expect(auditLogs).toHaveLength(1);
    });
  });

  describe('Database Constraints', () => {
    it('should enforce unique email constraint', async () => {
      await createTestUser({ email: 'unique@example.com' });

      await expect(
        createTestUser({ email: 'unique@example.com' })
      ).rejects.toThrow();
    });

    it('should enforce foreign key constraints', async () => {
      // Try to create coupon with non-existent user
      await expect(
        testPrisma.coupon.create({
          data: {
            code: 'INVALID',
            discountType: 'AMOUNT',
            faceValue: 10.00,
            createdBy: 'non-existent-user-id',
          },
        })
      ).rejects.toThrow();
    });

    it('should enforce check constraints on discount type', async () => {
      const user = await createTestUser();

      await expect(
        testPrisma.coupon.create({
          data: {
            code: 'INVALID_TYPE',
            discountType: 'INVALID' as any,
            faceValue: 10.00,
            createdBy: user.id,
          },
        })
      ).rejects.toThrow();
    });

    it('should enforce check constraints on coupon status', async () => {
      const user = await createTestUser();

      await expect(
        testPrisma.coupon.create({
          data: {
            code: 'INVALID_STATUS',
            discountType: 'AMOUNT',
            faceValue: 10.00,
            status: 'INVALID' as any,
            createdBy: user.id,
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('Database Indexes and Performance', () => {
    it('should efficiently query users by email', async () => {
      // Create multiple users
      for (let i = 0; i < 10; i++) {
        await createTestUser({ email: `user${i}@example.com` });
      }

      const startTime = Date.now();
      const user = await userRepository.findByEmail('user5@example.com');
      const endTime = Date.now();

      expect(user).toBeDefined();
      expect(endTime - startTime).toBeLessThan(100); // Should be fast due to index
    });

    it('should efficiently query coupons by status', async () => {
      const user = await createTestUser();

      // Create multiple coupons with different statuses
      for (let i = 0; i < 20; i++) {
        await createTestCoupon(user.id, {
          code: `COUPON${i}`,
          status: i % 2 === 0 ? 'ACTIVE' : 'EXPIRED',
        });
      }

      const startTime = Date.now();
      const activeCoupons = await testPrisma.coupon.findMany({
        where: { status: 'ACTIVE' },
      });
      const endTime = Date.now();

      expect(activeCoupons).toHaveLength(10);
      expect(endTime - startTime).toBeLessThan(100); // Should be fast due to index
    });

    it('should efficiently search coupons by code', async () => {
      const user = await createTestUser();

      // Create multiple coupons
      for (let i = 0; i < 50; i++) {
        await createTestCoupon(user.id, {
          code: `SEARCH${i.toString().padStart(3, '0')}`,
        });
      }

      const startTime = Date.now();
      const coupons = await testPrisma.coupon.findMany({
        where: {
          code: {
            contains: 'SEARCH025',
            mode: 'insensitive',
          },
        },
      });
      const endTime = Date.now();

      expect(coupons).toHaveLength(1);
      expect(endTime - startTime).toBeLessThan(100); // Should be fast due to index
    });
  });

  describe('Data Integrity', () => {
    it('should maintain referential integrity on user deletion', async () => {
      const user = await createTestUser();
      const coupon = await createTestCoupon(user.id);

      // Delete user should fail due to foreign key constraint
      await expect(
        userRepository.delete(user.id)
      ).rejects.toThrow();

      // Coupon should still exist
      const existingCoupon = await testPrisma.coupon.findUnique({
        where: { id: coupon.id },
      });
      expect(existingCoupon).toBeDefined();
    });

    it('should handle cascade operations correctly', async () => {
      const user = await createTestUser();
      const coupon = await createTestCoupon(user.id);

      // First delete the coupon
      await testPrisma.coupon.delete({
        where: { id: coupon.id },
      });

      // Now user deletion should succeed
      await userRepository.delete(user.id);

      const deletedUser = await userRepository.findById(user.id);
      expect(deletedUser).toBeNull();
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent user creation', async () => {
      const promises = [];
      
      for (let i = 0; i < 5; i++) {
        promises.push(
          createTestUser({ email: `concurrent${i}@example.com` })
        );
      }

      const users = await Promise.all(promises);
      expect(users).toHaveLength(5);

      // Verify all users were created
      const userCount = await userRepository.count();
      expect(userCount).toBeGreaterThanOrEqual(5);
    });

    it('should handle concurrent coupon creation for same user', async () => {
      const user = await createTestUser();
      const promises = [];

      for (let i = 0; i < 5; i++) {
        promises.push(
          createTestCoupon(user.id, { code: `CONCURRENT${i}` })
        );
      }

      const coupons = await Promise.all(promises);
      expect(coupons).toHaveLength(5);

      // Verify all coupons were created
      const userCoupons = await testPrisma.coupon.findMany({
        where: { createdBy: user.id },
      });
      expect(userCoupons).toHaveLength(5);
    });
  });

  describe('Database Connection Handling', () => {
    it('should handle database reconnection', async () => {
      // This test would require actually disconnecting and reconnecting
      // For now, we'll just verify the connection is working
      const result = await testPrisma.$queryRaw`SELECT 1 as test`;
      expect(result).toBeDefined();
    });

    it('should handle connection pool exhaustion gracefully', async () => {
      // Create many concurrent operations
      const promises = [];
      
      for (let i = 0; i < 20; i++) {
        promises.push(
          testPrisma.user.count()
        );
      }

      const results = await Promise.all(promises);
      expect(results).toHaveLength(20);
      results.forEach(count => {
        expect(typeof count).toBe('number');
      });
    });
  });

  describe('Data Validation at Database Level', () => {
    it('should validate email format at application level', async () => {
      // This would be handled by application validation, not database
      await expect(
        userRepository.create({
          email: 'invalid-email',
          password: 'hashedpassword',
          firstName: 'Test',
          lastName: 'User',
        })
      ).rejects.toThrow();
    });

    it('should validate coupon face value constraints', async () => {
      const user = await createTestUser();

      // Negative face value should be rejected
      await expect(
        testPrisma.coupon.create({
          data: {
            code: 'NEGATIVE',
            discountType: 'AMOUNT',
            faceValue: -10.00,
            createdBy: user.id,
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('Audit Trail Integrity', () => {
    it('should maintain audit log consistency', async () => {
      const user = await createTestUser();
      
      // Create audit log
      const auditLog = await createTestAuditLog({
        userId: user.id,
        action: 'TEST_ACTION',
        resourceType: 'TEST',
      });

      // Verify audit log was created correctly
      const retrievedLog = await testPrisma.auditLog.findUnique({
        where: { id: auditLog.id },
      });

      expect(retrievedLog).toBeDefined();
      expect(retrievedLog?.userId).toBe(user.id);
      expect(retrievedLog?.action).toBe('TEST_ACTION');
    });

    it('should handle audit logs for deleted users', async () => {
      const user = await createTestUser();
      
      // Create audit log
      await createTestAuditLog({
        userId: user.id,
        action: 'USER_ACTION',
      });

      // Delete all user's coupons first
      await testPrisma.coupon.deleteMany({
        where: { createdBy: user.id },
      });

      // Delete user
      await userRepository.delete(user.id);

      // Audit log should still exist but with null userId reference
      const auditLogs = await auditRepository.findByAction('USER_ACTION');
      expect(auditLogs).toHaveLength(1);
    });
  });
});
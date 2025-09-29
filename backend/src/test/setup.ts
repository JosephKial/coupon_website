import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';

// Mock Redis before importing it
vi.mock('redis', () => ({
  createClient: vi.fn(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    set: vi.fn().mockResolvedValue('OK'),
    setEx: vi.fn().mockResolvedValue('OK'),
    get: vi.fn().mockResolvedValue(null),
    del: vi.fn().mockResolvedValue(1),
    exists: vi.fn().mockResolvedValue(0),
    flushAll: vi.fn().mockResolvedValue('OK'),
    on: vi.fn(),
  })),
}));

// Test database instance
export const testPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
    },
  },
});

// Global test setup
beforeAll(async () => {
  // Redis is mocked, no need to connect
});

afterAll(async () => {
  // Cleanup connections
  await testPrisma.$disconnect();
});

beforeEach(async () => {
  // Clean up database before each test
  await testPrisma.auditLog.deleteMany();
  await testPrisma.coupon.deleteMany();
  await testPrisma.user.deleteMany();
});

afterEach(async () => {
  // Additional cleanup if needed
});

// Test utilities
export const createTestUser = async (overrides: any = {}) => {
  return testPrisma.user.create({
    data: {
      email: overrides.email || 'test@example.com',
      passwordHash: overrides.passwordHash || 'hashedpassword',
      firstName: overrides.firstName || 'Test',
      lastName: overrides.lastName || 'User',
      role: overrides.role || 'MEMBER',
      ...overrides,
    },
  });
};

export const createTestCoupon = async (userId: string, overrides: any = {}) => {
  return testPrisma.coupon.create({
    data: {
      code: overrides.code || 'TEST123',
      description: overrides.description || 'Test coupon',
      discountType: overrides.discountType || 'AMOUNT',
      faceValue: overrides.faceValue || 10.00,
      status: overrides.status || 'ACTIVE',
      createdBy: userId,
      ...overrides,
    },
  });
};

export const createTestAuditLog = async (overrides: any = {}) => {
  return testPrisma.auditLog.create({
    data: {
      action: overrides.action || 'TEST_ACTION',
      resourceType: overrides.resourceType || 'TEST_RESOURCE',
      resourceId: overrides.resourceId || 'test-id',
      details: overrides.details || {},
      ipAddress: overrides.ipAddress || '127.0.0.1',
      userAgent: overrides.userAgent || 'test-agent',
      ...overrides,
    },
  });
};
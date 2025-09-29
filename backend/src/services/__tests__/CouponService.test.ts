import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PrismaClient, Coupon, CouponStatus, DiscountType } from '@prisma/client';
import { CouponService } from '../CouponService.js';
import { CreateCouponData } from '../../types/coupon.types.js';

// Mock Prisma
const mockPrismaClient = {
  coupon: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
};

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => mockPrismaClient),
  CouponStatus: {
    ACTIVE: 'ACTIVE',
    EXPIRED: 'EXPIRED',
    USED: 'USED',
    DISABLED: 'DISABLED',
  },
  DiscountType: {
    AMOUNT: 'AMOUNT',
    PERCENTAGE: 'PERCENTAGE',
  },
}));

describe('CouponService', () => {
  let couponService: CouponService;
  let mockPrisma: any;
  let mockCouponRepository: any;
  let mockAuditRepository: any;

  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
  const mockCouponId = '123e4567-e89b-12d3-a456-426614174001';

  const mockCoupon: Coupon = {
    id: mockCouponId,
    code: 'TEST50',
    description: 'Test coupon',
    discountType: DiscountType.PERCENTAGE,
    faceValue: 50,
    expirationDate: new Date('2024-12-31'),
    usageLimit: 10,
    usageCount: 0,
    status: CouponStatus.ACTIVE,
    tags: ['test'],
    createdBy: mockUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockPrisma = mockPrismaClient;
    couponService = new CouponService(mockPrisma as any);

    // Mock the repository methods
    mockCouponRepository = {
      create: vi.fn(),
      findByCode: vi.fn(),
      findById: vi.fn(),
      findByIdWithCreator: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
      exists: vi.fn(),
      getStats: vi.fn(),
    };

    mockAuditRepository = {
      log: vi.fn(),
    };

    // Replace the repository instances
    (couponService as any).couponRepository = mockCouponRepository;
    (couponService as any).auditRepository = mockAuditRepository;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createCoupon', () => {
    const validCouponData: CreateCouponData = {
      code: 'TEST50',
      description: 'Test coupon',
      discountType: DiscountType.PERCENTAGE,
      faceValue: 50,
      expirationDate: new Date('2024-12-31'),
      usageLimit: 10,
      tags: ['test'],
    };

    it('should create a coupon successfully', async () => {
      mockCouponRepository.findByCode.mockResolvedValue(null);
      mockCouponRepository.create.mockResolvedValue(mockCoupon);
      mockAuditRepository.log.mockResolvedValue(undefined);

      const result = await couponService.createCoupon(
        validCouponData,
        mockUserId,
        '127.0.0.1',
        'test-agent'
      );

      expect(result).toEqual(mockCoupon);
      expect(mockCouponRepository.findByCode).toHaveBeenCalledWith('TEST50');
      expect(mockCouponRepository.create).toHaveBeenCalledWith(validCouponData, mockUserId);
      expect(mockAuditRepository.log).toHaveBeenCalledWith({
        userId: mockUserId,
        action: 'CREATE_COUPON',
        resourceType: 'COUPON',
        resourceId: mockCouponId,
        details: {
          code: mockCoupon.code,
          discountType: mockCoupon.discountType,
          faceValue: mockCoupon.faceValue,
        },
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      });
    });

    it('should throw error if coupon code already exists', async () => {
      mockCouponRepository.findByCode.mockResolvedValue(mockCoupon);

      await expect(
        couponService.createCoupon(validCouponData, mockUserId)
      ).rejects.toThrow('Coupon code already exists');

      expect(mockCouponRepository.create).not.toHaveBeenCalled();
      expect(mockAuditRepository.log).not.toHaveBeenCalled();
    });

    it('should throw error for invalid percentage discount over 100%', async () => {
      const invalidCouponData = {
        ...validCouponData,
        faceValue: 150,
      };

      await expect(
        couponService.createCoupon(invalidCouponData, mockUserId)
      ).rejects.toThrow('Percentage discount cannot exceed 100%');

      expect(mockCouponRepository.findByCode).not.toHaveBeenCalled();
      expect(mockCouponRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error for zero percentage discount', async () => {
      const invalidCouponData = {
        ...validCouponData,
        faceValue: 0,
      };

      await expect(
        couponService.createCoupon(invalidCouponData, mockUserId)
      ).rejects.toThrow('Percentage discount must be greater than 0%');

      expect(mockCouponRepository.findByCode).not.toHaveBeenCalled();
      expect(mockCouponRepository.create).not.toHaveBeenCalled();
    });

    it('should allow amount discounts over 100', async () => {
      const amountCouponData = {
        ...validCouponData,
        discountType: DiscountType.AMOUNT,
        faceValue: 150,
      };

      mockCouponRepository.findByCode.mockResolvedValue(null);
      mockCouponRepository.create.mockResolvedValue({
        ...mockCoupon,
        discountType: DiscountType.AMOUNT,
        faceValue: 150,
      });
      mockAuditRepository.log.mockResolvedValue(undefined);

      const result = await couponService.createCoupon(amountCouponData, mockUserId);

      expect(result.faceValue).toBe(150);
      expect(mockCouponRepository.create).toHaveBeenCalledWith(amountCouponData, mockUserId);
    });
  });

  describe('getCouponById', () => {
    const mockCouponResponse = {
      ...mockCoupon,
      creator: {
        id: mockUserId,
        firstName: 'John',
        lastName: 'Doe',
      },
    };

    it('should return coupon by id', async () => {
      mockCouponRepository.findByIdWithCreator.mockResolvedValue(mockCouponResponse);

      const result = await couponService.getCouponById(mockCouponId, mockUserId);

      expect(result).toEqual(mockCouponResponse);
      expect(mockCouponRepository.findByIdWithCreator).toHaveBeenCalledWith(mockCouponId);
    });

    it('should return null if coupon not found', async () => {
      mockCouponRepository.findByIdWithCreator.mockResolvedValue(null);

      const result = await couponService.getCouponById(mockCouponId, mockUserId);

      expect(result).toBeNull();
    });
  });

  describe('updateCoupon', () => {
    const updateData = {
      description: 'Updated description',
      faceValue: 25,
    };

    it('should update coupon successfully', async () => {
      mockCouponRepository.findById.mockResolvedValue(mockCoupon);
      mockCouponRepository.exists.mockResolvedValue(false);
      mockCouponRepository.update.mockResolvedValue({ ...mockCoupon, ...updateData });
      mockAuditRepository.log.mockResolvedValue(undefined);

      const result = await couponService.updateCoupon(
        mockCouponId,
        updateData,
        mockUserId,
        '127.0.0.1',
        'test-agent'
      );

      expect(result).toEqual({ ...mockCoupon, ...updateData });
      expect(mockCouponRepository.update).toHaveBeenCalledWith(mockCouponId, updateData);
      expect(mockAuditRepository.log).toHaveBeenCalled();
    });

    it('should throw error if coupon not found', async () => {
      mockCouponRepository.findById.mockResolvedValue(null);

      await expect(
        couponService.updateCoupon(mockCouponId, updateData, mockUserId)
      ).rejects.toThrow('Coupon not found');

      expect(mockCouponRepository.update).not.toHaveBeenCalled();
    });

    it('should throw error if user does not have permission', async () => {
      const otherUserId = '123e4567-e89b-12d3-a456-426614174999';
      mockCouponRepository.findById.mockResolvedValue(mockCoupon);

      await expect(
        couponService.updateCoupon(mockCouponId, updateData, otherUserId)
      ).rejects.toThrow('You do not have permission to update this coupon');

      expect(mockCouponRepository.update).not.toHaveBeenCalled();
    });

    it('should throw error if new coupon code already exists', async () => {
      const updateWithCode = { code: 'EXISTING' };
      mockCouponRepository.findById.mockResolvedValue(mockCoupon);
      mockCouponRepository.exists.mockResolvedValue(true);

      await expect(
        couponService.updateCoupon(mockCouponId, updateWithCode, mockUserId)
      ).rejects.toThrow('Coupon code already exists');

      expect(mockCouponRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteCoupon', () => {
    it('should delete coupon successfully', async () => {
      mockCouponRepository.findById.mockResolvedValue(mockCoupon);
      mockCouponRepository.delete.mockResolvedValue(mockCoupon);
      mockAuditRepository.log.mockResolvedValue(undefined);

      await couponService.deleteCoupon(
        mockCouponId,
        mockUserId,
        '127.0.0.1',
        'test-agent'
      );

      expect(mockCouponRepository.delete).toHaveBeenCalledWith(mockCouponId);
      expect(mockAuditRepository.log).toHaveBeenCalledWith({
        userId: mockUserId,
        action: 'DELETE_COUPON',
        resourceType: 'COUPON',
        resourceId: mockCouponId,
        details: {
          deletedCoupon: {
            code: mockCoupon.code,
            discountType: mockCoupon.discountType,
            faceValue: mockCoupon.faceValue,
            status: mockCoupon.status,
          },
        },
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      });
    });

    it('should throw error if coupon not found', async () => {
      mockCouponRepository.findById.mockResolvedValue(null);

      await expect(
        couponService.deleteCoupon(mockCouponId, mockUserId)
      ).rejects.toThrow('Coupon not found');

      expect(mockCouponRepository.delete).not.toHaveBeenCalled();
    });

    it('should throw error if user does not have permission', async () => {
      const otherUserId = '123e4567-e89b-12d3-a456-426614174999';
      mockCouponRepository.findById.mockResolvedValue(mockCoupon);

      await expect(
        couponService.deleteCoupon(mockCouponId, otherUserId)
      ).rejects.toThrow('You do not have permission to delete this coupon');

      expect(mockCouponRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('getCoupons', () => {
    const mockFilters = {
      page: 1,
      limit: 20,
      sortBy: 'createdAt' as const,
      sortOrder: 'desc' as const,
    };

    const mockResult = {
      coupons: [mockCoupon],
      total: 1,
    };

    it('should return paginated coupons', async () => {
      mockCouponRepository.findMany.mockResolvedValue(mockResult);

      const result = await couponService.getCoupons(mockFilters, mockUserId);

      expect(result).toEqual({
        coupons: mockResult.coupons,
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
      expect(mockCouponRepository.findMany).toHaveBeenCalledWith(mockFilters);
    });
  });

  describe('getCouponStats', () => {
    const mockStats = {
      totalCoupons: 10,
      activeCoupons: 8,
      expiredCoupons: 1,
      usedCoupons: 1,
      disabledCoupons: 0,
      totalSavings: 150.50,
      averageValue: 25.75,
      expiringThisWeek: 2,
      expiringThisMonth: 5,
    };

    it('should return coupon statistics', async () => {
      mockCouponRepository.getStats.mockResolvedValue(mockStats);

      const result = await couponService.getCouponStats(mockUserId);

      expect(result).toEqual(mockStats);
      expect(mockCouponRepository.getStats).toHaveBeenCalledWith(mockUserId);
    });
  });
});
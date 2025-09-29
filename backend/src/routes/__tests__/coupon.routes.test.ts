import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { PrismaClient, DiscountType, CouponStatus } from '@prisma/client';
import couponRoutes from '../coupon.routes.js';
import { authMiddleware } from '../../middleware/auth.middleware.js';

// Mock Prisma
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(),
  DiscountType: {
    AMOUNT: 'AMOUNT',
    PERCENTAGE: 'PERCENTAGE',
  },
  CouponStatus: {
    ACTIVE: 'ACTIVE',
    EXPIRED: 'EXPIRED',
    USED: 'USED',
    DISABLED: 'DISABLED',
  },
}));

// Mock auth middleware
vi.mock('../../middleware/auth.middleware.js', () => ({
  authMiddleware: vi.fn((req, res, next) => {
    req.user = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'test@example.com',
      role: 'MEMBER',
    };
    next();
  }),
}));

// Mock CouponService
vi.mock('../../services/CouponService.js', () => ({
  CouponService: vi.fn().mockImplementation(() => ({
    createCoupon: vi.fn(),
    getCouponById: vi.fn(),
    getCoupons: vi.fn(),
    updateCoupon: vi.fn(),
    deleteCoupon: vi.fn(),
    getCouponStats: vi.fn(),
  })),
}));

describe('Coupon Routes', () => {
  let app: express.Application;
  let mockCouponService: any;

  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
  const mockCouponId = '123e4567-e89b-12d3-a456-426614174001';

  const mockCoupon = {
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

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    app.use('/api/coupons', couponRoutes);

    // Get the mocked CouponService instance
    const { CouponService } = await import('../../services/CouponService.js');
    mockCouponService = new CouponService({} as PrismaClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/coupons', () => {
    const validCouponData = {
      code: 'TEST50',
      description: 'Test coupon',
      discountType: 'PERCENTAGE',
      faceValue: 50,
      expirationDate: '2024-12-31T00:00:00.000Z',
      usageLimit: 10,
      tags: ['test'],
    };

    it('should create a coupon successfully', async () => {
      mockCouponService.createCoupon.mockResolvedValue(mockCoupon);

      const response = await request(app)
        .post('/api/coupons')
        .send(validCouponData)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: mockCoupon,
        message: 'Coupon created successfully',
      });

      expect(mockCouponService.createCoupon).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'TEST50',
          discountType: DiscountType.PERCENTAGE,
          faceValue: 50,
        }),
        mockUserId,
        expect.any(String),
        expect.any(String)
      );
    });

    it('should return 400 for invalid input data', async () => {
      const invalidData = {
        code: '', // Empty code
        discountType: 'INVALID',
        faceValue: -10, // Negative value
      };

      const response = await request(app)
        .post('/api/coupons')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(mockCouponService.createCoupon).not.toHaveBeenCalled();
    });

    it('should return 409 for duplicate coupon code', async () => {
      mockCouponService.createCoupon.mockRejectedValue(new Error('Coupon code already exists'));

      const response = await request(app)
        .post('/api/coupons')
        .send(validCouponData)
        .expect(409);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'COUPON_CODE_EXISTS',
          message: 'Coupon code already exists',
          timestamp: expect.any(String),
        },
      });
    });

    it('should return 400 for invalid percentage discount', async () => {
      mockCouponService.createCoupon.mockRejectedValue(
        new Error('Percentage discount cannot exceed 100%')
      );

      const response = await request(app)
        .post('/api/coupons')
        .send(validCouponData)
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_PERCENTAGE');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/coupons')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should validate coupon code format', async () => {
      const invalidCodeData = {
        ...validCouponData,
        code: 'INVALID CODE!', // Contains spaces and special characters
      };

      const response = await request(app)
        .post('/api/coupons')
        .send(invalidCodeData)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should validate expiration date is in the future', async () => {
      const pastDateData = {
        ...validCouponData,
        expirationDate: '2020-01-01T00:00:00.000Z', // Past date
      };

      const response = await request(app)
        .post('/api/coupons')
        .send(pastDateData)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/coupons', () => {
    const mockCouponsResult = {
      coupons: [mockCoupon],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    };

    it('should get coupons with default pagination', async () => {
      mockCouponService.getCoupons.mockResolvedValue(mockCouponsResult);

      const response = await request(app)
        .get('/api/coupons')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockCouponsResult,
        message: 'Coupons retrieved successfully',
      });

      expect(mockCouponService.getCoupons).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          limit: 20,
          sortBy: 'createdAt',
          sortOrder: 'desc',
        }),
        mockUserId
      );
    });

    it('should handle query parameters correctly', async () => {
      mockCouponService.getCoupons.mockResolvedValue(mockCouponsResult);

      const response = await request(app)
        .get('/api/coupons')
        .query({
          search: 'test',
          status: 'ACTIVE',
          page: '2',
          limit: '10',
          sortBy: 'faceValue',
          sortOrder: 'asc',
        })
        .expect(200);

      expect(mockCouponService.getCoupons).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'test',
          status: ['ACTIVE'],
          page: 2,
          limit: 10,
          sortBy: 'faceValue',
          sortOrder: 'asc',
        }),
        mockUserId
      );
    });

    it('should handle array query parameters', async () => {
      mockCouponService.getCoupons.mockResolvedValue(mockCouponsResult);

      const response = await request(app)
        .get('/api/coupons')
        .query({
          status: ['ACTIVE', 'EXPIRED'],
          discountType: ['PERCENTAGE'],
        })
        .expect(200);

      expect(mockCouponService.getCoupons).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ['ACTIVE', 'EXPIRED'],
          discountType: ['PERCENTAGE'],
        }),
        mockUserId
      );
    });

    it('should return 400 for invalid query parameters', async () => {
      const response = await request(app)
        .get('/api/coupons')
        .query({
          page: 'invalid',
          limit: '-1',
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/coupons/stats', () => {
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

    it('should get coupon statistics', async () => {
      mockCouponService.getCouponStats.mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/coupons/stats')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockStats,
        message: 'Coupon statistics retrieved successfully',
      });

      expect(mockCouponService.getCouponStats).toHaveBeenCalledWith(mockUserId);
    });
  });

  describe('GET /api/coupons/:id', () => {
    const mockCouponResponse = {
      ...mockCoupon,
      creator: {
        id: mockUserId,
        firstName: 'John',
        lastName: 'Doe',
      },
    };

    it('should get coupon by id', async () => {
      mockCouponService.getCouponById.mockResolvedValue(mockCouponResponse);

      const response = await request(app)
        .get(`/api/coupons/${mockCouponId}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockCouponResponse,
        message: 'Coupon retrieved successfully',
      });

      expect(mockCouponService.getCouponById).toHaveBeenCalledWith(mockCouponId, mockUserId);
    });

    it('should return 404 for non-existent coupon', async () => {
      mockCouponService.getCouponById.mockResolvedValue(null);

      const response = await request(app)
        .get(`/api/coupons/${mockCouponId}`)
        .expect(404);

      expect(response.body.error.code).toBe('COUPON_NOT_FOUND');
    });

    it('should return 400 for invalid UUID format', async () => {
      const response = await request(app)
        .get('/api/coupons/invalid-id')
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_ID');
    });
  });

  describe('PUT /api/coupons/:id', () => {
    const updateData = {
      description: 'Updated description',
      faceValue: 25,
    };

    it('should update coupon successfully', async () => {
      const updatedCoupon = { ...mockCoupon, ...updateData };
      mockCouponService.updateCoupon.mockResolvedValue(updatedCoupon);

      const response = await request(app)
        .put(`/api/coupons/${mockCouponId}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: updatedCoupon,
        message: 'Coupon updated successfully',
      });

      expect(mockCouponService.updateCoupon).toHaveBeenCalledWith(
        mockCouponId,
        updateData,
        mockUserId,
        expect.any(String),
        expect.any(String)
      );
    });

    it('should return 404 for non-existent coupon', async () => {
      mockCouponService.updateCoupon.mockRejectedValue(new Error('Coupon not found'));

      const response = await request(app)
        .put(`/api/coupons/${mockCouponId}`)
        .send(updateData)
        .expect(404);

      expect(response.body.error.code).toBe('COUPON_NOT_FOUND');
    });

    it('should return 403 for permission denied', async () => {
      mockCouponService.updateCoupon.mockRejectedValue(
        new Error('You do not have permission to update this coupon')
      );

      const response = await request(app)
        .put(`/api/coupons/${mockCouponId}`)
        .send(updateData)
        .expect(403);

      expect(response.body.error.code).toBe('PERMISSION_DENIED');
    });

    it('should return 400 for invalid UUID format', async () => {
      const response = await request(app)
        .put('/api/coupons/invalid-id')
        .send(updateData)
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_ID');
    });
  });

  describe('DELETE /api/coupons/:id', () => {
    it('should delete coupon successfully', async () => {
      mockCouponService.deleteCoupon.mockResolvedValue(undefined);

      const response = await request(app)
        .delete(`/api/coupons/${mockCouponId}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Coupon deleted successfully',
      });

      expect(mockCouponService.deleteCoupon).toHaveBeenCalledWith(
        mockCouponId,
        mockUserId,
        expect.any(String),
        expect.any(String)
      );
    });

    it('should return 404 for non-existent coupon', async () => {
      mockCouponService.deleteCoupon.mockRejectedValue(new Error('Coupon not found'));

      const response = await request(app)
        .delete(`/api/coupons/${mockCouponId}`)
        .expect(404);

      expect(response.body.error.code).toBe('COUPON_NOT_FOUND');
    });

    it('should return 403 for permission denied', async () => {
      mockCouponService.deleteCoupon.mockRejectedValue(
        new Error('You do not have permission to delete this coupon')
      );

      const response = await request(app)
        .delete(`/api/coupons/${mockCouponId}`)
        .expect(403);

      expect(response.body.error.code).toBe('PERMISSION_DENIED');
    });

    it('should return 400 for invalid UUID format', async () => {
      const response = await request(app)
        .delete('/api/coupons/invalid-id')
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_ID');
    });
  });
});
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import couponRoutes from '../coupon.routes.js';
import { CacheService } from '../../services/CacheService.js';

// Mock Prisma
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(),
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

// Mock CacheService
const mockCacheService = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
  getOrSet: vi.fn(),
};

// Mock CouponService
vi.mock('../../services/CouponService.js', () => ({
  CouponService: vi.fn().mockImplementation(() => ({
    getCouponStats: vi.fn(),
  })),
}));

describe('Coupon Statistics with Caching Integration Tests', () => {
  let app: express.Application;
  let mockCouponService: any;

  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
  const mockStats = {
    totalCoupons: 25,
    activeCoupons: 18,
    expiredCoupons: 4,
    usedCoupons: 2,
    disabledCoupons: 1,
    totalSavings: 245.75,
    averageValue: 15.25,
    expiringThisWeek: 3,
    expiringThisMonth: 8,
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

  describe('GET /api/coupons/stats', () => {
    it('should return statistics successfully', async () => {
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

    it('should handle service errors gracefully', async () => {
      mockCouponService.getCouponStats.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/coupons/stats')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve coupon statistics',
          timestamp: expect.any(String),
        },
      });
    });

    it('should return consistent data structure', async () => {
      mockCouponService.getCouponStats.mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/coupons/stats')
        .expect(200);

      const { data } = response.body;

      // Verify all required fields are present
      expect(data).toHaveProperty('totalCoupons');
      expect(data).toHaveProperty('activeCoupons');
      expect(data).toHaveProperty('expiredCoupons');
      expect(data).toHaveProperty('usedCoupons');
      expect(data).toHaveProperty('disabledCoupons');
      expect(data).toHaveProperty('totalSavings');
      expect(data).toHaveProperty('averageValue');
      expect(data).toHaveProperty('expiringThisWeek');
      expect(data).toHaveProperty('expiringThisMonth');

      // Verify data types
      expect(typeof data.totalCoupons).toBe('number');
      expect(typeof data.activeCoupons).toBe('number');
      expect(typeof data.expiredCoupons).toBe('number');
      expect(typeof data.usedCoupons).toBe('number');
      expect(typeof data.disabledCoupons).toBe('number');
      expect(typeof data.totalSavings).toBe('number');
      expect(typeof data.averageValue).toBe('number');
      expect(typeof data.expiringThisWeek).toBe('number');
      expect(typeof data.expiringThisMonth).toBe('number');
    });

    it('should handle zero statistics', async () => {
      const emptyStats = {
        totalCoupons: 0,
        activeCoupons: 0,
        expiredCoupons: 0,
        usedCoupons: 0,
        disabledCoupons: 0,
        totalSavings: 0,
        averageValue: 0,
        expiringThisWeek: 0,
        expiringThisMonth: 0,
      };

      mockCouponService.getCouponStats.mockResolvedValue(emptyStats);

      const response = await request(app)
        .get('/api/coupons/stats')
        .expect(200);

      expect(response.body.data).toEqual(emptyStats);
    });

    it('should handle large numbers correctly', async () => {
      const largeStats = {
        totalCoupons: 999999,
        activeCoupons: 500000,
        expiredCoupons: 300000,
        usedCoupons: 199999,
        disabledCoupons: 0,
        totalSavings: 1234567.89,
        averageValue: 25.50,
        expiringThisWeek: 1500,
        expiringThisMonth: 15000,
      };

      mockCouponService.getCouponStats.mockResolvedValue(largeStats);

      const response = await request(app)
        .get('/api/coupons/stats')
        .expect(200);

      expect(response.body.data).toEqual(largeStats);
    });

    it('should handle decimal values correctly', async () => {
      const decimalStats = {
        totalCoupons: 10,
        activeCoupons: 8,
        expiredCoupons: 1,
        usedCoupons: 1,
        disabledCoupons: 0,
        totalSavings: 123.45,
        averageValue: 12.345,
        expiringThisWeek: 2,
        expiringThisMonth: 5,
      };

      mockCouponService.getCouponStats.mockResolvedValue(decimalStats);

      const response = await request(app)
        .get('/api/coupons/stats')
        .expect(200);

      expect(response.body.data.totalSavings).toBe(123.45);
      expect(response.body.data.averageValue).toBe(12.345);
    });
  });

  describe('Statistics Caching Behavior', () => {
    it('should call service method with correct user ID', async () => {
      mockCouponService.getCouponStats.mockResolvedValue(mockStats);

      await request(app)
        .get('/api/coupons/stats')
        .expect(200);

      expect(mockCouponService.getCouponStats).toHaveBeenCalledWith(mockUserId);
      expect(mockCouponService.getCouponStats).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple concurrent requests', async () => {
      mockCouponService.getCouponStats.mockResolvedValue(mockStats);

      const requests = Array.from({ length: 5 }, () =>
        request(app).get('/api/coupons/stats').expect(200)
      );

      const responses = await Promise.all(requests);

      // All responses should be successful
      responses.forEach(response => {
        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockStats);
      });

      // Service should be called for each request (caching is handled at service level)
      expect(mockCouponService.getCouponStats).toHaveBeenCalledTimes(5);
    });
  });

  describe('Error Handling', () => {
    it('should handle timeout errors', async () => {
      mockCouponService.getCouponStats.mockRejectedValue(new Error('Request timeout'));

      const response = await request(app)
        .get('/api/coupons/stats')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });

    it('should handle database connection errors', async () => {
      mockCouponService.getCouponStats.mockRejectedValue(new Error('Connection refused'));

      const response = await request(app)
        .get('/api/coupons/stats')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Failed to retrieve coupon statistics');
    });

    it('should include timestamp in error responses', async () => {
      mockCouponService.getCouponStats.mockRejectedValue(new Error('Test error'));

      const response = await request(app)
        .get('/api/coupons/stats')
        .expect(500);

      expect(response.body.error.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('Response Format', () => {
    it('should have consistent success response format', async () => {
      mockCouponService.getCouponStats.mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/coupons/stats')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Coupon statistics retrieved successfully');
    });

    it('should have consistent error response format', async () => {
      mockCouponService.getCouponStats.mockRejectedValue(new Error('Test error'));

      const response = await request(app)
        .get('/api/coupons/stats')
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body.error).toHaveProperty('timestamp');
    });

    it('should return JSON content type', async () => {
      mockCouponService.getCouponStats.mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/coupons/stats')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });
});
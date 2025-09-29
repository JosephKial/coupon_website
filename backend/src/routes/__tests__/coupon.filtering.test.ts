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
const mockAuthMiddleware = vi.fn((req, res, next) => {
  req.user = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    role: 'MEMBER',
  };
  next();
});

vi.mock('../../middleware/auth.middleware.js', () => ({
  authMiddleware: mockAuthMiddleware,
}));

// Mock CouponService
vi.mock('../../services/CouponService.js', () => ({
  CouponService: vi.fn().mockImplementation(() => ({
    getCoupons: vi.fn(),
  })),
}));

describe('Coupon Filtering Integration Tests', () => {
  let app: express.Application;
  let mockCouponService: any;

  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';

  const mockCouponsResult = {
    coupons: [],
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  };

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    
    // Apply the mock auth middleware directly
    app.use('/api/coupons', mockAuthMiddleware);
    app.use('/api/coupons', couponRoutes);

    // Get the mocked CouponService instance
    const { CouponService } = await import('../../services/CouponService.js');
    mockCouponService = new CouponService({} as PrismaClient);
    mockCouponService.getCoupons.mockResolvedValue(mockCouponsResult);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Status Filtering', () => {
    it('should filter by single status', async () => {
      await request(app)
        .get('/api/coupons')
        .query({ status: 'ACTIVE' })
        .expect(200);

      expect(mockCouponService.getCoupons).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ['ACTIVE'],
        }),
        mockUserId
      );
    });

    it('should filter by multiple statuses', async () => {
      await request(app)
        .get('/api/coupons')
        .query({ status: ['ACTIVE', 'EXPIRED'] })
        .expect(200);

      expect(mockCouponService.getCoupons).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ['ACTIVE', 'EXPIRED'],
        }),
        mockUserId
      );
    });

    it('should filter by all status types', async () => {
      await request(app)
        .get('/api/coupons')
        .query({ status: ['ACTIVE', 'EXPIRED', 'USED', 'DISABLED'] })
        .expect(200);

      expect(mockCouponService.getCoupons).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ['ACTIVE', 'EXPIRED', 'USED', 'DISABLED'],
        }),
        mockUserId
      );
    });

    it('should reject invalid status values', async () => {
      const response = await request(app)
        .get('/api/coupons')
        .query({ status: 'INVALID_STATUS' })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Expiration Date Filtering', () => {
    it('should filter by expiration date from', async () => {
      const fromDate = '2024-01-01T00:00:00.000Z';
      
      await request(app)
        .get('/api/coupons')
        .query({ expirationDateFrom: fromDate })
        .expect(200);

      expect(mockCouponService.getCoupons).toHaveBeenCalledWith(
        expect.objectContaining({
          expirationDateFrom: new Date(fromDate),
        }),
        mockUserId
      );
    });

    it('should filter by expiration date to', async () => {
      const toDate = '2024-12-31T23:59:59.999Z';
      
      await request(app)
        .get('/api/coupons')
        .query({ expirationDateTo: toDate })
        .expect(200);

      expect(mockCouponService.getCoupons).toHaveBeenCalledWith(
        expect.objectContaining({
          expirationDateTo: new Date(toDate),
        }),
        mockUserId
      );
    });

    it('should filter by expiration date range', async () => {
      const fromDate = '2024-01-01T00:00:00.000Z';
      const toDate = '2024-12-31T23:59:59.999Z';
      
      await request(app)
        .get('/api/coupons')
        .query({ 
          expirationDateFrom: fromDate,
          expirationDateTo: toDate
        })
        .expect(200);

      expect(mockCouponService.getCoupons).toHaveBeenCalledWith(
        expect.objectContaining({
          expirationDateFrom: new Date(fromDate),
          expirationDateTo: new Date(toDate),
        }),
        mockUserId
      );
    });

    it('should reject invalid date formats', async () => {
      const response = await request(app)
        .get('/api/coupons')
        .query({ expirationDateFrom: 'invalid-date' })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject when from date is after to date', async () => {
      const response = await request(app)
        .get('/api/coupons')
        .query({ 
          expirationDateFrom: '2024-12-31T00:00:00.000Z',
          expirationDateTo: '2024-01-01T00:00:00.000Z'
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Value Range Filtering', () => {
    it('should filter by minimum value', async () => {
      await request(app)
        .get('/api/coupons')
        .query({ minValue: '10' })
        .expect(200);

      expect(mockCouponService.getCoupons).toHaveBeenCalledWith(
        expect.objectContaining({
          minValue: 10,
        }),
        mockUserId
      );
    });

    it('should filter by maximum value', async () => {
      await request(app)
        .get('/api/coupons')
        .query({ maxValue: '100' })
        .expect(200);

      expect(mockCouponService.getCoupons).toHaveBeenCalledWith(
        expect.objectContaining({
          maxValue: 100,
        }),
        mockUserId
      );
    });

    it('should filter by value range', async () => {
      await request(app)
        .get('/api/coupons')
        .query({ 
          minValue: '10',
          maxValue: '100'
        })
        .expect(200);

      expect(mockCouponService.getCoupons).toHaveBeenCalledWith(
        expect.objectContaining({
          minValue: 10,
          maxValue: 100,
        }),
        mockUserId
      );
    });

    it('should handle decimal values', async () => {
      await request(app)
        .get('/api/coupons')
        .query({ 
          minValue: '10.50',
          maxValue: '99.99'
        })
        .expect(200);

      expect(mockCouponService.getCoupons).toHaveBeenCalledWith(
        expect.objectContaining({
          minValue: 10.50,
          maxValue: 99.99,
        }),
        mockUserId
      );
    });

    it('should reject negative values', async () => {
      const response = await request(app)
        .get('/api/coupons')
        .query({ minValue: '-10' })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject when min value is greater than max value', async () => {
      const response = await request(app)
        .get('/api/coupons')
        .query({ 
          minValue: '100',
          maxValue: '10'
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject invalid number formats', async () => {
      const response = await request(app)
        .get('/api/coupons')
        .query({ minValue: 'not-a-number' })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Discount Type Filtering', () => {
    it('should filter by single discount type', async () => {
      await request(app)
        .get('/api/coupons')
        .query({ discountType: 'PERCENTAGE' })
        .expect(200);

      expect(mockCouponService.getCoupons).toHaveBeenCalledWith(
        expect.objectContaining({
          discountType: ['PERCENTAGE'],
        }),
        mockUserId
      );
    });

    it('should filter by multiple discount types', async () => {
      await request(app)
        .get('/api/coupons')
        .query({ discountType: ['AMOUNT', 'PERCENTAGE'] })
        .expect(200);

      expect(mockCouponService.getCoupons).toHaveBeenCalledWith(
        expect.objectContaining({
          discountType: ['AMOUNT', 'PERCENTAGE'],
        }),
        mockUserId
      );
    });

    it('should reject invalid discount type values', async () => {
      const response = await request(app)
        .get('/api/coupons')
        .query({ discountType: 'INVALID_TYPE' })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Tags Filtering', () => {
    it('should filter by single tag', async () => {
      await request(app)
        .get('/api/coupons')
        .query({ tags: 'grocery' })
        .expect(200);

      expect(mockCouponService.getCoupons).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: ['grocery'],
        }),
        mockUserId
      );
    });

    it('should filter by multiple tags', async () => {
      await request(app)
        .get('/api/coupons')
        .query({ tags: ['grocery', 'electronics'] })
        .expect(200);

      expect(mockCouponService.getCoupons).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: ['grocery', 'electronics'],
        }),
        mockUserId
      );
    });

    it('should handle empty tags array', async () => {
      await request(app)
        .get('/api/coupons')
        .query({ tags: [] })
        .expect(200);

      expect(mockCouponService.getCoupons).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: [],
        }),
        mockUserId
      );
    });
  });

  describe('Search Filtering', () => {
    it('should filter by search term', async () => {
      await request(app)
        .get('/api/coupons')
        .query({ search: 'discount' })
        .expect(200);

      expect(mockCouponService.getCoupons).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'discount',
        }),
        mockUserId
      );
    });

    it('should handle empty search term', async () => {
      await request(app)
        .get('/api/coupons')
        .query({ search: '' })
        .expect(200);

      expect(mockCouponService.getCoupons).toHaveBeenCalledWith(
        expect.objectContaining({
          search: '',
        }),
        mockUserId
      );
    });

    it('should trim search term', async () => {
      await request(app)
        .get('/api/coupons')
        .query({ search: '  discount  ' })
        .expect(200);

      expect(mockCouponService.getCoupons).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'discount',
        }),
        mockUserId
      );
    });
  });

  describe('Combined Filtering', () => {
    it('should combine status and value range filters', async () => {
      await request(app)
        .get('/api/coupons')
        .query({ 
          status: ['ACTIVE', 'EXPIRED'],
          minValue: '10',
          maxValue: '50'
        })
        .expect(200);

      expect(mockCouponService.getCoupons).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ['ACTIVE', 'EXPIRED'],
          minValue: 10,
          maxValue: 50,
        }),
        mockUserId
      );
    });

    it('should combine search, status, and date filters', async () => {
      await request(app)
        .get('/api/coupons')
        .query({ 
          search: 'discount',
          status: 'ACTIVE',
          expirationDateFrom: '2024-01-01T00:00:00.000Z',
          expirationDateTo: '2024-12-31T23:59:59.999Z'
        })
        .expect(200);

      expect(mockCouponService.getCoupons).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'discount',
          status: ['ACTIVE'],
          expirationDateFrom: new Date('2024-01-01T00:00:00.000Z'),
          expirationDateTo: new Date('2024-12-31T23:59:59.999Z'),
        }),
        mockUserId
      );
    });

    it('should combine all filter types', async () => {
      await request(app)
        .get('/api/coupons')
        .query({ 
          search: 'save',
          status: ['ACTIVE', 'USED'],
          discountType: ['PERCENTAGE'],
          minValue: '5',
          maxValue: '75',
          expirationDateFrom: '2024-01-01T00:00:00.000Z',
          expirationDateTo: '2024-12-31T23:59:59.999Z',
          tags: ['grocery', 'electronics'],
          page: '2',
          limit: '10',
          sortBy: 'faceValue',
          sortOrder: 'asc'
        })
        .expect(200);

      expect(mockCouponService.getCoupons).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'save',
          status: ['ACTIVE', 'USED'],
          discountType: ['PERCENTAGE'],
          minValue: 5,
          maxValue: 75,
          expirationDateFrom: new Date('2024-01-01T00:00:00.000Z'),
          expirationDateTo: new Date('2024-12-31T23:59:59.999Z'),
          tags: ['grocery', 'electronics'],
          page: 2,
          limit: 10,
          sortBy: 'faceValue',
          sortOrder: 'asc',
        }),
        mockUserId
      );
    });

    it('should handle mixed valid and invalid filters', async () => {
      const response = await request(app)
        .get('/api/coupons')
        .query({ 
          status: 'ACTIVE', // Valid
          minValue: '-10', // Invalid
          search: 'test' // Valid
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Sorting and Pagination with Filters', () => {
    it('should combine filters with custom sorting', async () => {
      await request(app)
        .get('/api/coupons')
        .query({ 
          status: 'ACTIVE',
          sortBy: 'expirationDate',
          sortOrder: 'asc'
        })
        .expect(200);

      expect(mockCouponService.getCoupons).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ['ACTIVE'],
          sortBy: 'expirationDate',
          sortOrder: 'asc',
        }),
        mockUserId
      );
    });

    it('should combine filters with pagination', async () => {
      await request(app)
        .get('/api/coupons')
        .query({ 
          status: ['ACTIVE', 'EXPIRED'],
          page: '3',
          limit: '5'
        })
        .expect(200);

      expect(mockCouponService.getCoupons).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ['ACTIVE', 'EXPIRED'],
          page: 3,
          limit: 5,
        }),
        mockUserId
      );
    });

    it('should validate sort field options', async () => {
      const response = await request(app)
        .get('/api/coupons')
        .query({ 
          status: 'ACTIVE',
          sortBy: 'invalidField'
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should validate sort order options', async () => {
      const response = await request(app)
        .get('/api/coupons')
        .query({ 
          status: 'ACTIVE',
          sortOrder: 'invalid'
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should validate pagination limits', async () => {
      const response = await request(app)
        .get('/api/coupons')
        .query({ 
          status: 'ACTIVE',
          limit: '200' // Exceeds max limit of 100
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
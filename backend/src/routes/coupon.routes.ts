import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { CouponService } from '../services/CouponService.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { validate, validationChains } from '../middleware/validation.middleware.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import {
  createCouponSchema,
  updateCouponSchema,
  couponFiltersSchema,
} from '../types/coupon.types.js';
import { AuthenticatedRequest } from '../types/common.types.js';

const router = Router();
const prisma = new PrismaClient();
const couponService = new CouponService(prisma);

// Apply authentication middleware to all coupon routes
router.use(authMiddleware);

// POST /api/coupons - Create a new coupon
router.post('/', validate(validationChains.createCoupon), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const validatedData = req.body;
  
  // Create coupon
  const coupon = await couponService.createCoupon(
    validatedData,
    req.user!.id,
    req.ip,
    req.get('User-Agent')
  );

  res.status(201).json({
    success: true,
    data: coupon,
    message: 'Coupon created successfully',
  });
}));

// GET /api/coupons - Get coupons with filtering and pagination
router.get('/', validate(validationChains.couponFilters), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const validatedFilters = req.query;
  
  // Get coupons
  const result = await couponService.getCoupons(validatedFilters, req.user!.id);

  res.json({
    success: true,
    data: result,
    message: 'Coupons retrieved successfully',
  });
}));

// GET /api/coupons/stats - Get coupon statistics
router.get('/stats', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const stats = await couponService.getCouponStats(req.user!.id);

  res.json({
    success: true,
    data: stats,
    message: 'Coupon statistics retrieved successfully',
  });
}));

// GET /api/coupons/:id - Get a specific coupon
router.get('/:id', validate(validationChains.getCoupon), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const coupon = await couponService.getCouponById(id, req.user!.id);
  
  if (!coupon) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'COUPON_NOT_FOUND',
        message: 'Coupon not found',
        timestamp: new Date().toISOString(),
      },
    });
  }

  res.json({
    success: true,
    data: coupon,
    message: 'Coupon retrieved successfully',
  });
}));

// PUT /api/coupons/:id - Update a coupon
router.put('/:id', validate(validationChains.updateCoupon), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const validatedData = req.body;
  
  // Update coupon
  const coupon = await couponService.updateCoupon(
    id,
    validatedData,
    req.user!.id,
    req.ip,
    req.get('User-Agent')
  );

  res.json({
    success: true,
    data: coupon,
    message: 'Coupon updated successfully',
  });
}));

// DELETE /api/coupons/:id - Delete a coupon
router.delete('/:id', validate(validationChains.deleteCoupon), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  // Delete coupon
  await couponService.deleteCoupon(
    id,
    req.user!.id,
    req.ip,
    req.get('User-Agent')
  );

  res.json({
    success: true,
    message: 'Coupon deleted successfully',
  });
}));

export default router;
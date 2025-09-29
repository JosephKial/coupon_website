import { z } from 'zod';

// Import Prisma enums to ensure compatibility
import { DiscountType as PrismaDiscountType, CouponStatus as PrismaCouponStatus } from '@prisma/client';

// Re-export Prisma enums for consistency
export const DiscountType = PrismaDiscountType;
export const CouponStatus = PrismaCouponStatus;

// Type aliases for better type safety
export type DiscountType = PrismaDiscountType;
export type CouponStatus = PrismaCouponStatus;

// Coupon Interface
export interface Coupon {
  id: string;
  code: string;
  description?: string;
  discountType: DiscountType;
  faceValue: number;
  expirationDate?: Date;
  usageLimit?: number;
  usageCount: number;
  status: CouponStatus;
  tags: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Coupon creation interface
export interface CreateCouponData {
  code: string;
  description?: string;
  discountType: DiscountType;
  faceValue: number;
  expirationDate?: Date;
  usageLimit?: number;
  tags?: string[];
}

// Coupon update interface
export interface UpdateCouponData {
  code?: string;
  description?: string;
  discountType?: DiscountType;
  faceValue?: number;
  expirationDate?: Date | null;
  usageLimit?: number | null;
  status?: CouponStatus;
  tags?: string[];
}

// Coupon response interface (with creator info)
export interface CouponResponse extends Omit<Coupon, 'createdBy' | 'description'> {
  description?: string | null;
  creator: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

// Coupon search/filter interface
export interface CouponFilters {
  search?: string;
  status?: CouponStatus[];
  discountType?: DiscountType[];
  minValue?: number;
  maxValue?: number;
  expirationDateFrom?: Date;
  expirationDateTo?: Date;
  tags?: string[];
  createdBy?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'expirationDate' | 'faceValue' | 'code';
  sortOrder?: 'asc' | 'desc';
}

// Coupon statistics interface
export interface CouponStats {
  totalCoupons: number;
  activeCoupons: number;
  expiredCoupons: number;
  usedCoupons: number;
  disabledCoupons: number;
  totalSavings: number;
  averageValue: number;
  expiringThisWeek: number;
  expiringThisMonth: number;
}

// Zod validation schemas
export const createCouponSchema = z.object({
  code: z.string()
    .min(1, 'Coupon code is required')
    .max(100, 'Coupon code must be less than 100 characters')
    .trim()
    .regex(/^[A-Za-z0-9\-_]+$/, 'Coupon code can only contain letters, numbers, hyphens, and underscores'),
  description: z.string()
    .max(1000, 'Description must be less than 1000 characters')
    .trim()
    .optional(),
  discountType: z.nativeEnum(PrismaDiscountType, {
    errorMap: () => ({ message: 'Discount type must be either AMOUNT or PERCENTAGE' })
  }),
  faceValue: z.number()
    .positive('Face value must be positive')
    .max(999999.99, 'Face value must be less than 1,000,000')
    .refine((val) => Number(val.toFixed(2)) === val, 'Face value can have at most 2 decimal places'),
  expirationDate: z.string()
    .datetime('Invalid expiration date format')
    .transform((str) => new Date(str))
    .refine((date) => date > new Date(), 'Expiration date must be in the future')
    .optional(),
  usageLimit: z.number()
    .int('Usage limit must be an integer')
    .positive('Usage limit must be positive')
    .max(1000000, 'Usage limit must be less than 1,000,000')
    .optional(),
  tags: z.array(z.string().trim().min(1).max(50))
    .max(10, 'Maximum 10 tags allowed')
    .optional()
    .default([])
});

export const updateCouponSchema = z.object({
  code: z.string()
    .min(1, 'Coupon code is required')
    .max(100, 'Coupon code must be less than 100 characters')
    .trim()
    .regex(/^[A-Za-z0-9\-_]+$/, 'Coupon code can only contain letters, numbers, hyphens, and underscores')
    .optional(),
  description: z.string()
    .max(1000, 'Description must be less than 1000 characters')
    .trim()
    .optional(),
  discountType: z.nativeEnum(PrismaDiscountType, {
    errorMap: () => ({ message: 'Discount type must be either AMOUNT or PERCENTAGE' })
  }).optional(),
  faceValue: z.number()
    .positive('Face value must be positive')
    .max(999999.99, 'Face value must be less than 1,000,000')
    .refine((val) => Number(val.toFixed(2)) === val, 'Face value can have at most 2 decimal places')
    .optional(),
  expirationDate: z.union([
    z.string().datetime('Invalid expiration date format').transform((str) => new Date(str)),
    z.null()
  ]).optional(),
  usageLimit: z.number()
    .int('Usage limit must be an integer')
    .positive('Usage limit must be positive')
    .max(1000000, 'Usage limit must be less than 1,000,000')
    .optional()
    .nullable(),
  status: z.nativeEnum(PrismaCouponStatus).optional(),
  tags: z.array(z.string().trim().min(1).max(50))
    .max(10, 'Maximum 10 tags allowed')
    .optional()
});

export const couponFiltersSchema = z.object({
  search: z.string().trim().optional(),
  status: z.array(z.nativeEnum(PrismaCouponStatus)).optional(),
  discountType: z.array(z.nativeEnum(PrismaDiscountType)).optional(),
  minValue: z.number().positive().optional(),
  maxValue: z.number().positive().optional(),
  expirationDateFrom: z.string().datetime().transform((str) => new Date(str)).optional(),
  expirationDateTo: z.string().datetime().transform((str) => new Date(str)).optional(),
  tags: z.array(z.string().trim().min(1)).optional(),
  createdBy: z.string().uuid().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  sortBy: z.enum(['createdAt', 'updatedAt', 'expirationDate', 'faceValue', 'code']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
}).refine((data) => {
  if (data.minValue && data.maxValue) {
    return data.minValue <= data.maxValue;
  }
  return true;
}, {
  message: 'Minimum value must be less than or equal to maximum value',
  path: ['minValue']
}).refine((data) => {
  if (data.expirationDateFrom && data.expirationDateTo) {
    return data.expirationDateFrom <= data.expirationDateTo;
  }
  return true;
}, {
  message: 'From date must be less than or equal to to date',
  path: ['expirationDateFrom']
});

// Additional validation for percentage discounts
export const validatePercentageDiscount = (data: { discountType: DiscountType; faceValue: number }) => {
  if (data.discountType === DiscountType.PERCENTAGE && data.faceValue > 100) {
    throw new Error('Percentage discount cannot exceed 100%');
  }
  if (data.discountType === DiscountType.PERCENTAGE && data.faceValue <= 0) {
    throw new Error('Percentage discount must be greater than 0%');
  }
};

// Type inference from Zod schemas
export type CreateCouponInput = z.infer<typeof createCouponSchema>;
export type UpdateCouponInput = z.infer<typeof updateCouponSchema>;
export type CouponFiltersInput = z.infer<typeof couponFiltersSchema>;
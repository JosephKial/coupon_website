// Export all types and interfaces
export * from './user.types';
export * from './coupon.types';
export * from './audit.types';
export * from './common.types';

// Re-export Prisma generated types
export type {
  User as PrismaUser,
  Coupon as PrismaCoupon,
  AuditLog as PrismaAuditLog,
  UserRole as PrismaUserRole,
  DiscountType as PrismaDiscountType,
  CouponStatus as PrismaCouponStatus
} from '@prisma/client';
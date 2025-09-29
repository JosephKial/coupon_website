import { PrismaClient, Coupon, CouponStatus } from '@prisma/client';
import { CouponRepository } from '../repositories/coupon.repository.js';
import { AuditRepository } from '../repositories/audit.repository.js';
import { CacheService, getCacheService } from './CacheService.js';
import { SearchService } from './SearchService.js';
import {
  CreateCouponData,
  UpdateCouponData,
  CouponFilters,
  CouponResponse,
  CouponStats,
  validatePercentageDiscount,
  DiscountType,
} from '../types/coupon.types.js';

export class CouponService {
  private couponRepository: CouponRepository;
  private auditRepository: AuditRepository;
  private cacheService: CacheService;
  private searchService: SearchService;

  constructor(prisma: PrismaClient, cacheService?: CacheService) {
    this.couponRepository = new CouponRepository(prisma);
    this.auditRepository = new AuditRepository(prisma);
    this.cacheService = cacheService || getCacheService();
    this.searchService = new SearchService(prisma, this.cacheService);
  }

  async createCoupon(
    couponData: CreateCouponData,
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<Coupon> {
    // Validate percentage discount
    validatePercentageDiscount({
      discountType: couponData.discountType,
      faceValue: couponData.faceValue,
    });

    // Check if coupon code already exists
    const existingCoupon = await this.couponRepository.findByCode(couponData.code);
    if (existingCoupon) {
      throw new Error('Coupon code already exists');
    }

    // Create the coupon
    const coupon = await this.couponRepository.create(couponData, userId);

    // Invalidate caches
    await this.invalidateStatsCache(userId);
    await this.invalidateCouponListCache();
    await this.searchService.invalidateSearchCache();

    // Log the creation
    await this.auditRepository.log({
      userId,
      action: 'CREATE_COUPON',
      resourceType: 'COUPON',
      resourceId: coupon.id,
      details: {
        code: coupon.code,
        discountType: coupon.discountType,
        faceValue: coupon.faceValue,
      },
      ipAddress,
      userAgent,
    });

    return coupon;
  }

  async getCouponById(id: string, userId?: string): Promise<CouponResponse | null> {
    const coupon = await this.couponRepository.findByIdWithCreator(id);
    
    if (!coupon) {
      return null;
    }

    // Check if user has access to this coupon (for now, all authenticated users can view all coupons)
    // This can be modified later to implement more restrictive access control
    
    return coupon;
  }

  async getCoupons(filters: CouponFilters, userId?: string): Promise<{
    coupons: CouponResponse[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    // Generate cache key for coupon list
    const cacheKey = `coupons:list:${JSON.stringify(filters)}:${userId || 'all'}`;

    // Try to get from cache first
    const cachedResult = await this.cacheService.get<{
      coupons: CouponResponse[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(cacheKey);

    if (cachedResult) {
      return cachedResult;
    }

    // If user-specific filtering is needed, add userId to filters
    // For now, all authenticated users can see all coupons
    
    const { coupons, total } = await this.couponRepository.findMany(filters);
    const totalPages = Math.ceil(total / (filters.limit || 20));

    const result = {
      coupons,
      total,
      page: filters.page || 1,
      limit: filters.limit || 20,
      totalPages,
    };

    // Cache the results for 1 minute
    await this.cacheService.set(cacheKey, result, { ttl: 60 });

    return result;
  }

  async updateCoupon(
    id: string,
    couponData: UpdateCouponData,
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<Coupon> {
    // Check if coupon exists
    const existingCoupon = await this.couponRepository.findById(id);
    if (!existingCoupon) {
      throw new Error('Coupon not found');
    }

    // Check if user has permission to update this coupon
    if (existingCoupon.createdBy !== userId) {
      throw new Error('You do not have permission to update this coupon');
    }

    // Validate percentage discount if discount type or face value is being updated
    if (couponData.discountType || couponData.faceValue) {
      const discountType = couponData.discountType || existingCoupon.discountType;
      const faceValue = couponData.faceValue || Number(existingCoupon.faceValue);
      
      validatePercentageDiscount({ discountType, faceValue });
    }

    // Check if coupon code is being changed and if it already exists
    if (couponData.code && couponData.code !== existingCoupon.code) {
      const codeExists = await this.couponRepository.exists(couponData.code, id);
      if (codeExists) {
        throw new Error('Coupon code already exists');
      }
    }

    // Update the coupon
    const updatedCoupon = await this.couponRepository.update(id, couponData);

    // Invalidate caches if status or value changed
    if (couponData.status || couponData.faceValue) {
      await this.invalidateStatsCache(userId);
    }
    // Always invalidate list and search cache when coupon is updated
    await this.invalidateCouponListCache();
    await this.searchService.invalidateSearchCache();

    // Log the update
    await this.auditRepository.log({
      userId,
      action: 'UPDATE_COUPON',
      resourceType: 'COUPON',
      resourceId: id,
      details: {
        changes: couponData,
        previousValues: {
          code: existingCoupon.code,
          discountType: existingCoupon.discountType,
          faceValue: existingCoupon.faceValue,
          status: existingCoupon.status,
        },
      },
      ipAddress,
      userAgent,
    });

    return updatedCoupon;
  }

  async deleteCoupon(
    id: string,
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    // Check if coupon exists
    const existingCoupon = await this.couponRepository.findById(id);
    if (!existingCoupon) {
      throw new Error('Coupon not found');
    }

    // Check if user has permission to delete this coupon
    if (existingCoupon.createdBy !== userId) {
      throw new Error('You do not have permission to delete this coupon');
    }

    // Delete the coupon
    await this.couponRepository.delete(id);

    // Invalidate caches
    await this.invalidateStatsCache(userId);
    await this.invalidateCouponListCache();
    await this.searchService.invalidateSearchCache();

    // Log the deletion
    await this.auditRepository.log({
      userId,
      action: 'DELETE_COUPON',
      resourceType: 'COUPON',
      resourceId: id,
      details: {
        deletedCoupon: {
          code: existingCoupon.code,
          discountType: existingCoupon.discountType,
          faceValue: existingCoupon.faceValue,
          status: existingCoupon.status,
        },
      },
      ipAddress,
      userAgent,
    });
  }

  async getCouponStats(userId?: string): Promise<CouponStats> {
    const cacheKey = userId 
      ? CacheService.getUserKey(userId, 'stats')
      : CacheService.getGlobalKey('stats');

    // Try to get from cache first
    const cachedStats = await this.cacheService.get<CouponStats>(cacheKey);
    if (cachedStats) {
      return cachedStats;
    }

    // If not in cache, fetch from database
    const stats = await this.couponRepository.getStats(userId);
    
    // Cache the results for 5 minutes
    await this.cacheService.set(cacheKey, stats, { ttl: 300 });
    
    return stats;
  }

  async updateExpiredCoupons(): Promise<number> {
    // This method can be called periodically to update expired coupons
    const now = new Date();
    
    // Find all active coupons that have expired
    const expiredCoupons = await this.couponRepository.findMany({
      status: [CouponStatus.ACTIVE],
      expirationDateTo: now,
      limit: 1000, // Process in batches
    });

    let updatedCount = 0;
    const affectedUsers = new Set<string>();
    
    for (const coupon of expiredCoupons.coupons) {
      try {
        await this.couponRepository.update(coupon.id, { status: CouponStatus.EXPIRED });
        affectedUsers.add(coupon.creator.id);
        updatedCount++;
      } catch (error) {
        console.error(`Failed to update coupon ${coupon.id} to expired:`, error);
      }
    }

    // Invalidate cache for all affected users
    for (const userId of affectedUsers) {
      await this.invalidateStatsCache(userId);
    }

    return updatedCount;
  }

  /**
   * Invalidate statistics cache for a user and global stats
   */
  private async invalidateStatsCache(userId?: string): Promise<void> {
    try {
      // Invalidate user-specific stats cache
      if (userId) {
        const userCacheKey = CacheService.getUserKey(userId, 'stats');
        await this.cacheService.delete(userCacheKey);
      }

      // Invalidate global stats cache
      const globalCacheKey = CacheService.getGlobalKey('stats');
      await this.cacheService.delete(globalCacheKey);
    } catch (error) {
      console.error('Failed to invalidate stats cache:', error);
    }
  }

  /**
   * Invalidate coupon list cache
   */
  private async invalidateCouponListCache(): Promise<void> {
    try {
      // Clear all coupon list cache entries
      await this.cacheService.deletePattern('coupons:list:*');
    } catch (error) {
      console.error('Failed to invalidate coupon list cache:', error);
    }
  }
}
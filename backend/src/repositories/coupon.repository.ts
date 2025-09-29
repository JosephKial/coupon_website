import { PrismaClient, Coupon, CouponStatus } from '@prisma/client';
import { CreateCouponData, UpdateCouponData, CouponFilters, CouponResponse } from '../types/coupon.types.js';

export class CouponRepository {
  constructor(private prisma: PrismaClient) {}

  async create(couponData: CreateCouponData, createdBy: string): Promise<Coupon> {
    return this.prisma.coupon.create({
      data: {
        code: couponData.code,
        description: couponData.description,
        discountType: couponData.discountType,
        faceValue: couponData.faceValue,
        expirationDate: couponData.expirationDate,
        usageLimit: couponData.usageLimit,
        tags: couponData.tags || [],
        createdBy,
      },
    });
  }

  async findById(id: string): Promise<Coupon | null> {
    return this.prisma.coupon.findUnique({
      where: { id },
    });
  }

  async findByIdWithCreator(id: string): Promise<CouponResponse | null> {
    const coupon = await this.prisma.coupon.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!coupon) return null;

    const { creator, createdBy, ...couponData } = coupon;
    return {
      ...couponData,
      creator,
    };
  }

  async findByCode(code: string): Promise<Coupon | null> {
    return this.prisma.coupon.findFirst({
      where: { code },
    });
  }

  async update(id: string, couponData: UpdateCouponData): Promise<Coupon> {
    return this.prisma.coupon.update({
      where: { id },
      data: couponData,
    });
  }

  async delete(id: string): Promise<Coupon> {
    return this.prisma.coupon.delete({
      where: { id },
    });
  }

  async findMany(filters: CouponFilters): Promise<{ coupons: CouponResponse[]; total: number }> {
    const {
      search,
      status,
      discountType,
      minValue,
      maxValue,
      expirationDateFrom,
      expirationDateTo,
      tags,
      createdBy,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status && status.length > 0) {
      where.status = { in: status };
    }

    if (discountType && discountType.length > 0) {
      where.discountType = { in: discountType };
    }

    if (minValue !== undefined || maxValue !== undefined) {
      where.faceValue = {};
      if (minValue !== undefined) where.faceValue.gte = minValue;
      if (maxValue !== undefined) where.faceValue.lte = maxValue;
    }

    if (expirationDateFrom || expirationDateTo) {
      where.expirationDate = {};
      if (expirationDateFrom) where.expirationDate.gte = expirationDateFrom;
      if (expirationDateTo) where.expirationDate.lte = expirationDateTo;
    }

    if (tags && tags.length > 0) {
      where.tags = { hasSome: tags };
    }

    if (createdBy) {
      where.createdBy = createdBy;
    }

    // Get total count
    const total = await this.prisma.coupon.count({ where });

    // Get coupons with creator info
    const coupons = await this.prisma.coupon.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    });

    // Transform to CouponResponse format
    const couponResponses: CouponResponse[] = coupons.map(({ creator, createdBy, ...coupon }) => ({
      ...coupon,
      creator,
    }));

    return { coupons: couponResponses, total };
  }

  async exists(code: string, excludeId?: string): Promise<boolean> {
    const where: any = { code };
    if (excludeId) {
      where.id = { not: excludeId };
    }

    const coupon = await this.prisma.coupon.findFirst({
      where,
      select: { id: true },
    });
    return !!coupon;
  }

  async getStats(userId?: string): Promise<{
    totalCoupons: number;
    activeCoupons: number;
    expiredCoupons: number;
    usedCoupons: number;
    disabledCoupons: number;
    totalSavings: number;
    averageValue: number;
    expiringThisWeek: number;
    expiringThisMonth: number;
  }> {
    const where = userId ? { createdBy: userId } : {};
    
    const now = new Date();
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const oneMonthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [
      totalCoupons,
      activeCoupons,
      expiredCoupons,
      usedCoupons,
      disabledCoupons,
      expiringThisWeek,
      expiringThisMonth,
      allCoupons,
    ] = await Promise.all([
      this.prisma.coupon.count({ where }),
      this.prisma.coupon.count({ where: { ...where, status: CouponStatus.ACTIVE } }),
      this.prisma.coupon.count({ where: { ...where, status: CouponStatus.EXPIRED } }),
      this.prisma.coupon.count({ where: { ...where, status: CouponStatus.USED } }),
      this.prisma.coupon.count({ where: { ...where, status: CouponStatus.DISABLED } }),
      this.prisma.coupon.count({
        where: {
          ...where,
          status: CouponStatus.ACTIVE,
          expirationDate: {
            gte: now,
            lte: oneWeekFromNow,
          },
        },
      }),
      this.prisma.coupon.count({
        where: {
          ...where,
          status: CouponStatus.ACTIVE,
          expirationDate: {
            gte: now,
            lte: oneMonthFromNow,
          },
        },
      }),
      this.prisma.coupon.findMany({
        where,
        select: { faceValue: true, status: true },
      }),
    ]);

    const totalSavings = allCoupons
      .filter(c => c.status === CouponStatus.USED)
      .reduce((sum, c) => sum + Number(c.faceValue), 0);

    const averageValue = totalCoupons > 0 
      ? allCoupons.reduce((sum, c) => sum + Number(c.faceValue), 0) / totalCoupons 
      : 0;

    return {
      totalCoupons,
      activeCoupons,
      expiredCoupons,
      usedCoupons,
      disabledCoupons,
      totalSavings,
      averageValue,
      expiringThisWeek,
      expiringThisMonth,
    };
  }
}
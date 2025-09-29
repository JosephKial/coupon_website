import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { SearchService, SearchOptions } from '../SearchService.js';
import { CouponStatus, DiscountType } from '../../types/coupon.types.js';

// Mock PrismaClient
const mockPrisma = {
  coupon: {
    count: vi.fn(),
    findMany: vi.fn(),
  },
  $queryRaw: vi.fn(),
} as unknown as PrismaClient;

describe('SearchService', () => {
  let searchService: SearchService;

  beforeEach(() => {
    searchService = new SearchService(mockPrisma);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('searchCoupons', () => {
    it('should return empty results for empty query', async () => {
      const searchOptions: SearchOptions = { query: '' };
      
      const result = await searchService.searchCoupons(searchOptions);
      
      expect(result.coupons).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.searchTime).toBe(0);
      expect(result.highlightedTerms).toEqual([]);
    });

    it('should return empty results for whitespace-only query', async () => {
      const searchOptions: SearchOptions = { query: '   ' };
      
      const result = await searchService.searchCoupons(searchOptions);
      
      expect(result.coupons).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.searchTime).toBe(0);
      expect(result.highlightedTerms).toEqual([]);
    });

    it('should search across code and description by default', async () => {
      const mockCoupons = [
        {
          id: '1',
          code: 'SAVE20',
          description: 'Save 20% on groceries',
          discountType: DiscountType.PERCENTAGE,
          faceValue: 20,
          expirationDate: new Date('2024-12-31'),
          usageLimit: null,
          usageCount: 0,
          status: CouponStatus.ACTIVE,
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          creator: {
            id: 'user1',
            firstName: 'John',
            lastName: 'Doe',
          },
        },
      ];

      (mockPrisma.coupon.count as any).mockResolvedValue(1);
      (mockPrisma.coupon.findMany as any).mockResolvedValue([
        {
          ...mockCoupons[0],
          createdBy: 'user1',
        },
      ]);

      const searchOptions: SearchOptions = { query: 'SAVE20' };
      const result = await searchService.searchCoupons(searchOptions);

      expect(mockPrisma.coupon.count).toHaveBeenCalledWith({
        where: {
          AND: [
            {
              OR: [
                { AND: [{ code: { contains: 'SAVE20', mode: 'insensitive' } }] },
                { AND: [{ description: { contains: 'SAVE20', mode: 'insensitive' } }] },
              ],
            },
          ],
        },
      });

      expect(result.coupons).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.highlightedTerms).toEqual(['save20']);
    });

    it('should search only specified fields', async () => {
      const mockCoupons = [
        {
          id: '1',
          code: 'DISCOUNT10',
          description: null,
          discountType: DiscountType.PERCENTAGE,
          faceValue: 10,
          expirationDate: null,
          usageLimit: null,
          usageCount: 0,
          status: CouponStatus.ACTIVE,
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          creator: {
            id: 'user1',
            firstName: 'John',
            lastName: 'Doe',
          },
        },
      ];

      (mockPrisma.coupon.count as any).mockResolvedValue(1);
      (mockPrisma.coupon.findMany as any).mockResolvedValue([
        {
          ...mockCoupons[0],
          createdBy: 'user1',
        },
      ]);

      const searchOptions: SearchOptions = { 
        query: 'DISCOUNT10',
        fields: ['code']
      };
      
      const result = await searchService.searchCoupons(searchOptions);

      expect(mockPrisma.coupon.count).toHaveBeenCalledWith({
        where: {
          AND: [
            {
              OR: [
                { AND: [{ code: { contains: 'DISCOUNT10', mode: 'insensitive' } }] },
              ],
            },
          ],
        },
      });

      expect(result.coupons).toHaveLength(1);
    });

    it('should perform case-sensitive search when specified', async () => {
      const searchOptions: SearchOptions = { 
        query: 'Save20',
        caseSensitive: true
      };

      (mockPrisma.coupon.count as any).mockResolvedValue(0);
      (mockPrisma.coupon.findMany as any).mockResolvedValue([]);

      await searchService.searchCoupons(searchOptions);

      expect(mockPrisma.coupon.count).toHaveBeenCalledWith({
        where: {
          AND: [
            {
              OR: [
                { AND: [{ code: { contains: 'Save20', mode: 'default' } }] },
                { AND: [{ description: { contains: 'Save20', mode: 'default' } }] },
              ],
            },
          ],
        },
      });
    });

    it('should perform exact phrase search when fuzzy is false', async () => {
      const searchOptions: SearchOptions = { 
        query: 'Save 20 percent',
        fuzzy: false
      };

      (mockPrisma.coupon.count as any).mockResolvedValue(0);
      (mockPrisma.coupon.findMany as any).mockResolvedValue([]);

      await searchService.searchCoupons(searchOptions);

      expect(mockPrisma.coupon.count).toHaveBeenCalledWith({
        where: {
          AND: [
            {
              OR: [
                { code: { contains: 'Save 20 percent', mode: 'insensitive' } },
                { description: { contains: 'Save 20 percent', mode: 'insensitive' } },
              ],
            },
          ],
        },
      });
    });

    it('should combine search with additional filters', async () => {
      const searchOptions: SearchOptions = { query: 'discount' };
      const filters = {
        status: [CouponStatus.ACTIVE],
        minValue: 10,
        maxValue: 50,
      };

      (mockPrisma.coupon.count as any).mockResolvedValue(0);
      (mockPrisma.coupon.findMany as any).mockResolvedValue([]);

      await searchService.searchCoupons(searchOptions, filters);

      expect(mockPrisma.coupon.count).toHaveBeenCalledWith({
        where: {
          AND: [
            {
              OR: [
                { AND: [{ code: { contains: 'discount', mode: 'insensitive' } }] },
                { AND: [{ description: { contains: 'discount', mode: 'insensitive' } }] },
              ],
            },
            {
              status: { in: [CouponStatus.ACTIVE] },
              faceValue: { gte: 10, lte: 50 },
            },
          ],
        },
      });
    });

    it('should handle pagination correctly', async () => {
      const searchOptions: SearchOptions = { query: 'test' };
      const filters = { page: 2, limit: 10 };

      (mockPrisma.coupon.count as any).mockResolvedValue(25);
      (mockPrisma.coupon.findMany as any).mockResolvedValue([]);

      await searchService.searchCoupons(searchOptions, filters);

      expect(mockPrisma.coupon.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10, // (page 2 - 1) * limit 10
          take: 10,
        })
      );
    });

    it('should extract search terms correctly', async () => {
      const searchOptions: SearchOptions = { query: 'Save 20% on groceries!' };

      (mockPrisma.coupon.count as any).mockResolvedValue(0);
      (mockPrisma.coupon.findMany as any).mockResolvedValue([]);

      const result = await searchService.searchCoupons(searchOptions);

      expect(result.highlightedTerms).toEqual(['save', '20', 'on', 'groceries']);
    });

    it('should measure search time', async () => {
      const searchOptions: SearchOptions = { query: 'test' };

      (mockPrisma.coupon.count as any).mockResolvedValue(0);
      (mockPrisma.coupon.findMany as any).mockResolvedValue([]);

      const result = await searchService.searchCoupons(searchOptions);

      expect(result.searchTime).toBeGreaterThanOrEqual(0);
      expect(typeof result.searchTime).toBe('number');
    });
  });

  describe('advancedSearch', () => {
    it('should return empty results for empty query', async () => {
      const result = await searchService.advancedSearch('');
      
      expect(result.coupons).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.searchTime).toBe(0);
      expect(result.highlightedTerms).toEqual([]);
    });

    it('should use PostgreSQL full-text search', async () => {
      const mockResults = [
        {
          id: '1',
          code: 'SAVE20',
          description: 'Save 20% on groceries',
          discount_type: 'PERCENTAGE',
          face_value: 20,
          expiration_date: new Date('2024-12-31'),
          usage_limit: null,
          usage_count: 0,
          status: 'ACTIVE',
          tags: [],
          created_at: new Date(),
          updated_at: new Date(),
          created_by: 'user1',
          creator_id: 'user1',
          creator_first_name: 'John',
          creator_last_name: 'Doe',
          rank: 0.5,
        },
      ];

      const mockCountResult = [{ count: BigInt(1) }];

      (mockPrisma.$queryRaw as any)
        .mockResolvedValueOnce(mockResults)
        .mockResolvedValueOnce(mockCountResult);

      const result = await searchService.advancedSearch('groceries');

      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(2);
      expect(result.coupons).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.coupons[0].code).toBe('SAVE20');
      expect(result.coupons[0].creator.firstName).toBe('John');
    });
  });

  describe('getSuggestions', () => {
    it('should return empty array for short query', async () => {
      const result = await searchService.getSuggestions('a');
      expect(result).toEqual([]);
    });

    it('should return empty array for empty query', async () => {
      const result = await searchService.getSuggestions('');
      expect(result).toEqual([]);
    });

    it('should return suggestions based on coupon codes and descriptions', async () => {
      const mockCoupons = [
        { code: 'SAVE20', description: 'Save money on groceries' },
        { code: 'DISCOUNT10', description: 'Discount on electronics' },
        { code: 'SAVE50', description: null },
      ];

      (mockPrisma.coupon.findMany as any).mockResolvedValue(mockCoupons);

      const result = await searchService.getSuggestions('save', 5);

      expect(mockPrisma.coupon.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { code: { contains: 'save', mode: 'insensitive' } },
            { description: { contains: 'save', mode: 'insensitive' } },
          ],
        },
        select: {
          code: true,
          description: true,
        },
        take: 10, // limit * 2
      });

      expect(result).toContain('SAVE20');
      expect(result).toContain('SAVE50');
      expect(result).toContain('save');
    });

    it('should limit suggestions to specified count', async () => {
      const mockCoupons = Array.from({ length: 10 }, (_, i) => ({
        code: `SAVE${i}`,
        description: `Save ${i} percent`,
      }));

      (mockPrisma.coupon.findMany as any).mockResolvedValue(mockCoupons);

      const result = await searchService.getSuggestions('save', 3);

      expect(result.length).toBeLessThanOrEqual(3);
    });
  });
});
import { PrismaClient } from '@prisma/client';
import { CouponFilters, CouponResponse } from '../types/coupon.types.js';
import { CacheService, getCacheService } from './CacheService.js';

export interface SearchOptions {
  query: string;
  fields?: ('code' | 'description')[];
  fuzzy?: boolean;
  caseSensitive?: boolean;
}

export interface SearchResult {
  coupons: CouponResponse[];
  total: number;
  searchTime: number;
  highlightedTerms: string[];
}

export class SearchService {
  private cacheService: CacheService;

  constructor(private prisma: PrismaClient, cacheService?: CacheService) {
    this.cacheService = cacheService || getCacheService();
  }

  /**
   * Performs full-text search across coupon codes and descriptions
   */
  async searchCoupons(
    searchOptions: SearchOptions,
    filters: Omit<CouponFilters, 'search'> = {}
  ): Promise<SearchResult> {
    const startTime = Date.now();
    const { query, fields = ['code', 'description'], fuzzy = true, caseSensitive = false } = searchOptions;

    if (!query.trim()) {
      return {
        coupons: [],
        total: 0,
        searchTime: 0,
        highlightedTerms: [],
      };
    }

    // Generate cache key for search results
    const cacheKey = CacheService.getSearchKey(query, { 
      ...filters, 
      fields, 
      fuzzy, 
      caseSensitive 
    });

    // Try to get from cache first
    const cachedResult = await this.cacheService.get<SearchResult>(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    // Extract search terms for highlighting
    const searchTerms = this.extractSearchTerms(query);
    
    // Build search conditions
    const searchConditions = this.buildSearchConditions(query, fields, fuzzy, caseSensitive);
    
    // Build additional filters
    const additionalFilters = this.buildAdditionalFilters(filters);
    
    // Combine search and filter conditions
    const where = {
      AND: [
        searchConditions,
        additionalFilters,
      ].filter(Boolean),
    };

    // Execute search with pagination
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters;

    const skip = (page - 1) * limit;

    // Get total count
    const total = await this.prisma.coupon.count({ where });

    // Get search results with creator info
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
      orderBy: this.buildOrderBy(sortBy, sortOrder, query, fields),
      skip,
      take: limit,
    });

    // Transform to CouponResponse format
    const couponResponses: CouponResponse[] = coupons.map(({ creator, createdBy, ...coupon }) => ({
      ...coupon,
      creator,
    }));

    const searchTime = Date.now() - startTime;

    const result = {
      coupons: couponResponses,
      total,
      searchTime,
      highlightedTerms: searchTerms,
    };

    // Cache the search results for 2 minutes
    await this.cacheService.set(cacheKey, result, { ttl: 120 });

    return result;
  }

  /**
   * Performs advanced text search with ranking
   */
  async advancedSearch(
    query: string,
    filters: Omit<CouponFilters, 'search'> = {}
  ): Promise<SearchResult> {
    const startTime = Date.now();

    if (!query.trim()) {
      return {
        coupons: [],
        total: 0,
        searchTime: 0,
        highlightedTerms: [],
      };
    }

    // Generate cache key for advanced search results
    const cacheKey = CacheService.getSearchKey(`advanced:${query}`, filters);

    // Try to get from cache first
    const cachedResult = await this.cacheService.get<SearchResult>(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    // Use PostgreSQL full-text search for better performance and ranking
    const searchQuery = this.buildFullTextSearchQuery(query);
    const searchTerms = this.extractSearchTerms(query);
    
    // Build additional filters
    const additionalFilters = this.buildAdditionalFilters(filters);
    
    const {
      page = 1,
      limit = 20,
    } = filters;

    const skip = (page - 1) * limit;

    // Use raw SQL for full-text search with ranking
    const searchResults = await this.prisma.$queryRaw<Array<{
      id: string;
      code: string;
      description: string | null;
      discount_type: string;
      face_value: number;
      expiration_date: Date | null;
      usage_limit: number | null;
      usage_count: number;
      status: string;
      tags: string[];
      created_at: Date;
      updated_at: Date;
      created_by: string;
      creator_id: string;
      creator_first_name: string;
      creator_last_name: string;
      rank: number;
    }>>`
      SELECT 
        c.*,
        u.id as creator_id,
        u.first_name as creator_first_name,
        u.last_name as creator_last_name,
        ts_rank(
          to_tsvector('english', coalesce(c.code, '') || ' ' || coalesce(c.description, '')),
          plainto_tsquery('english', ${searchQuery})
        ) as rank
      FROM coupons c
      JOIN users u ON c.created_by = u.id
      WHERE 
        to_tsvector('english', coalesce(c.code, '') || ' ' || coalesce(c.description, ''))
        @@ plainto_tsquery('english', ${searchQuery})
        ${additionalFilters ? this.buildRawFilterConditions(additionalFilters) : ''}
      ORDER BY rank DESC, c.created_at DESC
      LIMIT ${limit} OFFSET ${skip}
    `;

    // Get total count for pagination
    const totalResult = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM coupons c
      WHERE 
        to_tsvector('english', coalesce(c.code, '') || ' ' || coalesce(c.description, ''))
        @@ plainto_tsquery('english', ${searchQuery})
        ${additionalFilters ? this.buildRawFilterConditions(additionalFilters) : ''}
    `;

    const total = Number(totalResult[0]?.count || 0);

    // Transform results to CouponResponse format
    const couponResponses: CouponResponse[] = searchResults.map((row) => ({
      id: row.id,
      code: row.code,
      description: row.description,
      discountType: row.discount_type as any,
      faceValue: Number(row.face_value),
      expirationDate: row.expiration_date,
      usageLimit: row.usage_limit,
      usageCount: row.usage_count,
      status: row.status as any,
      tags: row.tags,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      creator: {
        id: row.creator_id,
        firstName: row.creator_first_name,
        lastName: row.creator_last_name,
      },
    }));

    const searchTime = Date.now() - startTime;

    const result = {
      coupons: couponResponses,
      total,
      searchTime,
      highlightedTerms: searchTerms,
    };

    // Cache the advanced search results for 3 minutes
    await this.cacheService.set(cacheKey, result, { ttl: 180 });

    return result;
  }

  /**
   * Suggests search terms based on existing coupon data
   */
  async getSuggestions(query: string, limit: number = 5): Promise<string[]> {
    if (!query.trim() || query.length < 2) {
      return [];
    }

    // Generate cache key for suggestions
    const cacheKey = `suggestions:${query.toLowerCase()}:${limit}`;

    // Try to get from cache first
    const cachedSuggestions = await this.cacheService.get<string[]>(cacheKey);
    if (cachedSuggestions) {
      return cachedSuggestions;
    }

    const coupons = await this.prisma.coupon.findMany({
      where: {
        OR: [
          { code: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        code: true,
        description: true,
      },
      take: limit * 2, // Get more to filter duplicates
    });

    const uniqueSuggestions = new Set<string>();
    
    coupons.forEach(coupon => {
      // Add code if it matches
      if (coupon.code.toLowerCase().includes(query.toLowerCase())) {
        uniqueSuggestions.add(coupon.code);
      }
      
      // Add description words if they match
      if (coupon.description) {
        const words = coupon.description.toLowerCase().split(/\s+/);
        words.forEach(word => {
          if (word.includes(query.toLowerCase()) && word.length > 2) {
            uniqueSuggestions.add(word);
          }
        });
      }
    });

    const suggestions = Array.from(uniqueSuggestions).slice(0, limit);

    // Cache suggestions for 10 minutes
    await this.cacheService.set(cacheKey, suggestions, { ttl: 600 });

    return suggestions;
  }

  /**
   * Invalidate search-related cache entries
   */
  async invalidateSearchCache(): Promise<void> {
    try {
      // Clear all search results
      await this.cacheService.deletePattern('search:*');
      // Clear all suggestions
      await this.cacheService.deletePattern('suggestions:*');
    } catch (error) {
      console.error('Failed to invalidate search cache:', error);
    }
  }

  private extractSearchTerms(query: string): string[] {
    return query
      .toLowerCase()
      .split(/\s+/)
      .filter(term => term.length > 0)
      .map(term => term.replace(/[^\w]/g, ''))
      .filter(term => term.length > 0);
  }

  private buildSearchConditions(
    query: string,
    fields: ('code' | 'description')[],
    fuzzy: boolean,
    caseSensitive: boolean
  ) {
    const searchTerms = query.split(/\s+/).filter(term => term.length > 0);
    const mode = caseSensitive ? 'default' : 'insensitive';

    const conditions = [];

    for (const field of fields) {
      if (fuzzy) {
        // Fuzzy search - each term can appear anywhere in the field
        const fieldConditions = searchTerms.map(term => ({
          [field]: { contains: term, mode },
        }));
        conditions.push({ AND: fieldConditions });
      } else {
        // Exact phrase search
        conditions.push({
          [field]: { contains: query, mode },
        });
      }
    }

    return { OR: conditions };
  }

  private buildAdditionalFilters(filters: Omit<CouponFilters, 'search'>) {
    const where: any = {};

    if (filters.status && filters.status.length > 0) {
      where.status = { in: filters.status };
    }

    if (filters.discountType && filters.discountType.length > 0) {
      where.discountType = { in: filters.discountType };
    }

    if (filters.minValue !== undefined || filters.maxValue !== undefined) {
      where.faceValue = {};
      if (filters.minValue !== undefined) where.faceValue.gte = filters.minValue;
      if (filters.maxValue !== undefined) where.faceValue.lte = filters.maxValue;
    }

    if (filters.expirationDateFrom || filters.expirationDateTo) {
      where.expirationDate = {};
      if (filters.expirationDateFrom) where.expirationDate.gte = filters.expirationDateFrom;
      if (filters.expirationDateTo) where.expirationDate.lte = filters.expirationDateTo;
    }

    if (filters.tags && filters.tags.length > 0) {
      where.tags = { hasSome: filters.tags };
    }

    if (filters.createdBy) {
      where.createdBy = filters.createdBy;
    }

    return Object.keys(where).length > 0 ? where : undefined;
  }

  private buildOrderBy(
    sortBy: string,
    sortOrder: string,
    query?: string,
    fields?: string[]
  ) {
    // If we have a search query, prioritize relevance
    if (query && fields) {
      return [
        // Primary sort by relevance (exact matches first)
        { [sortBy]: sortOrder },
      ];
    }

    return { [sortBy]: sortOrder };
  }

  private buildFullTextSearchQuery(query: string): string {
    // Clean and prepare query for PostgreSQL full-text search
    return query
      .trim()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private buildRawFilterConditions(filters: any): string {
    const conditions = [];

    if (filters.status && filters.status.in) {
      const statusList = filters.status.in.map((s: string) => `'${s}'`).join(',');
      conditions.push(`AND c.status IN (${statusList})`);
    }

    if (filters.discountType && filters.discountType.in) {
      const typeList = filters.discountType.in.map((t: string) => `'${t}'`).join(',');
      conditions.push(`AND c.discount_type IN (${typeList})`);
    }

    if (filters.faceValue) {
      if (filters.faceValue.gte !== undefined) {
        conditions.push(`AND c.face_value >= ${filters.faceValue.gte}`);
      }
      if (filters.faceValue.lte !== undefined) {
        conditions.push(`AND c.face_value <= ${filters.faceValue.lte}`);
      }
    }

    if (filters.expirationDate) {
      if (filters.expirationDate.gte) {
        conditions.push(`AND c.expiration_date >= '${filters.expirationDate.gte.toISOString().split('T')[0]}'`);
      }
      if (filters.expirationDate.lte) {
        conditions.push(`AND c.expiration_date <= '${filters.expirationDate.lte.toISOString().split('T')[0]}'`);
      }
    }

    if (filters.createdBy) {
      conditions.push(`AND c.created_by = '${filters.createdBy}'`);
    }

    return conditions.join(' ');
  }
}
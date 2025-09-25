import { AxiosResponse } from 'axios';
import { apiClient } from './auth';
import {
  Coupon,
  CouponCreateRequest,
  CouponUpdateRequest,
  CouponFilters,
  PaginationParams,
  PaginatedResponse,
} from '@/types';

class CouponService {
  private static readonly BASE_PATH = '/coupons';

  // Get all coupons with optional filters and pagination
  static async getCoupons(
    filters?: CouponFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<Coupon>> {
    try {
      const params = new URLSearchParams();
      
      // Add pagination params
      if (pagination?.skip !== undefined) {
        params.append('skip', pagination.skip.toString());
      }
      if (pagination?.limit !== undefined) {
        params.append('limit', pagination.limit.toString());
      }
      
      // Add filter params
      if (filters?.search) {
        params.append('search', filters.search);
      }
      if (filters?.store_name) {
        params.append('store_name', filters.store_name);
      }
      if (filters?.category) {
        params.append('category', filters.category);
      }
      if (filters?.discount_type) {
        params.append('discount_type', filters.discount_type);
      }
      if (filters?.is_used !== undefined) {
        params.append('is_used', filters.is_used.toString());
      }
      if (filters?.expiry_date_from) {
        params.append('expiry_date_from', filters.expiry_date_from);
      }
      if (filters?.expiry_date_to) {
        params.append('expiry_date_to', filters.expiry_date_to);
      }
      if (filters?.min_discount !== undefined) {
        params.append('min_discount', filters.min_discount.toString());
      }
      if (filters?.max_discount !== undefined) {
        params.append('max_discount', filters.max_discount.toString());
      }

      const response: AxiosResponse<PaginatedResponse<Coupon>> = await apiClient.get(
        `${this.BASE_PATH}/?${params.toString()}`
      );
      
      return response.data;
    } catch (error: any) {
      console.error('Get coupons error:', error);
      throw new Error(
        error.response?.data?.detail || 'Failed to fetch coupons'
      );
    }
  }

  // Get a specific coupon by ID
  static async getCoupon(id: number): Promise<Coupon> {
    try {
      const response: AxiosResponse<Coupon> = await apiClient.get(
        `${this.BASE_PATH}/${id}`
      );
      
      return response.data;
    } catch (error: any) {
      console.error('Get coupon error:', error);
      throw new Error(
        error.response?.data?.detail || 'Failed to fetch coupon'
      );
    }
  }

  // Create a new coupon
  static async createCoupon(couponData: CouponCreateRequest): Promise<Coupon> {
    try {
      const response: AxiosResponse<Coupon> = await apiClient.post(
        this.BASE_PATH,
        couponData
      );
      
      return response.data;
    } catch (error: any) {
      console.error('Create coupon error:', error);
      throw new Error(
        error.response?.data?.detail || 'Failed to create coupon'
      );
    }
  }

  // Update an existing coupon
  static async updateCoupon(
    id: number,
    couponData: CouponUpdateRequest
  ): Promise<Coupon> {
    try {
      const response: AxiosResponse<Coupon> = await apiClient.put(
        `${this.BASE_PATH}/${id}`,
        couponData
      );
      
      return response.data;
    } catch (error: any) {
      console.error('Update coupon error:', error);
      throw new Error(
        error.response?.data?.detail || 'Failed to update coupon'
      );
    }
  }

  // Delete a coupon
  static async deleteCoupon(id: number): Promise<void> {
    try {
      await apiClient.delete(`${this.BASE_PATH}/${id}`);
    } catch (error: any) {
      console.error('Delete coupon error:', error);
      throw new Error(
        error.response?.data?.detail || 'Failed to delete coupon'
      );
    }
  }

  // Mark a coupon as used/unused
  static async toggleCouponUsed(id: number, isUsed: boolean): Promise<Coupon> {
    return this.updateCoupon(id, { is_used: isUsed });
  }

  // Get coupon statistics
  static async getCouponStats(): Promise<{
    total: number;
    used: number;
    unused: number;
    expired: number;
    expiring_soon: number;
  }> {
    try {
      const response = await apiClient.get(`${this.BASE_PATH}/stats`);
      return response.data;
    } catch (error: any) {
      console.error('Get coupon stats error:', error);
      throw new Error(
        error.response?.data?.detail || 'Failed to fetch coupon statistics'
      );
    }
  }

  // Get unique store names for filtering
  static async getStoreNames(): Promise<string[]> {
    try {
      const response = await apiClient.get(`${this.BASE_PATH}/stores`);
      return response.data;
    } catch (error: any) {
      console.error('Get store names error:', error);
      return [];
    }
  }

  // Get unique categories for filtering
  static async getCategories(): Promise<string[]> {
    try {
      const response = await apiClient.get(`${this.BASE_PATH}/categories`);
      return response.data;
    } catch (error: any) {
      console.error('Get categories error:', error);
      return [];
    }
  }
}

export default CouponService;
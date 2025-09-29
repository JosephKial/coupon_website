import { apiClient } from './apiClient';
import { Coupon, ApiResponse, PaginatedResponse, CouponFilters, CouponStats } from '../types';

export interface CreateCouponData {
  code: string;
  description?: string;
  discountType: 'amount' | 'percentage';
  faceValue: number;
  expirationDate?: string;
  usageLimit?: number;
  tags?: string[];
}

export interface UpdateCouponData extends Partial<CreateCouponData> {
  status?: 'active' | 'expired' | 'used' | 'disabled';
}

class CouponService {
  async getCoupons(filters?: CouponFilters & { page?: number; limit?: number }): Promise<ApiResponse<PaginatedResponse<Coupon>>> {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });
    }

    const queryString = params.toString();
    const url = queryString ? `/coupons?${queryString}` : '/coupons';
    
    return apiClient.get<PaginatedResponse<Coupon>>(url);
  }

  async getCoupon(id: string): Promise<ApiResponse<Coupon>> {
    return apiClient.get<Coupon>(`/coupons/${id}`);
  }

  async createCoupon(data: CreateCouponData): Promise<ApiResponse<Coupon>> {
    return apiClient.post<Coupon>('/coupons', data);
  }

  async updateCoupon(id: string, data: UpdateCouponData): Promise<ApiResponse<Coupon>> {
    return apiClient.put<Coupon>(`/coupons/${id}`, data);
  }

  async deleteCoupon(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete(`/coupons/${id}`);
  }

  async getCouponStats(): Promise<ApiResponse<CouponStats>> {
    return apiClient.get<CouponStats>('/coupons/stats');
  }

  async searchCoupons(query: string, filters?: Partial<CouponFilters>): Promise<ApiResponse<PaginatedResponse<Coupon>>> {
    const params = new URLSearchParams();
    params.append('search', query);
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });
    }

    return apiClient.get<PaginatedResponse<Coupon>>(`/coupons?${params.toString()}`);
  }

  async getSuggestions(query: string): Promise<ApiResponse<string[]>> {
    return apiClient.get<string[]>(`/coupons/suggestions?q=${encodeURIComponent(query)}`);
  }

  // Alias methods for consistency with hook naming
  getStats = this.getCouponStats;
}

export const couponService = new CouponService();
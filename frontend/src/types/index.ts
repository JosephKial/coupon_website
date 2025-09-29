// Common types used across the application

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'member';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface Coupon {
  id: string;
  code: string;
  description?: string;
  discountType: 'amount' | 'percentage';
  faceValue: number;
  expirationDate?: string;
  usageLimit?: number;
  usageCount: number;
  status: 'active' | 'expired' | 'used' | 'disabled';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CouponFilters {
  search?: string;
  status?: string;
  discountType?: string;
  expirationStart?: string;
  expirationEnd?: string;
  minValue?: number;
  maxValue?: number;
}

export interface CouponStats {
  totalCoupons: number;
  activeCoupons: number;
  expiredCoupons: number;
  usedCoupons: number;
  totalSavings: number;
}
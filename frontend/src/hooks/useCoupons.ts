import { useState, useEffect, useCallback } from 'react';
import { 
  Coupon, 
  CouponCreateRequest, 
  CouponUpdateRequest, 
  CouponFilters, 
  PaginationParams,
  PaginatedResponse 
} from '@/types';
import CouponService from '@/services/coupons';

interface UseCouponsReturn {
  coupons: Coupon[];
  total: number;
  isLoading: boolean;
  error: string | null;
  filters: CouponFilters;
  pagination: Required<PaginationParams>;
  setFilters: (filters: CouponFilters) => void;
  setPagination: (pagination: PaginationParams) => void;
  loadCoupons: () => Promise<void>;
  createCoupon: (couponData: CouponCreateRequest) => Promise<Coupon>;
  updateCoupon: (id: number, couponData: CouponUpdateRequest) => Promise<Coupon>;
  deleteCoupon: (id: number) => Promise<void>;
  toggleCouponUsed: (id: number, isUsed: boolean) => Promise<void>;
  refreshCoupons: () => Promise<void>;
  clearError: () => void;
}

const DEFAULT_PAGINATION: Required<PaginationParams> = {
  skip: 0,
  limit: 20,
};

export const useCoupons = (
  initialFilters: CouponFilters = {},
  initialPagination: PaginationParams = DEFAULT_PAGINATION
): UseCouponsReturn => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<CouponFilters>(initialFilters);
  const [pagination, setPaginationState] = useState<Required<PaginationParams>>({
    ...DEFAULT_PAGINATION,
    ...initialPagination,
  });

  const loadCoupons = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response: PaginatedResponse<Coupon> = await CouponService.getCoupons(
        filters,
        pagination
      );
      
      setCoupons(response.items);
      setTotal(response.total);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load coupons';
      setError(errorMessage);
      console.error('Load coupons error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filters, pagination]);

  // Load coupons when filters or pagination change
  useEffect(() => {
    loadCoupons();
  }, [loadCoupons]);

  const setFilters = useCallback((newFilters: CouponFilters) => {
    setFiltersState(newFilters);
    // Reset to first page when filters change
    setPaginationState(prev => ({ ...prev, skip: 0 }));
  }, []);

  const setPagination = useCallback((newPagination: PaginationParams) => {
    setPaginationState(prev => ({ ...prev, ...newPagination }));
  }, []);

  const createCoupon = useCallback(async (couponData: CouponCreateRequest): Promise<Coupon> => {
    try {
      setError(null);
      const newCoupon = await CouponService.createCoupon(couponData);
      
      // Add the new coupon to the beginning of the list
      setCoupons(prevCoupons => [newCoupon, ...prevCoupons]);
      setTotal(prevTotal => prevTotal + 1);
      
      return newCoupon;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create coupon';
      setError(errorMessage);
      throw error;
    }
  }, []);

  const updateCoupon = useCallback(async (
    id: number, 
    couponData: CouponUpdateRequest
  ): Promise<Coupon> => {
    try {
      setError(null);
      const updatedCoupon = await CouponService.updateCoupon(id, couponData);
      
      // Update the coupon in the list
      setCoupons(prevCoupons =>
        prevCoupons.map(coupon =>
          coupon.id === id ? updatedCoupon : coupon
        )
      );
      
      return updatedCoupon;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update coupon';
      setError(errorMessage);
      throw error;
    }
  }, []);

  const deleteCoupon = useCallback(async (id: number): Promise<void> => {
    try {
      setError(null);
      await CouponService.deleteCoupon(id);
      
      // Remove the coupon from the list
      setCoupons(prevCoupons => prevCoupons.filter(coupon => coupon.id !== id));
      setTotal(prevTotal => Math.max(0, prevTotal - 1));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete coupon';
      setError(errorMessage);
      throw error;
    }
  }, []);

  const toggleCouponUsed = useCallback(async (id: number, isUsed: boolean): Promise<void> => {
    try {
      setError(null);
      const updatedCoupon = await CouponService.toggleCouponUsed(id, isUsed);
      
      // Update the coupon in the list
      setCoupons(prevCoupons =>
        prevCoupons.map(coupon =>
          coupon.id === id ? updatedCoupon : coupon
        )
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update coupon status';
      setError(errorMessage);
      throw error;
    }
  }, []);

  const refreshCoupons = useCallback(async () => {
    await loadCoupons();
  }, [loadCoupons]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    coupons,
    total,
    isLoading,
    error,
    filters,
    pagination,
    setFilters,
    setPagination,
    loadCoupons,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    toggleCouponUsed,
    refreshCoupons,
    clearError,
  };
};
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { couponService } from '../services';
import { Coupon, CouponFilters, CreateCouponData, UpdateCouponData } from '../types';

// Query keys for consistent cache management
export const couponKeys = {
  all: ['coupons'] as const,
  lists: () => [...couponKeys.all, 'list'] as const,
  list: (filters: CouponFilters) => [...couponKeys.lists(), filters] as const,
  details: () => [...couponKeys.all, 'detail'] as const,
  detail: (id: string) => [...couponKeys.details(), id] as const,
  stats: () => [...couponKeys.all, 'stats'] as const,
  search: (query: string, filters?: Partial<CouponFilters>) => 
    [...couponKeys.all, 'search', query, filters] as const,
  suggestions: (query: string) => [...couponKeys.all, 'suggestions', query] as const,
};

// Hook for fetching coupon list with caching
export function useCoupons(filters: CouponFilters = {}) {
  return useQuery({
    queryKey: couponKeys.list(filters),
    queryFn: () => couponService.getCoupons(filters),
    staleTime: 1000 * 60 * 2, // 2 minutes
    cacheTime: 1000 * 60 * 5, // 5 minutes
    keepPreviousData: true, // Keep previous data while fetching new data
  });
}

// Hook for fetching a single coupon
export function useCoupon(id: string) {
  return useQuery({
    queryKey: couponKeys.detail(id),
    queryFn: () => couponService.getCoupon(id),
    staleTime: 1000 * 60 * 5, // 5 minutes
    cacheTime: 1000 * 60 * 10, // 10 minutes
    enabled: !!id, // Only run if id is provided
  });
}

// Hook for fetching coupon statistics
export function useCouponStats() {
  return useQuery({
    queryKey: couponKeys.stats(),
    queryFn: () => couponService.getStats(),
    staleTime: 1000 * 60 * 1, // 1 minute
    cacheTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Hook for searching coupons
export function useSearchCoupons(query: string, filters?: Partial<CouponFilters>) {
  return useQuery({
    queryKey: couponKeys.search(query, filters),
    queryFn: () => couponService.searchCoupons(query, filters),
    staleTime: 1000 * 30, // 30 seconds
    cacheTime: 1000 * 60 * 2, // 2 minutes
    enabled: query.length >= 2, // Only search if query is at least 2 characters
  });
}

// Hook for getting search suggestions
export function useSearchSuggestions(query: string) {
  return useQuery({
    queryKey: couponKeys.suggestions(query),
    queryFn: () => couponService.getSuggestions(query),
    staleTime: 1000 * 60 * 5, // 5 minutes
    cacheTime: 1000 * 60 * 10, // 10 minutes
    enabled: query.length >= 2,
  });
}

// Mutation hook for creating coupons
export function useCreateCoupon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCouponData) => couponService.createCoupon(data),
    onSuccess: () => {
      // Invalidate and refetch coupon lists and stats
      queryClient.invalidateQueries({ queryKey: couponKeys.lists() });
      queryClient.invalidateQueries({ queryKey: couponKeys.stats() });
      queryClient.invalidateQueries({ queryKey: [...couponKeys.all, 'search'] });
    },
  });
}

// Mutation hook for updating coupons
export function useUpdateCoupon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCouponData }) =>
      couponService.updateCoupon(id, data),
    onSuccess: (updatedCoupon, { id }) => {
      // Update the specific coupon in cache
      queryClient.setQueryData(couponKeys.detail(id), updatedCoupon);
      
      // Invalidate lists and stats
      queryClient.invalidateQueries({ queryKey: couponKeys.lists() });
      queryClient.invalidateQueries({ queryKey: couponKeys.stats() });
      queryClient.invalidateQueries({ queryKey: [...couponKeys.all, 'search'] });
    },
  });
}

// Mutation hook for deleting coupons
export function useDeleteCoupon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => couponService.deleteCoupon(id),
    onSuccess: (_, id) => {
      // Remove the specific coupon from cache
      queryClient.removeQueries({ queryKey: couponKeys.detail(id) });
      
      // Invalidate lists and stats
      queryClient.invalidateQueries({ queryKey: couponKeys.lists() });
      queryClient.invalidateQueries({ queryKey: couponKeys.stats() });
      queryClient.invalidateQueries({ queryKey: [...couponKeys.all, 'search'] });
    },
  });
}

// Hook for prefetching coupon data
export function usePrefetchCoupon() {
  const queryClient = useQueryClient();

  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: couponKeys.detail(id),
      queryFn: () => couponService.getCoupon(id),
      staleTime: 1000 * 60 * 5, // 5 minutes
    });
  };
}

// Hook for optimistic updates
export function useOptimisticCouponUpdate() {
  const queryClient = useQueryClient();

  return {
    // Optimistically update a coupon in the cache
    updateCouponOptimistically: (id: string, updates: Partial<Coupon>) => {
      queryClient.setQueryData(couponKeys.detail(id), (old: Coupon | undefined) => {
        if (!old) return old;
        return { ...old, ...updates };
      });
    },

    // Rollback optimistic update
    rollbackCouponUpdate: (id: string) => {
      queryClient.invalidateQueries({ queryKey: couponKeys.detail(id) });
    },
  };
}
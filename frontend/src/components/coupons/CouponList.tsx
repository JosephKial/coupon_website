import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Typography,
  Pagination,
  CircularProgress,
  Alert,
  Skeleton,
  useTheme,
  useMediaQuery,
  Fab,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CouponCard } from './CouponCard';
import { CouponSearch } from './CouponSearch';
import { Coupon, CouponFilters, PaginatedResponse } from '../../types';
import { apiClient } from '../../services/apiClient';

interface CouponListProps {
  filters?: CouponFilters;
  onEditCoupon?: (coupon: Coupon) => void;
  onCreateCoupon?: () => void;
  searchQuery?: string;
  showSearch?: boolean;
  onFiltersChange?: (filters: CouponFilters) => void;
  onSearchChange?: (search: string) => void;
}

const ITEMS_PER_PAGE = 12;

export const CouponList: React.FC<CouponListProps> = ({
  filters = {},
  onEditCoupon,
  onCreateCoupon,
  searchQuery = '',
  showSearch = true,
  onFiltersChange,
  onSearchChange,
}) => {
  const [page, setPage] = useState(1);
  const [deletingCouponId, setDeletingCouponId] = useState<string | null>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const queryClient = useQueryClient();

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filters, searchQuery]);

  // Fetch coupons query
  const {
    data: couponsResponse,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['coupons', page, filters, searchQuery],
    queryFn: async (): Promise<PaginatedResponse<Coupon>> => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: ITEMS_PER_PAGE.toString(),
      });

      // Add filters to params, converting values to strings
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });

      if (searchQuery) {
        params.append('search', searchQuery);
      }

      const response = await apiClient.get(`/coupons?${params.toString()}`);
      return response.data.data;
    },
    keepPreviousData: true,
  });

  // Delete coupon mutation
  const deleteCouponMutation = useMutation({
    mutationFn: async (couponId: string) => {
      await apiClient.delete(`/coupons/${couponId}`);
    },
    onMutate: (couponId: string) => {
      setDeletingCouponId(couponId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['coupons']);
      setDeletingCouponId(null);
    },
    onError: (error) => {
      console.error('Failed to delete coupon:', error);
      setDeletingCouponId(null);
    },
  });

  const handleDeleteCoupon = (couponId: string) => {
    deleteCouponMutation.mutate(couponId);
  };

  const handlePageChange = (event: React.ChangeEvent<unknown>, newPage: number) => {
    setPage(newPage);
    // Scroll to top when page changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Loading skeleton
  const renderLoadingSkeleton = () => (
    <Grid container spacing={3}>
      {Array.from({ length: ITEMS_PER_PAGE }).map((_, index) => (
        <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
          <Skeleton
            variant="rectangular"
            height={280}
            sx={{ borderRadius: 1 }}
            data-testid="skeleton"
          />
        </Grid>
      ))}
    </Grid>
  );

  // Error state
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert
          severity="error"
          action={
            <button onClick={() => refetch()}>
              Retry
            </button>
          }
        >
          Failed to load coupons. Please try again.
        </Alert>
      </Box>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        {renderLoadingSkeleton()}
      </Box>
    );
  }

  const coupons = couponsResponse?.data || [];
  const pagination = couponsResponse?.pagination;

  // Empty state
  if (coupons.length === 0) {
    const hasFilters = Object.keys(filters).some(key => filters[key as keyof CouponFilters]) || searchQuery;
    
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 400,
          textAlign: 'center',
          p: 3,
        }}
      >
        <Typography variant="h5" color="text.secondary" gutterBottom>
          {hasFilters ? 'No coupons found' : 'No coupons yet'}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          {hasFilters
            ? 'Try adjusting your search or filters to find what you\'re looking for.'
            : 'Get started by creating your first coupon!'}
        </Typography>
        {onCreateCoupon && !hasFilters && (
          <Fab
            color="primary"
            variant="extended"
            onClick={onCreateCoupon}
            sx={{ mt: 2 }}
          >
            <AddIcon sx={{ mr: 1 }} />
            Create Coupon
          </Fab>
        )}
      </Box>
    );
  }

  return (
    <Box sx={{ position: 'relative' }}>
      {/* Search and Filters */}
      {showSearch && onFiltersChange && onSearchChange && (
        <CouponSearch
          filters={filters}
          onFiltersChange={onFiltersChange}
          onSearchChange={onSearchChange}
          searchQuery={searchQuery}
          isLoading={isLoading}
          resultCount={pagination?.total}
        />
      )}

      {/* Results Summary */}
      {pagination && !showSearch && (
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Showing {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} coupons
          </Typography>
          {searchQuery && (
            <Typography variant="body2" color="text.secondary">
              Search: "{searchQuery}"
            </Typography>
          )}
        </Box>
      )}

      {/* Coupon Grid */}
      <Grid container spacing={3}>
        {coupons.map((coupon) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={coupon.id}>
            <CouponCard
              coupon={coupon}
              onEdit={onEditCoupon}
              onDelete={handleDeleteCoupon}
              isDeleting={deletingCouponId === coupon.id}
            />
          </Grid>
        ))}
      </Grid>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            mt: 4,
            mb: 2,
          }}
        >
          <Pagination
            count={pagination.totalPages}
            page={pagination.page}
            onChange={handlePageChange}
            color="primary"
            size={isMobile ? 'small' : 'medium'}
            showFirstButton
            showLastButton
          />
        </Box>
      )}

      {/* Floating Action Button for Create */}
      {onCreateCoupon && (
        <Fab
          color="primary"
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            zIndex: theme.zIndex.fab,
          }}
          onClick={onCreateCoupon}
        >
          <AddIcon />
        </Fab>
      )}

      {/* Loading overlay for delete operations */}
      {deletingCouponId && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: theme.zIndex.modal,
          }}
        >
          <Box
            sx={{
              backgroundColor: 'background.paper',
              borderRadius: 1,
              p: 3,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <CircularProgress size={24} />
            <Typography>Deleting coupon...</Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default CouponList;
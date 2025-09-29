import React, { useState } from 'react';
import { Typography, Box } from '@mui/material';
import { CouponList } from '../components/coupons';
import { CouponFilters, Coupon } from '../types';

const CouponsPage: React.FC = () => {
  const [filters, setFilters] = useState<CouponFilters>({});
  const [searchQuery, setSearchQuery] = useState('');

  const handleFiltersChange = (newFilters: CouponFilters) => {
    setFilters(newFilters);
  };

  const handleSearchChange = (search: string) => {
    setSearchQuery(search);
  };

  const handleEditCoupon = (coupon: Coupon) => {
    // TODO: Implement edit functionality
    console.log('Edit coupon:', coupon);
  };

  const handleCreateCoupon = () => {
    // TODO: Implement create functionality
    console.log('Create new coupon');
  };

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Coupons
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your family's coupon collection. Search, filter, and organize all your coupons in one place.
        </Typography>
      </Box>

      <CouponList
        filters={filters}
        searchQuery={searchQuery}
        onFiltersChange={handleFiltersChange}
        onSearchChange={handleSearchChange}
        onEditCoupon={handleEditCoupon}
        onCreateCoupon={handleCreateCoupon}
        showSearch={true}
      />
    </Box>
  );
};export d
efault CouponsPage;
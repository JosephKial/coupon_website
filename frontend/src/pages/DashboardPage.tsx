import React from 'react';
import { Typography, Box } from '@mui/material';

const DashboardPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Welcome to the Family Coupon Manager! This dashboard will show coupon statistics and recent activity.
      </Typography>
    </Box>
  );
};export
 default DashboardPage;
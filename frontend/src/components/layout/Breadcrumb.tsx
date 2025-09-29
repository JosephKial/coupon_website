import React from 'react';
import { Breadcrumbs, Link, Typography, Box } from '@mui/material';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { NavigateNext as NavigateNextIcon } from '@mui/icons-material';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

const routeLabels: Record<string, string> = {
  '/': 'Dashboard',
  '/coupons': 'Coupons',
  '/profile': 'Profile',
  '/settings': 'Settings',
};

export const Breadcrumb: React.FC = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Dashboard', path: '/' },
  ];

  // Build breadcrumb items from current path
  let currentPath = '';
  pathnames.forEach((pathname) => {
    currentPath += `/${pathname}`;
    const label = routeLabels[currentPath] || pathname.charAt(0).toUpperCase() + pathname.slice(1);
    breadcrumbItems.push({
      label,
      path: currentPath,
    });
  });

  // Don't show breadcrumbs if we're on the root page
  if (breadcrumbItems.length <= 1) {
    return null;
  }

  return (
    <Box sx={{ mb: 2 }}>
      <Breadcrumbs
        separator={<NavigateNextIcon fontSize="small" />}
        aria-label="breadcrumb"
        sx={{
          '& .MuiBreadcrumbs-separator': {
            color: 'text.secondary',
          },
        }}
      >
        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1;
          
          if (isLast || !item.path) {
            return (
              <Typography
                key={item.label}
                color="text.primary"
                variant="body2"
                sx={{ fontWeight: 500 }}
              >
                {item.label}
              </Typography>
            );
          }

          return (
            <Link
              key={item.label}
              component={RouterLink}
              to={item.path}
              color="inherit"
              variant="body2"
              sx={{
                textDecoration: 'none',
                '&:hover': {
                  textDecoration: 'underline',
                },
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </Breadcrumbs>
    </Box>
  );
};
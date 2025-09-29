import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  TouchApp as TouchIcon,
  SwipeLeft as SwipeIcon,
  Fingerprint as FingerprintIcon,
  PhoneAndroid as PhoneIcon,
} from '@mui/icons-material';

export const MobileDemo: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const mobileFeatures = [
    {
      icon: <TouchIcon />,
      title: 'Touch-Friendly Controls',
      description: 'Larger tap targets (48px minimum) for better touch interaction',
    },
    {
      icon: <SwipeIcon />,
      title: 'Swipe Gestures',
      description: 'Swipe left on coupon cards to reveal edit and delete actions',
    },
    {
      icon: <FingerprintIcon />,
      title: 'Optimized Input',
      description: 'Proper keyboard types (numeric, decimal) for mobile input fields',
    },
    {
      icon: <PhoneIcon />,
      title: 'Responsive Layout',
      description: 'Adaptive navigation with mobile drawer and full-width buttons',
    },
  ];

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Mobile Optimizations
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        {isMobile 
          ? 'You are currently viewing on a mobile device. Try the optimized interactions!'
          : 'Resize your browser or view on a mobile device to experience the mobile optimizations.'
        }
      </Typography>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Mobile-First Features
          </Typography>
          
          <List>
            {mobileFeatures.map((feature, index) => (
              <ListItem key={index}>
                <ListItemIcon>
                  {feature.icon}
                </ListItemIcon>
                <ListItemText
                  primary={feature.title}
                  secondary={feature.description}
                />
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>

      {isMobile && (
        <Card sx={{ mt: 2, backgroundColor: 'primary.light', color: 'primary.contrastText' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Mobile Mode Active
            </Typography>
            <Typography variant="body2">
              You're experiencing the mobile-optimized version with enhanced touch interactions,
              swipe gestures, and responsive layout adjustments.
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};
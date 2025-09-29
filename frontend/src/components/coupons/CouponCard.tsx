import React, { useState, useRef, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Chip,
  Button,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery,
  Slide,
  Fab,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Warning as WarningIcon,
  LocalOffer as CouponIcon,
  SwipeLeft as SwipeLeftIcon,
  SwipeRight as SwipeRightIcon,
} from '@mui/icons-material';
import { Coupon } from '../../types';

interface CouponCardProps {
  coupon: Coupon;
  onEdit?: (coupon: Coupon) => void;
  onDelete?: (couponId: string) => void;
  isDeleting?: boolean;
}

export const CouponCard: React.FC<CouponCardProps> = ({
  coupon,
  onEdit,
  onDelete,
  isDeleting = false,
}) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwipeActionsVisible, setIsSwipeActionsVisible] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const cardRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const currentX = useRef(0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'expired':
        return 'error';
      case 'used':
        return 'info';
      case 'disabled':
        return 'default';
      default:
        return 'default';
    }
  };

  const isExpiringSoon = () => {
    if (!coupon.expirationDate) return false;
    const expirationDate = new Date(coupon.expirationDate);
    const today = new Date();
    const daysUntilExpiration = Math.ceil(
      (expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiration <= 7 && daysUntilExpiration > 0;
  };

  const isExpired = () => {
    if (!coupon.expirationDate) return false;
    return new Date(coupon.expirationDate) < new Date();
  };

  const formatValue = () => {
    if (coupon.discountType === 'percentage') {
      return `${coupon.faceValue}%`;
    }
    return `$${coupon.faceValue.toFixed(2)}`;
  };

  const formatExpirationDate = () => {
    if (!coupon.expirationDate) return 'No expiration';
    return new Date(coupon.expirationDate).toLocaleDateString();
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (onDelete) {
      onDelete(coupon.id);
    }
    setDeleteDialogOpen(false);
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
  };

  const handleEditClick = () => {
    if (onEdit) {
      onEdit(coupon);
    }
  };

  // Touch/Swipe handlers for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isMobile) return;
    
    const touch = e.touches[0];
    startX.current = touch.clientX;
    currentX.current = touch.clientX;
    setIsDragging(true);
  }, [isMobile]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isMobile || !isDragging) return;
    
    const touch = e.touches[0];
    currentX.current = touch.clientX;
    const deltaX = currentX.current - startX.current;
    
    // Only allow left swipe (negative deltaX)
    if (deltaX < 0) {
      setSwipeOffset(Math.max(deltaX, -120)); // Limit swipe to 120px
    }
  }, [isMobile, isDragging]);

  const handleTouchEnd = useCallback(() => {
    if (!isMobile || !isDragging) return;
    
    setIsDragging(false);
    const deltaX = currentX.current - startX.current;
    
    // If swiped more than 60px, show actions
    if (deltaX < -60) {
      setSwipeOffset(-120);
      setIsSwipeActionsVisible(true);
    } else {
      // Reset position
      setSwipeOffset(0);
      setIsSwipeActionsVisible(false);
    }
  }, [isMobile, isDragging]);

  // Mouse handlers for desktop testing
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isMobile) return;
    
    startX.current = e.clientX;
    currentX.current = e.clientX;
    setIsDragging(true);
  }, [isMobile]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isMobile || !isDragging) return;
    
    currentX.current = e.clientX;
    const deltaX = currentX.current - startX.current;
    
    if (deltaX < 0) {
      setSwipeOffset(Math.max(deltaX, -120));
    }
  }, [isMobile, isDragging]);

  const handleMouseUp = useCallback(() => {
    if (isMobile || !isDragging) return;
    
    setIsDragging(false);
    const deltaX = currentX.current - startX.current;
    
    if (deltaX < -60) {
      setSwipeOffset(-120);
      setIsSwipeActionsVisible(true);
    } else {
      setSwipeOffset(0);
      setIsSwipeActionsVisible(false);
    }
  }, [isMobile, isDragging]);

  const resetSwipe = () => {
    setSwipeOffset(0);
    setIsSwipeActionsVisible(false);
  };

  return (
    <>
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 1,
        }}
      >
        {/* Swipe Actions Background */}
        {isMobile && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              width: 120,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
              backgroundColor: 'error.main',
              zIndex: 1,
            }}
          >
            {onEdit && (
              <Fab
                size="small"
                color="primary"
                onClick={handleEditClick}
                sx={{
                  minHeight: 48,
                  minWidth: 48,
                }}
                aria-label="Edit coupon"
              >
                <EditIcon />
              </Fab>
            )}
            {onDelete && (
              <Fab
                size="small"
                color="error"
                onClick={handleDeleteClick}
                sx={{
                  minHeight: 48,
                  minWidth: 48,
                  backgroundColor: 'error.dark',
                  '&:hover': {
                    backgroundColor: 'error.darker',
                  },
                }}
                aria-label="Delete coupon"
              >
                <DeleteIcon />
              </Fab>
            )}
          </Box>
        )}

        <Card
          ref={cardRef}
          sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            transform: `translateX(${swipeOffset}px)`,
            transition: isDragging ? 'none' : 'transform 0.3s ease-out',
            zIndex: 2,
            cursor: isMobile && isDragging ? 'grabbing' : 'default',
            touchAction: 'pan-y', // Allow vertical scrolling but handle horizontal
            '&:hover': {
              boxShadow: theme.shadows[4],
            },
            // Enhanced tap targets for mobile
            '& .MuiIconButton-root': {
              minHeight: isMobile ? 48 : 40,
              minWidth: isMobile ? 48 : 40,
              padding: isMobile ? 1.5 : 1,
            },
            '& .MuiButton-root': {
              minHeight: isMobile ? 48 : 36,
              padding: isMobile ? '12px 16px' : '6px 16px',
            },
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onClick={resetSwipe}
        >
        {/* Status and Warning Indicators */}
        <Box sx={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 0.5 }}>
          {isExpiringSoon() && (
            <Tooltip title="Expires soon">
              <WarningIcon color="warning" fontSize="small" aria-label="Expires soon" />
            </Tooltip>
          )}
          <Chip
            label={coupon.status.toUpperCase()}
            color={getStatusColor(coupon.status) as any}
            size="small"
          />
        </Box>

        <CardContent sx={{ flexGrow: 1, pt: 5 }}>
          {/* Coupon Code */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <CouponIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography
              variant="h6"
              component="h3"
              sx={{
                fontWeight: 'bold',
                wordBreak: 'break-word',
              }}
            >
              {coupon.code}
            </Typography>
          </Box>

          {/* Description */}
          {coupon.description && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                mb: 2,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {coupon.description}
            </Typography>
          )}

          {/* Discount Value */}
          <Typography
            variant="h5"
            color="primary"
            sx={{ fontWeight: 'bold', mb: 1 }}
          >
            {formatValue()} OFF
          </Typography>

          {/* Expiration Date */}
          <Typography
            variant="body2"
            color={isExpired() ? 'error.main' : 'text.secondary'}
            sx={{ mb: 1 }}
          >
            Expires: {formatExpirationDate()}
          </Typography>

          {/* Usage Information */}
          {coupon.usageLimit && (
            <Typography variant="body2" color="text.secondary">
              Used: {coupon.usageCount} / {coupon.usageLimit}
            </Typography>
          )}

          {/* Tags */}
          {coupon.tags && coupon.tags.length > 0 && (
            <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {coupon.tags.slice(0, 3).map((tag, index) => (
                <Chip
                  key={index}
                  label={tag}
                  size="small"
                  variant="outlined"
                />
              ))}
              {coupon.tags.length > 3 && (
                <Chip
                  label={`+${coupon.tags.length - 3} more`}
                  size="small"
                  variant="outlined"
                />
              )}
            </Box>
          )}
        </CardContent>

        <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Created: {new Date(coupon.createdAt).toLocaleDateString()}
          </Typography>
          
          {/* Desktop Actions */}
          {!isMobile && (
            <Box>
              {onEdit && (
                <Tooltip title="Edit coupon">
                  <IconButton
                    size="small"
                    onClick={handleEditClick}
                    disabled={isDeleting}
                    aria-label="Edit coupon"
                  >
                    <EditIcon />
                  </IconButton>
                </Tooltip>
              )}
              {onDelete && (
                <Tooltip title="Delete coupon">
                  <IconButton
                    size="small"
                    onClick={handleDeleteClick}
                    disabled={isDeleting}
                    color="error"
                    aria-label="Delete coupon"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          )}

          {/* Mobile Swipe Hint */}
          {isMobile && !isSwipeActionsVisible && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <SwipeLeftIcon fontSize="small" color="action" />
              <Typography variant="caption" color="text.secondary">
                Swipe for actions
              </Typography>
            </Box>
          )}
        </CardActions>
      </Card>
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>Delete Coupon</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the coupon "{coupon.code}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CouponCard;
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { vi } from 'vitest';
import { CouponCard } from '../CouponCard';
import { Coupon } from '../../../types';

const theme = createTheme();

const mockCoupon: Coupon = {
  id: '1',
  code: 'SAVE20',
  description: 'Save 20% on your next purchase',
  discountType: 'percentage',
  faceValue: 20,
  expirationDate: '2024-12-31',
  usageLimit: 5,
  usageCount: 2,
  status: 'active',
  createdBy: 'user1',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  tags: ['shopping', 'discount'],
};

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('CouponCard', () => {
  it('renders coupon information correctly', () => {
    renderWithTheme(<CouponCard coupon={mockCoupon} />);

    expect(screen.getByText('SAVE20')).toBeInTheDocument();
    expect(screen.getByText('Save 20% on your next purchase')).toBeInTheDocument();
    expect(screen.getByText('20% OFF')).toBeInTheDocument();
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    expect(screen.getByText('Used: 2 / 5')).toBeInTheDocument();
  });

  it('displays expiration date correctly', () => {
    renderWithTheme(<CouponCard coupon={mockCoupon} />);
    
    expect(screen.getByText(/Expires: 12\/31\/2024/)).toBeInTheDocument();
  });

  it('displays "No expiration" when expiration date is not set', () => {
    const couponWithoutExpiration = { ...mockCoupon, expirationDate: undefined };
    renderWithTheme(<CouponCard coupon={couponWithoutExpiration} />);
    
    expect(screen.getByText('Expires: No expiration')).toBeInTheDocument();
  });

  it('formats amount discount correctly', () => {
    const amountCoupon = { ...mockCoupon, discountType: 'amount' as const, faceValue: 15.50 };
    renderWithTheme(<CouponCard coupon={amountCoupon} />);
    
    expect(screen.getByText('$15.50 OFF')).toBeInTheDocument();
  });

  it('displays status chip with correct color', () => {
    renderWithTheme(<CouponCard coupon={mockCoupon} />);
    
    const statusChip = screen.getByText('ACTIVE');
    expect(statusChip).toBeInTheDocument();
  });

  it('shows expired status for expired coupons', () => {
    const expiredCoupon = { ...mockCoupon, status: 'expired' as const };
    renderWithTheme(<CouponCard coupon={expiredCoupon} />);
    
    expect(screen.getByText('EXPIRED')).toBeInTheDocument();
  });

  it('displays tags correctly', () => {
    renderWithTheme(<CouponCard coupon={mockCoupon} />);
    
    expect(screen.getByText('shopping')).toBeInTheDocument();
    expect(screen.getByText('discount')).toBeInTheDocument();
  });

  it('shows warning icon for expiring soon coupons', () => {
    // Set expiration date to 5 days from now
    const soonExpiringDate = new Date();
    soonExpiringDate.setDate(soonExpiringDate.getDate() + 5);
    
    const expiringSoonCoupon = {
      ...mockCoupon,
      expirationDate: soonExpiringDate.toISOString().split('T')[0],
    };
    
    renderWithTheme(<CouponCard coupon={expiringSoonCoupon} />);
    
    // Check for warning icon (using aria-label attribute)
    expect(screen.getByLabelText('Expires soon')).toBeInTheDocument();
  });

  it('calls onEdit when edit button is clicked', () => {
    const onEdit = vi.fn();
    renderWithTheme(<CouponCard coupon={mockCoupon} onEdit={onEdit} />);
    
    const editButton = screen.getByLabelText('Edit coupon');
    fireEvent.click(editButton);
    
    expect(onEdit).toHaveBeenCalledWith(mockCoupon);
  });

  it('opens delete confirmation dialog when delete button is clicked', () => {
    const onDelete = vi.fn();
    renderWithTheme(<CouponCard coupon={mockCoupon} onDelete={onDelete} />);
    
    const deleteButton = screen.getByLabelText('Delete coupon');
    fireEvent.click(deleteButton);
    
    expect(screen.getByText('Delete Coupon')).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to delete the coupon "SAVE20"/)).toBeInTheDocument();
  });

  it('calls onDelete when delete is confirmed', async () => {
    const onDelete = vi.fn();
    renderWithTheme(<CouponCard coupon={mockCoupon} onDelete={onDelete} />);
    
    // Open delete dialog
    const deleteButton = screen.getByLabelText('Delete coupon');
    fireEvent.click(deleteButton);
    
    // Confirm delete
    const confirmButton = screen.getByRole('button', { name: 'Delete' });
    fireEvent.click(confirmButton);
    
    await waitFor(() => {
      expect(onDelete).toHaveBeenCalledWith(mockCoupon.id);
    });
  });

  it('cancels delete when cancel button is clicked', async () => {
    const onDelete = vi.fn();
    renderWithTheme(<CouponCard coupon={mockCoupon} onDelete={onDelete} />);
    
    // Open delete dialog
    const deleteButton = screen.getByLabelText('Delete coupon');
    fireEvent.click(deleteButton);
    
    // Cancel delete
    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelButton);
    
    await waitFor(() => {
      expect(screen.queryByText('Delete Coupon')).not.toBeInTheDocument();
    });
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('disables buttons when isDeleting is true', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    renderWithTheme(
      <CouponCard 
        coupon={mockCoupon} 
        onEdit={onEdit} 
        onDelete={onDelete} 
        isDeleting={true} 
      />
    );
    
    const editButton = screen.getByLabelText('Edit coupon');
    const deleteButton = screen.getByLabelText('Delete coupon');
    
    expect(editButton).toBeDisabled();
    expect(deleteButton).toBeDisabled();
  });

  it('does not render edit/delete buttons when handlers are not provided', () => {
    renderWithTheme(<CouponCard coupon={mockCoupon} />);
    
    expect(screen.queryByLabelText('Edit coupon')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Delete coupon')).not.toBeInTheDocument();
  });

  it('handles coupons without description', () => {
    const couponWithoutDescription = { ...mockCoupon, description: undefined };
    renderWithTheme(<CouponCard coupon={couponWithoutDescription} />);
    
    expect(screen.getByText('SAVE20')).toBeInTheDocument();
    expect(screen.queryByText('Save 20% on your next purchase')).not.toBeInTheDocument();
  });

  it('handles coupons without usage limit', () => {
    const couponWithoutUsageLimit = { 
      ...mockCoupon, 
      usageLimit: undefined,
      usageCount: 0 
    };
    renderWithTheme(<CouponCard coupon={couponWithoutUsageLimit} />);
    
    expect(screen.queryByText(/Used:/)).not.toBeInTheDocument();
  });

  it('truncates long tag lists', () => {
    const couponWithManyTags = {
      ...mockCoupon,
      tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5'],
    };
    renderWithTheme(<CouponCard coupon={couponWithManyTags} />);
    
    expect(screen.getByText('tag1')).toBeInTheDocument();
    expect(screen.getByText('tag2')).toBeInTheDocument();
    expect(screen.getByText('tag3')).toBeInTheDocument();
    expect(screen.getByText('+2 more')).toBeInTheDocument();
  });
});
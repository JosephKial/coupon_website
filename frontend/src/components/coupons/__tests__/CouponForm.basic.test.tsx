import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { CouponForm } from '../CouponForm';
import { Coupon } from '../../../types';

// Mock the entire coupon service module
const mockCreateCoupon = vi.fn();
const mockUpdateCoupon = vi.fn();

vi.mock('../../../services/couponService', () => ({
  couponService: {
    createCoupon: mockCreateCoupon,
    updateCoupon: mockUpdateCoupon,
  },
}));

const mockCoupon: Coupon = {
  id: '1',
  code: 'TEST20',
  description: 'Test coupon',
  discountType: 'percentage',
  faceValue: 20,
  expirationDate: '2024-12-31',
  usageLimit: 100,
  usageCount: 5,
  status: 'active',
  createdBy: 'user1',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  tags: ['test', 'discount'],
};

describe('CouponForm Basic Tests', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();
  const user = userEvent.setup();

  beforeEach(() => {
    mockCreateCoupon.mockClear();
    mockUpdateCoupon.mockClear();
    mockOnSubmit.mockClear();
    mockOnCancel.mockClear();
  });

  it('renders create form with basic elements', () => {
    render(
      <CouponForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Create New Coupon')).toBeInTheDocument();
    expect(screen.getByLabelText(/coupon code/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/face value/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create coupon/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    render(
      <CouponForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const submitButton = screen.getByRole('button', { name: /create coupon/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Coupon code is required')).toBeInTheDocument();
      expect(screen.getByText('Face value is required')).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('validates coupon code format', async () => {
    render(
      <CouponForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const codeInput = screen.getByLabelText(/coupon code/i);
    
    // Test too short
    await user.type(codeInput, 'AB');
    await user.click(screen.getByRole('button', { name: /create coupon/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Coupon code must be at least 3 characters')).toBeInTheDocument();
    });
  });

  it('calls onCancel when cancel button is clicked', async () => {
    render(
      <CouponForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('renders edit form with pre-filled data', () => {
    render(
      <CouponForm
        coupon={mockCoupon}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isEdit={true}
      />
    );

    expect(screen.getByText('Edit Coupon')).toBeInTheDocument();
    expect(screen.getByDisplayValue('TEST20')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test coupon')).toBeInTheDocument();
    expect(screen.getByDisplayValue('20')).toBeInTheDocument();
    expect(screen.getByDisplayValue('100')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /update coupon/i })).toBeInTheDocument();
  });

  it('handles tag addition', async () => {
    render(
      <CouponForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const tagInput = screen.getByLabelText(/add tags/i);
    const addButton = screen.getByRole('button', { name: /add/i });

    // Add a tag
    await user.type(tagInput, 'grocery');
    await user.click(addButton);

    expect(screen.getByText('grocery')).toBeInTheDocument();
    expect(tagInput).toHaveValue('');
  });

  it('shows currency symbol for amount discount type', () => {
    render(
      <CouponForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    // Initially should show $ for amount (default)
    expect(screen.getByText('$')).toBeInTheDocument();
  });
});
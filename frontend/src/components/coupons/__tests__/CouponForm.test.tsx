import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
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

describe('CouponForm', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();
  const user = userEvent.setup();

  beforeEach(() => {
    mockCreateCoupon.mockClear();
    mockUpdateCoupon.mockClear();
  });

  afterEach(() => {
    mockCreateCoupon.mockClear();
    mockUpdateCoupon.mockClear();
  });

  describe('Create Mode', () => {
    it('renders create form with all fields', () => {
      render(
        <CouponForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Create New Coupon')).toBeInTheDocument();
      expect(screen.getByLabelText(/coupon code/i)).toBeInTheDocument();
      expect(screen.getByText('Discount Type')).toBeInTheDocument();
      expect(screen.getByLabelText(/face value/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/usage limit/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/expiration date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/add tags/i)).toBeInTheDocument();
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

      // Test invalid characters
      await user.clear(codeInput);
      await user.type(codeInput, 'TEST@CODE');
      await user.click(screen.getByRole('button', { name: /create coupon/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Coupon code can only contain letters, numbers, hyphens, and underscores')).toBeInTheDocument();
      });
    });

    it('validates face value for percentage discount', async () => {
      render(
        <CouponForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const codeInput = screen.getByLabelText(/coupon code/i);
      const faceValueInput = screen.getByLabelText(/face value/i);
      const discountTypeSelect = screen.getByRole('combobox');

      await user.type(codeInput, 'TEST');
      await user.click(discountTypeSelect);
      await user.click(screen.getByText('Percentage (%)'));
      await user.type(faceValueInput, '150');
      await user.click(screen.getByRole('button', { name: /create coupon/i }));

      await waitFor(() => {
        expect(screen.getByText('Percentage discount cannot exceed 100%')).toBeInTheDocument();
      });
    });

    it('validates expiration date is not in the past', async () => {
      render(
        <CouponForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const codeInput = screen.getByLabelText(/coupon code/i);
      const faceValueInput = screen.getByLabelText(/face value/i);
      const dateInput = screen.getByLabelText(/expiration date/i);

      await user.type(codeInput, 'TEST');
      await user.type(faceValueInput, '10');
      
      // Set date to yesterday
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      fireEvent.change(dateInput, { target: { value: yesterday.toISOString().split('T')[0] } });
      
      await user.click(screen.getByRole('button', { name: /create coupon/i }));

      await waitFor(() => {
        expect(screen.getByText('Expiration date cannot be in the past')).toBeInTheDocument();
      });
    });

    it('handles tag addition and removal', async () => {
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

      // Add tag with Enter key
      await user.type(tagInput, 'restaurant');
      await user.keyboard('{Enter}');

      expect(screen.getByText('restaurant')).toBeInTheDocument();

      // Remove a tag
      const groceryTag = screen.getByText('grocery').closest('.MuiChip-root');
      const deleteButton = groceryTag?.querySelector('[data-testid="CancelIcon"]');
      if (deleteButton) {
        await user.click(deleteButton);
      }

      expect(screen.queryByText('grocery')).not.toBeInTheDocument();
      expect(screen.getByText('restaurant')).toBeInTheDocument();
    });

    it('submits form with valid data', async () => {
      const mockResponse = {
        success: true,
        data: { ...mockCoupon, id: 'new-id' },
      };
      mockCreateCoupon.mockResolvedValue(mockResponse);

      render(
        <CouponForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const codeInput = screen.getByLabelText(/coupon code/i);
      const descriptionInput = screen.getByLabelText(/description/i);
      const faceValueInput = screen.getByLabelText(/face value/i);
      const usageLimitInput = screen.getByLabelText(/usage limit/i);

      await user.type(codeInput, 'NEWCODE');
      await user.type(descriptionInput, 'New coupon description');
      await user.type(faceValueInput, '25');
      await user.type(usageLimitInput, '50');

      await user.click(screen.getByRole('button', { name: /create coupon/i }));

      await waitFor(() => {
        expect(mockCreateCoupon).toHaveBeenCalledWith({
          code: 'NEWCODE',
          description: 'New coupon description',
          discountType: 'amount',
          faceValue: 25,
          expirationDate: undefined,
          usageLimit: 50,
          tags: undefined,
        });
        expect(mockOnSubmit).toHaveBeenCalledWith(mockResponse.data);
      });
    });

    it('handles API error during submission', async () => {
      const mockResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Coupon code already exists',
          timestamp: new Date().toISOString(),
        },
      };
      mockCreateCoupon.mockResolvedValue(mockResponse);

      render(
        <CouponForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const codeInput = screen.getByLabelText(/coupon code/i);
      const faceValueInput = screen.getByLabelText(/face value/i);

      await user.type(codeInput, 'EXISTING');
      await user.type(faceValueInput, '10');
      await user.click(screen.getByRole('button', { name: /create coupon/i }));

      await waitFor(() => {
        expect(screen.getByText('Coupon code already exists')).toBeInTheDocument();
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  describe('Edit Mode', () => {
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
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('test')).toBeInTheDocument();
      expect(screen.getByText('discount')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /update coupon/i })).toBeInTheDocument();
    });

    it('submits update with modified data', async () => {
      const mockResponse = {
        success: true,
        data: { ...mockCoupon, description: 'Updated description' },
      };
      mockUpdateCoupon.mockResolvedValue(mockResponse);

      render(
        <CouponForm
          coupon={mockCoupon}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          isEdit={true}
        />
      );

      const descriptionInput = screen.getByLabelText(/description/i);
      await user.clear(descriptionInput);
      await user.type(descriptionInput, 'Updated description');

      await user.click(screen.getByRole('button', { name: /update coupon/i }));

      await waitFor(() => {
        expect(mockUpdateCoupon).toHaveBeenCalledWith(mockCoupon.id, {
          code: 'TEST20',
          description: 'Updated description',
          discountType: 'percentage',
          faceValue: 20,
          expirationDate: '2024-12-31',
          usageLimit: 100,
          status: 'active',
          tags: ['test', 'discount'],
        });
        expect(mockOnSubmit).toHaveBeenCalledWith(mockResponse.data);
      });
    });

    it('allows status change in edit mode', async () => {
      render(
        <CouponForm
          coupon={mockCoupon}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          isEdit={true}
        />
      );

      const statusSelects = screen.getAllByRole('combobox');
      const statusSelect = statusSelects.find(select => 
        select.closest('.MuiFormControl-root')?.querySelector('label')?.textContent === 'Status'
      );
      
      if (statusSelect) {
        await user.click(statusSelect);
        await user.click(screen.getByText('Disabled'));
        expect(screen.getByText('Disabled')).toBeInTheDocument();
      }
    });
  });

  describe('Form Interactions', () => {
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

    it('shows loading state during submission', async () => {
      // Mock a delayed response
      mockCreateCoupon.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: true, data: mockCoupon }), 100))
      );

      render(
        <CouponForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const codeInput = screen.getByLabelText(/coupon code/i);
      const faceValueInput = screen.getByLabelText(/face value/i);

      await user.type(codeInput, 'TEST');
      await user.type(faceValueInput, '10');
      await user.click(screen.getByRole('button', { name: /create coupon/i }));

      expect(screen.getByText('Creating...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
    });

    it('clears field errors when user starts typing', async () => {
      render(
        <CouponForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      // Trigger validation error
      await user.click(screen.getByRole('button', { name: /create coupon/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Coupon code is required')).toBeInTheDocument();
      });

      // Start typing to clear error
      const codeInput = screen.getByLabelText(/coupon code/i);
      await user.type(codeInput, 'T');

      expect(screen.queryByText('Coupon code is required')).not.toBeInTheDocument();
    });

    it('updates currency symbol based on discount type', async () => {
      render(
        <CouponForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      // Initially should show $ for amount
      expect(screen.getByText('$')).toBeInTheDocument();

      // Change to percentage
      const discountTypeSelect = screen.getByRole('combobox');
      await user.click(discountTypeSelect);
      await user.click(screen.getByText('Percentage (%)'));

      // Should now show %
      expect(screen.getByText('%')).toBeInTheDocument();
    });
  });
});
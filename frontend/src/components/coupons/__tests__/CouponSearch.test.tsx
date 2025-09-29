import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { CouponSearch } from '../CouponSearch';
import { CouponFilters } from '../../../types';

describe('CouponSearch', () => {
  const mockOnFiltersChange = vi.fn();
  const mockOnSearchChange = vi.fn();

  const defaultProps = {
    filters: {},
    onFiltersChange: mockOnFiltersChange,
    onSearchChange: mockOnSearchChange,
    searchQuery: '',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders search input with placeholder', () => {
    render(<CouponSearch {...defaultProps} />);
    
    expect(screen.getByTestId('search-input')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search coupons by code or description...')).toBeInTheDocument();
  });

  it('renders filter toggle button', () => {
    render(<CouponSearch {...defaultProps} />);
    
    expect(screen.getByTestId('filter-toggle')).toBeInTheDocument();
  });

  it('shows and hides filters when toggle is clicked', async () => {
    const user = userEvent.setup();
    render(<CouponSearch {...defaultProps} />);
    
    // Click toggle to show filters
    await user.click(screen.getByTestId('filter-toggle'));
    
    // Filters should now be visible
    await waitFor(() => {
      expect(screen.getByTestId('status-filter')).toBeInTheDocument();
      expect(screen.getByTestId('discount-type-filter')).toBeInTheDocument();
    });
  });

  it('handles search input changes', async () => {
    const user = userEvent.setup();
    render(<CouponSearch {...defaultProps} />);
    
    const searchInput = screen.getByTestId('search-input').querySelector('input')!;
    
    // Type in search input
    await user.type(searchInput, 'test');
    
    // Should update the input value
    expect(searchInput.value).toBe('test');
  });

  it('clears search when clear button is clicked', async () => {
    const user = userEvent.setup();
    render(<CouponSearch {...defaultProps} searchQuery="test" />);
    
    const searchInput = screen.getByTestId('search-input').querySelector('input')!;
    expect(searchInput.value).toBe('test');
    
    // Clear button should be visible
    const clearButton = screen.getByLabelText('Clear search');
    await user.click(clearButton);
    
    expect(mockOnSearchChange).toHaveBeenCalledWith('');
  });

  it('handles filter changes', async () => {
    const user = userEvent.setup();
    render(<CouponSearch {...defaultProps} />);
    
    // Show filters
    await user.click(screen.getByTestId('filter-toggle'));
    
    // Change min value filter
    const minValueInput = screen.getByTestId('min-value-filter').querySelector('input')!;
    fireEvent.change(minValueInput, { target: { value: '10' } });
    
    expect(mockOnFiltersChange).toHaveBeenCalledWith({ minValue: 10 });
  });

  it('displays active filters as chips', () => {
    const filters: CouponFilters = {
      status: 'active',
      discountType: 'percentage',
      expirationStart: '2024-01-01',
      expirationEnd: '2024-12-31',
      minValue: 10,
      maxValue: 100,
    };
    
    render(<CouponSearch {...defaultProps} filters={filters} searchQuery="test" />);
    
    // Should show search chip
    expect(screen.getByText('Search: "test"')).toBeInTheDocument();
    
    // Should show status chip
    expect(screen.getByText('Status: active')).toBeInTheDocument();
    
    // Should show discount type chip
    expect(screen.getByText('Type: percentage')).toBeInTheDocument();
    
    // Should show date range chip
    expect(screen.getByText('Date range')).toBeInTheDocument();
    
    // Should show value range chip
    expect(screen.getByText('Value range')).toBeInTheDocument();
    
    // Should show clear all chip
    expect(screen.getByText('Clear all')).toBeInTheDocument();
  });

  it('clears all filters when clear all chip is clicked', async () => {
    const user = userEvent.setup();
    const filters: CouponFilters = {
      status: 'active',
      discountType: 'percentage',
    };
    
    render(<CouponSearch {...defaultProps} filters={filters} searchQuery="test" />);
    
    // Click clear all chip
    await user.click(screen.getByText('Clear all'));
    
    expect(mockOnSearchChange).toHaveBeenCalledWith('');
    expect(mockOnFiltersChange).toHaveBeenCalledWith({});
  });

  it('clears filters when clear filters button is clicked', async () => {
    const user = userEvent.setup();
    const filters: CouponFilters = {
      status: 'active',
    };
    
    render(<CouponSearch {...defaultProps} filters={filters} />);
    
    // Show filters
    await user.click(screen.getByTestId('filter-toggle'));
    
    // Click clear filters button
    await user.click(screen.getByTestId('clear-filters'));
    
    expect(mockOnFiltersChange).toHaveBeenCalledWith({});
  });

  it('displays result count when provided', () => {
    render(<CouponSearch {...defaultProps} resultCount={5} />);
    
    expect(screen.getByText('5 results found')).toBeInTheDocument();
  });

  it('displays no results message when count is 0', () => {
    render(<CouponSearch {...defaultProps} resultCount={0} />);
    
    expect(screen.getByText('No results found')).toBeInTheDocument();
  });

  it('displays singular result text when count is 1', () => {
    render(<CouponSearch {...defaultProps} resultCount={1} />);
    
    expect(screen.getByText('1 result found')).toBeInTheDocument();
  });

  it('includes search query in result count message', () => {
    render(<CouponSearch {...defaultProps} resultCount={3} searchQuery="discount" />);
    
    expect(screen.getByText('3 results found for "discount"')).toBeInTheDocument();
  });

  it('disables inputs when loading', () => {
    render(<CouponSearch {...defaultProps} isLoading={true} />);
    
    const searchInput = screen.getByTestId('search-input').querySelector('input')!;
    expect(searchInput).toBeDisabled();
  });

  it('syncs external filter changes with local state', () => {
    const { rerender } = render(<CouponSearch {...defaultProps} filters={{}} />);
    
    // Update filters externally
    const newFilters: CouponFilters = { status: 'active' };
    rerender(<CouponSearch {...defaultProps} filters={newFilters} />);
    
    // Should show the new filter as a chip
    expect(screen.getByText('Status: active')).toBeInTheDocument();
  });

  it('syncs external search query changes with local state', () => {
    const { rerender } = render(<CouponSearch {...defaultProps} searchQuery="" />);
    
    // Update search query externally
    rerender(<CouponSearch {...defaultProps} searchQuery="external search" />);
    
    const searchInput = screen.getByTestId('search-input').querySelector('input')!;
    expect(searchInput.value).toBe('external search');
  });

  it('highlights filter toggle button when filters are active', () => {
    const filters: CouponFilters = { status: 'active' };
    render(<CouponSearch {...defaultProps} filters={filters} />);
    
    const filterToggle = screen.getByTestId('filter-toggle');
    expect(filterToggle).toHaveClass('MuiIconButton-colorPrimary');
  });

  it('handles empty string values in filters correctly', async () => {
    const user = userEvent.setup();
    render(<CouponSearch {...defaultProps} />);
    
    // Show filters
    await user.click(screen.getByTestId('filter-toggle'));
    
    // Set a value then clear it
    const minValueInput = screen.getByTestId('min-value-filter').querySelector('input')!;
    fireEvent.change(minValueInput, { target: { value: '10' } });
    fireEvent.change(minValueInput, { target: { value: '' } });
    
    expect(mockOnFiltersChange).toHaveBeenLastCalledWith({ minValue: undefined });
  });
});
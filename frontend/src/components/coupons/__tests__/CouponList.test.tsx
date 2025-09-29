import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import { CouponList } from '../CouponList';
import { Coupon, PaginatedResponse } from '../../../types';

const theme = createTheme();

const mockCoupons: Coupon[] = [
  {
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
    tags: ['shopping'],
  },
  {
    id: '2',
    code: 'DISCOUNT10',
    description: 'Get $10 off',
    discountType: 'amount',
    faceValue: 10,
    expirationDate: '2024-11-30',
    usageLimit: 3,
    usageCount: 1,
    status: 'active',
    createdBy: 'user1',
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  },
];

const mockPaginatedResponse: PaginatedResponse<Coupon> = {
  data: mockCoupons,
  pagination: {
    page: 1,
    limit: 12,
    total: 2,
    totalPages: 1,
  },
};

// Mock the apiClient
const mockGet = vi.fn();
const mockDelete = vi.fn();

vi.mock('../../../services/apiClient', () => ({
  apiClient: {
    get: mockGet,
    delete: mockDelete,
  },
}));

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        {component}
      </ThemeProvider>
    </QueryClientProvider>
  );
};

describe('CouponList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue({
      data: { data: mockPaginatedResponse },
    });
  });

  it('renders loading skeleton initially', () => {
    renderWithProviders(<CouponList />);
    
    // Check for skeleton loading elements
    expect(screen.getAllByTestId('skeleton')).toHaveLength(12);
  });

  it('renders coupon list after loading', async () => {
    renderWithProviders(<CouponList />);
    
    await waitFor(() => {
      expect(screen.getByText('SAVE20')).toBeInTheDocument();
      expect(screen.getByText('DISCOUNT10')).toBeInTheDocument();
    });
  });

  it('displays results summary', async () => {
    renderWithProviders(<CouponList />);
    
    await waitFor(() => {
      expect(screen.getByText('Showing 1 - 2 of 2 coupons')).toBeInTheDocument();
    });
  });

  it('displays search query in summary when provided', async () => {
    renderWithProviders(<CouponList searchQuery="test search" />);
    
    await waitFor(() => {
      expect(screen.getByText('Search: "test search"')).toBeInTheDocument();
    });
  });

  it('calls API with correct parameters', async () => {
    const filters = { status: 'active', discountType: 'percentage' };
    renderWithProviders(<CouponList filters={filters} searchQuery="save" />);
    
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('/coupons?page=1&limit=12&status=active&discountType=percentage&search=save')
      );
    });
  });

  it('displays empty state when no coupons exist', async () => {
    mockGet.mockResolvedValue({
      data: { 
        data: { 
          data: [], 
          pagination: { page: 1, limit: 12, total: 0, totalPages: 0 } 
        } 
      },
    });

    renderWithProviders(<CouponList onCreateCoupon={vi.fn()} />);
    
    await waitFor(() => {
      expect(screen.getByText('No coupons yet')).toBeInTheDocument();
      expect(screen.getByText('Get started by creating your first coupon!')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Create Coupon/ })).toBeInTheDocument();
    });
  });

  it('displays filtered empty state when no results match filters', async () => {
    mockGet.mockResolvedValue({
      data: { 
        data: { 
          data: [], 
          pagination: { page: 1, limit: 12, total: 0, totalPages: 0 } 
        } 
      },
    });

    renderWithProviders(<CouponList filters={{ status: 'expired' }} />);
    
    await waitFor(() => {
      expect(screen.getByText('No coupons found')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your search or filters to find what you\'re looking for.')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    mockGet.mockRejectedValue(new Error('API Error'));

    renderWithProviders(<CouponList />);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load coupons. Please try again.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    });
  });

  it('calls onEditCoupon when edit is triggered', async () => {
    const onEditCoupon = vi.fn();
    renderWithProviders(<CouponList onEditCoupon={onEditCoupon} />);
    
    await waitFor(() => {
      expect(screen.getByText('SAVE20')).toBeInTheDocument();
    });

    const editButton = screen.getAllByLabelText('Edit coupon')[0];
    fireEvent.click(editButton);

    expect(onEditCoupon).toHaveBeenCalledWith(mockCoupons[0]);
  });

  it('handles coupon deletion', async () => {
    mockDelete.mockResolvedValue({});

    renderWithProviders(<CouponList />);
    
    await waitFor(() => {
      expect(screen.getByText('SAVE20')).toBeInTheDocument();
    });

    // Click delete button
    const deleteButton = screen.getAllByLabelText('Delete coupon')[0];
    fireEvent.click(deleteButton);

    // Confirm deletion
    const confirmButton = screen.getByRole('button', { name: 'Delete' });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith('/coupons/1');
    });
  });

  it('shows floating action button when onCreateCoupon is provided', async () => {
    const onCreateCoupon = vi.fn();
    renderWithProviders(<CouponList onCreateCoupon={onCreateCoupon} />);
    
    await waitFor(() => {
      expect(screen.getByText('SAVE20')).toBeInTheDocument();
    });

    const fab = screen.getByRole('button', { name: '' }); // FAB typically has no accessible name
    expect(fab).toBeInTheDocument();
    
    fireEvent.click(fab);
    expect(onCreateCoupon).toHaveBeenCalled();
  });

  it('does not show pagination for single page results', async () => {
    renderWithProviders(<CouponList />);
    
    await waitFor(() => {
      expect(screen.getByText('SAVE20')).toBeInTheDocument();
    });

    // Should not show pagination for single page
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });
});
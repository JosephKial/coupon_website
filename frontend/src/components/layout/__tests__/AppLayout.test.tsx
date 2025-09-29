import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { AppLayout } from '../AppLayout';
import { AuthProvider } from '../../../contexts/AuthContext';

const theme = createTheme();

const MockAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const mockUser = {
    id: '1',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'member' as const,
    isActive: true,
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
  };

  return (
    <AuthProvider>
      <div data-testid="mock-auth-context">
        {children}
      </div>
    </AuthProvider>
  );
};

const renderWithProviders = (children: React.ReactNode) => {
  return render(
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <MockAuthProvider>
          {children}
        </MockAuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

describe('AppLayout', () => {
  it('renders the main navigation items', () => {
    renderWithProviders(
      <AppLayout>
        <div>Test Content</div>
      </AppLayout>
    );

    expect(screen.getAllByText('Coupon Manager')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Dashboard')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Coupons')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Profile')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Settings')[0]).toBeInTheDocument();
  });

  it('renders the main content area', () => {
    renderWithProviders(
      <AppLayout>
        <div>Test Content</div>
      </AppLayout>
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('has proper responsive structure', () => {
    renderWithProviders(
      <AppLayout>
        <div>Test Content</div>
      </AppLayout>
    );

    // Check for navigation elements
    const navigation = screen.getByRole('navigation');
    expect(navigation).toBeInTheDocument();

    // Check for main content area
    const main = screen.getByRole('main');
    expect(main).toBeInTheDocument();
  });
});
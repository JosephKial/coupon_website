import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { Breadcrumb } from '../Breadcrumb';

const theme = createTheme();

const renderWithRouter = (initialEntries: string[] = ['/']) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <ThemeProvider theme={theme}>
        <Breadcrumb />
      </ThemeProvider>
    </MemoryRouter>
  );
};

describe('Breadcrumb', () => {
  it('does not render breadcrumbs on root path', () => {
    const { container } = renderWithRouter(['/']);
    expect(container.firstChild).toBeNull();
  });

  it('renders breadcrumbs for nested paths', () => {
    renderWithRouter(['/coupons']);
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Coupons')).toBeInTheDocument();
  });

  it('creates proper breadcrumb structure', () => {
    renderWithRouter(['/coupons']);
    
    const breadcrumbs = screen.getByRole('navigation');
    expect(breadcrumbs).toHaveAttribute('aria-label', 'breadcrumb');
  });
});
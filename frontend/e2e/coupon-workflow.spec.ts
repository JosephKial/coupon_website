import { test, expect } from '@playwright/test';

test.describe('Coupon Management Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.route('**/api/auth/profile', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: '1',
            email: 'test@example.com',
            firstName: 'Test',
            lastName: 'User',
            role: 'MEMBER',
          },
        }),
      });
    });

    // Mock coupon API endpoints
    let coupons = [
      {
        id: '1',
        code: 'SAVE20',
        description: '20% off electronics',
        discountType: 'PERCENTAGE',
        faceValue: 20,
        expirationDate: '2024-12-31',
        status: 'ACTIVE',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      {
        id: '2',
        code: 'FREESHIP',
        description: 'Free shipping on orders over $50',
        discountType: 'AMOUNT',
        faceValue: 0,
        expirationDate: '2024-06-30',
        status: 'ACTIVE',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ];

    // Mock GET /api/coupons
    await page.route('**/api/coupons*', async route => {
      if (route.request().method() === 'GET') {
        const url = new URL(route.request().url());
        const search = url.searchParams.get('search');
        const status = url.searchParams.get('status');
        
        let filteredCoupons = [...coupons];
        
        if (search) {
          filteredCoupons = filteredCoupons.filter(coupon =>
            coupon.code.toLowerCase().includes(search.toLowerCase()) ||
            coupon.description.toLowerCase().includes(search.toLowerCase())
          );
        }
        
        if (status && status !== 'ALL') {
          filteredCoupons = filteredCoupons.filter(coupon => coupon.status === status);
        }

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              coupons: filteredCoupons,
              pagination: {
                page: 1,
                limit: 12,
                total: filteredCoupons.length,
                totalPages: 1,
              },
            },
          }),
        });
      }
    });

    // Mock POST /api/coupons
    await page.route('**/api/coupons', async route => {
      if (route.request().method() === 'POST') {
        const postData = route.request().postDataJSON();
        const newCoupon = {
          id: String(coupons.length + 1),
          ...postData,
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        coupons.push(newCoupon);

        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: newCoupon,
          }),
        });
      }
    });

    // Mock PUT /api/coupons/:id
    await page.route('**/api/coupons/*', async route => {
      if (route.request().method() === 'PUT') {
        const url = route.request().url();
        const couponId = url.split('/').pop();
        const postData = route.request().postDataJSON();
        
        const couponIndex = coupons.findIndex(c => c.id === couponId);
        if (couponIndex !== -1) {
          coupons[couponIndex] = {
            ...coupons[couponIndex],
            ...postData,
            updatedAt: new Date().toISOString(),
          };

          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: coupons[couponIndex],
            }),
          });
        } else {
          await route.fulfill({
            status: 404,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              error: { message: 'Coupon not found' },
            }),
          });
        }
      }
    });

    // Mock DELETE /api/coupons/:id
    await page.route('**/api/coupons/*', async route => {
      if (route.request().method() === 'DELETE') {
        const url = route.request().url();
        const couponId = url.split('/').pop();
        
        const couponIndex = coupons.findIndex(c => c.id === couponId);
        if (couponIndex !== -1) {
          coupons.splice(couponIndex, 1);

          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              message: 'Coupon deleted successfully',
            }),
          });
        } else {
          await route.fulfill({
            status: 404,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              error: { message: 'Coupon not found' },
            }),
          });
        }
      }
    });

    // Set up authentication tokens
    await page.addInitScript(() => {
      localStorage.setItem('accessToken', 'mock-access-token');
      localStorage.setItem('refreshToken', 'mock-refresh-token');
    });
  });

  test('should display coupon list', async ({ page }) => {
    await page.goto('/coupons');

    // Wait for coupons to load
    await expect(page.getByText('SAVE20')).toBeVisible();
    await expect(page.getByText('FREESHIP')).toBeVisible();
    await expect(page.getByText('20% off electronics')).toBeVisible();
    await expect(page.getByText('Free shipping on orders over $50')).toBeVisible();
  });

  test('should search for coupons', async ({ page }) => {
    await page.goto('/coupons');

    // Wait for initial load
    await expect(page.getByText('SAVE20')).toBeVisible();

    // Search for specific coupon
    await page.getByPlaceholder(/search coupons/i).fill('SAVE20');
    await page.getByRole('button', { name: /search/i }).click();

    // Should show only matching coupon
    await expect(page.getByText('SAVE20')).toBeVisible();
    await expect(page.getByText('FREESHIP')).not.toBeVisible();
  });

  test('should filter coupons by status', async ({ page }) => {
    await page.goto('/coupons');

    // Wait for initial load
    await expect(page.getByText('SAVE20')).toBeVisible();

    // Open filter dropdown
    await page.getByRole('button', { name: /filter/i }).click();
    
    // Select active status filter
    await page.getByText('Active').click();

    // Should show active coupons
    await expect(page.getByText('SAVE20')).toBeVisible();
    await expect(page.getByText('FREESHIP')).toBeVisible();
  });

  test('should create a new coupon', async ({ page }) => {
    await page.goto('/coupons');

    // Click create coupon button
    await page.getByRole('button', { name: /add coupon/i }).click();

    // Fill out the form
    await page.getByLabel(/coupon code/i).fill('NEWCODE');
    await page.getByLabel(/description/i).fill('New test coupon');
    await page.getByLabel(/discount type/i).click();
    await page.getByText('Percentage').click();
    await page.getByLabel(/face value/i).fill('15');
    await page.getByLabel(/expiration date/i).fill('2024-12-31');

    // Submit the form
    await page.getByRole('button', { name: /save coupon/i }).click();

    // Should show success message and new coupon
    await expect(page.getByText('Coupon created successfully')).toBeVisible();
    await expect(page.getByText('NEWCODE')).toBeVisible();
    await expect(page.getByText('New test coupon')).toBeVisible();
  });

  test('should edit an existing coupon', async ({ page }) => {
    await page.goto('/coupons');

    // Wait for coupons to load
    await expect(page.getByText('SAVE20')).toBeVisible();

    // Click edit button on first coupon
    await page.getByTestId('edit-coupon-1').click();

    // Update the description
    await page.getByLabel(/description/i).clear();
    await page.getByLabel(/description/i).fill('Updated description');

    // Save changes
    await page.getByRole('button', { name: /save changes/i }).click();

    // Should show success message and updated coupon
    await expect(page.getByText('Coupon updated successfully')).toBeVisible();
    await expect(page.getByText('Updated description')).toBeVisible();
  });

  test('should delete a coupon', async ({ page }) => {
    await page.goto('/coupons');

    // Wait for coupons to load
    await expect(page.getByText('SAVE20')).toBeVisible();

    // Click delete button
    await page.getByTestId('delete-coupon-1').click();

    // Confirm deletion in dialog
    await page.getByRole('button', { name: /delete/i }).click();

    // Should show success message and coupon should be removed
    await expect(page.getByText('Coupon deleted successfully')).toBeVisible();
    await expect(page.getByText('SAVE20')).not.toBeVisible();
  });

  test('should handle form validation errors', async ({ page }) => {
    await page.goto('/coupons');

    // Click create coupon button
    await page.getByRole('button', { name: /add coupon/i }).click();

    // Try to submit empty form
    await page.getByRole('button', { name: /save coupon/i }).click();

    // Should show validation errors
    await expect(page.getByText('Coupon code is required')).toBeVisible();
    await expect(page.getByText('Face value is required')).toBeVisible();
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/coupons');

    // Wait for coupons to load
    await expect(page.getByText('SAVE20')).toBeVisible();

    // Check that mobile layout is applied
    // This would depend on your specific responsive design
    await expect(page.locator('[data-testid="mobile-coupon-card"]')).toBeVisible();

    // Test mobile navigation
    await page.getByRole('button', { name: /menu/i }).click();
    await expect(page.getByText('Dashboard')).toBeVisible();
  });

  test('should handle loading states', async ({ page }) => {
    // Delay the API response to test loading state
    await page.route('**/api/coupons*', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            coupons: [],
            pagination: { page: 1, limit: 12, total: 0, totalPages: 0 },
          },
        }),
      });
    });

    await page.goto('/coupons');

    // Should show loading skeleton
    await expect(page.getByTestId('skeleton')).toBeVisible();
  });

  test('should handle error states', async ({ page }) => {
    // Mock API error
    await page.route('**/api/coupons*', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: { message: 'Internal server error' },
        }),
      });
    });

    await page.goto('/coupons');

    // Should show error message
    await expect(page.getByText('Failed to load coupons')).toBeVisible();
    await expect(page.getByRole('button', { name: /retry/i })).toBeVisible();
  });
});
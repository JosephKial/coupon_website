import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API responses for testing
    await page.route('**/api/auth/login', async route => {
      if (route.request().method() === 'POST') {
        const postData = route.request().postDataJSON();
        
        if (postData.email === 'test@example.com' && postData.password === 'password123') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: {
                user: {
                  id: '1',
                  email: 'test@example.com',
                  firstName: 'Test',
                  lastName: 'User',
                  role: 'MEMBER',
                },
                accessToken: 'mock-access-token',
                refreshToken: 'mock-refresh-token',
              },
            }),
          });
        } else {
          await route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              error: {
                code: 'INVALID_CREDENTIALS',
                message: 'Invalid email or password',
              },
            }),
          });
        }
      }
    });

    await page.route('**/api/auth/register', async route => {
      if (route.request().method() === 'POST') {
        const postData = route.request().postDataJSON();
        
        if (postData.email === 'existing@example.com') {
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              error: {
                code: 'EMAIL_EXISTS',
                message: 'Email already exists',
              },
            }),
          });
        } else {
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: {
                user: {
                  id: '2',
                  email: postData.email,
                  firstName: postData.firstName,
                  lastName: postData.lastName,
                  role: 'MEMBER',
                },
                accessToken: 'mock-access-token',
                refreshToken: 'mock-refresh-token',
              },
            }),
          });
        }
      }
    });
  });

  test('should display login page', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByText('Welcome Back')).toBeVisible();
    await expect(page.getByText('Sign in to your account')).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('should show validation errors for empty login form', async ({ page }) => {
    await page.goto('/login');

    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page.getByText('Email is required')).toBeVisible();
    await expect(page.getByText('Password is required')).toBeVisible();
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page.getByText('Invalid email or password')).toBeVisible();
  });

  test('should navigate to register page', async ({ page }) => {
    await page.goto('/login');

    await page.getByText(/don't have an account/i).click();

    await expect(page).toHaveURL('/register');
    await expect(page.getByText('Create Account')).toBeVisible();
  });

  test('should register successfully with valid data', async ({ page }) => {
    await page.goto('/register');

    await page.getByLabel(/first name/i).fill('John');
    await page.getByLabel(/last name/i).fill('Doe');
    await page.getByLabel(/email/i).fill('john.doe@example.com');
    await page.getByLabel(/^password/i).fill('password123');
    await page.getByLabel(/confirm password/i).fill('password123');
    await page.getByRole('button', { name: /create account/i }).click();

    // Should redirect to dashboard after successful registration
    await expect(page).toHaveURL('/dashboard');
  });

  test('should show error for existing email during registration', async ({ page }) => {
    await page.goto('/register');

    await page.getByLabel(/first name/i).fill('John');
    await page.getByLabel(/last name/i).fill('Doe');
    await page.getByLabel(/email/i).fill('existing@example.com');
    await page.getByLabel(/^password/i).fill('password123');
    await page.getByLabel(/confirm password/i).fill('password123');
    await page.getByRole('button', { name: /create account/i }).click();

    await expect(page.getByText('Email already exists')).toBeVisible();
  });

  test('should show password mismatch error', async ({ page }) => {
    await page.goto('/register');

    await page.getByLabel(/first name/i).fill('John');
    await page.getByLabel(/last name/i).fill('Doe');
    await page.getByLabel(/email/i).fill('john.doe@example.com');
    await page.getByLabel(/^password/i).fill('password123');
    await page.getByLabel(/confirm password/i).fill('differentpassword');
    await page.getByRole('button', { name: /create account/i }).click();

    await expect(page.getByText('Passwords do not match')).toBeVisible();
  });

  test('should toggle password visibility', async ({ page }) => {
    await page.goto('/login');

    const passwordInput = page.getByLabel(/password/i);
    const toggleButton = page.getByRole('button', { name: /toggle password visibility/i });

    // Initially password should be hidden
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Click toggle to show password
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'text');

    // Click toggle to hide password again
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });
});
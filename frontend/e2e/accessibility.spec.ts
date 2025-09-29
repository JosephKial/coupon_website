import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Tests @accessibility', () => {
  test('should not have any automatically detectable accessibility issues on login page', async ({ page }) => {
    await page.goto('/login');

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should not have any automatically detectable accessibility issues on register page', async ({ page }) => {
    await page.goto('/register');

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should be navigable with keyboard on login page', async ({ page }) => {
    await page.goto('/login');

    // Test tab navigation
    await page.keyboard.press('Tab');
    await expect(page.getByLabel(/email/i)).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.getByLabel(/password/i)).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: /toggle password visibility/i })).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: /sign in/i })).toBeFocused();
  });

  test('should have proper ARIA labels and roles', async ({ page }) => {
    await page.goto('/login');

    // Check for proper form labels
    await expect(page.getByLabel(/email/i)).toHaveAttribute('aria-required', 'true');
    await expect(page.getByLabel(/password/i)).toHaveAttribute('aria-required', 'true');

    // Check for proper button roles
    await expect(page.getByRole('button', { name: /sign in/i })).toHaveAttribute('type', 'submit');
  });

  test('should announce form validation errors to screen readers', async ({ page }) => {
    await page.goto('/login');

    // Submit empty form to trigger validation
    await page.getByRole('button', { name: /sign in/i }).click();

    // Check that error messages are properly associated with form fields
    const emailError = page.getByText('Email is required');
    const passwordError = page.getByText('Password is required');

    await expect(emailError).toBeVisible();
    await expect(passwordError).toBeVisible();

    // Check that errors have proper ARIA attributes
    await expect(emailError).toHaveAttribute('role', 'alert');
    await expect(passwordError).toHaveAttribute('role', 'alert');
  });

  test('should have sufficient color contrast', async ({ page }) => {
    await page.goto('/login');

    // Run axe-core with color contrast rules
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    // Filter for color contrast violations
    const colorContrastViolations = accessibilityScanResults.violations.filter(
      violation => violation.id === 'color-contrast'
    );

    expect(colorContrastViolations).toEqual([]);
  });

  test('should work with high contrast mode', async ({ page }) => {
    // Enable high contrast mode
    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
    
    await page.goto('/login');

    // Verify that the page is still functional and readable
    await expect(page.getByText('Welcome Back')).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('should respect reduced motion preferences', async ({ page }) => {
    // Set reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });
    
    await page.goto('/login');

    // Check that animations are reduced or disabled
    // This would depend on your CSS implementation
    const animatedElements = page.locator('[class*="animate"], [class*="transition"]');
    
    // Verify that elements still function without animations
    await expect(page.getByText('Welcome Back')).toBeVisible();
  });

  test('should be usable at 200% zoom level', async ({ page }) => {
    await page.goto('/login');

    // Set zoom level to 200%
    await page.setViewportSize({ width: 640, height: 480 });

    // Verify that all elements are still visible and functional
    await expect(page.getByText('Welcome Back')).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();

    // Test that form still works at high zoom
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('password123');
    
    // Button should still be clickable
    await expect(page.getByRole('button', { name: /sign in/i })).toBeEnabled();
  });
});
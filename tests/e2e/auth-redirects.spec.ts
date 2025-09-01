import { test, expect } from '@playwright/test';

const COOKIE_NAME = 'domainflow_session';

test.describe('Auth redirect behavior', () => {
  test('unauthenticated: / -> 302 to /login via middleware, root server redirect is no-op with middleware', async ({ page }) => {
    const res = await page.goto('/');
    // We expect to end up on /login
    await expect(page).toHaveURL(/\/login$/);
    expect(res?.status()).toBeLessThan(400);
  });

  test('unauthenticated: /dashboard -> redirected to /login', async ({ page }) => {
    const res = await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login$/);
    expect(res?.status()).toBeLessThan(400);
  });

  test('authenticated: /login -> redirected to /dashboard', async ({ page, context }) => {
    await context.addCookies([{ name: COOKIE_NAME, value: 'devtoken', domain: 'localhost', path: '/' }]);
    const res = await page.goto('/login');
    await expect(page).toHaveURL(/\/dashboard$/);
    expect(res?.status()).toBeLessThan(400);
  });

  test('logout navigates to /login without page reload', async ({ page, context }) => {
    await context.addCookies([{ name: COOKIE_NAME, value: 'devtoken', domain: 'localhost', path: '/' }]);
    await page.goto('/dashboard');
    // Click Logout in sidebar
    await page.getByRole('button', { name: /logout/i }).click();
    await expect(page).toHaveURL(/\/login$/);
  });
});

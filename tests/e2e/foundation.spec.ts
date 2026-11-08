import { test, expect } from '@playwright/test';

for (const [name, url] of [['H5', 'http://127.0.0.1:5173'], ['admin', 'http://127.0.0.1:5174']]) {
  test(`${name}: connects to real API/database and retries after failure`, async ({ page }) => {
    await page.setViewportSize(name === 'H5' ? { width: 390, height: 844 } : { width: 1280, height: 800 });
    await page.goto(url);
    await expect(page.getByText('服务与数据库已连接', { exact: true })).toBeVisible();
    await page.route('**/api/ready', route => route.fulfill({ status: 503, json: { message: 'Unavailable' } }));
    await page.getByRole('button', { name: '重新检查连接' }).click();
    await expect(page.getByText('暂时无法连接服务，请稍后重试', { exact: true })).toBeVisible();
    await page.unroute('**/api/ready');
    await page.getByRole('button', { name: '重新检查连接' }).click();
    await expect(page.getByText('服务与数据库已连接', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}

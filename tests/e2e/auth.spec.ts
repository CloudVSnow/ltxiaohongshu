import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

// Use the API's generated client and dependencies for scoped test-data cleanup.
const apiRequire = createRequire(resolve('apps/api/package.json'));
apiRequire('dotenv').config({ path: resolve('apps/api/.env'), quiet: true });
const { PrismaClient } = apiRequire('./dist/src/generated/prisma/client.js');
const { PrismaPg } = apiRequire('@prisma/adapter-pg');
const email = `e2e-${randomUUID()}@example.com`;
const password = 'test-password-123';
test.afterAll(async () => {
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  try { await db.user.deleteMany({ where: { email } }); } finally { await db.$disconnect(); }
});

test('H5 registration, reload, logout and login keep sessions private and revocable', async ({ page, context, browser }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://127.0.0.1:5173');
  await page.getByRole('button', { name: '我的', exact: true }).click();
  await page.getByRole('button', { name: '登录 / 注册', exact: true }).click();
  await page.getByRole('button', { name: '没有账号？去注册', exact: true }).click();
  await page.getByRole('button', { name: '注册并登录', exact: true }).click();
  await expect(page.getByText('请输入有效邮箱和 8–64 个字符的密码', { exact: true })).toBeVisible();
  await page.locator('uni-input[aria-label="邮箱"] input').fill(email.toUpperCase());
  await page.locator('uni-input[aria-label="密码"] input').fill(password);
  await page.getByRole('button', { name: '注册并登录', exact: true }).click();
  await expect(page.getByText(email, { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText(email, { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.cookie)).not.toContain('lt_session');
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain('lt_session');
  const cookie = (await context.cookies()).find(item => item.name === 'lt_session')!;
  expect(cookie.httpOnly).toBe(true);
  await page.getByRole('button', { name: '退出登录', exact: true }).click();
  await expect(page.getByRole('button', { name: '登录 / 注册', exact: true })).toBeVisible();
  const oldSession = await context.request.get('http://127.0.0.1:5173/api/auth/me', { headers: { Cookie: `lt_session=${cookie.value}` } });
  expect(oldSession.status()).toBe(401);
  await page.getByRole('button', { name: '登录 / 注册', exact: true }).click();
  await page.locator('uni-input[aria-label="邮箱"] input').fill(email);
  await page.locator('uni-input[aria-label="密码"] input').fill('incorrect-password');
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await expect(page.getByText('邮箱或密码错误，或登录已失效', { exact: true })).toBeVisible();
  await page.locator('uni-input[aria-label="密码"] input').fill(password);
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await expect(page.getByText(email, { exact: true })).toBeVisible();

  const isolated = await browser.newContext();
  try {
    const other = await isolated.newPage();
    await other.goto('http://127.0.0.1:5173/#/pages/me/index');
    await expect(other.getByRole('button', { name: '登录 / 注册', exact: true })).toBeVisible();
    await other.goto('http://127.0.0.1:5173/#/pages/auth/index?returnTo=https%3A%2F%2Fevil.example');
    await other.getByRole('button', { name: '没有账号？去注册', exact: true }).click();
    await other.locator('uni-input[aria-label="邮箱"] input').fill(email);
    await other.locator('uni-input[aria-label="密码"] input').fill(password);
    await other.getByRole('button', { name: '注册并登录', exact: true }).click();
    await expect(other.getByText('该邮箱已注册，请切换登录', { exact: true })).toBeVisible();
    await other.getByRole('button', { name: '已有账号？去登录', exact: true }).click();
    await other.locator('uni-input[aria-label="密码"] input').fill(password);
    await other.getByRole('button', { name: '登录', exact: true }).click();
    await expect(other.getByText(email, { exact: true })).toBeVisible();
    expect(other.url()).toContain('127.0.0.1:5173/#/pages/me/index');
    await other.getByRole('button', { name: '退出登录', exact: true }).click();
    await page.reload();
    await expect(page.getByText(email, { exact: true })).toBeVisible();
  } finally { await isolated.close(); }
});

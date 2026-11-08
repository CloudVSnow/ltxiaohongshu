import { test, expect, type Locator } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const apiRequire = createRequire(resolve('apps/api/package.json'));
apiRequire('dotenv').config({ path: resolve('apps/api/.env'), quiet: true });
const { PrismaClient } = apiRequire('./dist/src/generated/prisma/client.js');
const { PrismaPg } = apiRequire('@prisma/adapter-pg');
const email = `swagger-e2e-${randomUUID()}@example.com`;
const password = 'swagger-test-123';
test.afterAll(async () => {
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  try { await db.user.deleteMany({ where: { email } }); } finally { await db.$disconnect(); }
});
async function execute(operation: Locator, body?: object) {
  if (!(await operation.getByRole('button', { name: 'Execute', exact: true }).isVisible())) {
    await operation.locator('.opblock-summary').click();
    await operation.getByRole('button', { name: 'Try it out', exact: true }).click();
  }
  if (body) await operation.locator('textarea.body-param__text').fill(JSON.stringify(body));
  await operation.getByRole('button', { name: 'Execute', exact: true }).click();
}
test('Swagger UI login sends real browser cookies, me reads them, logout revokes them', async ({ page, context }) => {
  // Seed only this test's account; all authentication under test happens through Swagger UI.
  const seed = await context.request.post('http://127.0.0.1:3000/api/auth/register', { headers: { Origin: 'http://127.0.0.1:3000' }, data: { email, password } });
  expect(seed.status()).toBe(201);
  await context.clearCookies();
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:3000/api/docs');
  await expect(page.getByRole('heading', { name: /图文社区接口文档/ })).toBeVisible();
  const operation = (name: string) => page.locator(`[id$="-auth_${name}"]`);
  const login = operation('login');
  const loginResponse = page.waitForResponse(response => response.url().endsWith('/api/auth/login') && response.request().method() === 'POST');
  await execute(login, { email, password });
  expect((await loginResponse).status()).toBe(200);
  await expect(login.locator('.responses-inner .live-responses-table')).toContainText(email);
  const session = (await context.cookies()).find(cookie => cookie.name === 'lt_session')!;
  expect(session.httpOnly).toBe(true);
  const me = operation('me');
  const meResponse = page.waitForResponse(response => response.url().endsWith('/api/auth/me'));
  await execute(me);
  expect((await meResponse).status()).toBe(200);
  await expect(me.locator('.live-responses-table')).toContainText(email);
  const logout = operation('logout');
  const logoutResponse = page.waitForResponse(response => response.url().endsWith('/api/auth/logout'));
  await execute(logout);
  expect((await logoutResponse).status()).toBe(204);
  const replay = await context.request.get('http://127.0.0.1:3000/api/auth/me', { headers: { Cookie: `lt_session=${session.value}` } });
  expect(replay.status()).toBe(401);
  expect(errors).toEqual([]);
});

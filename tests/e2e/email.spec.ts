import { test, expect, type APIRequestContext } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const apiRequire = createRequire(resolve('apps/api/package.json'));
apiRequire('dotenv').config({ path: resolve('apps/api/.env'), quiet: true });
const { PrismaClient } = apiRequire('./dist/src/generated/prisma/client.js');
const { PrismaPg } = apiRequire('@prisma/adapter-pg');
const email = `email-e2e-${randomUUID()}@example.com`;
test.afterAll(async () => {
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  try { await db.user.deleteMany({ where: { email } }); } finally { await db.$disconnect(); }
});
async function mailLink(request: APIRequestContext, purpose: string) {
  let id = '';
  await expect.poll(async () => {
    const result = await (await request.get(`http://127.0.0.1:8025/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`)).json();
    id = result.messages?.find((message: { Subject: string }) => message.Subject.includes(purpose))?.ID ?? '';
    return id;
  }).not.toBe('');
  const message = await (await request.get(`http://127.0.0.1:8025/api/v1/message/${id}`)).json();
  return message.Text.match(/http[^\s]+token=[a-f0-9]{64}/)[0] as string;
}
test('real SMTP inbox: verify email, reset password, invalidate old session and reuse', async ({ page, context, request }) => {
  await page.goto('http://127.0.0.1:5173/#/pages/auth/index');
  await page.getByRole('button', { name: '没有账号？去注册', exact: true }).click();
  await page.locator('uni-input[aria-label="邮箱"] input').fill(email);
  await page.locator('uni-input[aria-label="密码"] input').fill('old-password-123');
  await page.getByRole('button', { name: '注册并登录', exact: true }).click();
  await expect(page.getByText('邮箱尚未验证', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '发送验证邮件', exact: true }).click();
  await expect(page.getByText('验证邮件已发送，请查看邮箱（包括垃圾邮件）', { exact: true })).toBeVisible();
  await page.goto(await mailLink(request, '验证邮箱'));
  await page.getByRole('button', { name: '确认验证', exact: true }).click();
  await expect(page.getByText('邮箱验证成功', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '返回我的', exact: true }).click();
  await expect(page.getByText('邮箱已验证', { exact: true })).toBeVisible();
  const old = (await context.cookies()).find(cookie => cookie.name === 'lt_session')!;
  await page.goto('http://127.0.0.1:5173/#/pages/auth/index');
  await page.getByRole('button', { name: '忘记密码', exact: true }).click();
  await page.locator('uni-input[aria-label="邮箱"] input').fill(email);
  await page.getByRole('button', { name: '发送重置邮件', exact: true }).click();
  await expect(page.getByText('如果该邮箱可用，重置邮件将发送至你的邮箱，请稍后查看。', { exact: true })).toBeVisible();
  const link = await mailLink(request, '重置密码');
  await page.goto(link);
  await page.locator('uni-input[aria-label="新密码"] input').fill('new-password-456');
  await page.locator('uni-input[aria-label="确认密码"] input').fill('new-password-456');
  await page.getByRole('button', { name: '重置密码', exact: true }).click();
  await expect(page.getByText('密码已重置，请重新登录', { exact: true })).toBeVisible();
  expect((await request.get('http://127.0.0.1:5173/api/auth/me', { headers: { Cookie: `lt_session=${old.value}` } })).status()).toBe(401);
  await page.getByRole('button', { name: '返回登录', exact: true }).click();
  await page.locator('uni-input[aria-label="邮箱"] input').fill(email);
  await page.locator('uni-input[aria-label="密码"] input').fill('new-password-456');
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await expect(page.getByText(email, { exact: true })).toBeVisible();
  await page.goto(link);
  await page.locator('uni-input[aria-label="新密码"] input').fill('another-password-789');
  await page.locator('uni-input[aria-label="确认密码"] input').fill('another-password-789');
  await page.getByRole('button', { name: '重置密码', exact: true }).click();
  await expect(page.getByText('链接无效、已使用或已过期，请重新申请；新密码须为 8–64 个字符', { exact: true })).toBeVisible();
});

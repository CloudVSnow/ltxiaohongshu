import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ExecutionContext } from '@nestjs/common';
import { hashPassword, verifyPassword } from '../src/auth/password';
import { readSessionCookie, sessionCookieOptions, tokenHash } from '../src/auth/session';
import { AuthWriteGuard } from '../src/auth/auth-write.guard';

test('password hashes are salted; Unicode and spaces remain significant', async () => {
  const password = ' 空格与密码123 ';
  const first = await hashPassword(password);
  assert.notEqual(first, await hashPassword(password));
  assert.equal(await verifyPassword(password, first), true);
  assert.equal(await verifyPassword(password.trim(), first), false);
  assert.equal(await verifyPassword('incorrect', first), false);
  assert.equal(await verifyPassword(password, 'invalid'), false);
  assert.ok(!first.includes(password));
});
test('session cookie parser rejects malformed and duplicate tokens', () => {
  const token = 'a'.repeat(64);
  assert.equal(readSessionCookie(`other=x; lt_session=${token}`), token);
  for (const value of [undefined, '', 'lt_session=short', `lt_session=${token}; lt_session=${token}`, 'lt_session=%']) assert.equal(readSessionCookie(value), undefined);
  assert.notEqual(tokenHash(token), token);
  const previous = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = 'production';
    assert.deepEqual(sessionCookieOptions(), { httpOnly: true, sameSite: 'lax', secure: true, path: '/api' });
  } finally { if (previous === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous; }
});
test('auth writes enforce exact origins and rate limit even when forwarded IPs change', context => {
  const previous = process.env.DATABASE_URL;
  process.env.DATABASE_URL ??= 'postgresql://test:test@localhost/test';
  let now = Date.now();
  context.mock.method(Date, 'now', () => now);
  const guard = new AuthWriteGuard();
  const request = { headers: { origin: 'http://localhost:5173', 'x-forwarded-for': '1.1.1.1' }, socket: { remoteAddress: '127.0.0.1' }, path: '/api/auth/login' };
  const execution = { switchToHttp: () => ({ getRequest: () => request }) } as unknown as ExecutionContext;
  try {
    request.headers.origin = 'https://evil.example';
    assert.throws(() => guard.canActivate(execution), /请求来源/);
    request.headers.origin = 'http://localhost:5173';
    for (let i = 0; i < 10; i++) { request.headers['x-forwarded-for'] = `1.1.1.${i}`; assert.equal(guard.canActivate(execution), true); }
    assert.throws(() => guard.canActivate(execution), /频繁/);
    request.path = '/api/auth/logout';
    assert.equal(guard.canActivate(execution), true);
    request.path = '/api/auth/register';
    now += 15 * 60 * 1000;
    assert.equal(guard.canActivate(execution), true);
  } finally { if (previous === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = previous; }
});

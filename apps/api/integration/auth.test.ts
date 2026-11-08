import 'dotenv/config';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createApp } from '../src/app';
import { DatabaseService } from '../src/database.service';
import { tokenHash } from '../src/auth/session';

test('real auth lifecycle: validation, session rotation, revocation, expiration and disabled users', async () => {
  const app = await createApp();
  await app.listen(0, '127.0.0.1');
  const base = `${await app.getUrl()}/api/auth`;
  const db = app.get(DatabaseService);
  const email = `auth-${randomUUID()}@example.com`;
  const password = '测试密码123456';
  const post = (path: string, body: unknown, cookie = '', origin = 'http://localhost:5173') => fetch(`${base}/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin, Cookie: cookie }, body: JSON.stringify(body) });
  const me = (cookie = '') => fetch(`${base}/me`, { headers: { Cookie: cookie } });
  const credentials = { email, password };
  try {
    assert.equal((await me()).status, 401);
    assert.equal((await post('register', credentials, '', 'https://evil.example')).status, 403);
    assert.equal((await post('register', credentials, '', '')).status, 403);
    assert.equal((await post('register', { ...credentials, password: 'short' })).status, 400);
    const registration = await post('register', { ...credentials, email: ` ${email.toUpperCase()} ` });
    assert.equal(registration.status, 201);
    assert.equal(registration.headers.get('cache-control'), 'no-store');
    const header = registration.headers.get('set-cookie')!;
    assert.match(header, /HttpOnly/); assert.match(header, /SameSite=Lax/); assert.match(header, /Path=\/api/);
    const cookie = header.split(';')[0];
    const result = await registration.json();
    assert.deepEqual(Object.keys(result), ['user']);
    assert.deepEqual(Object.keys(result.user).sort(), ['email', 'id', 'nickname']);
    assert.equal(result.user.email, email);
    const storedUser = await db.user.findUniqueOrThrow({ where: { email } });
    assert.notEqual(storedUser.passwordHash, password);
    const firstSession = await db.session.findUniqueOrThrow({ where: { tokenHash: tokenHash(cookie.split('=')[1]) } });
    assert.notEqual(firstSession.tokenHash, cookie.split('=')[1]);
    assert.equal((await me(cookie)).status, 200);
    assert.equal((await post('register', credentials)).status, 409);
    const wrong = await post('login', { ...credentials, password: 'wrong-password' });
    const unknown = await post('login', { ...credentials, email: `missing-${email}` });
    assert.equal(wrong.status, 401); assert.deepEqual(await wrong.json(), await unknown.json());
    const login = await post('login', credentials, cookie);
    assert.equal(login.status, 200);
    const secondCookie = login.headers.get('set-cookie')!.split(';')[0];
    assert.notEqual(secondCookie, cookie);
    assert.equal((await me(cookie)).status, 401);
    assert.equal((await me(secondCookie)).status, 200);
    assert.equal((await post('logout', {}, secondCookie)).status, 204);
    assert.equal((await me(secondCookie)).status, 401);
    assert.equal((await post('logout', {}, secondCookie)).status, 204);
    const again = await post('login', credentials);
    const thirdCookie = again.headers.get('set-cookie')!.split(';')[0];
    await db.session.updateMany({ where: { userId: storedUser.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    assert.equal((await me(thirdCookie)).status, 401);
    const last = await post('login', credentials);
    const lastCookie = last.headers.get('set-cookie')!.split(';')[0];
    await db.user.update({ where: { id: storedUser.id }, data: { disabledAt: new Date() } });
    assert.equal((await me(lastCookie)).status, 401);
    assert.equal((await post('login', credentials)).status, 401);
    assert.equal((await me('lt_session=%bad')).status, 401);
  } finally {
    await db.user.deleteMany({ where: { email } });
    await app.close();
  }
});

test('concurrent registrations create one user; two accounts keep independent sessions', async () => {
  const app = await createApp(); await app.listen(0, '127.0.0.1');
  const db = app.get(DatabaseService);
  const base = `${await app.getUrl()}/api/auth`;
  const emails = [`race-${randomUUID()}@example.com`, `second-${randomUUID()}@example.com`];
  const register = (email: string) => fetch(`${base}/register`, { method: 'POST', headers: { Origin: 'http://localhost:5173', 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: 'password-123' }) });
  try {
    const responses = await Promise.all([register(emails[0]), register(emails[0])]);
    assert.deepEqual(responses.map(r => r.status).sort(), [201, 409]);
    assert.equal(await db.user.count({ where: { email: emails[0] } }), 1);
    const first = responses.find(r => r.status === 201)!;
    const second = await register(emails[1]);
    for (const [response, email] of [[first, emails[0]], [second, emails[1]]] as const) {
      const me = await fetch(`${base}/me`, { headers: { Cookie: response.headers.get('set-cookie')!.split(';')[0] } });
      assert.equal((await me.json()).user.email, email);
    }
  } finally { await db.user.deleteMany({ where: { email: { in: emails } } }); await app.close(); }
});

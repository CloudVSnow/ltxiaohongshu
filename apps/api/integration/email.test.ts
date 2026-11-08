import 'dotenv/config';
import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { MailService } from '../src/mail/mail.service';
import { DatabaseService } from '../src/database.service';
import { AuthService } from '../src/auth/auth.service';
import { EmailService } from '../src/auth/email.service';
import { tokenHash } from '../src/auth/session';

test('email token lifecycle: resend, purpose, expiry, concurrency, reset and failed delivery', async () => {
  // Explicitly override delivery: integration tests must never send to the configured QQ mailbox.
  const captured: { to: string; text: string }[] = [];
  let fail = false;
  const testConfig = { SMTP_HOST: '127.0.0.1', MAIL_FROM: 'test@example.com', PUBLIC_WEB_URL: 'http://127.0.0.1:5173' };
  const previous = Object.fromEntries(Object.keys(testConfig).map(key => [key, process.env[key]]));
  Object.assign(process.env, testConfig);
  const module = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(MailService).useValue({ send: async (to: string, _subject: string, text: string) => {
    if (fail) throw new Error('simulated SMTP failure'); captured.push({ to, text });
  } }).compile();
  const db = module.get(DatabaseService), auth = module.get(AuthService), emailService = module.get(EmailService);
  const email = `email-${randomUUID()}@example.com`;
  const password = 'old-password-123', newPassword = 'new-password-456';
  const lastToken = () => captured.at(-1)!.text.match(/token=([a-f0-9]{64})/)![1];
  const age = async (userId: string) => db.emailToken.updateMany({ where: { userId }, data: { createdAt: new Date(Date.now() - 61000) } });
  try {
    const registered = await auth.register({ email, password });
    const userId = registered.user.id;
    assert.equal(registered.user.isEmailVerified, false);
    await emailService.request(userId, 'verify');
    const first = lastToken();
    assert.equal(captured[0].to, email);
    assert.equal(await db.emailToken.count({ where: { tokenHash: first } }), 0);
    await assert.rejects(emailService.request(userId, 'verify'), /一分钟/);
    await assert.rejects(emailService.consume(first, 'reset', newPassword), /链接无效/);
    await age(userId); await emailService.request(userId, 'verify');
    const second = lastToken();
    await assert.rejects(emailService.consume(first, 'verify'), /链接无效/);
    await db.emailToken.update({ where: { tokenHash: tokenHash(second) }, data: { expiresAt: new Date(Date.now() - 1000) } });
    await assert.rejects(emailService.consume(second, 'verify'), /链接无效/);
    await age(userId); await emailService.request(userId, 'verify');
    const outcomes = await Promise.allSettled([emailService.consume(lastToken(), 'verify'), emailService.consume(lastToken(), 'verify')]);
    assert.equal(outcomes.filter(result => result.status === 'fulfilled').length, 1);
    assert.equal((await auth.currentUser(registered.token)).isEmailVerified, true);
    const session2 = await auth.login({ email, password });
    const known = await emailService.forgot(email), unknown = await emailService.forgot(`missing-${email}`);
    assert.deepEqual(known, unknown);
    const resetToken = lastToken();
    await emailService.consume(resetToken, 'reset', newPassword);
    await assert.rejects(emailService.consume(resetToken, 'reset', newPassword), /链接无效/);
    await assert.rejects(auth.currentUser(registered.token));
    await assert.rejects(auth.currentUser(session2.token));
    await assert.rejects(auth.login({ email, password }));
    assert.equal((await auth.login({ email, password: newPassword })).user.id, userId);
    await age(userId);
    fail = true;
    assert.deepEqual(await emailService.forgot(email), unknown);
    assert.equal(await db.emailToken.count({ where: { userId, usedAt: null } }), 0);
    await assert.rejects(emailService.consume('0'.repeat(64), 'verify'), /链接无效/);
  } finally {
    await db.user.deleteMany({ where: { email } }); await module.close();
    for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  }
});

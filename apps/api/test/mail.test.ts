import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mailConfig } from '../src/mail/mail.service';

test('QQ SMTP uses explicit TLS and configured credentials', () => {
  const config = mailConfig({ SMTP_HOST: 'smtp.qq.com', SMTP_PORT: '465', SMTP_SECURE: 'true', SMTP_USER: 'user@qq.com', SMTP_PASS: 'test-only', MAIL_FROM: 'user@qq.com' });
  assert.equal(config.secure, true); assert.equal(config.port, 465);
  assert.equal(config.auth?.pass, 'test-only');
  assert.equal(mailConfig({ SMTP_HOST: '127.0.0.1', SMTP_PORT: '1025', SMTP_SECURE: 'false', MAIL_FROM: 'test@example.com' }).auth, undefined);
});
test('rejects invalid ports, TLS flags, missing remote credentials and unsafe public URLs', () => {
  const base = { SMTP_HOST: 'smtp.qq.com', SMTP_USER: 'user@qq.com', SMTP_PASS: 'test-only', MAIL_FROM: 'user@qq.com' };
  for (const env of [{}, { ...base, SMTP_PORT: '0' }, { ...base, SMTP_SECURE: 'yes' }, { ...base, SMTP_PASS: '' }, ...['javascript:alert(1)', 'http://user:password@example.com', 'https://example.com/#/evil', 'https://example.com/?url=evil'].map(PUBLIC_WEB_URL => ({ ...base, PUBLIC_WEB_URL })), { ...base, NODE_ENV: 'production', PUBLIC_WEB_URL: 'http://example.com' }]) assert.throws(() => mailConfig(env));
  assert.equal(mailConfig({ ...base, SMTP_PORT: '587', SMTP_SECURE: 'false' }).requireTLS, true);
});

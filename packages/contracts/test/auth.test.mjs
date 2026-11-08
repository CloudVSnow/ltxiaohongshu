import { test } from 'node:test';
import assert from 'node:assert/strict';
import { credentialsSchema } from '../dist/index.js';

test('credentials normalize email and preserve password exactly', () => {
  assert.deepEqual(credentialsSchema.parse({ email: '  Alice@Example.com ', password: ' password ' }), { email: 'alice@example.com', password: ' password ' });
  for (const password of ['x'.repeat(8), '😀'.repeat(64)]) assert.equal(credentialsSchema.safeParse({ email: 'a@example.com', password }).success, true);
});
test('rejects invalid email, password boundaries, extra fields and non-object input', () => {
  for (const input of [null, [], { email: 'bad', password: 'password' }, { email: 'a@example.com', password: 'x'.repeat(7) }, { email: 'a@example.com', password: '😀'.repeat(65) }, { email: 'a@example.com', password: 'password', role: 'admin' }]) assert.equal(credentialsSchema.safeParse(input).success, false);
});

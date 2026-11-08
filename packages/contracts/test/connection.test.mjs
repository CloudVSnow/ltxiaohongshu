import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkConnection } from '../dist/index.js';

test('checks process health before database readiness', async () => {
  const calls = [];
  await checkConnection(async (path) => {
    calls.push(path);
    return path === '/health' ? { status: 'ok', service: 'api' } : { status: 'ok', database: 'ok' };
  });
  assert.deepEqual(calls, ['/health', '/ready']);
});
test('rejects invalid API responses and does not continue', async () => {
  let calls = 0;
  await assert.rejects(checkConnection(async () => { calls++; return { status: 'ok' }; }));
  assert.equal(calls, 1);
});
test('propagates network and database errors', async () => {
  const offline = new Error('offline');
  await assert.rejects(checkConnection(async () => { throw offline; }), offline);
  await assert.rejects(checkConnection(async (path) => path === '/health'
    ? { status: 'ok', service: 'api' } : { status: 'error', database: 'unavailable' }));
});

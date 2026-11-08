import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/database.service';

test('HTTP health survives database failures; readiness returns sanitized 503', async () => {
  let state: 'ok' | 'missing' | 'offline' = 'ok';
  const module = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(DatabaseService).useValue({
    isReady: async () => { if (state === 'offline') throw new Error('secret-password'); return state === 'ok'; }
  }).compile();
  const app = module.createNestApplication();
  app.setGlobalPrefix('api');
  await app.listen(0, '127.0.0.1');
  const url = await app.getUrl();
  try {
    assert.deepEqual(await (await fetch(`${url}/api/health`)).json(), { status: 'ok', service: 'api' });
    assert.deepEqual(await (await fetch(`${url}/api/ready`)).json(), { status: 'ok', database: 'ok' });
    for (state of ['missing', 'offline'] as const) {
      const response = await fetch(`${url}/api/ready`);
      assert.equal(response.status, 503);
      assert.ok(!(await response.text()).includes('secret-password'));
      assert.equal((await fetch(`${url}/api/health`)).status, 200);
    }
    assert.equal((await fetch(`${url}/api/unknown`)).status, 404);
  } finally { await app.close(); }
});

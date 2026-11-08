import 'dotenv/config';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app';
import { DatabaseService } from '../src/database.service';

test('real PostgreSQL migration and readiness via HTTP', async () => {
  // No skip: the caller must supply a migrated test database.
  const app = await createApp();
  await app.listen(0, '127.0.0.1');
  try {
    const db = app.get(DatabaseService);
    assert.equal(await db.isReady(), true);
    assert.equal(await db.appMetadata.count({ where: { key: 'schema_version', value: '1' } }), 1);
    const url = await app.getUrl();
    const response = await fetch(`${url}/api/ready`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'ok', database: 'ok' });
    const cors = await fetch(`${url}/api/health`, { headers: { Origin: 'http://localhost:5173' } });
    assert.equal(cors.headers.get('access-control-allow-origin'), 'http://localhost:5173');
    const blocked = await fetch(`${url}/api/health`, { headers: { Origin: 'https://untrusted.example' } });
    assert.equal(blocked.headers.get('access-control-allow-origin'), null);
  } finally { await app.close(); }
});

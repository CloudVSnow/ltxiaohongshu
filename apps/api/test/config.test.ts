import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readConfig } from '../src/config';

const base = { DATABASE_URL: 'postgresql://test:test@localhost/test' };
test('accepts PostgreSQL URLs and trims exact CORS origins', () => {
  const config = readConfig({ ...base, PORT: '3100', CORS_ORIGINS: ' http://localhost:5173 ,http://localhost:5174' });
  assert.equal(config.port, 3100);
  assert.deepEqual(config.origins, ['http://localhost:5173', 'http://localhost:5174']);
});
test('rejects missing database, invalid ports, and wildcard/path origins', () => {
  for (const env of [{}, { DATABASE_URL: 'https://example.com' }, ...['0', '65536', 'NaN', '2.5'].map(PORT => ({ ...base, PORT })), ...['*', '', 'https://example.com/path'].map(CORS_ORIGINS => ({ ...base, CORS_ORIGINS }))]) {
    assert.throws(() => readConfig(env));
  }
});

test('Swagger and implicit local debug origins are development-only by default', () => {
  const dev = readConfig({ ...base, PORT: '3100' });
  assert.equal(dev.swaggerEnabled, true);
  assert.ok(dev.authOrigins.includes('http://127.0.0.1:3100'));
  assert.ok(dev.authOrigins.includes('http://localhost:3100'));
  assert.ok(!dev.authOrigins.includes('http://evil.example:3100'));
  for (const config of [readConfig({ ...base, SWAGGER_ENABLED: 'false' }), readConfig({ ...base, NODE_ENV: 'production' }), readConfig({ ...base, NODE_ENV: 'production', SWAGGER_ENABLED: 'true' })]) {
    assert.deepEqual(config.authOrigins, config.origins);
  }
  assert.equal(readConfig({ ...base, NODE_ENV: 'production' }).swaggerEnabled, false);
  assert.equal(readConfig({ ...base, NODE_ENV: 'production', SWAGGER_ENABLED: 'true' }).swaggerEnabled, true);
  assert.throws(() => readConfig({ ...base, SWAGGER_ENABLED: 'yes' }));
});

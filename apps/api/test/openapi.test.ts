import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Test } from '@nestjs/testing';
import SwaggerParser from '@apidevtools/swagger-parser';
import type { SchemaObject, ReferenceObject } from '@nestjs/swagger';
import { PATH_METADATA, METHOD_METADATA } from '@nestjs/common/constants';
import { authResponseSchema, credentialsSchema, emailSchema, emailTokenSchema, resetPasswordSchema, healthSchema, readySchema } from '@lt/contracts';
import { AppModule } from '../src/app.module';
import { AuthController } from '../src/auth/auth.controller';
import { HealthController } from '../src/health.controller';
import { DatabaseService } from '../src/database.service';
import { createOpenApiDocument, setupOpenApi } from '../src/openapi/setup';
import { createApp } from '../src/app';

test('OpenAPI is valid, documents all actual routes and reuses the runtime contracts', async () => {
  const module = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(DatabaseService).useValue({ isReady: async () => true }).compile();
  const app = module.createNestApplication(); app.setGlobalPrefix('api');
  setupOpenApi(app);
  await app.listen(0, '127.0.0.1');
  try {
    const doc = createOpenApiDocument(app);
    await SwaggerParser.validate(JSON.parse(JSON.stringify(doc)));
    const actualRoutes: string[] = [];
    for (const controller of [AuthController, HealthController]) {
      const prefix = Reflect.getMetadata(PATH_METADATA, controller);
      for (const name of Object.getOwnPropertyNames(controller.prototype)) {
        const handler = Object.getOwnPropertyDescriptor(controller.prototype, name)?.value;
        if (typeof handler !== 'function') continue;
        const method = Reflect.getMetadata(METHOD_METADATA, handler);
        if (method === undefined) continue;
        const path = '/' + ['api', prefix, Reflect.getMetadata(PATH_METADATA, handler)].map(value => String(value ?? '').replace(/^\/+|\/+$/g, '')).filter(Boolean).join('/');
        actualRoutes.push(`${method === 0 ? 'get' : 'post'} ${path}`);
      }
    }
    const documentedRoutes = Object.entries(doc.paths).flatMap(([path, item]) => Object.entries(item ?? {}).filter(([method]) => ['get', 'post'].includes(method)).map(([method]) => `${method} ${path}`));
    assert.deepEqual(documentedRoutes.sort(), actualRoutes.sort());
    assert.equal(documentedRoutes.length, 10);
    const operations = Object.values(doc.paths).flatMap(path => [path?.get, path?.post].filter(operation => !!operation));
    assert.equal(new Set(operations.map(operation => operation!.operationId)).size, operations.length);
    for (const operation of operations) { assert.ok(operation!.summary); assert.ok(operation!.description); assert.ok(operation!.tags?.length); }
    assert.deepEqual(doc.components?.securitySchemes?.session, { type: 'apiKey', in: 'cookie', name: 'lt_session', description: 'HttpOnly 会话由登录接口设置，不能由 Swagger Authorize 手工写入。' });
    assert.deepEqual(doc.paths['/api/auth/me'].get?.security, [{ session: [] }]);
    assert.deepEqual(doc.paths['/api/auth/email/request'].post?.security, [{ session: [] }]);
    assert.equal(doc.paths['/api/auth/login'].post?.security, undefined);
    assert.ok(doc.paths['/api/auth/logout'].post?.responses['204']);
    assert.ok(doc.paths['/api/auth/password/forgot'].post?.responses['202']);
    assert.ok(!doc.paths['/api/auth/password/forgot'].post?.responses['503']);
    const contracts = { Credentials: credentialsSchema, Email: emailSchema, EmailToken: emailTokenSchema, ResetPassword: resetPasswordSchema };
    for (const [name, schema] of Object.entries(contracts)) {
      const generated: SchemaObject | ReferenceObject = doc.components!.schemas![name];
      assert.ok(!('$ref' in generated));
      assert.equal(generated.additionalProperties, false);
      assert.deepEqual(generated.required, Object.keys(schema.shape));
    }
    const credentials = doc.components!.schemas!.Credentials;
    assert.ok(!('$ref' in credentials));
    const password = credentials.properties!.password;
    assert.ok(!('$ref' in password));
    assert.equal(password.minLength, 8); assert.equal(password.maxLength, 64); assert.equal(password.writeOnly, true);
    for (const operation of operations) {
      const body = operation!.requestBody;
      if (!body || '$ref' in body) continue;
      const media = body.content['application/json'];
      const name = media.schema && '$ref' in media.schema ? media.schema.$ref.split('/').at(-1)! : '';
      assert.ok(name in contracts);
      const example = media.examples?.example;
      assert.ok(example && !('$ref' in example));
      const contract = contracts[name as keyof typeof contracts];
      assert.equal(contract.safeParse(example.value).success, true);
    }
    const authExample = doc.paths['/api/auth/login'].post?.responses['200'];
    assert.ok(authExample && !('$ref' in authExample));
    assert.equal(authResponseSchema.safeParse(authExample.content!['application/json'].example).success, true);
    for (const [path, schema] of [['/api/health', healthSchema], ['/api/ready', readySchema]] as const) {
      const response = doc.paths[path].get!.responses['200']; assert.ok(response && !('$ref' in response));
      assert.equal(schema.safeParse(response.content!['application/json'].example).success, true);
    }
    const serialized = JSON.stringify(doc);
    for (const secret of ['SMTP_PASS', 'DATABASE_URL', 'passwordHash', 'tokenHash']) assert.equal(serialized.includes(secret), false);
    const url = await app.getUrl();
    assert.equal((await fetch(`${url}/api/docs`)).status, 200);
    assert.equal((await fetch(`${url}/api/docs/swagger-ui-bundle.js`)).status, 200);
    assert.deepEqual(await (await fetch(`${url}/api/docs-json`)).json(), JSON.parse(JSON.stringify(doc)));
  } finally { await app.close(); }
});

test('production disables both Swagger UI and JSON unless explicitly enabled', async () => {
  const saved = { NODE_ENV: process.env.NODE_ENV, SWAGGER_ENABLED: process.env.SWAGGER_ENABLED, DATABASE_URL: process.env.DATABASE_URL };
  Object.assign(process.env, { NODE_ENV: 'production', SWAGGER_ENABLED: 'false', DATABASE_URL: 'postgresql://test:test@127.0.0.1/test' });
  try {
    const app = await createApp(); await app.listen(0, '127.0.0.1');
    try { for (const path of ['/api/docs', '/api/docs-json']) assert.equal((await fetch(`${await app.getUrl()}${path}`)).status, 404); }
    finally { await app.close(); }
  } finally { for (const [key, value] of Object.entries(saved)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } }
});

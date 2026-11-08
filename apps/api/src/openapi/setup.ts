import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { schemas } from './metadata';

export function createOpenApiDocument(app: INestApplication) {
  const config = new DocumentBuilder().setTitle('图文社区接口文档').setVersion('0.1.0')
    .setDescription('本地开发接口。先执行登录或注册，浏览器会自动保存 HttpOnly Cookie；随后可直接调试受保护接口。写请求需要可信 Origin。示例不包含真实账号或令牌。')
    .addServer('/', '当前 API 服务')
    .addCookieAuth('lt_session', { type: 'apiKey', in: 'cookie', name: 'lt_session', description: 'HttpOnly 会话由登录接口设置，不能由 Swagger Authorize 手工写入。' }, 'session').build();
  const document = SwaggerModule.createDocument(app, config, { autoTagControllers: false });
  document.components = { ...document.components, schemas: { ...document.components?.schemas, ...schemas } };
  return document;
}
export function setupOpenApi(app: INestApplication) {
  SwaggerModule.setup('api/docs', app, () => createOpenApiDocument(app), {
    jsonDocumentUrl: 'api/docs-json', raw: ['json'],
    customSiteTitle: '图文社区接口文档',
    swaggerOptions: { withCredentials: true, persistAuthorization: false, validatorUrl: null, defaultModelsExpandDepth: 0, displayRequestDuration: true }
  });
}

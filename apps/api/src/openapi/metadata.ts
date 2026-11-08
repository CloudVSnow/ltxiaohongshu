import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiCookieAuth, ApiOperation, ApiResponse, ApiTags, type SchemaObject } from '@nestjs/swagger';
import { authResponseSchema, credentialsSchema, emailSchema, emailTokenSchema, healthSchema, readySchema, resetPasswordSchema } from '@lt/contracts';

type Convertible = { toJSONSchema(options: { target: 'openapi-3.0'; io: 'input' | 'output' }): unknown };
function convert(schema: Convertible, io: 'input' | 'output'): SchemaObject {
  return schema.toJSONSchema({ target: 'openapi-3.0', io }) as SchemaObject;
}
const password: SchemaObject = { type: 'string', format: 'password', minLength: 8, maxLength: 64, writeOnly: true,
  description: '按 Unicode 码点计算 8–64 个字符，保留首尾空格。' };
function withPassword(schema: Convertible): SchemaObject {
  const result = convert(schema, 'input');
  return { ...result, properties: { ...result.properties, password } };
}
export const schemas: Record<string, SchemaObject> = {
  Credentials: withPassword(credentialsSchema),
  Email: convert(emailSchema, 'input'),
  EmailToken: convert(emailTokenSchema, 'input'),
  ResetPassword: withPassword(resetPasswordSchema),
  AuthResponse: convert(authResponseSchema, 'output'),
  HealthResponse: convert(healthSchema, 'output'),
  ReadyResponse: convert(readySchema, 'output'),
  Message: { type: 'object', required: ['message'], properties: { message: { type: 'string' } } },
  Error: { type: 'object', required: ['statusCode', 'message'], properties: {
    statusCode: { type: 'integer' }, message: { type: 'string' }, error: { type: 'string' }
  } }
};
export const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const sampleUser = { user: { id: 'c1a45bd8-264f-4af7-815e-f7ae4024667e', email: 'user@example.com', nickname: '用户示例', isEmailVerified: false } };
const sampleToken = '0'.repeat(64);
const cookieHeader = { 'Set-Cookie': { description: '浏览器自动保存 HttpOnly、SameSite=Lax、Path=/api 的 lt_session Cookie；生产 HTTPS 使用 Secure。令牌不在 JSON 中返回。', schema: { type: 'string' as const } } };
const errors: Record<number, string> = { 400: '输入无效，或链接已使用/过期', 401: '未登录、会话失效或凭据错误', 403: 'Origin 不在可信来源列表', 409: '邮箱已注册', 429: '请求过于频繁，请稍后重试', 503: '邮件服务暂不可用' };
type Operation = { summary: string; description: string; status: number; body?: string; example?: object; response?: string; responseExample?: object; auth?: boolean; cookie?: boolean; errors: number[] };
const operations = {
  register: { summary: '邮箱注册并登录', description: '邮箱去除首尾空格并转为小写后判重。创建未验证账号并设置会话；从「我的」主动申请验证邮件。', status: 201, body: 'Credentials', example: { email: 'user@example.com', password: 'Example-123' }, response: 'AuthResponse', responseExample: sampleUser, cookie: true, errors: [400, 403, 409, 429] },
  login: { summary: '邮箱密码登录', description: '替换当前浏览器的旧会话，其他浏览器会话独立。Swagger 页面执行成功后 Cookie 由浏览器保存，再调用「查询当前账号」即可。', status: 200, body: 'Credentials', example: { email: 'user@example.com', password: 'Example-123' }, response: 'AuthResponse', responseExample: sampleUser, cookie: true, errors: [400, 401, 403, 429] },
  me: { summary: '查询当前账号', description: '仅返回当前会话的本人资料，邮箱不应出现在公开用户接口中。无需在 Authorize 中手填 Cookie；先在此页面登录。', status: 200, response: 'AuthResponse', responseExample: sampleUser, auth: true, errors: [401] },
  logout: { summary: '退出当前会话', description: '撤销当前会话并清除 Cookie；重复退出仍返回 204，不影响其他浏览器会话。', status: 204, cookie: true, errors: [403] },
  requestEmail: { summary: '发送邮箱验证邮件', description: '需要登录。每个账号每类邮件发送间隔至少 60 秒。已验证则无需重发；新链接使旧链接失效。真实 SMTP 环境执行会实际发信。', status: 202, response: 'Message', responseExample: { message: '验证邮件已发送；若已验证则无需重复操作。' }, auth: true, errors: [401, 403, 429, 503] },
  verifyEmail: { summary: '确认邮箱验证', description: '提交邮件中的一次性 token；链接 24 小时有效。GET 打开链接不会消费令牌，需由页面确认。', status: 200, body: 'EmailToken', example: { token: sampleToken }, response: 'Message', responseExample: { message: '邮箱验证成功' }, errors: [400, 403, 429] },
  forgot: { summary: '申请密码重置邮件', description: '链接 30 分钟有效。账号不存在、被禁用、冷却中或发信失败时，均返回相同 202 提示，不能据此判断邮件已送达。真实 SMTP 环境执行可能实际发信。', status: 202, body: 'Email', example: { email: 'user@example.com' }, response: 'Message', responseExample: { message: '如果该邮箱可用，重置邮件将发送至你的邮箱，请稍后查看。' }, errors: [400, 403, 429] },
  reset: { summary: '重置密码', description: '提交一次性重置 token 和新密码。成功后确认邮箱归属、撤销全部旧会话与剩余邮件令牌，并清除当前 Cookie。', status: 200, body: 'ResetPassword', example: { token: sampleToken, password: 'New-example-123' }, response: 'Message', responseExample: { message: '密码已重置，请重新登录' }, cookie: true, errors: [400, 403, 429] }
} satisfies Record<string, Operation>;
export function AuthApi(name: keyof typeof operations) {
  const operation: Operation = operations[name];
  const decorators = [ApiTags('账号与认证'), ApiOperation({ operationId: `auth_${name}`, summary: operation.summary, description: operation.description }),
    ApiResponse({ status: operation.status, description: operation.summary, ...(operation.response ? { content: { 'application/json': { schema: ref(operation.response), example: operation.responseExample } } } : {}), ...(operation.cookie ? { headers: cookieHeader } : {}) }),
    ...operation.errors.map(status => ApiResponse({
      status, description: errors[status], content: {
        'application/json': { schema: ref('Error'), example: { statusCode: status, message: errors[status] } }
      }
    })),
    ApiResponse({ status: 500, description: '服务内部错误；不会返回密码、令牌或数据库连接信息', schema: ref('Error') })];
  if (operation.body) decorators.push(ApiBody({ required: true, schema: ref(operation.body), examples: { example: { summary: '示例数据，请替换为自己的测试数据', value: operation.example } } }));
  if (operation.auth) decorators.push(ApiCookieAuth('session'));
  return applyDecorators(...decorators);
}

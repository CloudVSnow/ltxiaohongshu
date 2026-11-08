# Swagger / OpenAPI 接口文档

## 本地访问

启动项目（见 [README](../README.md)）后打开：

- Swagger UI：[http://127.0.0.1:3000/api/docs](http://127.0.0.1:3000/api/docs)
- OpenAPI JSON：[http://127.0.0.1:3000/api/docs-json](http://127.0.0.1:3000/api/docs-json)

本地 Swagger UI 不需要 Swagger 或 SwaggerHub 账号。页面包含当前全部 10 个接口，按「服务状态」「账号与认证」分组，提供中文说明、请求结构、响应示例、错误码及 Cookie 认证说明。邮件流程细节见 [认证文档](auth.md)。

## 在页面调试登录

1. 展开「邮箱密码登录」接口，点击 **Try it out**。
2. 将请求示例替换为自己的测试邮箱和密码，点击 **Execute**。没有账号时可以先执行注册接口。
3. 登录成功后浏览器自动保存 HttpOnly Cookie，再执行「查询当前账号」即可验证登录。
4. 执行退出接口后，旧会话立即失效。邮箱验证、密码重置接口的 token 必须来自对应邮件，示例中的全零 token 不能用于认证。

不用在 **Authorize** 中手工输入 Cookie；HttpOnly Cookie 由服务端设置，浏览器自动携带。Swagger UI 未开启授权信息持久化。Try it out 会实际调用当前 API，注册、发信、重置等操作会产生对应效果；使用测试账号。

开发环境允许当前配置 API 端口的 `http://127.0.0.1:端口`、`http://localhost:端口` 调试写请求，不根据请求 Host 动态放行来源。现有 H5 来源校验保留，不放行其他域名。

## 开关与生产配置

`apps/api/.env` 可配置 `SWAGGER_ENABLED=true` 或 `false`，修改后重启 API。未设置时，开发环境默认开启，`NODE_ENV=production` 默认关闭；关闭会同时移除 UI 和 JSON 路由。

生产环境显式开启文档时仍需通过 `CORS_ORIGINS` 声明真实可信来源；不会自动放行本地调试来源。该开关不提供访问控制，如需要团队私有文档，应另外在部署入口设置访问权限。

## 导出与 SwaggerHub

在根目录运行：

```powershell
pnpm docs:export
```

生成 `apps/api/dist/openapi.json`，使用与在线文档相同的生成器。该命令只创建应用上下文，不监听端口或执行接口业务，不要求数据库正在运行；仍需有效的 API 环境配置（例如 `DATABASE_URL`）。文件位于忽略的构建目录，可重复生成。

你可以将生成的 JSON 文件导入已注册的 SwaggerHub，进行在线管理和分享。本次接入只提供本地文档与文件导出，不自动向 SwaggerHub 上传，也不需要你的 SwaggerHub API Key。

SwaggerHub 上的接口调试来源与本地 Swagger UI 不同；如果需要云端页面调试，需另外配置可达的测试服务、可信来源及 Cookie 策略，不应直接把当前本机配置当作公开服务。

## 维护与验证

接口通过控制器装饰器登记，认证文档元数据位于 `apps/api/src/openapi/metadata.ts`；请求和账号响应结构从共享 Zod 契约转换为 OpenAPI 3.0，密码的 Unicode 长度规则以补充元数据说明。运行时仍由原有 Zod 校验负责。

新增接口时补齐说明、请求结构、成功响应、错误码和认证标记。测试会比较控制器真实路由与文档路径，校验所有引用和规范有效性，并验证示例能通过现有运行时契约；浏览器测试会实际完成 Swagger UI 登录、Cookie 查询及退出撤销。完整检查命令见 [启动文档](../README.md)。

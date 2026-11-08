# 图文社区

个人开发的多端图文社区。已建立 uni-app H5、NestJS API、Vue 管理后台、共享接口契约、PostgreSQL 迁移和自动化检查，并实现 H5 注册登录、邮箱验证、密码找回及会话管理。个人资料编辑、发布、互动与审核业务后续实现。

需求与后续阶段见 [第一版需求](docs/mvp-requirements.md) 和 [页面与验收流程](docs/mvp-flows.md)。

## 环境

- Node.js 24.x，pnpm 11.25.0。
- PowerShell 7（`pwsh`，用于仓库已有测试，Windows/macOS/Linux 均可安装）。
- PostgreSQL 18；建议 Docker Compose，也可使用本仓库的本地临时服务工具。

## 首次启动

从仓库根目录执行，以下复制命令使用 PowerShell：

```powershell
pnpm install --frozen-lockfile
Copy-Item .env.example .env
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/client/.env.example apps/client/.env
Copy-Item apps/admin/.env.example apps/admin/.env
```

已有 `.env` 时保留原文件，不要重复覆盖。所有示例密码仅用于本机开发。若修改根目录数据库用户名、密码、端口或数据库名，必须同步修改 `apps/api/.env` 的 `DATABASE_URL`。

有 Docker 时启动数据库：

```powershell
docker compose up -d --wait
```

没有 Docker 时，在单独终端运行以下命令并保持终端打开（Linux/macOS 使用普通用户，不能以 root 身份运行；Windows 通过 `pg_ctl` 使用受限令牌启动数据库）。它使用真实 PostgreSQL 二进制，在 `.cache/postgres` 中保存本地数据，使用示例连接信息，仅监听本机。与 Docker 数据库二选一，避免端口冲突。按 Ctrl+C 停止，数据保留用于下次启动。

```powershell
pnpm db:dev
```

接着在仓库根目录的新终端执行：

```powershell
pnpm db:generate
pnpm db:migrate
pnpm dev
```

`pnpm dev` 会先构建共享契约并生成 Prisma 客户端，再同时启动三个应用：

| 应用 | 地址 |
| --- | --- |
| uni-app H5 | http://127.0.0.1:5173 |
| 管理后台 | http://127.0.0.1:5174 |
| 进程健康检查 | http://127.0.0.1:3000/api/health |
| 数据库就绪检查 | http://127.0.0.1:3000/api/ready |
| Swagger 接口文档 | http://127.0.0.1:3000/api/docs |
| OpenAPI JSON | http://127.0.0.1:3000/api/docs-json |

健康检查不依赖数据库。就绪检查会通过 Prisma 查询迁移建立的版本记录，数据库断开或迁移缺失时返回 503，客户端显示可重试提示。应用通过各自开发服务器的 `/api` 代理访问后端，避免把本机 API 地址写死在客户端。

单独启动可以使用 `pnpm dev:api`、`pnpm dev:client`、`pnpm dev:admin`；请先执行 `pnpm --filter @lt/contracts build` 和 `pnpm db:generate`。共享契约修改后需重新构建，并重启对应应用。

接口在线调试、Cookie 登录、生产开关与 SwaggerHub 导入见 [Swagger / OpenAPI 文档](docs/openapi.md)。运行 `pnpm docs:export` 可导出 `apps/api/dist/openapi.json`；本地文档无需账号或 API Key。

## 验证

```powershell
# 静态检查、所有单元与仓库测试、三端构建（无需数据库）
pnpm verify

# 数据库需先启动；重复迁移应安全无变化
pnpm db:migrate
pnpm db:migrate
pnpm test:integration

# 首次安装浏览器；Linux CI 使用 --with-deps
pnpm exec playwright install chromium
# 启动仅用于测试的本地 SMTP 收件箱，不向外部发信
docker compose --profile test-mail up -d mailpit
# 自动启动三个应用，请先停止手动运行的开发服务器
pnpm test:e2e
```

浏览器测试分别验证移动尺寸 H5 和桌面后台：连接真实 API/数据库、服务故障恢复、注册登录、会话，以及邮箱验证和密码重置。浏览器测试 API 会显式使用本地 Mailpit（SMTP 1025，收件箱 http://127.0.0.1:8025），不读取真实 SMTP 凭据发信。集成与浏览器测试创建随机邮箱账号，结束时只清理本次创建的记录，不清空数据库；建议在独立开发或测试数据库运行。CI 使用独立 PostgreSQL 和 Mailpit 服务，运行相同检查。CI 结果需推送后查看。

## 仓库结构

```text
apps/client        uni-app H5（后续适配小程序及 App）
apps/api           NestJS、Prisma schema 和版本化迁移
apps/admin         Vue 3、Element Plus 管理后台
packages/contracts 共享响应类型、运行时校验与连接流程
scripts            本地开发辅助工具
tests              仓库规则与端到端测试
docs               需求与页面流程
```

目前只包含 H5 依赖，不声明小程序或 App 已适配。对应阶段再增加平台依赖、账号与打包配置。

## 数据与部署约定

- 新增数据库变更：`pnpm --filter @lt/api db:migrate:dev --name 变更名称`，审查并提交迁移；已有环境使用 `pnpm db:migrate`。生成的 Prisma 客户端忽略，不提交。
- Compose 仅提供本地数据库，不是生产部署配置。`docker compose down` 停止服务并保留卷；不要用删除卷命令处理需要保留的数据。
- `pnpm build` 生成 H5 `apps/client/dist/build/h5`、后台 `apps/admin/dist` 和 API `apps/api/dist`。API 从 `apps/api` 目录执行 `pnpm start`，使用该目录的环境文件或进程环境变量。
- 生产环境应配置 HTTPS、受控数据库和备份，并将静态站点的 `/api` 转发到 API；修改 `VITE_API_BASE_URL` 后需重新构建。`VITE_*` 会被打包公开，不能存储凭据。管理后台目前只是公开的连接检查页面，尚未提供管理员认证或敏感接口。
- 前端从发现页点击「我的」进入登录注册；数据库包含基础版本、用户与会话表。认证接口和配置见 [注册登录说明](docs/auth.md)。

uni-app 依赖参考 [DCloud 官方 CLI 模板](https://uniapp.dcloud.io/quickstart-cli)，Vue、Vite 和 DCloud 类型包按其声明的版本固定，升级时需要一起验证；Prisma 固定 7.10.1，避免当前 latest 指向的 8.x 预发布版本。[Prisma 配置说明](https://docs.prisma.io/docs/orm/reference/prisma-config-reference)

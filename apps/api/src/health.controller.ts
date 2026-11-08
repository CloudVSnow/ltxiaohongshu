import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import type { HealthResponse, ReadyResponse } from '@lt/contracts';
import { DatabaseService } from './database.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ref } from './openapi/metadata';

@Controller()
@ApiTags('服务状态')
export class HealthController {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}
  @Get('health')
  @ApiOperation({ operationId: 'health', summary: '进程健康检查', description: '不依赖数据库，仅用于检查 API 进程是否正常运行。' })
  @ApiResponse({ status: 200, description: '进程正常', schema: ref('HealthResponse'), example: { status: 'ok', service: 'api' } })
  health(): HealthResponse { return { status: 'ok', service: 'api' }; }
  @Get('ready')
  @ApiOperation({ operationId: 'ready', summary: '数据库就绪检查', description: '查询数据库中的基础迁移版本；不可用时返回 503。' })
  @ApiResponse({ status: 200, description: '数据库就绪', schema: ref('ReadyResponse'), example: { status: 'ok', database: 'ok' } })
  @ApiResponse({ status: 503, description: '数据库尚未就绪', schema: ref('Error'), example: { statusCode: 503, message: 'Database is not ready', error: 'Service Unavailable' } })
  async ready(): Promise<ReadyResponse> {
    try {
      if (await this.database.isReady()) return { status: 'ok', database: 'ok' };
    } catch { /* Readiness errors must not expose connection credentials or stack traces. */ }
    throw new ServiceUnavailableException('Database is not ready');
  }
}

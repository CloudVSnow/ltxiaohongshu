import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import type { HealthResponse, ReadyResponse } from '@lt/contracts';
import { DatabaseService } from './database.service';

@Controller()
export class HealthController {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}
  @Get('health')
  health(): HealthResponse { return { status: 'ok', service: 'api' }; }
  @Get('ready')
  async ready(): Promise<ReadyResponse> {
    try {
      if (await this.database.isReady()) return { status: 'ok', database: 'ok' };
    } catch { /* Readiness errors must not expose connection credentials or stack traces. */ }
    throw new ServiceUnavailableException('Database is not ready');
  }
}

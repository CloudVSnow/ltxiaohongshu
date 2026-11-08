import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client';
import { readConfig } from './config';

@Injectable()
export class DatabaseService extends PrismaClient implements OnModuleDestroy {
  constructor() {
    const adapter = new PrismaPg({ connectionString: readConfig().databaseUrl, connectionTimeoutMillis: 2000, query_timeout: 2000 });
    super({ adapter });
  }
  async isReady(): Promise<boolean> {
    const version = await this.appMetadata.findUnique({ where: { key: 'schema_version' } });
    return version?.value === '1';
  }
  async onModuleDestroy() { await this.$disconnect(); }
}

import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  // Generation/validation do not require a running database. Runtime validates the real URL.
  datasource: { url: process.env.DATABASE_URL ?? 'postgresql://lt:local_dev_only@127.0.0.1:5432/ltcommunity' }
});

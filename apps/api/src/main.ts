import 'dotenv/config';
import { createApp } from './app';
import { readConfig } from './config';

async function bootstrap() {
  const config = readConfig();
  const app = await createApp();
  await app.listen(config.port, config.host);
}
bootstrap().catch(() => {
  console.error('API startup failed. Check environment configuration and port availability.');
  process.exitCode = 1;
});

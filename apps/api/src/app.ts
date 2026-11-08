import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { readConfig } from './config';
import type { Request, Response, NextFunction } from 'express';

export async function createApp() {
  const config = readConfig();
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.use('/api/auth', (_request: Request, response: Response, next: NextFunction) => { response.setHeader('Cache-Control', 'no-store'); next(); });
  app.enableCors({ origin: config.origins, credentials: true });
  app.enableShutdownHooks();
  return app;
}

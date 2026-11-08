import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { DatabaseService } from './database.service';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { AuthGuard } from './auth/auth.guard';
import { AuthWriteGuard } from './auth/auth-write.guard';

@Module({ controllers: [HealthController, AuthController], providers: [DatabaseService, AuthService, AuthGuard, AuthWriteGuard] })
export class AppModule {}

import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { DatabaseService } from './database.service';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { AuthGuard } from './auth/auth.guard';
import { AuthWriteGuard } from './auth/auth-write.guard';
import { EmailService } from './auth/email.service';
import { MailService } from './mail/mail.service';

@Module({ controllers: [HealthController, AuthController], providers: [DatabaseService, AuthService, AuthGuard, AuthWriteGuard, EmailService, MailService] })
export class AppModule {}

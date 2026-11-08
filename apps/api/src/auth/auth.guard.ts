import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import type { Account } from '@lt/contracts';
import { AuthService } from './auth.service';
import { readSessionCookie } from './session';

export type AuthRequest = Request & { account: Account };
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    request.account = await this.auth.currentUser(readSessionCookie(request.headers.cookie));
    return true;
  }
}

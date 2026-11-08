import { CanActivate, ExecutionContext, ForbiddenException, HttpException, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { readConfig } from '../config';

// Single-process MVP limiter. The server does not trust forwarded IP headers.
@Injectable()
export class AuthWriteGuard implements CanActivate {
  private readonly attempts = new Map<string, { count: number; expires: number }>();
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    if (!readConfig().origins.includes(request.headers.origin ?? '')) throw new ForbiddenException('请求来源不受信任');
    if (request.path.endsWith('/logout')) return true;
    const now = Date.now();
    for (const [key, entry] of this.attempts) if (entry.expires <= now) this.attempts.delete(key);
    const key = request.socket.remoteAddress ?? 'unknown';
    const entry = this.attempts.get(key) ?? { count: 0, expires: now + 15 * 60 * 1000 };
    if (entry.count >= 10 || (!this.attempts.has(key) && this.attempts.size >= 10000)) throw new HttpException('操作过于频繁，请稍后再试', 429);
    entry.count++;
    this.attempts.set(key, entry);
    return true;
  }
}

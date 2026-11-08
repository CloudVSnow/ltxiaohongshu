import { BadRequestException, Body, Controller, Get, Header, HttpCode, Inject, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { credentialsSchema } from '@lt/contracts';
import { AuthService } from './auth.service';
import { AuthGuard, type AuthRequest } from './auth.guard';
import { AuthWriteGuard } from './auth-write.guard';
import { readSessionCookie, SESSION_COOKIE, SESSION_DURATION, sessionCookieOptions } from './session';

function credentials(body: unknown) {
  const result = credentialsSchema.safeParse(body);
  if (!result.success) throw new BadRequestException('请输入有效邮箱和 8–64 个字符的密码');
  return result.data;
}
@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}
  @Post('register') @UseGuards(AuthWriteGuard) @Header('Cache-Control', 'no-store')
  async register(@Body() body: unknown, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.register(credentials(body), readSessionCookie(request.headers.cookie));
    response.cookie(SESSION_COOKIE, result.token, { ...sessionCookieOptions(), maxAge: SESSION_DURATION });
    return { user: result.user };
  }
  @Post('login') @HttpCode(200) @UseGuards(AuthWriteGuard) @Header('Cache-Control', 'no-store')
  async login(@Body() body: unknown, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.login(credentials(body), readSessionCookie(request.headers.cookie));
    response.cookie(SESSION_COOKIE, result.token, { ...sessionCookieOptions(), maxAge: SESSION_DURATION });
    return { user: result.user };
  }
  @Get('me') @UseGuards(AuthGuard) @Header('Cache-Control', 'no-store')
  me(@Req() request: AuthRequest) { return { user: request.account }; }
  @Post('logout') @HttpCode(204) @UseGuards(AuthWriteGuard) @Header('Cache-Control', 'no-store')
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    await this.auth.logout(readSessionCookie(request.headers.cookie));
    response.clearCookie(SESSION_COOKIE, sessionCookieOptions());
  }
}

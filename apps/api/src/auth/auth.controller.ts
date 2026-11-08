import { BadRequestException, Body, Controller, Get, Header, HttpCode, Inject, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { credentialsSchema, emailSchema, emailTokenSchema, resetPasswordSchema } from '@lt/contracts';
import { EmailService } from './email.service';
import { AuthService } from './auth.service';
import { AuthGuard, type AuthRequest } from './auth.guard';
import { AuthWriteGuard } from './auth-write.guard';
import { readSessionCookie, SESSION_COOKIE, SESSION_DURATION, sessionCookieOptions } from './session';
import { AuthApi } from '../openapi/metadata';

function credentials(body: unknown) {
  const result = credentialsSchema.safeParse(body);
  if (!result.success) throw new BadRequestException('请输入有效邮箱和 8–64 个字符的密码');
  return result.data;
}
@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService, @Inject(EmailService) private readonly email: EmailService) {}
  @Post('email/request') @HttpCode(202) @UseGuards(AuthWriteGuard, AuthGuard)
  @AuthApi('requestEmail')
  async requestEmail(@Req() request: AuthRequest) {
    await this.email.request(request.account.id, 'verify');
    return { message: '验证邮件已发送；若已验证则无需重复操作。' };
  }
  @Post('email/verify') @HttpCode(200) @UseGuards(AuthWriteGuard)
  @AuthApi('verifyEmail')
  verifyEmail(@Body() body: unknown) {
    const parsed = emailTokenSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException('链接无效或已过期，请重新发送');
    return this.email.consume(parsed.data.token, 'verify');
  }
  @Post('password/forgot') @HttpCode(202) @UseGuards(AuthWriteGuard)
  @AuthApi('forgot')
  forgot(@Body() body: unknown) {
    const parsed = emailSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException('请输入有效邮箱');
    return this.email.forgot(parsed.data.email);
  }
  @Post('password/reset') @HttpCode(200) @UseGuards(AuthWriteGuard)
  @AuthApi('reset')
  async reset(@Body() body: unknown, @Res({ passthrough: true }) response: Response) {
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException('请输入有效链接和 8–64 个字符的密码');
    const result = await this.email.consume(parsed.data.token, 'reset', parsed.data.password);
    response.clearCookie(SESSION_COOKIE, sessionCookieOptions());
    return result;
  }
  @Post('register') @UseGuards(AuthWriteGuard) @Header('Cache-Control', 'no-store')
  @AuthApi('register')
  async register(@Body() body: unknown, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.register(credentials(body), readSessionCookie(request.headers.cookie));
    response.cookie(SESSION_COOKIE, result.token, { ...sessionCookieOptions(), maxAge: SESSION_DURATION });
    return { user: result.user };
  }
  @Post('login') @HttpCode(200) @UseGuards(AuthWriteGuard) @Header('Cache-Control', 'no-store')
  @AuthApi('login')
  async login(@Body() body: unknown, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.login(credentials(body), readSessionCookie(request.headers.cookie));
    response.cookie(SESSION_COOKIE, result.token, { ...sessionCookieOptions(), maxAge: SESSION_DURATION });
    return { user: result.user };
  }
  @Get('me') @UseGuards(AuthGuard) @Header('Cache-Control', 'no-store')
  @AuthApi('me')
  me(@Req() request: AuthRequest) { return { user: request.account }; }
  @Post('logout') @HttpCode(204) @UseGuards(AuthWriteGuard) @Header('Cache-Control', 'no-store')
  @AuthApi('logout')
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    await this.auth.logout(readSessionCookie(request.headers.cookie));
    response.clearCookie(SESSION_COOKIE, sessionCookieOptions());
  }
}

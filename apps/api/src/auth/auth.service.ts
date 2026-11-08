import { ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import type { Account, Credentials } from '@lt/contracts';
import { DatabaseService } from '../database.service';
import { hashPassword, verifyPassword } from './password';
import { SESSION_DURATION, tokenHash } from './session';

const account = (user: { id: string; email: string; nickname: string; emailVerifiedAt: Date | null }): Account => ({ id: user.id, email: user.email, nickname: user.nickname, isEmailVerified: !!user.emailVerifiedAt });
@Injectable()
export class AuthService {
  private readonly dummyHash = hashPassword(randomBytes(32).toString('hex'));
  constructor(@Inject(DatabaseService) private readonly db: DatabaseService) {}

  async register(credentials: Credentials, previousToken?: string) {
    const passwordHash = await hashPassword(credentials.password);
    const token = randomBytes(32).toString('hex');
    try {
      const user = await this.db.$transaction(async tx => {
        const created = await tx.user.create({ data: {
          email: credentials.email, passwordHash, nickname: `用户${randomBytes(4).toString('hex')}`,
          sessions: { create: { tokenHash: tokenHash(token), expiresAt: new Date(Date.now() + SESSION_DURATION) } }
        } });
        if (previousToken) await tx.session.deleteMany({ where: { tokenHash: tokenHash(previousToken) } });
        return created;
      });
      return { user: account(user), token };
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') throw new ConflictException('该邮箱已注册');
      throw error;
    }
  }
  async login(credentials: Credentials, previousToken?: string) {
    const user = await this.db.user.findUnique({ where: { email: credentials.email } });
    const valid = await verifyPassword(credentials.password, user?.passwordHash ?? await this.dummyHash);
    if (!valid || !user || user.disabledAt) throw new UnauthorizedException('邮箱或密码错误，或账号不可用');
    const token = randomBytes(32).toString('hex');
    await this.db.$transaction(async tx => {
      // Recheck disabled state under a row lock before issuing a session.
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${user.id}::uuid FOR UPDATE`;
      const current = await tx.user.findUnique({ where: { id: user.id } });
      if (!current || current.disabledAt || current.passwordHash !== user.passwordHash) throw new UnauthorizedException('账号不可用，请重新登录');
      await tx.session.deleteMany({ where: { OR: [
        { userId: user.id, expiresAt: { lte: new Date() } },
        ...(previousToken ? [{ tokenHash: tokenHash(previousToken) }] : [])
      ] } });
      await tx.session.create({ data: { userId: user.id, tokenHash: tokenHash(token), expiresAt: new Date(Date.now() + SESSION_DURATION) } });
    });
    return { user: account(user), token };
  }
  async currentUser(token?: string) {
    if (!token) throw new UnauthorizedException('请先登录');
    const session = await this.db.session.findUnique({ where: { tokenHash: tokenHash(token) }, include: { user: true } });
    if (!session || session.expiresAt <= new Date() || session.user.disabledAt) throw new UnauthorizedException('登录已失效，请重新登录');
    return account(session.user);
  }
  async logout(token?: string) {
    if (token) await this.db.session.deleteMany({ where: { tokenHash: tokenHash(token) } });
  }
}

import { BadRequestException, HttpException, Inject, Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { DatabaseService } from '../database.service';
import { MailService, mailConfig } from '../mail/mail.service';
import { tokenHash } from './session';
import { hashPassword } from './password';

@Injectable()
export class EmailService {
  constructor(@Inject(DatabaseService) private readonly db: DatabaseService, @Inject(MailService) private readonly mail: MailService) {}
  async request(userId: string, purpose: 'verify' | 'reset') {
    const token = randomBytes(32).toString('hex');
    const issued = await this.db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user || user.disabledAt || (purpose === 'verify' && user.emailVerifiedAt)) return null;
      const recent = await tx.emailToken.findFirst({ where: { userId, purpose, createdAt: { gt: new Date(Date.now() - 60000) } } });
      if (recent) throw new HttpException('请等待一分钟后再发送', 429);
      await tx.emailToken.updateMany({ where: { userId, purpose, usedAt: null }, data: { usedAt: new Date() } });
      const record = await tx.emailToken.create({ data: { userId, purpose, tokenHash: tokenHash(token), expiresAt: new Date(Date.now() + (purpose === 'verify' ? 24 * 60 : 30) * 60000) } });
      return { record, email: user.email };
    });
    if (!issued) return;
    try {
      const link = `${mailConfig().web}/#/pages/email/index?mode=${purpose}&token=${token}`;
      await this.mail.send(issued.email, purpose === 'verify' ? '图文社区：验证邮箱' : '图文社区：重置密码',
        `${purpose === 'verify' ? '请打开链接并确认验证邮箱，24 小时内有效。' : '请打开链接设置新密码，30 分钟内有效。'}\n\n${link}\n\n链接仅可使用一次。若非本人操作，请忽略此邮件。`);
    } catch (error) {
      await this.db.emailToken.deleteMany({ where: { id: issued.record.id } });
      throw error;
    }
  }
  async forgot(email: string) {
    const user = await this.db.user.findUnique({ where: { email } });
    if (user && !user.disabledAt) {
      try { await this.request(user.id, 'reset'); }
      catch { /* Always return the same result; never expose account existence or SMTP errors. */ }
    }
    return { message: '如果该邮箱可用，重置邮件将发送至你的邮箱，请稍后查看。' };
  }
  async consume(token: string, purpose: 'verify' | 'reset', password?: string) {
    if (purpose === 'reset' && password === undefined) throw new BadRequestException('请输入新密码');
    const passwordHash = password === undefined ? undefined : await hashPassword(password);
    return this.db.$transaction(async tx => {
      const found = await tx.emailToken.findUnique({ where: { tokenHash: tokenHash(token) } });
      if (!found) throw new BadRequestException('链接无效或已过期，请重新发送');
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${found.userId}::uuid FOR UPDATE`;
      const user = await tx.user.findUnique({ where: { id: found.userId } });
      const valid = await tx.emailToken.findFirst({ where: { id: found.id, purpose, usedAt: null, expiresAt: { gt: new Date() } } });
      if (!valid || !user || user.disabledAt) throw new BadRequestException('链接无效或已过期，请重新发送');
      await tx.emailToken.update({ where: { id: valid.id }, data: { usedAt: new Date() } });
      await tx.user.update({ where: { id: user.id }, data: { emailVerifiedAt: user.emailVerifiedAt ?? new Date(), ...(passwordHash ? { passwordHash } : {}) } });
      if (purpose === 'reset') {
        await tx.session.deleteMany({ where: { userId: user.id } });
        await tx.emailToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } });
      }
      return { message: purpose === 'verify' ? '邮箱验证成功' : '密码已重置，请重新登录' };
    });
  }
}

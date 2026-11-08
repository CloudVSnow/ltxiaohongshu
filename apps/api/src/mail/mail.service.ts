import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import nodemailer from 'nodemailer';

export function mailConfig(env: NodeJS.ProcessEnv = process.env) {
  const port = Number(env.SMTP_PORT ?? 465);
  const secure = env.SMTP_SECURE ?? 'true';
  if (!env.SMTP_HOST || !env.MAIL_FROM || !Number.isInteger(port) || port < 1 || port > 65535 || !['true', 'false'].includes(secure)) throw new Error('Invalid mail configuration');
  const local = ['localhost', '127.0.0.1', '::1'].includes(env.SMTP_HOST);
  if (!local && (!env.SMTP_USER || !env.SMTP_PASS)) throw new Error('SMTP credentials required');
  const web = new URL(env.PUBLIC_WEB_URL ?? 'http://127.0.0.1:5173');
  if (!['http:', 'https:'].includes(web.protocol) || web.username || web.password || web.search || web.hash || (env.NODE_ENV === 'production' && web.protocol !== 'https:')) throw new Error('Invalid PUBLIC_WEB_URL');
  return { host: env.SMTP_HOST, port, secure: secure === 'true', requireTLS: !local && secure === 'false',
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
    from: env.MAIL_FROM, web: web.href.replace(/\/$/, '') };
}
@Injectable()
export class MailService {
  async send(to: string, subject: string, text: string) {
    try {
      const config = mailConfig();
      const transport = nodemailer.createTransport(config);
      try {
        const result = await transport.sendMail({ from: config.from, to, subject, text });
        if (!result.accepted?.length) throw new Error('Mail not accepted');
      } finally { transport.close(); }
    } catch { throw new ServiceUnavailableException('邮件发送失败，请稍后重试'); }
  }
}

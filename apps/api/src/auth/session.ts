import { createHash } from 'node:crypto';
export const SESSION_COOKIE = 'lt_session';
export const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000;
export const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');
export function readSessionCookie(header?: string) {
  const values = (header ?? '').split(';').map(value => value.trim()).filter(value => value.startsWith(`${SESSION_COOKIE}=`));
  if (values.length !== 1) return undefined;
  const token = values[0].slice(SESSION_COOKIE.length + 1);
  return /^[a-f0-9]{64}$/.test(token) ? token : undefined;
}
export const sessionCookieOptions = () => ({ httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', path: '/api' });

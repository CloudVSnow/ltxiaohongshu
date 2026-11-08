import { z } from 'zod';

export const healthSchema = z.object({ status: z.literal('ok'), service: z.literal('api') });
export const readySchema = z.object({ status: z.literal('ok'), database: z.literal('ok') });
export type HealthResponse = z.infer<typeof healthSchema>;
export type ReadyResponse = z.infer<typeof readySchema>;
export type JsonTransport = (path: string) => Promise<unknown>;

export const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().max(254).email(),
  password: z.string().refine(value => [...value].length >= 8 && [...value].length <= 64, '密码须为 8–64 个字符')
}).strict();
export type Credentials = z.infer<typeof credentialsSchema>;
export const accountSchema = z.object({ id: z.string().uuid(), email: z.string().email(), nickname: z.string(), isEmailVerified: z.boolean() });
export const emailSchema = z.object({ email: credentialsSchema.shape.email }).strict();
export const emailTokenSchema = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/) }).strict();
export const resetPasswordSchema = emailTokenSchema.extend({ password: credentialsSchema.shape.password });
export const authResponseSchema = z.object({ user: accountSchema });
export type Account = z.infer<typeof accountSchema>;

// Each client supplies its platform's HTTP transport; response validation is shared.
export async function checkConnection(transport: JsonTransport): Promise<void> {
  healthSchema.parse(await transport('/health'));
  readySchema.parse(await transport('/ready'));
}

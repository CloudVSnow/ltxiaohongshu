import { z } from 'zod';

export const healthSchema = z.object({ status: z.literal('ok'), service: z.literal('api') });
export const readySchema = z.object({ status: z.literal('ok'), database: z.literal('ok') });
export type HealthResponse = z.infer<typeof healthSchema>;
export type ReadyResponse = z.infer<typeof readySchema>;
export type JsonTransport = (path: string) => Promise<unknown>;

// Each client supplies its platform's HTTP transport; response validation is shared.
export async function checkConnection(transport: JsonTransport): Promise<void> {
  healthSchema.parse(await transport('/health'));
  readySchema.parse(await transport('/ready'));
}

export function readConfig(env: NodeJS.ProcessEnv = process.env) {
  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required');
  const parsed = new URL(databaseUrl);
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) throw new Error('DATABASE_URL must use PostgreSQL');
  const port = Number(env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be 1-65535');
  const origins = (env.CORS_ORIGINS ?? 'http://localhost:5173,http://localhost:5174').split(',').map(x => x.trim()).filter(Boolean);
  if (!origins.length || origins.some(origin => new URL(origin).origin !== origin || !/^https?:/.test(origin))) {
    throw new Error('CORS_ORIGINS must list exact HTTP origins');
  }
  const swaggerSetting = env.SWAGGER_ENABLED ?? (env.NODE_ENV === 'production' ? 'false' : 'true');
  if (!['true', 'false'].includes(swaggerSetting)) throw new Error('SWAGGER_ENABLED must be true or false');
  const swaggerEnabled = swaggerSetting === 'true';
  // Only local development Swagger gets implicit write access; production uses the explicit allowlist.
  const swaggerOrigins = swaggerEnabled && env.NODE_ENV !== 'production' ? [`http://127.0.0.1:${port}`, `http://localhost:${port}`] : [];
  return { databaseUrl, port, host: env.HOST ?? '127.0.0.1', origins, swaggerEnabled, authOrigins: [...new Set([...origins, ...swaggerOrigins])] };
}

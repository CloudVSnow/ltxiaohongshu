import 'dotenv/config';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createApp } from '../app';
import { createOpenApiDocument } from './setup';

async function exportDocument() {
  const app = await createApp();
  try {
    const document = createOpenApiDocument(app);
    const output = resolve('dist/openapi.json');
    await mkdir(resolve('dist'), { recursive: true });
    await writeFile(output, JSON.stringify(document, null, 2) + '\n', 'utf8');
    console.log('OpenAPI exported to apps/api/dist/openapi.json');
  } finally { await app.close(); }
}
exportDocument().catch(() => { console.error('OpenAPI export failed. Check application configuration.'); process.exitCode = 1; });

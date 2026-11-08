import EmbeddedPostgres from 'embedded-postgres';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';

function execute(file, args) {
  return new Promise((resolve, reject) => {
    // Ignore stdio: detached Windows server descendants can keep pipe handles open.
    const child = spawn(file, args, { stdio: 'ignore', windowsHide: true });
    child.once('error', reject);
    child.once('exit', code => code === 0 ? resolve() : reject(new Error(`Database control exited with code ${code}`)));
  });
}
let windowsControl;
if (process.platform === 'win32') {
  const require = createRequire(import.meta.resolve('embedded-postgres'));
  windowsControl = (await import(pathToFileURL(require.resolve('@embedded-postgres/windows-x64')).href)).pg_ctl;
}

// Optional local development fallback when Docker is unavailable. Loopback only.
const database = new EmbeddedPostgres({
  databaseDir: resolve('.cache/postgres'), user: 'lt', password: 'local_dev_only',
  port: 5432, persistent: true, postgresFlags: ['-h', '127.0.0.1']
});
if (!existsSync(resolve('.cache/postgres/PG_VERSION'))) await database.initialise();
// pg_ctl starts Windows PostgreSQL with a restricted token, including from an admin terminal.
if (windowsControl) {
  await execute(windowsControl, ['start', '-D', resolve('.cache/postgres'), '-l', resolve('.cache/postgres/server.log'), '-o', '-h 127.0.0.1 -p 5432', '-w', '-t', '15']);
} else {
  await database.start();
}
const client = database.getPgClient('postgres', '127.0.0.1');
try {
  await client.connect();
  const result = await client.query("SELECT 1 FROM pg_database WHERE datname = 'ltcommunity'");
  if (!result.rowCount) await client.query('CREATE DATABASE ltcommunity');
} finally { await client.end(); }

let stopping = false;
const keepAlive = setInterval(() => {}, 60000);
async function stop() {
  if (stopping) return;
  stopping = true;
  if (windowsControl) await execute(windowsControl, ['stop', '-D', resolve('.cache/postgres'), '-m', 'fast', '-w', '-t', '15']);
  else await database.stop();
  clearInterval(keepAlive);
}
process.on('SIGINT', () => { void stop(); });
process.on('SIGTERM', () => { void stop(); });
console.log('Local PostgreSQL ready at 127.0.0.1:5432. Keep this terminal open; Ctrl+C stops it.');

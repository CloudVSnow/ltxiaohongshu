import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  use: { browserName: 'chromium', trace: 'retain-on-failure' },
  webServer: [
    { command: 'pnpm dev:api', url: 'http://127.0.0.1:3000/api/ready', reuseExistingServer: false, timeout: 60000,
      env: { SMTP_HOST: '127.0.0.1', SMTP_PORT: '1025', SMTP_SECURE: 'false', SMTP_USER: '', SMTP_PASS: '', MAIL_FROM: 'test@example.com', PUBLIC_WEB_URL: 'http://127.0.0.1:5173' } },
    { command: 'pnpm dev:client', url: 'http://127.0.0.1:5173', reuseExistingServer: false, timeout: 60000 },
    { command: 'pnpm dev:admin', url: 'http://127.0.0.1:5174', reuseExistingServer: false, timeout: 60000 }
  ]
});

import { defineConfig, devices } from '@playwright/test';

const frontendUrl = process.env.E2E_BASE_URL || 'http://127.0.0.1:4173';
const apiUrl = process.env.E2E_API_BASE_URL || 'http://127.0.0.1:3000/api';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  reporter: process.env.CI
    ? [['line'], ['html', { open: 'never' }]]
    : 'list',
  outputDir: 'test-results',
  use: {
    baseURL: frontendUrl,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4173',
    url: frontendUrl,
    reuseExistingServer: !process.env.CI,
    env: {
      ...process.env,
      VITE_API_BASE_URL: apiUrl,
      VITE_KHQR_ENABLED: 'false',
      VITE_SHOW_DEMO_CREDENTIALS: 'false',
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});

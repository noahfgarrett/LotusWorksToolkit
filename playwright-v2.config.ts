import { defineConfig, devices } from '@playwright/test'

const PORT = 5180

export default defineConfig({
  testDir: './e2e/pdf-annotate-v2',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 3,
  timeout: 30_000,
  reporter: [['html', { outputFolder: 'playwright-report-v2' }]],
  expect: { timeout: 10_000 },
  use: {
    baseURL: `http://localhost:${PORT}`,
    screenshot: 'only-on-failure',
    video: 'off',
    trace: 'retain-on-failure',
    headless: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `npx vite --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
  },
  globalSetup: './e2e/pdf-annotate-v2/global-setup.ts',
  globalTeardown: './e2e/pdf-annotate-v2/global-teardown.ts',
})

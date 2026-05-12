import { defineConfig } from '@playwright/test';

/**
 * Playwright config — Phase 20 Plan 20-08.
 *
 * Tests assert live `https://medikah.health` DOM matches the canonical token
 * file (`lib/design-tokens.ts`) per the D-02 source-of-truth ladder. There
 * is no local dev server — `baseURL` points directly at production. Hector
 * does not run frontend locally (per user constraint).
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'https://medikah.health',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});

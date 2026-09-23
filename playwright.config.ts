import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 20000,
  retries: 0,
  workers: 1, // Electron 앱 테스트는 단일 워커로 안정적 실행
  reporter: [
    ['list'],
    ['json', { outputFile: 'tests/playwright-results.json' }],
    ['html', { outputFolder: 'tests/playwright-report', open: 'never' }]
  ],
  use: {
    trace: 'on-first-retry',
    screenshot: 'on',
  },
});

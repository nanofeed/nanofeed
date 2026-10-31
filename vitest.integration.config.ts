import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: {
    include: ['tests/integration/**/*.test.ts'],
    fileParallelism: false,
    hookTimeout: 30_000,
    testTimeout: 30_000,
    env: {
      BETTER_AUTH_URL: 'http://localhost:3100',
      ROOTCAP_SECRET: 'synthetic-rootcap-secret-at-least-32-characters',
      BETTER_AUTH_SECRET: 'synthetic-test-secret-only-at-least-32-characters',
      GITHUB_CLIENT_ID: 'synthetic-client',
      GITHUB_CLIENT_SECRET: 'synthetic-secret',
      OWNER_GITHUB_ID: '900001',
      CRON_SECRET: 'synthetic-cron-secret',
    },
  },
})

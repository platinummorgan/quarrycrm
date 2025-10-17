/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    // Use node by default for the test environment. Component tests that
    // need jsdom can opt-in using environmentOptions for specific files.
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.ts', './__tests__/setup.ts'],
    globalSetup: ['./tests/global-setup.ts'],
    // Limit concurrency for DB-heavy tests
    poolOptions: {
      // Keep a single worker so DB-reset based suites don't step on each other.
      threads: {
        maxThreads: 1,
        minThreads: 1,
      },
      forks: {
        maxForks: 1,
        minForks: 1,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})

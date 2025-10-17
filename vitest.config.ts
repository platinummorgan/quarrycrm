/// <reference types="vitest" />
import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./__tests__/setup.ts'],
    // Limit concurrency for DB-heavy tests
    poolOptions: {
      threads: {
        maxThreads: 2,
        minThreads: 1,
      },
      forks: {
        maxForks: 2,
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

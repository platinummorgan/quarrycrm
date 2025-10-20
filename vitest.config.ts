import { defineConfig } from 'vitest/config'
import path from 'path'

process.env.SKIP_DOCKER ||= '1'

export default defineConfig({
  test: {
    environment: 'node',
    environmentMatchGlobs: [
      ['**/*.{test,spec}.tsx', 'jsdom'],
      ['**/*.{test,spec}.jsx', 'jsdom'],
    ],
    globals: true,
    setupFiles: ['tests/setup.ts', '__tests__/setup.ts'],
    globalSetup: 'tests/global-setup.ts',
    include: [
      'src/**/*.{test,spec}.{ts,tsx,js,jsx}',
      'tests/**/*.{test,spec}.{ts,tsx,js,jsx}',
      '__tests__/**/*.{test,spec}.{ts,tsx,js,jsx}',
    ],
    // exclude these from BOTH running and watch mode
    exclude: [
      'node_modules',
      '.next',
      'dist',
      '**/fixtures/**',
      '**/e2e/**',
      '**/setup.ts', // Exclude setup files from being run as tests
      '**/setup.js',
      '**/global-setup.ts',
      '**/global-setup.js',
    ],
    poolOptions: {
      threads: { maxThreads: 1, minThreads: 1 },
      forks: { maxForks: 1, minForks: 1 },
    },
    restoreMocks: true,
    clearMocks: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
})

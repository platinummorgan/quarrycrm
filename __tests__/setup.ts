import '@testing-library/jest-dom/vitest'

// Load .env.test as early as possible so TEST_DATABASE_URL/DATABASE_URL are
// available to any module that imports at collection time.
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const dotenv = require('dotenv')
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const path = require('path')
  const envPath = path.resolve(process.cwd(), '.env.test')
  try {
    dotenv.config({ path: envPath, override: true })
  } catch (e) {
    const parsed = dotenv.parse(require('fs').readFileSync(envPath))
    for (const k of Object.keys(parsed)) {
      process.env[k] = parsed[k]
    }
  }
} catch (e) {
  // ignore silently if dotenv isn't installed in the environment
}

// Fallback loader: if dotenv isn't installed, parse .env.test manually so
// TEST_DATABASE_URL/DATABASE_URL are still available to worker processes.
const loadEnvTestFallback = () => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs')
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const path = require('path')
    const envPath = path.resolve(process.cwd(), '.env.test')
    if (!fs.existsSync(envPath)) return
    const content = fs.readFileSync(envPath, 'utf8')
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      let key = trimmed.slice(0, eq).trim()
      let val = trimmed.slice(eq + 1).trim()
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1)
      }
      // Force override so worker processes always prefer .env.test values
      process.env[key] = val
    }
  } catch (e) {
    // ignore
  }
}

loadEnvTestFallback()

// Debug logs to help verify what DB URL each worker sees
// eslint-disable-next-line no-console
console.log('__tests__/setup.ts: DATABASE_URL=', process.env.DATABASE_URL)
// eslint-disable-next-line no-console
console.log(
  '__tests__/setup.ts: TEST_DATABASE_URL=',
  process.env.TEST_DATABASE_URL
)

// Ensure critical environment variables are set as soon as this module is imported.
// Some modules read these at import/collection time, so setting them inside
// a beforeAll() is too late and causes import-time errors in Vitest.
// Ensure env is present at module load
const ensureEnv = (key: keyof NodeJS.ProcessEnv, value: string) => {
  if (!process.env[key]) {
    process.env[key] = value
  }
}

ensureEnv('NODE_ENV', 'test')
ensureEnv('NEXTAUTH_URL', 'http://localhost:3000')
ensureEnv('DEMO_TOKEN_SECRET', 'test_demo_secret')
ensureEnv('RESEND_API_KEY', 'test_key')
ensureEnv('EMAIL_FROM', 'onboarding@resend.dev')
ensureEnv(
  'ENCRYPTION_KEY',
  '000102030405060708090a0b0c0d0e0f000102030405060708090a0b0c0d0e0f'
)
ensureEnv('KMS_KEY_ID', 'test-key-v1')

// Allow tests to use a dedicated TEST_DATABASE_URL and prevent accidental
// destructive operations on non-test DBs. If TEST_DATABASE_URL is present we
// will prefer it and validate it looks like a test database (contains "test").
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
}

// Safety guard: refuse to run tests if DATABASE_URL doesn't look like a test DB.
if (!process.env.DATABASE_URL || !/test/i.test(process.env.DATABASE_URL)) {
  // Allow an explicit override for local dev only (not for CI) via
  // ALLOW_UNSAFE_TEST_DB=1. This will still set a marker so the DB reset
  // logic can detect the unsafe flag.
  if (process.env.ALLOW_UNSAFE_TEST_DB !== '1') {
    throw new Error(
      'Refusing to run tests: DATABASE_URL must be a *test* database (set TEST_DATABASE_URL).'
    )
  }
  process.env.__TEST_DB_ALLOWED = '1'
  // eslint-disable-next-line no-console
  console.warn(
    '⚠️  ALLOW_UNSAFE_TEST_DB=1 is set — tests will run against a non-test DB. Proceed with caution.'
  )
}

import {
  resetPostgresDb,
  closePrisma,
  withAdvisoryLock,
} from '../tests/db-reset'

// Export helpers to globalThis without re-declaring global types. This avoids
// "Subsequent variable declarations must have the same type" when multiple
// setup files or test helpers declare slightly different shapes for the same
// globals in CI/type-check environments.
globalThis.__dbReset = resetPostgresDb
globalThis.__dbClose = closePrisma
globalThis.__withAdvisoryLock = withAdvisoryLock

// Optional: per-file reset toggle via env, NOT global (keeps tests fast)
if (process.env.DB_RESET_EAGER === '1') {
  beforeEach(async () => {
    await globalThis.__dbReset()
  })
}

afterAll(async () => {
  await globalThis.__dbClose()
})

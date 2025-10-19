// Ensure test env vars from .env.test are loaded early so they are available
// to all worker processes and test setup files before any Prisma/DB code runs.
// Try to load .env.test using dotenv if available. If not, parse the file
// manually so we don't depend on dotenv being installed in every env.
const loadEnvTest = () => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const dotenv = require('dotenv')
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const path = require('path')
    const envPath = path.resolve(process.cwd(), '.env.test')
    // Prefer .env.test values for test runs — override any existing envs
    try {
      // dotenv v16+ supports override option
      dotenv.config({ path: envPath, override: true })
    } catch (e) {
      const parsed = dotenv.parse(require('fs').readFileSync(envPath))
      for (const k of Object.keys(parsed)) {
        process.env[k] = parsed[k]
      }
    }
    return
  } catch (err) {
    // Fallback: parse .env.test manually
  }

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
      // Force override so test runner workers always use .env.test values
      process.env[key] = val
    }
  } catch (e) {
    // ignore
  }
}

loadEnvTest()

// Set deterministic test encryption key early (32 bytes hex, 64 chars)
if (!process.env.ENCRYPTION_KEY) {
  process.env.ENCRYPTION_KEY =
    '000102030405060708090a0b0c0d0e0f000102030405060708090a0b0c0d0e0f'
}

import { resetPostgresDb, closePrisma, withAdvisoryLock } from './db-reset'
// Use the app's shared Prisma singleton so all test helpers operate on the
// exact same client instance. This prevents cross-client visibility issues
// when running against branch DBs or connection pools.
import { prisma } from '@/lib/prisma'

// Debug: print DATABASE_URL and TEST_DATABASE_URL early for troubleshooting (masked)
// eslint-disable-next-line no-console
const mask = (v?: string) => (v ? v.replace(/(.{10}).+/, '$1…') : v)
// eslint-disable-next-line no-console
console.log('tests/setup.ts: DATABASE_URL=', mask(process.env.DATABASE_URL))
// eslint-disable-next-line no-console
console.log(
  'tests/setup.ts: TEST_DATABASE_URL=',
  mask(process.env.TEST_DATABASE_URL)
)

// Minimal env defaults for tests
const ensureEnv = (key: keyof NodeJS.ProcessEnv, value: string) => {
  if (!process.env[key]) {
    process.env[key] = value
  }
}

ensureEnv('NODE_ENV', 'test')
ensureEnv('NEXTAUTH_URL', 'http://localhost')
ensureEnv('DEMO_TOKEN_SECRET', 'demo')
ensureEnv('RESEND_API_KEY', 'test')
ensureEnv('EMAIL_FROM', 'test@example.com')
ensureEnv('ENCRYPTION_KEY', 'a'.repeat(64))
ensureEnv('KMS_KEY_ID', 'local')

// Default to in-memory rate limiter for tests to avoid Redis dependency
ensureEnv('RATE_LIMIT_ADAPTER', 'memory')
ensureEnv('SKIP_DOCKER', '1')

// Prefer TEST_DATABASE_URL for test runs. Fall back if DATABASE_URL already
// points to a test DB (database name ending with _test).
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
} else if (
  process.env.DATABASE_URL &&
  /_test\b/i.test(process.env.DATABASE_URL)
) {
  // ok — already a test DB URL
}

// Safety guard: ensure the URL's database name ends with _test
const url = process.env.DATABASE_URL
const isClearlyTestDb =
  !!url &&
  /\/[^/?#]+/i.test(url) &&
  /_test$/i.test(url.split('?')[0].split('/').pop() || '')

if (!isClearlyTestDb && process.env.ALLOW_UNSAFE_TEST_DB !== '1') {
  throw new Error(
    'Refusing to run tests: DATABASE_URL must point to a *test* database (name ending in "_test"). ' +
      'Set TEST_DATABASE_URL or set ALLOW_UNSAFE_TEST_DB=1 to override (DANGEROUS).'
  )
}

// Assign helpers to globalThis without redeclaring global types (avoids type-clash across files/CI)
// Wrap withAdvisoryLock so it uses the shared prisma instance by default.
globalThis.__withAdvisoryLock = <T>(fn: (c: typeof prisma) => Promise<T>) =>
  withAdvisoryLock(prisma as any, fn)

// Make __dbReset smart: if a client/tx is provided, use it directly. Otherwise
// run the reset inside the advisory-lock wrapper so resets are serialized
// across test workers and avoid races between truncates and concurrent writes.
globalThis.__dbReset = (client?: any) => {
  if (client && typeof client.$transaction === 'function') {
    return resetPostgresDb(client)
  }

  if (typeof globalThis.__withAdvisoryLock === 'function') {
    return globalThis.__withAdvisoryLock(async (tx: typeof prisma) =>
      resetPostgresDb(tx)
    )
  }

  return resetPostgresDb(prisma)
}

// Ensure global close uses the shared prisma instance
globalThis.__dbClose = () => closePrisma(prisma as any)

afterAll(async () => {
  // cleanup DB connection if available
  try {
    if (globalThis.__dbClose) {
      await globalThis.__dbClose()
    }
  } catch {
    /* ignore */
  }
})

export {}

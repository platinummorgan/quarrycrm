import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

// Load .env.test early so TEST_DATABASE_URL/DATABASE_URL are available
// to this global setup and we don't accidentally override them with a
// sqlite fallback.
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const dotenv = require('dotenv')
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const envPath = require('path').resolve(process.cwd(), '.env.test')
  dotenv.config({ path: envPath })
} catch (e) {
  // ignore if dotenv isn't present — fallback behavior below will handle it
}

// Ensure tests directory exists and point DATABASE_URL to a sqlite file
const dbDir = path.resolve(process.cwd(), 'tests')
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true })
const dbFile = path.join(dbDir, 'test.db')
// Only set a sqlite fallback if no DATABASE_URL or TEST_DATABASE_URL is configured.
if (!process.env.DATABASE_URL && !process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = `file:${dbFile}`
} else {
  // Respect existing configuration - avoid overriding a configured test DB
  // eslint-disable-next-line no-console
  console.log(
    'prisma-test-env: DATABASE_URL or TEST_DATABASE_URL already set; skipping sqlite fallback'
  )
}

// Run prisma generate and migrate deploy (fallback to db push) so schema/client are ready
try {
  console.log('Prisma: generating client...')
  execSync('npx prisma generate', { stdio: 'inherit' })
} catch (e) {
  console.warn(
    'Prisma generate failed (continuing):',
    e && (e as Error).message
  )
}

try {
  console.log('Prisma: applying migrations for test SQLite DB...')
  execSync('npx prisma migrate deploy', { stdio: 'inherit' })
} catch (e) {
  console.warn(
    'prisma migrate deploy failed, falling back to db push:',
    e && (e as Error).message
  )
  try {
    execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' })
  } catch (pushErr) {
    console.error(
      'prisma db push also failed during test setup:',
      pushErr && (pushErr as Error).message
    )
    throw pushErr
  }
}

console.log('Test DB ready at', process.env.DATABASE_URL)

// export nothing — vitest will run this file as globalSetup

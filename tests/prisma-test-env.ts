import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

// Ensure tests directory exists and point DATABASE_URL to a sqlite file
const dbDir = path.resolve(process.cwd(), 'tests')
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true })
const dbFile = path.join(dbDir, 'test.db')
process.env.DATABASE_URL = `file:${dbFile}`

// Run prisma generate and migrate deploy (fallback to db push) so schema/client are ready
try {
  console.log('Prisma: generating client...')
  execSync('npx prisma generate', { stdio: 'inherit' })
} catch (e) {
  console.warn('Prisma generate failed (continuing):', e && (e as Error).message)
}

try {
  console.log('Prisma: applying migrations for test SQLite DB...')
  execSync('npx prisma migrate deploy', { stdio: 'inherit' })
} catch (e) {
  console.warn('prisma migrate deploy failed, falling back to db push:', e && (e as Error).message)
  try {
    execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' })
  } catch (pushErr) {
    console.error('prisma db push also failed during test setup:', pushErr && (pushErr as Error).message)
    throw pushErr
  }
}

console.log('Test DB ready at', process.env.DATABASE_URL)

// export nothing — vitest will run this file as globalSetup

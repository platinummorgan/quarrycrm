import { execSync } from 'node:child_process'

export default async function globalSetup() {
  const url = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL
  const skipDocker = process.env.SKIP_DOCKER === '1'
  if (!url && !skipDocker) throw new Error('No TEST_DATABASE_URL/DATABASE_URL set for tests.')

  if (skipDocker) {
    // Developer requested to skip DB setup (local unit test runs)
    // Useful for running pure unit tests that don't require DB access.
    // eslint-disable-next-line no-console
    console.log('SKIP_DOCKER=1 set — skipping global DB setup')
    return
  }

  // From this point on `url` is defined (not skipDocker), narrow its type for TypeScript
  const dbUrl = url as string

  // If the URL points to a sqlite file, prepare a local sqlite DB file and
  // run prisma generate + migrate deploy (fallback to db push). This avoids
  // requiring TypeScript modules at runtime.
  if (dbUrl.startsWith('file:')) {
    // Create tests directory if needed
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs')
    const path = require('path')
  const dbPath = dbUrl.replace(/^file:/, '')
    const dbDir = path.dirname(dbPath)
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true })

    try {
      // Run prisma generate
      // eslint-disable-next-line no-console
  console.log('Prisma: generating client for sqlite test DB...')
  execSync('npx prisma generate', { stdio: 'inherit', env: { ...process.env, DATABASE_URL: dbUrl } })
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Prisma generate failed (continuing):', e && (e as any).message ? (e as any).message : e)
    }

    try {
      // eslint-disable-next-line no-console
  console.log('Prisma: applying migrations for test SQLite DB...')
  execSync('npx prisma migrate deploy', { stdio: 'inherit', env: { ...process.env, DATABASE_URL: dbUrl } })
    } catch (e) {
      // Fallback to db push as in older setup
      // eslint-disable-next-line no-console
      console.warn('prisma migrate deploy failed, falling back to db push:', e && (e as any).message ? (e as any).message : e)
      try {
  execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit', env: { ...process.env, DATABASE_URL: dbUrl } })
      } catch (pushErr) {
        // eslint-disable-next-line no-console
        console.error('prisma db push also failed during test setup:', pushErr && (pushErr as any).message ? (pushErr as any).message : pushErr)
        throw pushErr
      }
    }

    // Done setting up sqlite test DB
    // eslint-disable-next-line no-console
    console.log('Test DB ready at', dbUrl)
    return
  }

  // Safety: ensure the chosen URL looks like a test DB for remote/higher-risk DBs
  if (!/test/i.test(dbUrl)) {
    if (process.env.ALLOW_UNSAFE_TEST_DB !== '1') {
      throw new Error('Refusing to reset schema: TEST_DATABASE_URL must point to a test database.')
    }
    // eslint-disable-next-line no-console
    console.warn('⚠️  ALLOW_UNSAFE_TEST_DB=1 is set — global reset will run against a non-test DB.')
  }

  // Run prisma migrate reset to ensure a clean, baselined schema.
  // --force = don't prompt, --skip-generate = generator runs later as needed
  try {
    // eslint-disable-next-line no-console
    console.log('Running `npx prisma migrate reset --force --skip-generate --skip-seed` against', dbUrl)
    execSync('npx prisma migrate reset --force --skip-generate --skip-seed', {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: dbUrl },
    })
  } catch (err) {
    // Bubble up the error — failing here prevents tests from running against
    // an uninitialized or inconsistent schema.
    // eslint-disable-next-line no-console
    console.error('prisma migrate reset failed during global setup:', err)
    throw err
  }
}

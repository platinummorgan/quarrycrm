import { PrismaClient } from '@prisma/client'
import { createHash, randomBytes } from 'crypto'

/**
 * Lazy-loaded Prisma client to avoid connecting at import time.
 * This ensures DATABASE_URL can be modified by test setup before connection.
 */
let prisma: PrismaClient | null = null

function getPrismaClient(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient()
  }
  return prisma
}

/**
 * Cached list of public tables (excluding _prisma_migrations).
 * Populated on first reset, then reused to avoid repeated queries.
 */
let cachedTables: string[] | null = null

/**
 * Serializes resets across workers to avoid concurrent TRUNCATEs.
 * Works within a single process; for multi-process CI, use a Redis lock instead.
 */
const globalLock = (() => {
  // Simple in-memory mutex
  let p: Promise<void> = Promise.resolve()
  return <T>(fn: () => Promise<T>) => {
    const next = p.then(fn, fn).then(() => void 0, () => void 0)
    p = next
    return next
  }
})()

/**
 * Truncate all public tables except `_prisma_migrations`.
 * Resets sequences and cascades FKs.
 * Uses cached table list after first call for performance.
 * 
 * SAFETY: Only operates on databases with "_test" in DATABASE_URL
 * to prevent accidental TRUNCATE on dev/prod databases.
 * Set ALLOW_UNSAFE_TEST_DB=1 to bypass this check (NOT recommended for CI/prod).
 */
export async function resetPostgresDb(client?: PrismaClient) {
  // Safety check: Refuse to TRUNCATE unless DATABASE_URL points to a test DB
  // or ALLOW_UNSAFE_TEST_DB=1 was set in test setup
  const databaseUrl = process.env.DATABASE_URL || ''
  const isTestDb = databaseUrl.includes('_test')
  const allowUnsafe = process.env.__TEST_DB_ALLOWED === '1'

  if (!isTestDb && !allowUnsafe) {
    throw new Error(
      'Refusing to TRUNCATE: DATABASE_URL must point to a test database. ' +
      'Expected "_test" in the database URL (e.g., postgres://user:pass@host/quarrycrm_test). ' +
      `Current: ${databaseUrl.replace(/:[^:@]+@/, ':***@')} ` +
      'Set ALLOW_UNSAFE_TEST_DB=1 to bypass this check (NOT recommended for CI/production).'
    )
  }

  const db = client ?? getPrismaClient()
  const RESET_TIMEOUT_MS = 3000

  return globalLock(async () => {
    // Wrap reset logic in a timeout guard to catch accidental hangs
    const resetPromise = (async () => {
      // Query tables only on first call, then reuse cached list
      if (cachedTables === null) {
        const tables = await db.$queryRaw<Array<{ tablename: string }>>`
          SELECT tablename
          FROM pg_tables
          WHERE schemaname = 'public'
            AND tablename <> '_prisma_migrations'
        `
        cachedTables = tables.map(t => String(t.tablename))
      }

      // Skip TRUNCATE if no tables to reset
      if (cachedTables.length === 0) return

      const qualified = cachedTables
        .map(t => `"public"."${t.replace(/"/g, '""')}"`)
        .join(', ')

      // TRUNCATE with RESTART IDENTITY and CASCADE to reset sequences and respect FKs
      await db.$executeRawUnsafe(`TRUNCATE TABLE ${qualified} RESTART IDENTITY CASCADE;`)
    })()

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(
          `DB reset timed out after ${RESET_TIMEOUT_MS}ms. ` +
          `This may indicate a lock contention issue or slow DB connection. ` +
          `Consider running tests with --no-file-parallelism or reducing concurrency.`
        ))
      }, RESET_TIMEOUT_MS)
    })

    return Promise.race([resetPromise, timeoutPromise])
  })
}

export async function closePrisma() {
  // Ensure disconnect doesn't hang tests: race with a short timeout
  const DISCONNECT_TIMEOUT = 3000
  const client = getPrismaClient()
  await Promise.race([
    client.$disconnect(),
    new Promise((r) => setTimeout(r, DISCONNECT_TIMEOUT)),
  ])
}

/**
 * Acquire an advisory lock, run the provided function, then release the lock.
 * Useful for performing reset + seed within the same lock to avoid races
 * between parallel test workers.
 */
export async function withAdvisoryLock<T>(fn: (client: any) => Promise<T>) {
  const LOCK_ID = 424242
  const client = getPrismaClient()

  // Use a transaction callback provided by Prisma. The tx client that
  // Prisma passes into the callback is guaranteed to run on a single
  // physical connection for the lifetime of the callback. Acquire a
  // session-level advisory lock on that connection, run the provided
  // function passing the tx client, and then release the lock.
  return client.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SELECT pg_advisory_lock(${LOCK_ID})`)
    try {
      return await fn(tx)
    } finally {
      try {
        await tx.$executeRawUnsafe(`SELECT pg_advisory_unlock(${LOCK_ID})`)
      } catch (err) {
        // ignore
      }
    }
  })
}


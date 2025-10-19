import { PrismaClient } from '@prisma/client'
import type { Prisma } from '@prisma/client'
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
    const next = p.then(fn, fn).then(
      () => void 0,
      () => void 0
    )
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
export async function resetPostgresDb(
  client?: PrismaClient | Prisma.TransactionClient
) {
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
        'If you see `file:tests/test.db` here, ensure `.env.test` does not override TEST_DATABASE_URL with a file-based fallback. ' +
        'Set ALLOW_UNSAFE_TEST_DB=1 to bypass this check (NOT recommended for CI/production).'
    )
  }

  const db = client ?? getPrismaClient()
  const RESET_TIMEOUT_MS = 30000 // increase timeout to handle remote DB latency

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
        cachedTables = tables.map((t) => String(t.tablename))
      }

      // Skip TRUNCATE if no tables to reset
      if (cachedTables.length === 0) return

      const qualified = cachedTables
        .map((t) => `"public"."${t.replace(/"/g, '""')}"`)
        .join(', ')

      // TRUNCATE with RESTART IDENTITY and CASCADE to reset sequences and respect FKs
      await db.$executeRawUnsafe(
        `TRUNCATE TABLE ${qualified} RESTART IDENTITY CASCADE;`
      )
    })()

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(
          new Error(
            `DB reset timed out after ${RESET_TIMEOUT_MS}ms. ` +
              `This may indicate a lock contention issue or slow DB connection. ` +
              `Consider running tests with --no-file-parallelism or reducing concurrency.`
          )
        )
      }, RESET_TIMEOUT_MS)
    })

    return Promise.race([resetPromise, timeoutPromise])
  })
}

export async function closePrisma(client?: PrismaClient) {
  // Ensure disconnect doesn't hang tests: race with a short timeout
  const DISCONNECT_TIMEOUT = 3000
  const c = client ?? getPrismaClient()
  await Promise.race([
    c.$disconnect(),
    new Promise((r) => setTimeout(r, DISCONNECT_TIMEOUT)),
  ])
}

/**
 * Acquire an advisory lock, run the provided function, then release the lock.
 * Useful for performing reset + seed within the same lock to avoid races
 * between parallel test workers.
 */
export async function withAdvisoryLock<T>(
  clientOrFn: any,
  maybeFn?: (client: any) => Promise<T>
) {
  const LOCK_ID = 424242
  // Support two call styles:
  // - withAdvisoryLock(fn) -> uses internal client
  // - withAdvisoryLock(prisma, fn) -> uses provided client
  let client: any
  let fn: (client: any) => Promise<T>
  if (typeof clientOrFn === 'function') {
    client = getPrismaClient()
    fn = clientOrFn
  } else {
    client = clientOrFn ?? getPrismaClient()
    fn = maybeFn!
  }
  // Instead of attempting to acquire the advisory lock while inside the
  // transaction (which can exceed Prisma's interactive transaction
  // timeout), acquire the lock on the client connection first using
  // pg_try_advisory_lock in a loop. Once acquired, run the transaction
  // callback and finally release the lock.
  const MAX_WAIT_MS = 60_000
  const ATTEMPT_DELAY_MS = 100

  // Attempt to acquire the lock on the client connection (not inside tx)
  const start = Date.now()
  // eslint-disable-next-line no-console
  console.debug(
    `withAdvisoryLock: attempting to acquire advisory lock ${LOCK_ID}`
  )

  while (true) {
    const res: Array<{ pg_try_advisory_lock: boolean } | any> =
      await client.$queryRawUnsafe(
        `SELECT pg_try_advisory_lock(${LOCK_ID}) as pg_try_advisory_lock`
      )
    const acquired = Array.isArray(res)
      ? Boolean(
          (res[0] &&
            (res[0].pg_try_advisory_lock ??
              res[0].pg_try_advisory_lock === 1)) ??
            false
        )
      : false
    if (acquired) {
      // eslint-disable-next-line no-console
      console.debug(
        `withAdvisoryLock: acquired lock ${LOCK_ID} after ${Date.now() - start}ms`
      )
      break
    }

    if (Date.now() - start > MAX_WAIT_MS) {
      throw new Error(
        `withAdvisoryLock: failed to acquire advisory lock ${LOCK_ID} within ${MAX_WAIT_MS}ms`
      )
    }

    // Wait then retry
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, ATTEMPT_DELAY_MS))
  }

  try {
    return await client.$transaction(async (tx: Prisma.TransactionClient) => {
      return await fn(tx)
    })
  } finally {
    try {
      await client.$executeRawUnsafe(`SELECT pg_advisory_unlock(${LOCK_ID})`)
    } catch (err) {
      // ignore
    }
  }
}

import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function runTestMigrationsIfNeeded() {
  try {
    const url = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || ''
    if (!url) return
    if (!url.includes('_test')) return
    // Run the idempotent, test-only migration script to ensure enum/columns exist
    // Wrap in try/catch to avoid blocking non-test runs if script fails.
    execSync('node scripts/apply-test-migrations.js', { stdio: 'inherit' })
  } catch (e) {
    // swallow — tests will show failures if schema still missing
    // eslint-disable-next-line no-console
    console.warn('runTestMigrationsIfNeeded: failed to run apply-test-migrations.js:', (e as any)?.message ?? e)
  }
}

// Ensure test-specific migrations are applied before creating the shared client.
if (process.env.NODE_ENV === 'test' || (process.env.DATABASE_URL || '').includes('_test')) {
  runTestMigrationsIfNeeded()
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

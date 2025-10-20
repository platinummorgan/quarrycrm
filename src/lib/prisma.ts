import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function runTestMigrationsIfNeeded() {
  // Only run in Node.js environment (not Edge runtime)
  if (typeof process === 'undefined' || !process.versions || !process.versions.node) {
    return
  }
  
  try {
    const url = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || ''
    if (!url) return
    if (!url.includes('_test')) return
    
    // Dynamically import child_process only in Node.js environment
    const { execSync } = require('child_process')
    // Run the idempotent, test-only migration script to ensure enum/columns exist
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

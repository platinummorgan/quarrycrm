import { resetPostgresDb, closePrisma, withAdvisoryLock } from './db-reset'
import type { PrismaClient } from '@prisma/client'

// Minimal env defaults for tests
(process.env as any).NODE_ENV ||= 'test'
process.env.NEXTAUTH_URL ||= 'http://localhost'
process.env.DEMO_TOKEN_SECRET ||= 'demo'
process.env.RESEND_API_KEY ||= 'test'
process.env.EMAIL_FROM ||= 'test@example.com'
process.env.ENCRYPTION_KEY ||= 'a'.repeat(64) // 64 chars hex-like
process.env.KMS_KEY_ID ||= 'local'

// Assign helpers to globalThis without redeclaring global types (avoids type-clash across files/CI)
(globalThis as any).__dbReset = resetPostgresDb
(globalThis as any).__dbClose = closePrisma
(globalThis as any).__withAdvisoryLock = withAdvisoryLock

afterAll(async () => {
  // cleanup DB connection
  await (globalThis as any).__dbClose?.()
})

export {}

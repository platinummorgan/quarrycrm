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

declare global {
  // test helpers (use flexible any types to avoid redeclaration conflicts in CI/type-check)
  var __dbReset: ((client?: any) => Promise<void>) | undefined
  var __dbClose: (() => Promise<void>) | undefined
  var __withAdvisoryLock: (<T>(fn: (client: any) => Promise<T>) => Promise<T>) | undefined
}

globalThis.__dbReset = resetPostgresDb
globalThis.__dbClose = closePrisma
globalThis.__withAdvisoryLock = withAdvisoryLock

afterAll(async () => {
  // @ts-ignore
  await globalThis.__dbClose?.()
})

export {}

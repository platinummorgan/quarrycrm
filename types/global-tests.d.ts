import type { Prisma, PrismaClient } from '@prisma/client'

export {}

declare global {
  var __dbReset: (
    client?: PrismaClient | Prisma.TransactionClient
  ) => Promise<void>
  var __dbClose: () => Promise<void>
  var __withAdvisoryLock: <T>(
    fn: (client: Prisma.TransactionClient) => Promise<T>
  ) => Promise<T>
}

declare namespace NodeJS {
  interface ProcessEnv {
    __TEST_DB_ALLOWED?: string
  }
}

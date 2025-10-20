// tests/globals.d.ts
export {}

declare global {
  /** Run a function under a serialized DB advisory lock. */
  // eslint-disable-next-line no-var
  var __withAdvisoryLock: <T>(
    fn: (tx: import('@prisma/client').Prisma.TransactionClient) => Promise<T>
  ) => Promise<T>

  /** Reset the DB; accepts an optional Prisma tx/client. */
  // eslint-disable-next-line no-var
  var __dbReset: (
    client?:
      | import('@prisma/client').Prisma.TransactionClient
      | import('@prisma/client').PrismaClient
  ) => Promise<void>

  /** Close the shared Prisma client. */
  // eslint-disable-next-line no-var
  var __dbClose: () => Promise<void>
}
export {}

declare global {
  /** Run a function under a serialized DB advisory lock. */
  // eslint-disable-next-line no-var
  var __withAdvisoryLock: <T>(
    fn: (tx: import('@prisma/client').Prisma.TransactionClient) => Promise<T>
  ) => Promise<T>

  /** Reset the DB; accepts an optional Prisma tx/client. */
  // eslint-disable-next-line no-var
  var __dbReset: (
    client?:
      | import('@prisma/client').Prisma.TransactionClient
      | import('@prisma/client').PrismaClient
  ) => Promise<void>

  /** Close the shared Prisma client. */
  // eslint-disable-next-line no-var
  var __dbClose: () => Promise<void>
}

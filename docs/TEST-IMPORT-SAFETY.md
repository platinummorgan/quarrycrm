# Test Import-Time Safety Audit

## Overview

This document tracks the audit of test modules for import-time database connections and ensures Prisma operations only happen inside test hooks.

## Audit Results

### ✅ Safe Modules

#### `tests/utils/seed.ts`

- **Status**: ✅ Safe - Lazy-loaded PrismaClient
- **Details**:
  - Uses lazy-loaded `getPrismaClient()` instead of import-time instantiation
  - All database operations are inside async functions
  - Accepts optional `client` parameter for transaction support
- **Functions**: `seedOrgUser()`, `seedPipelines()`, `seedContacts()`

#### `tests/db-reset.ts`

- **Status**: ✅ Safe - Lazy-loaded PrismaClient
- **Details**:
  - Uses lazy-loaded `getPrismaClient()` to defer connection until first use
  - Connection happens after test setup modifies `DATABASE_URL`
  - Safety checks run before any database operations
- **Functions**: `resetPostgresDb()`, `closePrisma()`, `withAdvisoryLock()`

#### `tests/setup.ts`

- **Status**: ✅ Safe - No Prisma imports
- **Details**:
  - Sets environment variables before any Prisma connections
  - Imports helper functions but doesn't execute them at import time
  - Registers cleanup in `afterAll` hook

#### `__tests__/setup.ts`

- **Status**: ✅ Safe - No Prisma imports
- **Details**:
  - Validates and modifies `DATABASE_URL` before any Prisma connections
  - Runs Prisma migrations synchronously during setup
  - Imports helper functions from `tests/db-reset.ts` (lazy-loaded)

### ⚠️ Import-Time Connections (Acceptable)

#### Test Files Using `@/lib/prisma`

- **Files**:
  - `src/server/trpc/routers/contacts.smoke.test.ts`
  - `src/server/trpc/routers/deals-board.test.ts`
  - `src/server/contacts.test.ts`
  - `src/server/deals.test.ts`
  - `src/lib/server/__tests__/views-round-trip.test.ts`

- **Status**: ⚠️ Import-time instantiation, but usage is deferred
- **Details**:
  - Import `prisma` from `@/lib/prisma` which creates client at import time
  - However, prisma is only _used_ inside test hooks/functions
  - Test setup runs before test functions execute
  - `DATABASE_URL` is modified by test setup before first query

- **Why Acceptable**:
  1. Test setup (`__tests__/setup.ts`) modifies `DATABASE_URL` at import time
  2. Prisma client creation happens during test file import
  3. But client doesn't actually connect until first query
  4. First query happens inside test hooks (after safety checks)
  5. Safety checks in `db-reset.ts` validate before any TRUNCATE

- **Import Order**:
  ```
  1. Vitest loads __tests__/setup.ts (modifies DATABASE_URL)
  2. Test files import (creates PrismaClient with correct URL)
  3. beforeEach hooks run (reset + seed with safety checks)
  4. Test functions run (use prisma client)
  ```

## Best Practices

### ✅ DO

1. **Use lazy-loaded Prisma clients in test utilities**:

   ```typescript
   let prisma: PrismaClient | null = null

   function getPrismaClient(): PrismaClient {
     if (!prisma) {
       prisma = new PrismaClient()
     }
     return prisma
   }
   ```

2. **Accept client parameter in test helpers**:

   ```typescript
   export async function seedData(client?: PrismaClient) {
     const db = client ?? getPrismaClient()
     // Use db instead of direct prisma import
   }
   ```

3. **Use prisma inside test hooks, not at import time**:

   ```typescript
   describe('My Tests', () => {
     beforeEach(async () => {
       // ✅ Good - inside hook
       await prisma.user.create(...)
     })

     it('should work', async () => {
       // ✅ Good - inside test
       const users = await prisma.user.findMany()
     })
   })
   ```

4. **Modify DATABASE_URL before any imports**:

   ```typescript
   // In setup.ts - BEFORE imports
   process.env.DATABASE_URL = 'postgres://...test'

   // THEN import test utilities
   import { resetPostgresDb } from './db-reset'
   ```

### ❌ DON'T

1. **Don't execute Prisma queries at import time**:

   ```typescript
   // ❌ Bad - runs at import
   import { prisma } from '@/lib/prisma'
   const users = await prisma.user.findMany()

   describe('My Tests', () => { ... })
   ```

2. **Don't create eager PrismaClient in test utilities**:

   ```typescript
   // ❌ Bad - creates client at import
   import { PrismaClient } from '@prisma/client'
   const prisma = new PrismaClient() // Connects immediately

   export async function seedData() {
     await prisma.user.create(...)
   }
   ```

3. **Don't seed data at module level**:

   ```typescript
   // ❌ Bad - seeds at import time
   const testUser = await seedUser()

   describe('My Tests', () => {
     it('should use user', () => {
       expect(testUser).toBeDefined()
     })
   })
   ```

## Connection Timeline

### Import Phase (Module Loading)

1. Vitest loads `__tests__/setup.ts`
2. Setup modifies `DATABASE_URL` (adds `_test` or sets `__TEST_DB_ALLOWED`)
3. Setup imports `tests/db-reset.ts` (lazy client, no connection yet)
4. Test files import (may create PrismaClient, but no queries yet)

### Test Execution Phase

1. `beforeEach` hooks run
2. `globalThis.__withAdvisoryLock` acquires lock
3. `globalThis.__dbReset` runs safety checks
4. Safety checks validate `DATABASE_URL` (first actual connection attempt)
5. TRUNCATE executes (if safety checks pass)
6. Seed functions run
7. Test body executes

### Key Safety Points

- **Safety Check Location**: In `resetPostgresDb()` before any TRUNCATE
- **First Connection**: Happens during `resetPostgresDb()` when checking tables
- **DATABASE_URL Modification**: Happens in setup before any connections
- **Validation**: Both in setup (fail-fast) and reset (last-line defense)

## Migration Guide

If you need to add new test utilities that use Prisma:

### Step 1: Use Lazy-Loaded Client

```typescript
// tests/utils/my-helper.ts
import { PrismaClient } from '@prisma/client'

let prisma: PrismaClient | null = null

function getPrismaClient(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient()
  }
  return prisma
}

export async function myHelper(client?: PrismaClient) {
  const db = client ?? getPrismaClient()
  // Use db for queries
}
```

### Step 2: Accept Client Parameter

Always accept an optional client parameter so tests can pass transaction clients:

```typescript
export async function myHelper(data: any, client?: PrismaClient) {
  const db = client ?? getPrismaClient()
  return await db.myTable.create({ data })
}
```

### Step 3: Call Inside Test Hooks

Never call helper functions at import time:

```typescript
describe('My Tests', () => {
  let myData: any

  beforeEach(async () => {
    // ✅ Good - inside hook
    myData = await myHelper({ ... })
  })

  it('should work', () => {
    expect(myData).toBeDefined()
  })
})
```

## Verification

To verify no import-time connections are happening:

1. **Add debug logging** (temporary):

   ```typescript
   // In getPrismaClient()
   console.log('Creating PrismaClient', new Error().stack)
   ```

2. **Run tests** and check logs - client should only be created inside test hooks

3. **Check for import-time queries**:
   ```bash
   # Should find no matches
   grep -r "await prisma\." tests/ --include="*.ts" | grep -v "async function"
   ```

## Summary

✅ **All test utilities use lazy-loaded Prisma clients**  
✅ **No database queries at import time**  
✅ **Safety checks run before any database operations**  
✅ **DATABASE_URL modified before any connections**  
⚠️ **Test files import app's prisma client (acceptable - used in hooks only)**

The current setup ensures:

1. Test setup runs first and modifies environment
2. Prisma clients are created with correct configuration
3. Safety checks validate before any destructive operations
4. No accidental connections to prod/dev databases

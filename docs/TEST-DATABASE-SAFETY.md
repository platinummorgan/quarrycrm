# Test Database Safety Implementation

## Overview

Implemented safety checks to prevent accidental TRUNCATE operations on production or development databases during test runs.

## Changes Made

### 1. Safety Check in `tests/db-reset.ts`

Added validation before TRUNCATE operations:

```typescript
// Safety check: Refuse to TRUNCATE unless DATABASE_URL points to a test DB
// or ALLOW_UNSAFE_TEST_DB=1 was set in test setup
const databaseUrl = process.env.DATABASE_URL || ''
const isTestDb = databaseUrl.includes('_test')
const allowUnsafe = process.env.__TEST_DB_ALLOWED === '1'

if (!isTestDb && !allowUnsafe) {
  throw new Error(
    'Refusing to TRUNCATE: DATABASE_URL must point to a test database. ' +
    'Expected "_test" in the database URL...'
  )
}
```

**Benefits:**
- ✅ Prevents accidental data loss on prod/dev databases
- ✅ Clear error messages with actionable instructions
- ✅ Multiple layers of protection

### 2. Setup Validation in `__tests__/setup.ts`

Added early validation before tests begin:

```typescript
// SAFETY: Ensure DATABASE_URL points to a test database
if (!process.env.DATABASE_URL?.includes('_test')) {
  if (process.env.ALLOW_UNSAFE_TEST_DB === '1') {
    // Set internal flag to allow bypass
    process.env.__TEST_DB_ALLOWED = '1'
    console.warn('⚠️ WARNING: Using production/dev database for tests...')
  } else {
    throw new Error('DATABASE_URL does not contain "_test"...')
  }
}
```

**Benefits:**
- ✅ Fails fast before tests run
- ✅ Loud warning when using production database
- ✅ Clear documentation in error messages

### 3. Documentation in `docs/TESTING.md`

Comprehensive guide covering:
- Test database requirements
- Local development options
- CI/CD setup instructions (Neon branches, dedicated databases)
- Safety check details
- Troubleshooting guide

## Usage

### For CI/Production (Recommended)

Set `DATABASE_URL` to a dedicated test database:

```bash
# Example for Neon branch
export DATABASE_URL="postgres://user:pass@host/neondb_test"

# Run tests normally
npm test
```

### For Local Development (Quick & Unsafe)

Use `ALLOW_UNSAFE_TEST_DB=1` to bypass the safety check:

```bash
# PowerShell
$env:ALLOW_UNSAFE_TEST_DB="1"
npx vitest run

# Bash
export ALLOW_UNSAFE_TEST_DB=1
npm test
```

⚠️ **WARNING**: This will TRUNCATE all data in your database on each test run.

## Behavior Matrix

| DATABASE_URL         | ALLOW_UNSAFE_TEST_DB | Result                          |
|----------------------|----------------------|---------------------------------|
| `*_test`             | not set              | ✅ Tests run normally           |
| `*_test`             | `1`                  | ✅ Tests run normally           |
| `production_db`      | not set              | ❌ Error: "DATABASE_URL does not contain _test" |
| `production_db`      | `1`                  | ⚠️ Tests run with warning       |

## CI Setup Examples

### GitHub Actions

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      # Option 1: Use Neon branch
      - name: Create Neon branch
        run: |
          # Use Neon API to create test branch
          # Set DATABASE_URL to branch connection string
      
      # Option 2: Use dedicated test database
      - name: Setup test database
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL_TEST }}
        run: |
          npx prisma migrate deploy
      
      - name: Run tests
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL_TEST }}
        run: npm test
```

### GitLab CI

```yaml
test:
  script:
    - export DATABASE_URL="${DATABASE_URL_TEST}"
    - npx prisma migrate deploy
    - npm test
  variables:
    DATABASE_URL_TEST: "postgres://user:pass@host/quarrycrm_test"
```

## Test Results

All 18 tests passing with safety checks in place:

```
✓ src/server/trpc/routers/contacts.smoke.test.ts (9 tests)
✓ src/server/trpc/routers/deals-board.test.ts (9 tests)

Test Files  2 passed (2)
Tests  18 passed (18)
```

## Safety Features

1. **Dual Validation**: Checks in both setup and reset functions
2. **Clear Error Messages**: Actionable instructions for each scenario
3. **Loud Warnings**: Console warnings when bypassing safety checks
4. **Password Masking**: Sensitive credentials hidden in error messages
5. **Environment Variables**: `__TEST_DB_ALLOWED` for internal bypass tracking

## Next Steps for Production

1. **Create Neon Branch for CI**:
   - Use Neon's branching API or console
   - Name it `test` or `ci-test`
   - Get connection string with `_test` in database name

2. **Update CI Configuration**:
   - Set `DATABASE_URL` secret to test branch connection string
   - Remove any `ALLOW_UNSAFE_TEST_DB` flags from CI

3. **Document for Team**:
   - Share `docs/TESTING.md` with team
   - Emphasize NEVER using `ALLOW_UNSAFE_TEST_DB` in CI
   - Show how to create local test databases

## Success Criteria Met

✅ **Local runs succeed**: Tests pass with `ALLOW_UNSAFE_TEST_DB=1` for local dev  
✅ **CI ready**: Tests will run on dedicated test DB when DATABASE_URL is configured  
✅ **No accidental TRUNCATEs**: Safety check rejects non-test databases by default  
✅ **Clear documentation**: Complete guide in `docs/TESTING.md`  
✅ **Loud warnings**: Console warnings when using prod/dev database for tests

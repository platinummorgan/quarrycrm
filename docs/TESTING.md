# Testing Guide

## Database Safety

The test suite includes safety checks to prevent accidental TRUNCATE operations on production or development databases.

### Test Database Requirements

**All tests MUST use a dedicated test database** to prevent data loss. The `DATABASE_URL` must contain `_test` in the database name.

Examples:
- ✅ `postgres://user:pass@host/quarrycrm_test`
- ✅ `postgres://user:pass@host/neondb_test`
- ❌ `postgres://user:pass@host/quarrycrm` (will be rejected)
- ❌ `postgres://user:pass@host/neondb` (will be rejected)

### Local Development

For local testing, you have two options:

#### Option 1: Use a Dedicated Test Database (Recommended)

Create a separate database for testing:

```bash
# If using Neon, create a branch named "test" or create a new database
# Set DATABASE_URL to point to the test database
export DATABASE_URL="postgres://user:pass@host/neondb_test"
```

#### Option 2: Use Same Database with Safety Override (NOT Recommended)

⚠️ **WARNING**: This will TRUNCATE all data in your database on each test run.

```bash
# PowerShell
$env:ALLOW_UNSAFE_TEST_DB="1"
npx vitest run

# Bash/Zsh
export ALLOW_UNSAFE_TEST_DB=1
npm test
```

**NEVER use this option in CI or production environments.**

### CI/CD Setup

In your CI environment (GitHub Actions, GitLab CI, etc.), set up a dedicated test database:

#### Neon (Recommended)

Use Neon's branching feature to create an isolated test database:

```yaml
# .github/workflows/test.yml
env:
  # Use a Neon branch or dedicated database for testing
  DATABASE_URL: ${{ secrets.DATABASE_URL_TEST }}
```

The test database URL should contain `_test` in the database name.

#### Other PostgreSQL Providers

Create a separate test database and set the `DATABASE_URL` environment variable:

```bash
# Create test database
createdb quarrycrm_test

# Set environment variable
export DATABASE_URL="postgres://user:pass@localhost/quarrycrm_test"
```

### Safety Check Details

The safety check is implemented in two places:

1. **`__tests__/setup.ts`**: Validates DATABASE_URL before tests run
   - Checks if URL contains `_test`
   - Allows bypass with `ALLOW_UNSAFE_TEST_DB=1` (sets `__TEST_DB_ALLOWED` internally)
   - Displays warning when using production/dev database

2. **`tests/db-reset.ts`**: Validates before TRUNCATE operations
   - Refuses to TRUNCATE unless:
     - DATABASE_URL contains `_test`, OR
     - `__TEST_DB_ALLOWED=1` is set (from setup.ts)
   - Throws clear error with instructions if validation fails

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Specific Test Files
```bash
npx vitest run src/server/trpc/routers/contacts.smoke.test.ts
```

### Run Tests Sequentially (for DB-heavy tests)
```bash
npx vitest run --no-file-parallelism
```

### Watch Mode
```bash
npx vitest watch
```

## Test Performance

The test suite includes optimizations for fast database resets:

- **Table Caching**: Table list is cached after first query (~50-100ms savings per reset)
- **Timeout Guards**: 3-second timeout catches accidental hangs
- **Advisory Locks**: Prevents concurrent TRUNCATE operations across test workers

Target reset times: **<100-200ms per reset on local PostgreSQL**

## Troubleshooting

### "Refusing to TRUNCATE: DATABASE_URL must point to a test database"

**Cause**: DATABASE_URL doesn't contain `_test`

**Solution**: 
1. Create a dedicated test database with `_test` in the name
2. Update DATABASE_URL to point to it
3. For local dev ONLY, set `ALLOW_UNSAFE_TEST_DB=1` (see warning above)

### "Can't reach database server"

**Cause**: Test database doesn't exist

**Solution**: Create the test database before running tests:
```bash
# For local PostgreSQL
createdb quarrycrm_test

# For Neon
# Create a branch via Neon console or API
```

### "DB reset timed out after 3000ms"

**Cause**: Lock contention or slow DB connection

**Solution**: 
- Run tests with `--no-file-parallelism`
- Reduce concurrency in `vitest.config.ts`
- Check database connection speed

### Tests Fail with FK Violations

**Cause**: Tests running in parallel are interfering with each other

**Solution**: Run mutate-heavy test suites sequentially:
```bash
npx vitest run --no-file-parallelism
```

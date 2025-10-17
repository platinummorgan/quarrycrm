// Ensure critical environment variables are set as soon as this module is imported.
// Some modules read these at import/collection time, so setting them inside
// a beforeAll() is too late and causes import-time errors in Vitest.
// Ensure env is present at module load
process.env.NODE_ENV ??= 'test'
process.env.NEXTAUTH_URL ??= 'http://localhost:3000'
process.env.DEMO_TOKEN_SECRET ??= 'test_demo_secret'
process.env.RESEND_API_KEY ??= 'test_key'
process.env.EMAIL_FROM ??= 'onboarding@resend.dev'
process.env.ENCRYPTION_KEY ??= '000102030405060708090a0b0c0d0e0f000102030405060708090a0b0c0d0e0f'
process.env.KMS_KEY_ID ??= 'test-key-v1'

// SAFETY: Ensure DATABASE_URL points to a test database to prevent accidental
// TRUNCATE operations on dev/prod databases. The DATABASE_URL must contain "_test".
// In CI, set DATABASE_URL to a dedicated test database/branch.
// For local development where you want to use the same DB for testing (not recommended),
// set ALLOW_UNSAFE_TEST_DB=1 to bypass the safety check.
if (!process.env.DATABASE_URL?.includes('_test')) {
	const originalUrl = process.env.DATABASE_URL || ''
	if (!originalUrl) {
		throw new Error(
			'DATABASE_URL is not set. Please set DATABASE_URL to a test database URL ' +
			'(must contain "_test" in the database name, e.g., postgres://user:pass@host/quarrycrm_test)'
		)
	}

	// Check if user explicitly allows using a non-test database for tests
	if (process.env.ALLOW_UNSAFE_TEST_DB === '1') {
		// Mark the environment as allowing test database operations
		// The db-reset.ts safety check will look for this flag
		process.env.__TEST_DB_ALLOWED = '1'
		// eslint-disable-next-line no-console
		console.warn(
			`⚠️  WARNING: Using production/dev database for tests with ALLOW_UNSAFE_TEST_DB=1. ` +
			`This will TRUNCATE all data on each test run. ` +
			`For production/CI, use a dedicated test database with "_test" in the name.`
		)
	} else {
		throw new Error(
			'DATABASE_URL does not contain "_test". For safety, tests require a dedicated test database. ' +
			'Either: (1) Set DATABASE_URL to a test database (e.g., postgres://...neondb_test), ' +
			'(2) In CI, create a Neon branch for testing, or ' +
			'(3) For local dev ONLY, set ALLOW_UNSAFE_TEST_DB=1 (NOT recommended for prod/CI)'
		)
	}
}

// Run prisma migrations for test DB unless explicitly skipped. This ensures the
// schema (and generated client) match migrations before tests run. Tests can
// set SKIP_DB_MIGRATE=1 to opt out (useful for CI environments that prepare DB differently).
if (!process.env.SKIP_DB_MIGRATE) {
	// Attempt to load execSync in an outer scope so the catch block can still use it.
	// Some test runners / environments may sandbox or disallow child_process.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let execSync: any
	try {
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		execSync = require('child_process')?.execSync
	} catch (reqErr) {
		// require may be unavailable in some bundling/test environments.
		execSync = undefined
	}

	if (!execSync) {
		const msg = 'child_process.execSync is unavailable in this environment; skipping prisma migrate/db push in test setup.'
		// In CI we fail fast because the test DB should be prepared by the environment.
		if (process.env.CI) {
			throw new Error(msg)
		}
		// Locally, warn and continue; tests may still fail if schema is missing.
		// eslint-disable-next-line no-console
		console.warn(msg)
	} else {
		try {
			// Run synchronously at import time so migrations complete before tests execute.
			// Use npx to pick the workspace prisma binary.
			// eslint-disable-next-line no-console
			console.log('Running prisma migrate deploy before tests...')
			execSync('npx prisma migrate deploy', { stdio: 'inherit' })
		} catch (e: any) {
			// eslint-disable-next-line no-console
			console.warn('prisma migrate deploy failed during test setup:', e && e.message ? e.message : e)
			// If migrate deploy fails (for example P3005 when DB is not baselined),
			// fallback to db push to ensure schema is present for tests.
			try {
				// eslint-disable-next-line no-console
				console.log('Falling back to `prisma db push` to ensure schema is updated for tests...')
				execSync('npx prisma db push', { stdio: 'inherit' })
			} catch (pushErr: any) {
				// eslint-disable-next-line no-console
				console.warn('prisma db push also failed during test setup:', pushErr && pushErr.message ? pushErr.message : pushErr)
				if (process.env.CI) throw pushErr
			}
		}
	}
}

 

import { resetPostgresDb, closePrisma, withAdvisoryLock } from '../tests/db-reset'

// Export helpers to globalThis without re-declaring global types. This avoids
// "Subsequent variable declarations must have the same type" when multiple
// setup files or test helpers declare slightly different shapes for the same
// globals in CI/type-check environments.
(globalThis as any).__dbReset = resetPostgresDb
(globalThis as any).__dbClose = closePrisma
(globalThis as any).__withAdvisoryLock = withAdvisoryLock

// Optional: per-file reset toggle via env, NOT global (keeps tests fast)
if (process.env.DB_RESET_EAGER === '1') {
	beforeEach(async () => {
		// @ts-ignore
		await globalThis.__dbReset()
	})
}

afterAll(async () => {
	// @ts-ignore
	await globalThis.__dbClose()
})


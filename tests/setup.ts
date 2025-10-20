// tests/setup.ts

// --- Load .env.test early so all workers share the same env ------------------
(function loadEnvTest() {
  const path = require('path');
  const envPath = path.resolve(process.cwd(), '.env.test');

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const dotenv = require('dotenv');
    // Ensure .env.test values override anything already set
    dotenv.config({ path: envPath, override: true });
    return;
  } catch {
    // dotenv not installed — fall back to manual parse
  }

  try {
    const fs = require('fs');
    if (!fs.existsSync(envPath)) return;
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i < 0) continue;
      const key = t.slice(0, i).trim();
      let val = t.slice(i + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  } catch {
    // ignore
  }
})();

// --- Minimal env defaults (only set if missing) ------------------------------
const ensureEnv = (k: keyof NodeJS.ProcessEnv, v: string) => {
  if (!process.env[k]) process.env[k] = v;
};

ensureEnv('NODE_ENV', 'test');
ensureEnv('NEXTAUTH_URL', 'http://localhost');
ensureEnv('DEMO_TOKEN_SECRET', 'demo');
ensureEnv('RESEND_API_KEY', 'test');
ensureEnv('EMAIL_FROM', 'test@example.com');
// 32-byte (64 hex chars) deterministic key for local tests
ensureEnv('ENCRYPTION_KEY', '000102030405060708090a0b0c0d0e0f000102030405060708090a0b0c0d0e0f');
ensureEnv('KMS_KEY_ID', 'local');
ensureEnv('RATE_LIMIT_ADAPTER', 'memory');
ensureEnv('SKIP_DOCKER', '1'); // allow pure unit tests without DB

// Prefer TEST_DATABASE_URL if provided. If global-setup already resolved and set
// DATABASE_URL/TEST_DATABASE_URL, do not overwrite them here. This keeps all
// processes using the exact same resolved DB URL.
if (process.env.TEST_DATABASE_URL && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}

// --- Safety guard: DATABASE_URL must point to a *_test DB --------------------
(function enforceTestDbSuffix() {
  const urlStr = process.env.DATABASE_URL;
  if (!urlStr) return; // some unit tests might not hit DB at all

  let dbName = '';
  try {
    const u = new URL(urlStr);
    dbName = u.pathname.split('/').filter(Boolean).pop() ?? '';
  } catch {
    // If URL parsing fails and we’re about to touch DB, fail loudly
    if (process.env.ALLOW_UNSAFE_TEST_DB !== '1') {
      throw new Error('Refusing to run tests: DATABASE_URL is not a valid URL.');
    }
  }

  const looksLikeTest = /_test$/i.test(dbName);
  if (!looksLikeTest && process.env.ALLOW_UNSAFE_TEST_DB !== '1') {
    throw new Error(
      `Refusing to run tests: database name must end with "_test" (got "${dbName || 'unknown'}"). ` +
        `Set TEST_DATABASE_URL to a test database or ALLOW_UNSAFE_TEST_DB=1 to override (DANGEROUS).`
    );
  }
})();

// Optional masked debug prints (enable with LOG_TEST_ENVS=1)
const mask = (v?: string) => (v ? v.replace(/(.{10}).+/, '$1…') : v);
if (process.env.LOG_TEST_ENVS === '1') {
  // eslint-disable-next-line no-console
  console.log('tests/setup.ts: DATABASE_URL =', mask(process.env.DATABASE_URL));
  // eslint-disable-next-line no-console
  console.log('tests/setup.ts: TEST_DATABASE_URL =', mask(process.env.TEST_DATABASE_URL));
}

// --- Apply safe, additive test-only migrations early ----------------------
// This script is idempotent and guarded to only touch databases whose name ends
// with `_test`. Running it here ensures workers see the same schema state even if
// global-setup didn't run (e.g., when SKIP_DOCKER=1 and running single test files).
// Note: global-setup already runs migrations + generate, so this is a safety fallback.
try {
  const { execSync } = require('child_process');
  // Only attempt to run if DATABASE_URL exists (enforced earlier to be a _test DB)
  if (process.env.DATABASE_URL && process.env.SKIP_DOCKER === '1') {
    // If global setup was skipped, apply migrations in worker setup
    console.log('tests/setup.ts: SKIP_DOCKER=1, applying migrations in worker...')
    execSync('node scripts/apply-test-migrations.js', { stdio: 'inherit' });
  }
} catch (err) {
  // If migrations fail here, we still want tests to run (they will likely fail),
  // but log the error to help debugging.
  // eslint-disable-next-line no-console
  console.warn('tests/setup.ts: apply-test-migrations.js failed:', (err as any)?.message ?? err);
}

// --- Share the app's Prisma instance & wire test helpers globally ------------
import { prisma } from '@/lib/prisma';
import { resetPostgresDb, closePrisma, withAdvisoryLock } from './db-reset';
import { afterAll } from 'vitest';

// Expose helpers at runtime (add types in tests/globals.d.ts if you want TS help)
globalThis.__withAdvisoryLock = <T>(fn: (c: typeof prisma) => Promise<T>) =>
  withAdvisoryLock(prisma as any, fn);

globalThis.__dbReset = (client?: any) => {
  if (client && typeof client.$transaction === 'function') {
    return resetPostgresDb(client);
  }
  if (typeof globalThis.__withAdvisoryLock === 'function') {
    return globalThis.__withAdvisoryLock(async (tx) => resetPostgresDb(tx));
  }
  return resetPostgresDb(prisma);
};

globalThis.__dbClose = () => closePrisma(prisma as any);

// Ensure the Prisma connection closes after the test run
afterAll(async () => {
  try {
    if (globalThis.__dbClose) await globalThis.__dbClose();
  } catch {
    /* ignore */
  }
});

export {};

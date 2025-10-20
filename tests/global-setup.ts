// tests/global-setup.ts
import { execSync } from 'node:child_process';

export default async function globalSetup() {
  // Load .env.test before anything else (manual parse, no dotenv dependency)
  const path = require('path');
  const fs = require('fs');
  const envPath = path.resolve(process.cwd(), '.env.test');
  if (fs.existsSync(envPath)) {
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
  }

  // Resolve the single effective DB URL for all setup steps. Prefer TEST_DATABASE_URL
  // if provided, otherwise fall back to DATABASE_URL. We will export the chosen
  // value into both env vars so subsequent steps and worker processes see the same URL.
  const resolvedUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

  if (!resolvedUrl) {
    throw new Error('No TEST_DATABASE_URL/DATABASE_URL set for tests.');
  }

  const dbUrl = resolvedUrl as string;

  // Ensure both env vars point to the same chosen DB URL for consistency
  process.env.TEST_DATABASE_URL = dbUrl
  process.env.DATABASE_URL = dbUrl

  const mask = (v?: string) => (v ? v.replace(/:[^:@]+@/, ':***@') : v)
  console.log('Global setup: using TEST/DATABASE_URL =', mask(dbUrl))

  // If using SQLite for local runs
  if (dbUrl.startsWith('file:')) {
    const fs = require('fs');
    const path = require('path');
    const dbPath = dbUrl.replace(/^file:/, '');
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

    try {
      console.log('Prisma: generating client for sqlite test DB...');
      execSync('npx prisma generate', {
        stdio: 'inherit',
        env: { ...process.env, DATABASE_URL: dbUrl, TEST_DATABASE_URL: dbUrl },
      });
    } catch (e) {
      console.warn('Prisma generate failed (continuing):', (e as any)?.message ?? e);
    }

    try {
      console.log('Prisma: applying migrations for test SQLite DB...');
      execSync('npx prisma migrate deploy', {
        stdio: 'inherit',
        env: { ...process.env, DATABASE_URL: dbUrl, TEST_DATABASE_URL: dbUrl },
      });
    } catch (e) {
      console.warn('`migrate deploy` failed, falling back to `db push`:', (e as any)?.message ?? e);
      execSync('npx prisma db push --accept-data-loss', {
        stdio: 'inherit',
        env: { ...process.env, DATABASE_URL: dbUrl, TEST_DATABASE_URL: dbUrl },
      });
    }

    console.log('Test DB ready at', dbUrl);
    return;
  }

  // Safety: ensure the DB *name* ends with _test unless explicitly overridden
  try {
    const u = new URL(dbUrl);
    const dbName = u.pathname.split('/').filter(Boolean).pop() ?? '';
    const looksLikeTest = /_test$/i.test(dbName);
    if (!looksLikeTest && process.env.ALLOW_UNSAFE_TEST_DB !== '1') {
      throw new Error(
        `Refusing to reset schema: database "${dbName}" does not end with "_test". ` +
          `Set TEST_DATABASE_URL to a test DB or ALLOW_UNSAFE_TEST_DB=1 to override (DANGEROUS).`
      );
    }
    if (!looksLikeTest) {
      console.warn('⚠️  ALLOW_UNSAFE_TEST_DB=1 set — running reset against a non-test DB.');
    }
  } catch {
    // If URL parsing failed, bail.
    throw new Error('TEST_DATABASE_URL/DATABASE_URL is not a valid URL.');
  }

  // Use db push for test setup (avoids migration advisory locks)
  try {
    console.log(
      'Running `prisma db push --skip-generate --accept-data-loss` against',
      mask(dbUrl)
    );
    execSync('npx prisma db push --skip-generate --accept-data-loss --force-reset', {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: dbUrl, TEST_DATABASE_URL: dbUrl },
    });

    // Apply idempotent, test-only migrations (adds enum/columns if missing).
    // This must run AFTER db push and BEFORE prisma generate so the
    // generated client includes all columns that exist in the actual DB.
    console.log('Applying test-only additive migrations...')
    execSync('node scripts/apply-test-migrations.js', {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: dbUrl, TEST_DATABASE_URL: dbUrl },
    })

    // NOW generate the Prisma client against the actual DB schema (after migrations)
    // so the generated types match what's actually in the database.
    console.log('Running `prisma generate` after migrations to', mask(dbUrl))
    execSync('npx prisma generate', {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: dbUrl, TEST_DATABASE_URL: dbUrl }
    })

    console.log('✓ Database pushed, test migrations applied, and Prisma client generated')
  } catch (err) {
    console.error('Global setup failed:', err);
    throw err;
  }
}

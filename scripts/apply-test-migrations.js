/* Apply safe, additive schema changes to the test database.
 * This script will only run against a DATABASE_URL or TEST_DATABASE_URL that
 * contains the substring "_test" to avoid touching dev/prod databases.
 *
 * Usage: node scripts/apply-test-migrations.js
 */

const fs = require('fs')

async function main() {
  let url = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL

  if (!url) {
    const envPath = './.env.test'
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8')
      // crude parse: look for TEST_DATABASE_URL= on its own line
      const m = content.match(/^TEST_DATABASE_URL=(.+)$/m)
      if (m) url = m[1].trim().replace(/^['"]|['"]$/g, '')
    }
  }

  if (!url) {
    console.error('No TEST_DATABASE_URL or DATABASE_URL found in env or .env.test')
    process.exit(2)
  }

  if (!url.includes('_test')) {
    console.error('Refusing to run migrations: target database URL does not contain "_test"\n', url)
    process.exit(3)
  }

  console.log('Using test database URL (masked):', url.replace(/:[^:@]+@/, ':***@'))

  // Lazy-load Prisma and run the statements.
  let PrismaClient
  try {
    PrismaClient = require('@prisma/client').PrismaClient
  } catch (err) {
    console.error('Cannot require @prisma/client. Run `npx prisma generate` first.')
    console.error(err)
    process.exit(4)
  }

  const db = new PrismaClient({ datasources: { db: { url } } })

  try {
    console.log('Applying safe ALTER TABLE statements...')
    // Ensure the Postgres enum type for OrganizationPlan exists (Prisma expects this enum)
    // Use a DO block to create it only if missing to be safe across Postgres versions.
    await db.$executeRawUnsafe(
      `DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE lower(typname) = lower('OrganizationPlan')) THEN
    CREATE TYPE "OrganizationPlan" AS ENUM ('FREE','PRO','TEAM');
  END IF;
END$$;`
    )

    // Add organization.plan using the enum type if missing
    await db.$executeRawUnsafe(
      `ALTER TABLE organizations ADD COLUMN IF NOT EXISTS plan "OrganizationPlan" DEFAULT 'FREE'::"OrganizationPlan";`
    )

    // If the column exists but is text (from older schema), attempt non-destructive cast to enum
    // Check the current udt_name for the column and perform ALTER TYPE only if it's text
    const colInfo = await db.$queryRawUnsafe(
      "SELECT udt_name FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'plan' LIMIT 1"
    )
    if (colInfo && colInfo[0] && colInfo[0].udt_name === 'text') {
      console.log('organizations.plan exists as text; attempting to cast to OrganizationPlan enum')
      // Remove default if present (text default blocks direct cast), then cast, then set enum default
      try {
        await db.$executeRawUnsafe(`ALTER TABLE organizations ALTER COLUMN plan DROP DEFAULT;`)
      } catch (e) {
        // ignore
      }
      // Perform the cast
      await db.$executeRawUnsafe(
        `ALTER TABLE organizations ALTER COLUMN plan TYPE "OrganizationPlan" USING (plan::"OrganizationPlan");`
      )
      // Re-apply the enum default
      await db.$executeRawUnsafe(
        `ALTER TABLE organizations ALTER COLUMN plan SET DEFAULT 'FREE'::"OrganizationPlan";`
      )
      console.log('Cast organizations.plan to OrganizationPlan enum')
    }
    // Add org_members.onboarding_dismissed if missing
    await db.$executeRawUnsafe(
      "ALTER TABLE org_members ADD COLUMN IF NOT EXISTS onboarding_dismissed BOOLEAN DEFAULT false;"
    )

    console.log('Migrations applied successfully.')
    // Diagnostic: report columns on organizations and existence of enum type
    try {
      const cols = await db.$queryRawUnsafe(
        "SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name = 'organizations' ORDER BY ordinal_position"
      )
      console.log('organizations table columns:')
      console.log(cols)

      // Try a robust diagnostic for enum values; different PG versions name
      // columns slightly differently or may require different joins. Wrap in
      // try/catch to avoid failing the whole script if the DB doesn't support
      // the diagnostic shape.
      try {
        const enumInfo = await db.$queryRawUnsafe(
          "SELECT t.typname AS type_name, e.enumlabel AS enum_value FROM pg_type t JOIN pg_enum e ON t.oid = e.enum_type JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace WHERE lower(t.typname) = 'organizationplan' ORDER BY e.enumsortorder"
        )
        console.log('OrganizationPlan enum rows:')
        console.log(enumInfo)
      } catch (diagErr) {
        console.warn('Could not run enum diagnostics:', (diagErr && diagErr.message) || diagErr)
      }
    } catch (e) {
      console.warn('Could not run diagnostics:', e.message || e)
    }
  } catch (err) {
    console.error('Error applying migrations:', err)
    process.exit(5)
  } finally {
    try {
      await db.$disconnect()
    } catch (e) {}
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

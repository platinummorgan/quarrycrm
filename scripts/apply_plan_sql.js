const { Client } = require('pg')

const sql = `DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'organizationplan') THEN
    CREATE TYPE "OrganizationPlan" AS ENUM ('FREE', 'PRO', 'TEAM');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='organizations' AND column_name='plan') THEN
    ALTER TABLE "organizations" ADD COLUMN "plan" "OrganizationPlan" NOT NULL DEFAULT 'FREE';
  END IF;
END$$;`

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  try {
    await client.connect()
    console.log('Connected to DB')
    const res = await client.query(sql)
    console.log('SQL applied:', res.command || res)
  } catch (err) {
    console.error(err)
    process.exit(1)
  } finally {
    await client.end()
  }
}

main()

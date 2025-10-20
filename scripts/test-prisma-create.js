const { PrismaClient } = require('@prisma/client')

async function main() {
  const url = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL
  if (!url) {
    console.error('No DB URL')
    process.exit(2)
  }
  const db = new PrismaClient({ log: ['query', 'info', 'warn', 'error'], datasources: { db: { url } } })
  try {
    const searchPath = await db.$queryRaw`SHOW search_path`
    console.log('search_path:', searchPath)
    const currentSchema = await db.$queryRaw`SELECT current_schema()`
    console.log('current_schema:', currentSchema)
    const tables = await db.$queryRaw`SELECT table_schema, table_name FROM information_schema.tables WHERE table_name='organizations'`
    console.log('tables named organizations:', tables)
    const cols = await db.$queryRaw`SELECT table_schema, column_name, data_type, udt_name FROM information_schema.columns WHERE table_name='organizations' ORDER BY table_schema, ordinal_position`
    console.log('columns:', cols)
    console.log('Attempting create...')
    const org = await db.organization.create({ data: { id: 'org1', name: 'O1' } })
    console.log('Created org:', org)
  } catch (err) {
    console.error('Error:', err)
  } finally {
    await db.$disconnect()
  }
}

main()

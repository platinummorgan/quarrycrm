const { PrismaClient } = require('@prisma/client')
;(async () => {
  const prisma = new PrismaClient()
  try {
    const orgCols = await prisma.$queryRaw`
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_name = 'organizations'
      ORDER BY ordinal_position
    `
    console.log('organizations columns:')
    console.dir(orgCols, { depth: null })

    const memberCols = await prisma.$queryRaw`
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_name = 'org_members'
      ORDER BY ordinal_position
    `
    console.log('org_members columns:')
    console.dir(memberCols, { depth: null })

    const enums = await prisma.$queryRaw`
      SELECT n.nspname as enum_schema, t.typname as enum_name, e.enumlabel as enum_value
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
      WHERE t.typname IN ('organizationplan','orgmemberrole')
      ORDER BY enum_schema, enum_name, e.enumsortorder
    `
    console.log('enum rows for organizationplan/orgmemberrole:')
    console.dir(enums, { depth: null })
  } catch (err) {
    console.error('error:', err)
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
})()

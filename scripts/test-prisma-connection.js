// small script to test Prisma DB connectivity using .env.test
const fs = require('fs')
const path = require('path')

// Load .env.test
const envPath = path.resolve(process.cwd(), '.env.test')
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8')
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    let key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    process.env[key] = val
  }
}

;(async () => {
  try {
    const { PrismaClient } = require('@prisma/client')
    const prisma = new PrismaClient()
    console.log('Using DATABASE_URL=', process.env.DATABASE_URL)
    const res = await prisma.$queryRawUnsafe('SELECT 1')
    console.log('Query result:', res)
    await prisma.$disconnect()
    process.exit(0)
  } catch (err) {
    console.error('Connection test failed:', err)
    // Try a fallback: remove channel_binding parameter which can break some TLS configs
    try {
      const fallbackUrl = (process.env.DATABASE_URL || '').replace(
        /&?channel_binding=require/,
        ''
      )
      if (!fallbackUrl || fallbackUrl === process.env.DATABASE_URL) throw err
      console.log(
        'Retrying with fallback URL (removed channel_binding):',
        fallbackUrl
      )
      process.env.DATABASE_URL = fallbackUrl
      const { PrismaClient: PrismaClient2 } = require('@prisma/client')
      const prisma2 = new PrismaClient2()
      const res2 = await prisma2.$queryRawUnsafe('SELECT 1')
      console.log('Fallback query result:', res2)
      await prisma2.$disconnect()
      process.exit(0)
    } catch (err2) {
      console.error('Fallback connection also failed:', err2)
      process.exit(2)
    }
  }
})()

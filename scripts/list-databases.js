// list-databases.js
// Connects to the server's 'postgres' database (using the same host/creds) and lists databases
const fs = require('fs')
const path = require('path')

// Load .env.test if present
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

const DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error(
    'No TEST_DATABASE_URL or DATABASE_URL found in environment or .env.test'
  )
  process.exit(2)
}

// Replace database path in the URL with '/postgres'
let url = DATABASE_URL
try {
  const u = new URL(DATABASE_URL)
  u.pathname = '/postgres'
  url = u.toString()
} catch (e) {
  // fallback: simple replace after last '/'
  url = DATABASE_URL.replace(/\/[^/]*\?/, '/postgres?')
}

console.log('Connecting to:', url)

const { Client } = require('pg')
;(async () => {
  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  })
  try {
    await client.connect()
    const res = await client.query(
      'SELECT datname FROM pg_database WHERE datistemplate = false;'
    )
    console.log('Databases:')
    for (const row of res.rows) console.log(' -', row.datname)
    await client.end()
    process.exit(0)
  } catch (err) {
    console.error(
      'Error listing databases:',
      err && err.stack ? err.stack : err
    )
    try {
      await client.end()
    } catch (e) {}
    process.exit(2)
  }
})()

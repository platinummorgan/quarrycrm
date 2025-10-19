// pg-connection-test.js
// Attempts to connect to the DB using node-postgres (pg) and prints full errors.
// Tries two ssl modes: default (ssl: true) and fallback (rejectUnauthorized: false).

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

console.log('Using DATABASE_URL=', DATABASE_URL)
console.log('Node version:', process.version)
console.log('OpenSSL version:', process.versions.openssl)

async function tryConnect(ssl) {
  const { Client } = require('pg')
  const opts = { connectionString: DATABASE_URL }
  if (ssl !== undefined) opts.ssl = ssl
  const client = new Client(opts)
  try {
    console.log('\nAttempting pg connect with ssl=', ssl)
    await client.connect()
    const res = await client.query('SELECT 1 as ok')
    console.log('Query result:', res.rows)
    await client.end()
    return { ok: true }
  } catch (err) {
    console.error('Connection error (ssl=' + ssl + '):')
    console.error(err && err.stack ? err.stack : err)
    try {
      await client.end()
    } catch (e) {}
    return { ok: false, err }
  }
}

;(async () => {
  try {
    // Try with default ssl behavior (let pg decide)
    const r1 = await tryConnect(true)
    if (r1.ok) return process.exit(0)

    // Fallback: explicitly disable certificate verification
    const r2 = await tryConnect({ rejectUnauthorized: false })
    if (r2.ok) return process.exit(0)

    // Final fallback: try without SSL (not recommended) — just to see the error
    const r3 = await tryConnect(false)
    if (r3.ok) return process.exit(0)

    console.error(
      '\nAll attempts failed. See errors above. If you expect Neon to require TLS, ensure your client supports the TLS settings required by Neon and that your IP is allowed. In CI, prefer using a local docker test DB to run tests when possible.'
    )
    process.exit(2)
  } catch (e) {
    console.error('Unexpected error:', e && e.stack ? e.stack : e)
    process.exit(2)
  }
})()

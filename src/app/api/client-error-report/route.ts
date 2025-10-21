import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const tmpDir = path.resolve(process.cwd(), 'tmp')
    try {
      fs.mkdirSync(tmpDir, { recursive: true })
    } catch {}
    const out = path.join(tmpDir, 'client-error-reports.log')
    const entry = `[${new Date().toISOString()}] ${JSON.stringify(body)}\n`
    fs.appendFileSync(out, entry)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Error saving client error report', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { Resend } from 'resend'

export const runtime = 'nodejs'

const resend = new Resend(process.env.RESEND_API_KEY!)
const base = process.env.NEXTAUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
const from = process.env.EMAIL_FROM || 'onboarding@resend.dev'

export async function POST(req: Request) {
  try {
    const { to } = await req.json()
    if (!to) return NextResponse.json({ ok: false, error: "Missing 'to'" }, { status: 400 })
    const link = new URL('/api/auth/callback/email?token=test-token', base).toString()
    const result = await resend.emails.send({
      from,
      to,
      subject: 'Test mail from Quarry CRM',
      html: `<a href="${link}">${link}</a>`,
    })
    // Resend SDK may return an object with `error` on failure
    if ((result as any)?.error) throw new Error((result as any).error.message || String((result as any).error))
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('test-email error:', e)
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 })
  }
}
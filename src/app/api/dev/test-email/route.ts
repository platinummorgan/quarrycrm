import { NextResponse } from 'next/server'
import { Resend } from 'resend'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any))
    const to = (body.to || body.email) as string | undefined
    const link = body.link as string | undefined
    if (!to) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Prefer to use internal helper if available (tests mock this module)
    try {
      const mod = await import('@/lib/auth-email')
      if (mod?.sendMagicLinkEmail) {
        // sendMagicLinkEmail(identifier: string, rawUrl: string)
        await mod.sendMagicLinkEmail(to, link || '')
        return NextResponse.json({ message: 'Test email sent successfully' }, { status: 200 })
      }
    } catch (e) {
      // ignore and fall back to Resend
    }

    const resend = new Resend(process.env.RESEND_API_KEY || '')
    const from = process.env.EMAIL_FROM || 'onboarding@resend.dev'
    const base = process.env.NEXTAUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://www.quarrycrm.com')

    const sent = await resend.emails.send({
      from,
      to,
      subject: 'Quarry CRM test email',
      html: `<p>Test link: <a href="${link || base}">open</a></p>`,
    })

    // If Resend reports an error shape, return 500 with message
    if ((sent as any)?.error) {
      return NextResponse.json(
        { ok: false, error: `send failed: ${(sent as any).error.message || String((sent as any).error)}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'Test email sent successfully' }, { status: 200 })
  } catch (e: any) {
    console.error('test-email error:', e)
    return NextResponse.json({ ok: false, error: `send failed: ${e?.message || String(e)}` }, { status: 500 })
  }
}
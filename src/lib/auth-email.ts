import { Resend } from 'resend'
import { getBaseUrl } from './baseUrl'

function getResendClient() {
  // Return a fresh Resend client each call. Tests mock the Resend
  // constructor per-test, so caching a client breaks test isolation.
  return process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
}

export async function sendMagicLinkEmail(identifier: string, rawUrl: string) {
  const resend = getResendClient()
  if (!resend) {
    throw new Error('Email service not configured')
  }

  // Force URL origin to canonical base
  const base = process.env.NEXTAUTH_URL || getBaseUrl()
  let forced: string
  try {
    const u = new URL(rawUrl)
    forced = new URL(u.pathname + u.search, base).toString()
  } catch (e) {
    // If rawUrl isn't a full URL, join it
    forced = `${base.replace(/\/$/, '')}/${rawUrl.replace(/^\//, '')}`
  }

  const from = process.env.EMAIL_FROM || 'onboarding@resend.dev'

  const res = await resend.emails.send({
    from,
    to: identifier,
    subject: 'Your Quarry CRM sign-in link',
    html: `<p>Click to sign in:</p><p><a href="${forced}">${forced}</a></p>`,
  })

  // Resend returns { id } on success, throws on auth error; safety-check for error
  if ((res as any)?.error) {
    throw new Error(`Email send failed: ${(res as any).error?.message || JSON.stringify((res as any).error)}`)
  }

  return res
}

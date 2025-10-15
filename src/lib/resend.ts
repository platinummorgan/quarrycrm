import { Resend } from 'resend'
import MagicLinkEmail from '@/emails/MagicLinkEmail'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export async function sendMagicLinkEmail({
  to,
  url,
  host,
}: {
  to: string
  url: string
  host: string
}) {
  if (!resend) {
    console.warn('RESEND_API_KEY not configured, skipping email send')
    return { success: false, error: 'Email service not configured' }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'login@mail.quarrycrm.com',
      to,
      subject: `Sign in to ${host}`,
      react: MagicLinkEmail({ url, host }),
    })

    if (error) {
      console.error('Resend email send failed:', error)
      const errorMessage = error.message || 'Unknown email sending error'
      throw new Error(`Failed to send magic link email: ${errorMessage}`)
    }

    return { success: true, data }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unexpected error during email send'
    console.error('Failed to send magic link email:', errorMessage)
    return { success: false, error: errorMessage }
  }
}
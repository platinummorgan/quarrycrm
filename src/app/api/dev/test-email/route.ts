import { NextRequest, NextResponse } from 'next/server'
import { sendMagicLinkEmail } from '@/lib/resend'
import { getBaseUrl } from '@/lib/baseUrl'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const baseUrl = getBaseUrl()
    const testUrl = `${baseUrl}/auth/signin?test=true`

    const result = await sendMagicLinkEmail({
      to: email,
      url: testUrl,
      host: 'QuarryCRM (Test)',
    })

    if (result.success) {
      return NextResponse.json({ message: 'Test email sent successfully' })
    } else {
      console.error('Test email failed:', result.error)
      return NextResponse.json({ 
        error: 'Failed to send test email', 
        details: result.error,
        suggestion: 'Check your Resend API key and domain verification status'
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Test email error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
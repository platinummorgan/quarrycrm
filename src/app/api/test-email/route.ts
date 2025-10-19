import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function GET(request: NextRequest) {
  try {
    // Trim any whitespace/newlines from environment variables
    const apiKey = process.env.RESEND_API_KEY?.trim()
    const emailFrom = process.env.EMAIL_FROM?.trim()

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'RESEND_API_KEY not found',
        env: {
          hasApiKey: false,
          hasEmailFrom: !!emailFrom,
          nodeEnv: process.env.NODE_ENV,
        },
      }, { status: 500 })
    }

    const resend = new Resend(apiKey)
    
    const result = await resend.emails.send({
      from: emailFrom || 'noreply@mail.quarrycrm.com',
      to: 'mdorminey79@gmail.com',
      subject: 'Test Email from Quarry CRM API Route',
      html: '<p>This is a test email sent directly from the API route.</p>',
    })

    if (result.error) {
      return NextResponse.json({
        success: false,
        error: result.error,
        env: {
          hasApiKey: true,
          hasEmailFrom: !!emailFrom,
          emailFrom: emailFrom,
          apiKeyPrefix: apiKey.substring(0, 10),
        },
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      emailId: result.data?.id,
      env: {
        hasApiKey: true,
        hasEmailFrom: !!emailFrom,
        emailFrom: emailFrom,
      },
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
    }, { status: 500 })
  }
}

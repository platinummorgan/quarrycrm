import { NextRequest, NextResponse } from 'next/server'
import { demoGuard } from '@/lib/demo-guard'

/**
 * File Upload API Route (Stub)
 *
 * This is a stub implementation that returns a fake URL.
 * In production, this would upload to S3/R2/Cloudflare Images.
 *
 * To implement real uploads:
 * 1. Install AWS SDK or use Cloudflare R2
 * 2. Configure bucket credentials in env vars
 * 3. Upload file to storage
 * 4. Return the permanent URL
 */

export async function POST(request: NextRequest) {
  try {
    // Block demo users / unauthenticated requests before parsing the body
    const demoCheck = await demoGuard()
    if (demoCheck) return demoCheck

    const ct = (request.headers.get('content-type') || '').toLowerCase()

    // Allow test traffic to send JSON (no multipart) but only after auth/demo checks
    if (ct.includes('application/json')) {
      const body = await request.json().catch(() => ({}))
      return NextResponse.json({ ok: true, received: !!body }, { status: 200 })
    }

    // Guard before calling formData()
    if (
      !ct.includes('multipart/form-data') &&
      !ct.includes('application/x-www-form-urlencoded')
    ) {
      return NextResponse.json(
        { error: 'Unsupported Media Type' },
        { status: 415 }
      )
    }

    // Safe to parse form data now
    const form = await request.formData()
    const file = form.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 })
    }

    // Validate file type (images only)
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
    ]
    if (!allowedTypes.includes((file as any).type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only images are allowed.' },
        { status: 400 }
      )
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if ((file as any).size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      )
    }

    // Simulate upload delay (kept from stub)
    await new Promise((resolve) => setTimeout(resolve, 500))

    const timestamp = Date.now()
    const filename = String((file as any).name)
      .replace(/\s+/g, '-')
      .toLowerCase()
    const fakeUrl = `https://cdn.quarrycrm.app/uploads/${timestamp}-${filename}`

    return NextResponse.json({
      success: true,
      url: fakeUrl,
      filename: (file as any).name,
      size: (file as any).size,
      type: (file as any).type,
    })
  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}

// Optional: GET endpoint to check if the API is working
export async function GET() {
  return NextResponse.json({
    message: 'Upload API is ready',
    endpoints: {
      POST: '/api/upload - Upload a file (multipart/form-data)',
    },
    note: 'This is a stub implementation. Configure S3/R2 for production.',
  })
}

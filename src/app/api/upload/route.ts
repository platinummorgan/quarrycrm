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
  // Block demo users from file uploads
  const demoCheck = await demoGuard()
  if (demoCheck) return demoCheck

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type (images only)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only images are allowed.' },
        { status: 400 }
      )
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      )
    }

    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 500))

    // Generate a fake URL based on the file name
    // In production, this would be the actual S3/R2 URL
    const timestamp = Date.now()
    const filename = file.name.replace(/\s+/g, '-').toLowerCase()
    const fakeUrl = `https://cdn.quarrycrm.app/uploads/${timestamp}-${filename}`

    // For development, you could also convert to base64 data URL:
    // const buffer = await file.arrayBuffer()
    // const base64 = Buffer.from(buffer).toString('base64')
    // const dataUrl = `data:${file.type};base64,${base64}`

    return NextResponse.json({
      success: true,
      url: fakeUrl,
      filename: file.name,
      size: file.size,
      type: file.type,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
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

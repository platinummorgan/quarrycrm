import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getExportJob } from '@/server/workspace-export'

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const job = await getExportJob(params.jobId)
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Check if user has access to this organization
    // TODO: Add proper permission check

    if (job.status !== 'COMPLETED') {
      return NextResponse.json({ error: 'Export not ready' }, { status: 400 })
    }

    // Check if job has expired (7 days)
    const createdAt = new Date(job.createdAt)
    const expiresAt = new Date(createdAt)
    expiresAt.setDate(expiresAt.getDate() + 7)

    if (new Date() > expiresAt) {
      return NextResponse.json(
        { error: 'Download link expired' },
        { status: 410 }
      )
    }

    // Get ZIP data from metadata (in production, fetch from S3/R2)
    const metadata = job.metadata as any
    const zipData = metadata.zipData

    if (!zipData) {
      return NextResponse.json(
        { error: 'Export file not found' },
        { status: 404 }
      )
    }

    const buffer = Buffer.from(zipData, 'base64')

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="workspace-export-${params.jobId}.zip"`,
        'Content-Length': buffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('Download error:', error)
    return NextResponse.json({ error: 'Download failed' }, { status: 500 })
  }
}

/**
 * Workspace Export API
 * 
 * POST /api/export - Start async export job
 * GET /api/export/:jobId - Get export job status
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { processExportJob, type ExportOptions } from '@/lib/jobs/export'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current organization from session or request
    const body = await request.json()
    const { organizationId, format = 'json', ...options } = body as ExportOptions & { organizationId: string }

    // Verify user has access to organization
    const membership = await prisma.orgMember.findFirst({
      where: {
        userId: session.user.id,
        organizationId,
        role: { in: ['OWNER', 'ADMIN'] }, // Only owners/admins can export
      },
    })

    if (!membership) {
      return NextResponse.json(
        { error: 'Access denied. You must be an owner or admin to export workspace data.' },
        { status: 403 }
      )
    }

    // Create export job
    const job = await prisma.workspaceJob.create({
      data: {
        organizationId,
        userId: session.user.id,
        type: 'EXPORT',
        status: 'PENDING',
        metadata: {
          format,
          ...options,
        } as any,
      },
    })

    // Start async processing (in production, use a queue like BullMQ or Inngest)
    processExportJob(job.id).catch((error) => {
      console.error(`Export job ${job.id} failed:`, error)
    })

    return NextResponse.json({
      jobId: job.id,
      status: 'PENDING',
      message: 'Export job started. Check status using GET /api/export/:jobId',
    })
  } catch (error) {
    console.error('Export API error:', error)
    return NextResponse.json(
      {
        error: 'Failed to start export',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get jobId from URL
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')

    if (!jobId) {
      return NextResponse.json({ error: 'jobId parameter required' }, { status: 400 })
    }

    // Get job
    const job = await prisma.workspaceJob.findUnique({
      where: { id: jobId },
    })

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Verify user has access
    if (job.userId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Return job status
    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      type: job.type,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
      result: job.result,
      error: job.error,
    })
  } catch (error) {
    console.error('Export status API error:', error)
    return NextResponse.json(
      {
        error: 'Failed to get export status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

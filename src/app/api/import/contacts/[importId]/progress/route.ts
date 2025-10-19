import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { importId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's organization
    const member = await prisma.orgMember.findFirst({
      where: { userId: session.user.id },
      include: {
        organization: true,
      },
    })

    if (!member?.organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    const importId = params.importId

    // Get the import history and verify ownership
    const importHistory = await prisma.importHistory.findUnique({
      where: { id: importId },
      select: {
        id: true,
        organizationId: true,
        status: true,
        totalRows: true,
        processedRows: true,
        skippedRows: true,
        errorRows: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    if (!importHistory) {
      return NextResponse.json({ error: 'Import not found' }, { status: 404 })
    }

    // Verify the import belongs to the user's organization
    if (importHistory.organizationId !== member.organization.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    const progress = (importHistory.totalRows ?? 0) > 0
      ? (importHistory.processedRows / (importHistory.totalRows ?? 1)) * 100
      : 0

    return NextResponse.json({
      importId: importHistory.id,
      status: importHistory.status,
      progress: Math.round(progress),
      totalRows: importHistory.totalRows,
      processedRows: importHistory.processedRows,
      skippedRows: importHistory.skippedRows,
      errorRows: importHistory.errorRows,
      updatedAt: importHistory.updatedAt,
    })
  } catch (error) {
    console.error('Import progress error:', error)
    return NextResponse.json(
      { error: 'Failed to get import progress' },
      { status: 500 }
    )
  }
}
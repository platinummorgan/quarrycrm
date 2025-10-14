import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Rollback an import
export async function POST(
  request: NextRequest,
  { params }: { params: { importId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.currentOrg) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const importId = params.importId

    // Get the import record with rollback data
    const importRecord = await prisma.importHistory.findUnique({
      where: {
        id: importId,
        organizationId: session.user.currentOrg.id,
      },
      include: {
        rollbacks: true,
      },
    })

    if (!importRecord) {
      return NextResponse.json(
        { error: 'Import record not found' },
        { status: 404 }
      )
    }

    if (importRecord.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Only completed imports can be rolled back' },
        { status: 400 }
      )
    }

    if (importRecord.rollbacks.length > 0) {
      return NextResponse.json(
        { error: 'Import has already been rolled back' },
        { status: 400 }
      )
    }

    const affectedIds = importRecord.affectedIds

    if (!affectedIds || affectedIds.length === 0) {
      return NextResponse.json(
        { error: 'No records to rollback' },
        { status: 400 }
      )
    }

    // Delete the imported records
    switch (importRecord.entityType) {
      case 'CONTACT':
        await prisma.contact.deleteMany({
          where: {
            id: { in: affectedIds },
            organizationId: session.user.currentOrg.id,
          },
        })
        break
      case 'COMPANY':
        await prisma.company.deleteMany({
          where: {
            id: { in: affectedIds },
            organizationId: session.user.currentOrg.id,
          },
        })
        break
      case 'DEAL':
        await prisma.deal.deleteMany({
          where: {
            id: { in: affectedIds },
            organizationId: session.user.currentOrg.id,
          },
        })
        break
    }

    // Update import status to rolled back
    await prisma.importHistory.update({
      where: { id: importId },
      data: {
        status: 'ROLLED_BACK',
        updatedAt: new Date(),
      },
    })

    // Create rollback records for each affected entity
    const rollbackRecords = affectedIds.map((entityId: string) => ({
      importId,
      entityType: importRecord.entityType,
      entityId,
      action: 'DELETE' as const,
    }))

    await prisma.importRollback.createMany({
      data: rollbackRecords,
    })

    return NextResponse.json({
      success: true,
      message: `Successfully rolled back ${affectedIds.length} records`,
      affectedCount: affectedIds.length,
    })

  } catch (error) {
    console.error('Rollback error:', error)
    return NextResponse.json(
      { error: 'Failed to rollback import' },
      { status: 500 }
    )
  }
}
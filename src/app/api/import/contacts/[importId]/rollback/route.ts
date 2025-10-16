import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { demoGuard } from '@/lib/demo-guard'

export async function POST(
  request: NextRequest,
  { params }: { params: { importId: string } }
) {
  try {
    // Block demo users from rollback operations
    const demoCheck = await demoGuard()
    if (demoCheck) return demoCheck

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
      include: { rollbacks: true }
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

    if (importHistory.status === 'ROLLED_BACK') {
      return NextResponse.json({ error: 'Import already rolled back' }, { status: 400 })
    }

    // Get all rollback entries for this import
    const rollbackEntries = await prisma.importRollback.findMany({
      where: { importId }
    })

    let deletedCount = 0

    // Process rollbacks in reverse order (delete what was created)
    for (const entry of rollbackEntries.reverse()) {
      if (entry.action === 'CREATE') {
        try {
          await prisma.contact.delete({
            where: { id: entry.entityId }
          })
          deletedCount++
        } catch (error) {
          // Contact might have been deleted or modified, continue
          console.warn(`Failed to delete contact ${entry.entityId}:`, error)
        }
      }
    }

    // Update import history status
    await prisma.importHistory.update({
      where: { id: importId },
      data: {
        status: 'ROLLED_BACK'
      }
    })

    return NextResponse.json({
      message: 'Import rolled back successfully',
      deletedCount
    })
  } catch (error) {
    console.error('Rollback error:', error)
    return NextResponse.json(
      { error: 'Rollback failed' },
      { status: 500 }
    )
  }
}
/**
 * Workspace Delete API
 *
 * DELETE /api/workspace/delete - Soft delete or permanent delete workspace
 *
 * Soft delete: Sets deletedAt and schedules purge for 30 days
 * Permanent delete: Requires confirmation phrase and immediately purges
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const CONFIRMATION_PHRASE = 'delete my workspace'
const PURGE_DELAY_DAYS = 30

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { organizationId, confirmationPhrase, immediate = false } = body

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId required' },
        { status: 400 }
      )
    }

    // Verify user is owner
    const membership = await prisma.orgMember.findFirst({
      where: {
        userId: session.user.id,
        organizationId,
        role: 'OWNER',
      },
    })

    if (!membership) {
      return NextResponse.json(
        {
          error: 'Access denied. Only workspace owners can delete workspaces.',
        },
        { status: 403 }
      )
    }

    // Get organization
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        _count: {
          select: {
            contacts: true,
            companies: true,
            deals: true,
            members: true,
          },
        },
      },
    })

    if (!organization) {
      return NextResponse.json(
        { error: 'Workspace not found' },
        { status: 404 }
      )
    }

    // Check if already deleted
    if (organization.deletedAt) {
      return NextResponse.json(
        {
          error: 'Workspace already scheduled for deletion',
          scheduledPurgeAt: organization.scheduledPurgeAt,
        },
        { status: 400 }
      )
    }

    // Immediate deletion requires confirmation phrase
    if (immediate) {
      if (confirmationPhrase?.toLowerCase().trim() !== CONFIRMATION_PHRASE) {
        return NextResponse.json(
          {
            error: 'Invalid confirmation phrase',
            required: CONFIRMATION_PHRASE,
            hint: 'Type exactly: "delete my workspace"',
          },
          { status: 400 }
        )
      }

      // PERMANENT DELETE - no recovery
      await prisma.organization.delete({
        where: { id: organizationId },
      })

      return NextResponse.json({
        success: true,
        action: 'permanent_delete',
        message: 'Workspace permanently deleted',
        deletedCounts: organization._count,
      })
    }

    // SOFT DELETE - schedule purge for 30 days
    const deletedAt = new Date()
    const scheduledPurgeAt = new Date(
      deletedAt.getTime() + PURGE_DELAY_DAYS * 24 * 60 * 60 * 1000
    )

    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        deletedAt,
        scheduledPurgeAt,
        deletedBy: session.user.id,
      },
    })

    return NextResponse.json({
      success: true,
      action: 'soft_delete',
      message: `Workspace scheduled for deletion. Data will be permanently removed on ${scheduledPurgeAt.toISOString().split('T')[0]}.`,
      deletedAt: deletedAt.toISOString(),
      scheduledPurgeAt: scheduledPurgeAt.toISOString(),
      recoveryPeriod: `${PURGE_DELAY_DAYS} days`,
      recordCounts: organization._count,
    })
  } catch (error) {
    console.error('Workspace delete API error:', error)
    return NextResponse.json(
      {
        error: 'Failed to delete workspace',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * Cancel scheduled deletion and restore workspace
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { organizationId } = body

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId required' },
        { status: 400 }
      )
    }

    // Verify user is owner
    const membership = await prisma.orgMember.findFirst({
      where: {
        userId: session.user.id,
        organizationId,
        role: 'OWNER',
      },
    })

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Cancel deletion
    const restored = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        deletedAt: null,
        scheduledPurgeAt: null,
        deletedBy: null,
      },
    })

    return NextResponse.json({
      success: true,
      action: 'restore',
      message: 'Workspace deletion cancelled. Data has been restored.',
      restoredAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Workspace restore API error:', error)
    return NextResponse.json(
      {
        error: 'Failed to restore workspace',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

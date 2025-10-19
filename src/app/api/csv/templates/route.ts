import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { EntityType } from '@/lib/csv-processor'
import { demoGuard } from '@/lib/demo-guard'

// Get import templates for an organization
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const entityType = searchParams.get('entityType') as EntityType

    // Get current user/org from session (simplified)
    const orgId = 'org_123' // This should come from auth context
    const userId = 'user_123' // This should come from auth context

    const where: any = {
      organizationId: orgId,
      ownerId: userId,
    }

    if (entityType) {
      where.entityType = entityType
    }

    const templates = await prisma.importTemplate.findMany({
      where,
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    })

    return NextResponse.json({ templates })
  } catch (error) {
    console.error('Get templates error:', error)
    return NextResponse.json(
      { error: 'Failed to get templates' },
      { status: 500 }
    )
  }
}

// Create a new import template
export async function POST(request: NextRequest) {
  // Block demo users from creating templates
  const demoCheck = await demoGuard()
  if (demoCheck) return demoCheck

  try {
    const body = await request.json()
    const { name, entityType, mappings, isDefault = false } = body

    if (!name || !entityType || !mappings) {
      return NextResponse.json(
        { error: 'Name, entity type, and mappings are required' },
        { status: 400 }
      )
    }

    // Get current user/org from session (simplified)
    const orgId = 'org_123' // This should come from auth context
    const userId = 'user_123' // This should come from auth context

    // If setting as default, unset other defaults for this entity type
    if (isDefault) {
      await prisma.importTemplate.updateMany({
        where: {
          organizationId: orgId,
          ownerId: userId,
          entityType,
          isDefault: true,
        },
        data: { isDefault: false },
      })
    }

    const template = await prisma.importTemplate.create({
      data: {
        name,
        entityType,
        template: mappings,
        isDefault,
        organizationId: orgId,
        ownerId: userId,
      },
    })

    return NextResponse.json({ template })
  } catch (error) {
    console.error('Create template error:', error)
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    )
  }
}

// Update an import template
export async function PUT(request: NextRequest) {
  // Block demo users from updating templates
  const demoCheck = await demoGuard()
  if (demoCheck) return demoCheck

  try {
    const body = await request.json()
    const { id, name, mappings, isDefault } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      )
    }

    // Get current user/org from session (simplified)
    const orgId = 'org_123' // This should come from auth context
    const userId = 'user_123' // This should come from auth context

    // If setting as default, unset other defaults for this entity type
    if (isDefault) {
      const template = await prisma.importTemplate.findUnique({
        where: { id },
      })

      if (template) {
        await prisma.importTemplate.updateMany({
          where: {
            organizationId: orgId,
            ownerId: userId,
            entityType: template.entityType,
            isDefault: true,
            id: { not: id },
          },
          data: { isDefault: false },
        })
      }
    }

    const template = await prisma.importTemplate.update({
      where: {
        id,
        organizationId: orgId,
        ownerId: userId,
      },
      data: {
        ...(name && { name }),
        ...(mappings && { template: mappings }),
        ...(isDefault !== undefined && { isDefault }),
      },
    })

    return NextResponse.json({ template })
  } catch (error) {
    console.error('Update template error:', error)
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    )
  }
}

// Delete an import template
export async function DELETE(request: NextRequest) {
  // Block demo users from deleting templates
  const demoCheck = await demoGuard()
  if (demoCheck) return demoCheck

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      )
    }

    // Get current user/org from session (simplified)
    const orgId = 'org_123' // This should come from auth context
    const userId = 'user_123' // This should come from auth context

    await prisma.importTemplate.delete({
      where: {
        id,
        organizationId: orgId,
        ownerId: userId,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete template error:', error)
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    )
  }
}

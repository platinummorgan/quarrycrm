'use server'

import { prisma } from '@/lib/prisma'
import { requireOrg } from '@/lib/auth-helpers'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// Schema for updating workspace
const updateWorkspaceSchema = z.object({
  name: z.string().min(1, 'Workspace name is required').max(100, 'Name too long'),
  logo: z.string().url().optional().nullable(),
})

// Get current workspace
export async function getWorkspace() {
  const { orgId } = await requireOrg()

  const organization = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      id: true,
      name: true,
      domain: true,
      description: true,
      logo: true,
      emailLogAddress: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (!organization) {
    throw new Error('Organization not found')
  }

  return organization
}

// Update workspace
export async function updateWorkspace(data: z.infer<typeof updateWorkspaceSchema>) {
  const { orgId } = await requireOrg()

  // Validate input
  const validatedData = updateWorkspaceSchema.parse(data)

  // Update organization
  const updatedOrg = await prisma.organization.update({
    where: { id: orgId },
    data: {
      name: validatedData.name,
      logo: validatedData.logo,
    },
    select: {
      id: true,
      name: true,
      domain: true,
      description: true,
      logo: true,
      emailLogAddress: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  // Revalidate the settings page
  revalidatePath('/app/settings')

  return updatedOrg
}
import { z } from 'zod'
import { createTRPCRouter, orgProcedure, demoProcedure } from '@/server/trpc/trpc'
import { prisma } from '@/lib/prisma'
import { TRPCError } from '@trpc/server'
import { randomBytes, createHmac } from 'crypto'
import { nanoid } from 'nanoid'

// Update workspace settings (name, logo, email log address)
const updateWorkspaceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  logo: z.string().url().optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  emailLogAddress: z.string().email().optional().nullable(),
})

// Invite member schema
const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER']).default('MEMBER'),
})

// Update member role schema
const updateMemberRoleSchema = z.object({
  memberId: z.string(),
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER']),
})

// Create API key schema
const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  expiresInDays: z.number().int().positive().optional(),
})

// Create webhook schema
const createWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).min(1),
  isActive: z.boolean().default(true),
})

// Update webhook schema
const updateWebhookSchema = z.object({
  id: z.string(),
  url: z.string().url().optional(),
  events: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
})

function generateApiKey(): { key: string; keyPrefix: string; hashedKey: string } {
  const key = `qcrm_${nanoid(32)}`
  const keyPrefix = key.substring(0, 12)
  const hashedKey = createHmac('sha256', process.env.API_KEY_SECRET || 'default-secret')
    .update(key)
    .digest('hex')
  
  return { key, keyPrefix, hashedKey }
}

export const settingsRouter = createTRPCRouter({
  // Get current workspace settings
  getWorkspace: orgProcedure.query(async ({ ctx }) => {
    const { orgId } = ctx

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        name: true,
        logo: true,
        description: true,
        emailLogAddress: true,
        plan: true,
        createdAt: true,
        _count: {
          select: {
            members: true,
            contacts: true,
            companies: true,
            deals: true,
            apiKeys: true,
            webhooks: true,
          },
        },
      },
    })

    if (!org) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Organization not found',
      })
    }

    return org
  }),

  // Update workspace settings
  updateWorkspace: demoProcedure
    .input(updateWorkspaceSchema)
    .mutation(async ({ ctx, input }) => {
      const { orgId, userId } = ctx

      // Check if user is admin or owner
      const member = await prisma.orgMember.findFirst({
        where: {
          organizationId: orgId,
          userId,
          role: { in: ['OWNER', 'ADMIN'] },
        },
      })

      if (!member) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only owners and admins can update workspace settings',
        })
      }

      return prisma.organization.update({
        where: { id: orgId },
        data: input,
      })
    }),

  // Get all members
  getMembers: orgProcedure.query(async ({ ctx }) => {
    const { orgId } = ctx

    return prisma.orgMember.findMany({
      where: { organizationId: orgId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: [
        { role: 'asc' },
        { createdAt: 'asc' },
      ],
    })
  }),

  // Generate magic link for invitation
  inviteMember: demoProcedure
    .input(inviteMemberSchema)
    .mutation(async ({ ctx, input }) => {
      const { orgId, userId } = ctx

      // Check if user is admin or owner
      const member = await prisma.orgMember.findFirst({
        where: {
          organizationId: orgId,
          userId,
          role: { in: ['OWNER', 'ADMIN'] },
        },
      })

      if (!member) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only owners and admins can invite members',
        })
      }

      // Check plan limits
      const org = await prisma.organization.findUnique({
        where: { id: orgId },
        include: {
          _count: {
            select: { members: true },
          },
        },
      })

      if (!org) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Organization not found',
        })
      }

      // Import plan limits
      const { PLAN_LIMITS } = await import('@/lib/plans')
      const limit = PLAN_LIMITS[org.plan].users
      if (limit !== -1 && org._count.members >= limit) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: `Your ${org.plan} plan allows up to ${limit} users. Please upgrade to add more.`,
        })
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: input.email },
      })

      // Check if already a member
      if (existingUser) {
        const existingMember = await prisma.orgMember.findFirst({
          where: {
            organizationId: orgId,
            userId: existingUser.id,
          },
        })

        if (existingMember) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'User is already a member of this organization',
          })
        }
      }

      // Generate magic link token
      const token = nanoid(32)
      const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`

      // Store invitation in audit log
      await prisma.eventAudit.create({
        data: {
          organizationId: orgId,
          eventType: 'member.invited',
          eventData: {
            email: input.email,
            role: input.role,
            token,
            invitedBy: userId,
          },
        },
      })

      return {
        inviteUrl,
        token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      }
    }),

  // Update member role
  updateMemberRole: demoProcedure
    .input(updateMemberRoleSchema)
    .mutation(async ({ ctx, input }) => {
      const { orgId, userId } = ctx

      // Check if user is admin or owner
      const currentMember = await prisma.orgMember.findFirst({
        where: {
          organizationId: orgId,
          userId,
          role: { in: ['OWNER', 'ADMIN'] },
        },
      })

      if (!currentMember) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only owners and admins can update member roles',
        })
      }

      // Prevent changing the last owner
      if (input.role !== 'OWNER') {
        const targetMember = await prisma.orgMember.findUnique({
          where: { id: input.memberId },
        })

        if (targetMember?.role === 'OWNER') {
          const ownerCount = await prisma.orgMember.count({
            where: {
              organizationId: orgId,
              role: 'OWNER',
            },
          })

          if (ownerCount <= 1) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'Cannot change the role of the last owner',
            })
          }
        }
      }

      return prisma.orgMember.update({
        where: { id: input.memberId },
        data: { role: input.role },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      })
    }),

  // Remove member
  removeMember: demoProcedure
    .input(z.object({ memberId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { orgId, userId } = ctx

      // Check if user is admin or owner
      const currentMember = await prisma.orgMember.findFirst({
        where: {
          organizationId: orgId,
          userId,
          role: { in: ['OWNER', 'ADMIN'] },
        },
      })

      if (!currentMember) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only owners and admins can remove members',
        })
      }

      // Check if removing the last owner
      const targetMember = await prisma.orgMember.findUnique({
        where: { id: input.memberId },
      })

      if (targetMember?.role === 'OWNER') {
        const ownerCount = await prisma.orgMember.count({
          where: {
            organizationId: orgId,
            role: 'OWNER',
          },
        })

        if (ownerCount <= 1) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Cannot remove the last owner',
          })
        }
      }

      await prisma.orgMember.delete({
        where: { id: input.memberId },
      })

      return { success: true }
    }),

  // Get all API keys
  getApiKeys: orgProcedure.query(async ({ ctx }) => {
    const { orgId } = ctx

    return prisma.apiKey.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null,
      },
      include: {
        owner: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }),

  // Create API key
  createApiKey: demoProcedure
    .input(createApiKeySchema)
    .mutation(async ({ ctx, input }) => {
      const { orgId, userId } = ctx

      // Get org member
      const member = await prisma.orgMember.findFirst({
        where: {
          organizationId: orgId,
          userId,
        },
      })

      if (!member) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'User not in organization',
        })
      }

      // Check plan limits
      const org = await prisma.organization.findUnique({
        where: { id: orgId },
        include: {
          _count: {
            select: { apiKeys: { where: { deletedAt: null } } },
          },
        },
      })

      if (!org) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Organization not found',
        })
      }

      const { PLAN_LIMITS } = await import('@/lib/plans')
      const limit = PLAN_LIMITS[org.plan].apiKeys
      if (limit !== -1 && org._count.apiKeys >= limit) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: `Your ${org.plan} plan allows up to ${limit} API keys. Please upgrade to add more.`,
        })
      }

      const { key, keyPrefix, hashedKey } = generateApiKey()

      const expiresAt = input.expiresInDays
        ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000)
        : null

      const apiKey = await prisma.apiKey.create({
        data: {
          name: input.name,
          key: hashedKey,
          keyPrefix,
          expiresAt,
          organizationId: orgId,
          ownerId: member.id,
        },
        include: {
          owner: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      })

      // Return the plain key only once
      return {
        ...apiKey,
        plainKey: key, // Only shown once!
      }
    }),

  // Revoke API key
  revokeApiKey: demoProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { orgId, userId } = ctx

      // Check ownership or admin
      const member = await prisma.orgMember.findFirst({
        where: {
          organizationId: orgId,
          userId,
        },
      })

      if (!member) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'User not in organization',
        })
      }

      const apiKey = await prisma.apiKey.findFirst({
        where: {
          id: input.id,
          organizationId: orgId,
        },
      })

      if (!apiKey) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'API key not found',
        })
      }

      // Allow owner of the key or admins to revoke
      if (apiKey.ownerId !== member.id && !['OWNER', 'ADMIN'].includes(member.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only the key owner or admins can revoke this key',
        })
      }

      await prisma.apiKey.update({
        where: { id: input.id },
        data: { deletedAt: new Date() },
      })

      return { success: true }
    }),

  // Get all webhooks
  getWebhooks: orgProcedure.query(async ({ ctx }) => {
    const { orgId } = ctx

    return prisma.webhook.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null,
      },
      include: {
        owner: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }),

  // Create webhook
  createWebhook: demoProcedure
    .input(createWebhookSchema)
    .mutation(async ({ ctx, input }) => {
      const { orgId, userId } = ctx

      // Get org member
      const member = await prisma.orgMember.findFirst({
        where: {
          organizationId: orgId,
          userId,
        },
      })

      if (!member) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'User not in organization',
        })
      }

      // Check plan limits
      const org = await prisma.organization.findUnique({
        where: { id: orgId },
        include: {
          _count: {
            select: { webhooks: { where: { deletedAt: null } } },
          },
        },
      })

      if (!org) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Organization not found',
        })
      }

      const { PLAN_LIMITS } = await import('@/lib/plans')
      const limit = PLAN_LIMITS[org.plan].webhooks
      if (limit !== -1 && org._count.webhooks >= limit) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: `Your ${org.plan} plan allows up to ${limit} webhooks. Please upgrade to add more.`,
        })
      }

      // Generate webhook secret
      const secret = randomBytes(32).toString('hex')

      return prisma.webhook.create({
        data: {
          url: input.url,
          events: input.events,
          isActive: input.isActive,
          secret,
          organizationId: orgId,
          ownerId: member.id,
        },
        include: {
          owner: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      })
    }),

  // Update webhook
  updateWebhook: demoProcedure
    .input(updateWebhookSchema)
    .mutation(async ({ ctx, input }) => {
      const { orgId, userId } = ctx
      const { id, ...updateData } = input

      // Check ownership or admin
      const member = await prisma.orgMember.findFirst({
        where: {
          organizationId: orgId,
          userId,
        },
      })

      if (!member) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'User not in organization',
        })
      }

      const webhook = await prisma.webhook.findFirst({
        where: {
          id,
          organizationId: orgId,
          deletedAt: null,
        },
      })

      if (!webhook) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Webhook not found',
        })
      }

      // Allow owner of the webhook or admins to update
      if (webhook.ownerId !== member.id && !['OWNER', 'ADMIN'].includes(member.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only the webhook owner or admins can update this webhook',
        })
      }

      return prisma.webhook.update({
        where: { id },
        data: updateData,
        include: {
          owner: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      })
    }),

  // Delete webhook
  deleteWebhook: demoProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { orgId, userId } = ctx

      // Check ownership or admin
      const member = await prisma.orgMember.findFirst({
        where: {
          organizationId: orgId,
          userId,
        },
      })

      if (!member) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'User not in organization',
        })
      }

      const webhook = await prisma.webhook.findFirst({
        where: {
          id: input.id,
          organizationId: orgId,
        },
      })

      if (!webhook) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Webhook not found',
        })
      }

      // Allow owner of the webhook or admins to delete
      if (webhook.ownerId !== member.id && !['OWNER', 'ADMIN'].includes(member.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only the webhook owner or admins can delete this webhook',
        })
      }

      await prisma.webhook.update({
        where: { id: input.id },
        data: { deletedAt: new Date() },
      })

      return { success: true }
    }),

  // Get plan usage
  getPlanUsage: orgProcedure.query(async ({ ctx }) => {
    const { orgId } = ctx

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        _count: {
          select: {
            members: true,
            contacts: true,
            companies: true,
            deals: true,
            apiKeys: { where: { deletedAt: null } },
            webhooks: { where: { deletedAt: null } },
          },
        },
      },
    })

    if (!org) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Organization not found',
      })
    }

    const { PLAN_LIMITS, PLAN_NAMES, PLAN_PRICES } = await import('@/lib/plans')
    const limits = PLAN_LIMITS[org.plan]

    return {
      plan: org.plan,
      planName: PLAN_NAMES[org.plan],
      pricing: PLAN_PRICES[org.plan],
      usage: {
        contacts: org._count.contacts,
        companies: org._count.companies,
        deals: org._count.deals,
        users: org._count.members,
        apiKeys: org._count.apiKeys,
        webhooks: org._count.webhooks,
      },
      limits,
    }
  }),
})

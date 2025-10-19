import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { TRPCError } from '@trpc/server'

// View configuration schema for validation
export const viewConfigSchema = z.object({
  filters: z.record(z.any()),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  visibleColumns: z.array(z.string()).optional(),
})

export type ViewConfig = z.infer<typeof viewConfigSchema>

// URL encoding/decoding utilities for shareable view links
export class ViewUrlCodec {
  private static readonly SEPARATOR = '|'
  private static readonly FILTER_SEPARATOR = ':'

  /**
   * Encodes a view configuration into a URL-safe string
   */
  static encode(config: ViewConfig): string {
    const parts: string[] = []

    // Encode filters
    if (Object.keys(config.filters).length > 0) {
      const filterParts = Object.entries(config.filters).map(([key, value]) => {
        const encodedValue = typeof value === 'string'
          ? encodeURIComponent(value)
          : encodeURIComponent(JSON.stringify(value))
        return `${key}${this.FILTER_SEPARATOR}${encodedValue}`
      })
      parts.push(`filters=${filterParts.join(',')}`)
    }

    // Encode sorting
    if (config.sortBy) {
      parts.push(`sortBy=${encodeURIComponent(config.sortBy)}`)
    }
    if (config.sortOrder) {
      parts.push(`sortOrder=${config.sortOrder}`)
    }

    // Encode visible columns
    if (config.visibleColumns && config.visibleColumns.length > 0) {
      parts.push(`columns=${config.visibleColumns.join(',')}`)
    }

    return parts.join(this.SEPARATOR)
  }

  /**
   * Decodes a URL-safe string back into a view configuration
   */
  static decode(encoded: string): ViewConfig {
    const config: ViewConfig = {
      filters: {},
      visibleColumns: undefined,
    }

    const parts = encoded.split(this.SEPARATOR)

    for (const part of parts) {
      const [key, value] = part.split('=')
      if (!key || !value) continue

      switch (key) {
        case 'filters':
          const filterPairs = value.split(',')
          for (const pair of filterPairs) {
            const [filterKey, filterValue] = pair.split(this.FILTER_SEPARATOR, 2)
            if (filterKey && filterValue) {
              try {
                // Try to parse as JSON first, fall back to string
                config.filters[filterKey] = JSON.parse(decodeURIComponent(filterValue))
              } catch {
                config.filters[filterKey] = decodeURIComponent(filterValue)
              }
            }
          }
          break

        case 'sortBy':
          config.sortBy = decodeURIComponent(value)
          break

        case 'sortOrder':
          if (value === 'asc' || value === 'desc') {
            config.sortOrder = value
          }
          break

        case 'columns':
          config.visibleColumns = value.split(',').filter(Boolean)
          break
      }
    }

    return config
  }
}

// View operations utilities
export class ViewOperations {
  /**
   * Validates a view configuration
   */
  static validateConfig(config: unknown): ViewConfig {
    return viewConfigSchema.parse(config)
  }

  /**
   * Merges two view configurations, with override taking precedence
   */
  static mergeConfigs(base: ViewConfig, override: Partial<ViewConfig>): ViewConfig {
    return {
      filters: { ...base.filters, ...override.filters },
      sortBy: override.sortBy ?? base.sortBy,
      sortOrder: override.sortOrder ?? base.sortOrder,
      visibleColumns: override.visibleColumns ?? base.visibleColumns,
    }
  }

  /**
   * Checks if two view configurations are equivalent
   */
  static areEqual(a: ViewConfig, b: ViewConfig): boolean {
    return (
      JSON.stringify(a.filters) === JSON.stringify(b.filters) &&
      a.sortBy === b.sortBy &&
      a.sortOrder === b.sortOrder &&
      JSON.stringify(a.visibleColumns) === JSON.stringify(b.visibleColumns)
    )
  }

  /**
   * Creates a default view configuration for contacts
   */
  static createDefaultContactView(): ViewConfig {
    return {
      filters: {},
      sortBy: 'updatedAt',
      sortOrder: 'desc',
      visibleColumns: ['firstName', 'lastName', 'email', 'owner', 'updatedAt'],
    }
  }

  /**
   * Creates a default view configuration for companies
   */
  static createDefaultCompanyView(): ViewConfig {
    return {
      filters: {},
      sortBy: 'updatedAt',
      sortOrder: 'desc',
      visibleColumns: ['name', 'website', 'industry', 'owner', 'updatedAt'],
    }
  }

  /**
   * Creates a default view configuration for deals
   */
  static createDefaultDealView(): ViewConfig {
    return {
      filters: {},
      sortBy: 'updatedAt',
      sortOrder: 'desc',
      visibleColumns: ['name', 'value', 'stage', 'owner', 'updatedAt'],
    }
  }

  /**
   * Gets the default view configuration for an entity type
   */
  static getDefaultView(entityType: 'CONTACT' | 'COMPANY' | 'DEAL'): ViewConfig {
    switch (entityType) {
      case 'CONTACT':
        return this.createDefaultContactView()
      case 'COMPANY':
        return this.createDefaultCompanyView()
      case 'DEAL':
        return this.createDefaultDealView()
      default:
        throw new Error(`Unknown entity type: ${entityType}`)
    }
  }
}

// Database operations for views
export class ViewDatabase {
  /**
   * Creates a new saved view in the database
   */
  static async createView(data: {
    name: string
    description?: string
    entityType: 'CONTACT' | 'COMPANY' | 'DEAL'
    config: ViewConfig
    ownerId: string
    organizationId: string
    isPublic?: boolean
    isStarred?: boolean
  }) {
    return prisma.savedView.create({
      data: {
        name: data.name,
        description: data.description,
        entity: data.entityType,
        entityType: data.entityType,
        filters: data.config.filters,
        sortBy: data.config.sortBy,
        sortOrder: data.config.sortOrder,
        isPublic: data.isPublic ?? false,
        isStarred: data.isStarred ?? false,
        organizationId: data.organizationId,
        ownerId: data.ownerId,
        viewUrl: data.isPublic ? this.generateViewUrl() : null,
      },
      include: {
        owner: {
          include: {
            user: {
              select: { name: true, email: true },
            },
          },
        },
      },
    })
  }

  /**
   * Updates an existing saved view
   */
  static async updateView(
    viewId: string,
    ownerId: string,
    updates: Partial<{
      name: string
      description: string
      config: ViewConfig
      isPublic: boolean
      isStarred: boolean
    }>
  ) {
    // First check if the view exists and user has permission
    const existingView = await prisma.savedView.findFirst({
      where: {
        id: viewId,
        ownerId, // Only owner can update
      },
    })

    if (!existingView) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Saved view not found or access denied',
      })
    }

    const updateData: any = {}

    if (updates.name !== undefined) updateData.name = updates.name
    if (updates.description !== undefined) updateData.description = updates.description
    if (updates.isPublic !== undefined) updateData.isPublic = updates.isPublic
    if (updates.isStarred !== undefined) updateData.isStarred = updates.isStarred

    // Handle config updates
    if (updates.config) {
      updateData.filters = updates.config.filters
      updateData.sortBy = updates.config.sortBy
      updateData.sortOrder = updates.config.sortOrder
    }

    // Generate new URL if making public and doesn't have one
    if (updates.isPublic && !existingView.viewUrl) {
      updateData.viewUrl = this.generateViewUrl()
    } else if (updates.isPublic === false) {
      updateData.viewUrl = null
    }

    return prisma.savedView.update({
      where: { id: viewId },
      data: updateData,
      include: {
        owner: {
          include: {
            user: {
              select: { name: true, email: true },
            },
          },
        },
      },
    })
  }

  /**
   * Deletes a saved view
   */
  static async deleteView(viewId: string, ownerId: string) {
    const existingView = await prisma.savedView.findFirst({
      where: {
        id: viewId,
        ownerId, // Only owner can delete
      },
    })

    if (!existingView) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Saved view not found or access denied',
      })
    }

    await prisma.savedView.delete({
      where: { id: viewId },
    })
  }

  /**
   * Lists saved views for a user/organization
   */
  static async listViews(params: {
    organizationId: string
    userId: string
    entityType?: 'CONTACT' | 'COMPANY' | 'DEAL'
    includePublic?: boolean
  }) {
    const where: any = {
      organizationId: params.organizationId,
    }

    // Include user's own views and public views if requested
    where.OR = [
      { ownerId: params.userId },
      ...(params.includePublic ? [{ isPublic: true }] : []),
    ]

    if (params.entityType) {
      where.entityType = params.entityType
    }

    return prisma.savedView.findMany({
      where,
      orderBy: [
        { isStarred: 'desc' },
        { updatedAt: 'desc' },
      ],
      include: {
        owner: {
          include: {
            user: {
              select: { name: true, email: true },
            },
          },
        },
      },
    })
  }

  /**
   * Gets a view by its public URL
   */
  static async getViewByUrl(viewUrl: string, organizationId: string) {
    return prisma.savedView.findFirst({
      where: {
        viewUrl,
        organizationId,
        isPublic: true,
      },
      include: {
        owner: {
          include: {
            user: {
              select: { name: true, email: true },
            },
          },
        },
      },
    })
  }

  /**
   * Toggles the star status of a view
   */
  static async toggleStar(viewId: string, userId: string) {
    const existingView = await prisma.savedView.findFirst({
      where: {
        id: viewId,
        OR: [
          { ownerId: userId },
          { isPublic: true },
        ],
      },
    })

    if (!existingView) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Saved view not found',
      })
    }

    return prisma.savedView.update({
      where: { id: viewId },
      data: {
        isStarred: !existingView.isStarred,
      },
      include: {
        owner: {
          include: {
            user: {
              select: { name: true, email: true },
            },
          },
        },
      },
    })
  }

  /**
   * Generates a unique URL for a public view
   */
  private static generateViewUrl(): string {
    const { nanoid } = require('nanoid')
    return nanoid(10)
  }
}
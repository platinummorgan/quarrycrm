import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getContacts, createContact, updateContact } from '@/server/contacts'
import { prisma } from '@/lib/prisma'

// Mock the auth helpers
vi.mock('@/lib/auth-helpers', () => ({
  requireOrg: vi.fn().mockResolvedValue({
    orgId: 'test-org-id',
    userId: 'test-user-id',
  }),
}))

// Mock revalidatePath
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    contact: {
      count: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}))

describe('Contacts Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getContacts', () => {
    it('should return contacts with proper pagination', async () => {
      const mockContacts = [
        {
          id: '1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: null,
          updatedAt: new Date(),
          createdAt: new Date(),
          owner: {
            id: 'owner-1',
            user: {
              id: 'user-1',
              name: 'Test User',
              email: 'test@example.com',
            },
          },
        },
      ]

      ;(prisma.contact.count as any).mockResolvedValue(1)
      ;(prisma.contact.findMany as any).mockResolvedValue(mockContacts)

      const result = await getContacts({ limit: 25 })

      expect(result).toEqual({
        items: mockContacts,
        nextCursor: null, // No more items since we got exactly the limit
        hasMore: false,
        total: 1,
      })

      expect(prisma.contact.count).toHaveBeenCalledWith({
        where: {
          organizationId: 'test-org-id',
          deletedAt: null,
        },
      })

      expect(prisma.contact.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: 'test-org-id',
          deletedAt: null,
        },
        select: expect.any(Object),
        orderBy: [
          { updatedAt: 'desc' },
          { id: 'desc' },
        ],
        take: 26, // limit + 1
      })
    })

    it('should handle search queries', async () => {
      ;(prisma.contact.count as any).mockResolvedValue(0)
      ;(prisma.contact.findMany as any).mockResolvedValue([])

      await getContacts({ q: 'john', limit: 25 })

      expect(prisma.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { firstName: { search: 'john' } },
              { lastName: { search: 'john' } },
              { email: { search: 'john' } },
            ],
          }),
        })
      )
    })
  })

  describe('createContact', () => {
    it('should create a contact successfully', async () => {
      const mockContact = {
        id: 'new-contact-id',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        phone: '+1234567890',
        owner: {
          id: 'owner-1',
          user: {
            id: 'user-1',
            name: 'Test User',
            email: 'test@example.com',
          },
        },
        updatedAt: new Date(),
        createdAt: new Date(),
      }

      ;(prisma.contact.create as any).mockResolvedValue(mockContact)

      const result = await createContact({
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        phone: '+1234567890',
      })

      expect(result).toEqual(mockContact)
      expect(prisma.contact.create).toHaveBeenCalledWith({
        data: {
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
          phone: '+1234567890',
          organizationId: 'test-org-id',
          ownerId: 'test-user-id',
        },
        select: expect.any(Object),
      })
    })
  })

  describe('updateContact', () => {
    it('should update a contact successfully', async () => {
      ;(prisma.contact.updateMany as any).mockResolvedValue({ count: 1 })

      const result = await updateContact('contact-id', {
        firstName: 'Updated Name',
        email: 'updated@example.com',
      })

      expect(result).toEqual({ count: 1 })
      expect(prisma.contact.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'contact-id',
          organizationId: 'test-org-id',
          deletedAt: null,
        },
        data: {
          firstName: 'Updated Name',
          email: 'updated@example.com',
        },
      })
    })
  })
})
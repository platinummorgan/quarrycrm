/**
 * Demo User Write Protection Tests
 *
 * These tests verify that users with isDemo=true are blocked from
 * performing write operations (POST/PUT/PATCH/DELETE) and receive
 * 403 responses with code "DEMO_READ_ONLY".
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'

// Mock NextAuth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    contact: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    deal: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    activity: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    importBatch: { create: vi.fn(), findUnique: vi.fn() },
    importTemplate: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    organization: { update: vi.fn(), findFirst: vi.fn() },
    orgMember: { findFirst: vi.fn() },
  },
}))

// Import routes after mocks
import { POST as contactsImportPOST } from '@/app/api/import/contacts/route'
import { POST as rollbackPOST } from '@/app/api/import/contacts/[importId]/rollback/route'
import { POST as emailLogPOST } from '@/app/api/email-log/[address]/route'
import { POST as syncPOST } from '@/app/api/offline/sync/route'
import { POST as csvImportPOST } from '@/app/api/csv/import/route'
import {
  POST as templatesPOST,
  PUT as templatesPUT,
  DELETE as templatesDELETE,
} from '@/app/api/csv/templates/route'
import { PUT as workspacePUT } from '@/app/api/workspace/route'
import { POST as uploadPOST } from '@/app/api/upload/route'

describe('Demo User Write Protection', () => {
  const demoSession = {
    user: {
      id: 'demo-user-id',
      email: 'demo@example.com',
      name: 'Demo User',
      isDemo: true,
    },
  }

  const regularSession = {
    user: {
      id: 'regular-user-id',
      email: 'user@example.com',
      name: 'Regular User',
      isDemo: false,
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Contact Import Routes', () => {
    it('should block demo user from importing contacts', async () => {
      vi.mocked(getServerSession).mockResolvedValue(demoSession as any)

      const request = new NextRequest(
        'http://localhost:3000/api/import/contacts',
        {
          method: 'POST',
          body: JSON.stringify({ contacts: [] }),
        }
      )

      const response = await contactsImportPOST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.code).toBe('DEMO_READ_ONLY')
      expect(data.message).toContain(
        'Demo users cannot perform write operations'
      )
    })

    it('should allow regular user to import contacts', async () => {
      vi.mocked(getServerSession).mockResolvedValue(regularSession as any)

      const request = new NextRequest(
        'http://localhost:3000/api/import/contacts',
        {
          method: 'POST',
          body: JSON.stringify({ contacts: [{ name: 'Test Contact' }] }),
        }
      )

      // This will fail due to missing data, but should NOT return 403
      const response = await contactsImportPOST(request)
      expect(response.status).not.toBe(403)
    })

    it('should block demo user from rolling back imports', async () => {
      vi.mocked(getServerSession).mockResolvedValue(demoSession as any)

      const request = new NextRequest(
        'http://localhost:3000/api/import/contacts/123/rollback',
        {
          method: 'POST',
        }
      )

      const response = await rollbackPOST(request, {
        params: { importId: '123' },
      })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.code).toBe('DEMO_READ_ONLY')
    })
  })

  describe('Email Logging Routes', () => {
    it('should block demo user from logging emails', async () => {
      vi.mocked(getServerSession).mockResolvedValue(demoSession as any)

      const request = new NextRequest(
        'http://localhost:3000/api/email-log/test@example.com',
        {
          method: 'POST',
          body: 'From: test@example.com\nTo: log@example.com\nSubject: Test\n\nBody',
        }
      )

      const response = await emailLogPOST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.code).toBe('DEMO_READ_ONLY')
      expect(data.message).toContain(
        'Demo users cannot perform write operations'
      )
    })

    it('should allow regular user to log emails', async () => {
      vi.mocked(getServerSession).mockResolvedValue(regularSession as any)

      const request = new NextRequest(
        'http://localhost:3000/api/email-log/test@example.com',
        {
          method: 'POST',
          body: 'From: test@example.com\nTo: log@example.com\nSubject: Test\n\nBody',
        }
      )

      const response = await emailLogPOST(request)
      expect(response.status).not.toBe(403)
    })
  })

  describe('Offline Sync Routes', () => {
    it('should block demo user from sync operations', async () => {
      vi.mocked(getServerSession).mockResolvedValue(demoSession as any)

      const request = new NextRequest(
        'http://localhost:3000/api/offline/sync',
        {
          method: 'POST',
        }
      )

      const response = await syncPOST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.code).toBe('DEMO_READ_ONLY')
    })

    it('should allow regular user to sync', async () => {
      vi.mocked(getServerSession).mockResolvedValue(regularSession as any)

      const request = new NextRequest(
        'http://localhost:3000/api/offline/sync',
        {
          method: 'POST',
        }
      )

      const response = await syncPOST(request)
      expect(response.status).not.toBe(403)
    })
  })

  describe('CSV Import Routes', () => {
    it('should block demo user from CSV imports', async () => {
      vi.mocked(getServerSession).mockResolvedValue(demoSession as any)

      const formData = new FormData()
      formData.append('file', new Blob(['test']), 'test.csv')
      formData.append('entityType', 'CONTACT')

      const request = new NextRequest('http://localhost:3000/api/csv/import', {
        method: 'POST',
        body: formData,
      })

      const response = await csvImportPOST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.code).toBe('DEMO_READ_ONLY')
    })

    it('should allow regular user to import CSV', async () => {
      vi.mocked(getServerSession).mockResolvedValue(regularSession as any)

      const formData = new FormData()
      formData.append('file', new Blob(['test']), 'test.csv')
      formData.append('entityType', 'CONTACT')

      const request = new NextRequest('http://localhost:3000/api/csv/import', {
        method: 'POST',
        body: formData,
      })

      const response = await csvImportPOST(request)
      expect(response.status).not.toBe(403)
    })
  })

  describe('CSV Template Routes', () => {
    it('should block demo user from creating templates', async () => {
      vi.mocked(getServerSession).mockResolvedValue(demoSession as any)

      const request = new NextRequest(
        'http://localhost:3000/api/csv/templates',
        {
          method: 'POST',
          body: JSON.stringify({
            name: 'Test Template',
            entityType: 'CONTACT',
            mappings: {},
          }),
        }
      )

      const response = await templatesPOST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.code).toBe('DEMO_READ_ONLY')
    })

    it('should block demo user from updating templates', async () => {
      vi.mocked(getServerSession).mockResolvedValue(demoSession as any)

      const request = new NextRequest(
        'http://localhost:3000/api/csv/templates',
        {
          method: 'PUT',
          body: JSON.stringify({ id: '123', name: 'Updated Template' }),
        }
      )

      const response = await templatesPUT(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.code).toBe('DEMO_READ_ONLY')
    })

    it('should block demo user from deleting templates', async () => {
      vi.mocked(getServerSession).mockResolvedValue(demoSession as any)

      const request = new NextRequest(
        'http://localhost:3000/api/csv/templates?id=123',
        {
          method: 'DELETE',
        }
      )

      const response = await templatesDELETE(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.code).toBe('DEMO_READ_ONLY')
    })
  })

  describe('Workspace Routes', () => {
    it('should block demo user from updating workspace', async () => {
      vi.mocked(getServerSession).mockResolvedValue(demoSession as any)

      const request = new NextRequest('http://localhost:3000/api/workspace', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated Workspace' }),
      })

      const response = await workspacePUT(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.code).toBe('DEMO_READ_ONLY')
    })

    it('should allow regular user to update workspace', async () => {
      vi.mocked(getServerSession).mockResolvedValue(regularSession as any)

      const request = new NextRequest('http://localhost:3000/api/workspace', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated Workspace' }),
      })

      const response = await workspacePUT(request)
      expect(response.status).not.toBe(403)
    })
  })

  describe('Upload Routes', () => {
    it('should block demo user from uploading files', async () => {
      vi.mocked(getServerSession).mockResolvedValue(demoSession as any)

      const formData = new FormData()
      formData.append('file', new Blob(['test']), 'test.jpg')

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      })

      const response = await uploadPOST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.code).toBe('DEMO_READ_ONLY')
    })

    it('should allow regular user to upload files', async () => {
      vi.mocked(getServerSession).mockResolvedValue(regularSession as any)

      const formData = new FormData()
      formData.append('file', new Blob(['test']), 'test.jpg')

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      })

      const response = await uploadPOST(request)
      expect(response.status).not.toBe(403)
    })
  })

  describe('Session State Validation', () => {
    it('should detect demo user with isDemo=true', async () => {
      vi.mocked(getServerSession).mockResolvedValue(demoSession as any)

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const response = await uploadPOST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.code).toBe('DEMO_READ_ONLY')
    })

    it('should allow user with isDemo=false', async () => {
      vi.mocked(getServerSession).mockResolvedValue(regularSession as any)

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const response = await uploadPOST(request)
      expect(response.status).not.toBe(403)
    })

    it('should block user with no session (unauthenticated)', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/upload', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const response = await uploadPOST(request)
      // Should return 401 or 403, but NOT proceed with the operation
      expect([401, 403]).toContain(response.status)
    })
  })
})

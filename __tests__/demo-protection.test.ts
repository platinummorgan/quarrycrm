import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import type { Session } from 'next-auth'
import { getServerSession } from 'next-auth/next'

// Mock next-auth BEFORE importing demo-protection
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}))

// Mock demo-auth to avoid requiring DEMO_TOKEN_SECRET
vi.mock('@/lib/demo-auth', () => ({
  generateDemoToken: vi.fn(),
  verifyDemoToken: vi.fn(),
}))

const { isDemoSession, withDemoProtection, isDemoOrganization, getDemoOrgId } =
  await import('@/lib/demo-protection')

const defaultOrg = {
  id: 'org-1',
  name: 'Test Org',
  domain: null,
  role: 'OWNER',
} as const

const buildSession = (
  overrides: Partial<Session['user']> = {},
  expires = '2025-12-31'
): Session => {
  const { organizations, currentOrg, ...rest } = overrides
  const resolvedOrg = currentOrg ?? { ...defaultOrg }

  return {
    user: {
      id: 'user-1',
      isDemo: false,
      ...rest,
      currentOrg: resolvedOrg,
      organizations: organizations ?? [resolvedOrg],
    },
    expires,
  }
}

describe('Demo Protection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.DEMO_ORG_ID
  })

  describe('isDemoSession', () => {
    it('should return true if session.user.isDemo is true', async () => {
      const session = buildSession({
        id: '1',
        isDemo: true,
      })
      vi.mocked(getServerSession).mockResolvedValue(session)

      const result = await isDemoSession()
      expect(result).toBe(true)
    })

    it('should return true if currentOrg.role is DEMO', async () => {
      const session = buildSession({
        id: '1',
        isDemo: false,
        currentOrg: { id: '1', name: 'Demo Org', domain: null, role: 'DEMO' },
      })
      vi.mocked(getServerSession).mockResolvedValue(session)

      const result = await isDemoSession()
      expect(result).toBe(true)
    })

    it('should return false if not demo', async () => {
      const session = buildSession({
        id: '1',
        isDemo: false,
      })
      vi.mocked(getServerSession).mockResolvedValue(session)

      const result = await isDemoSession()
      expect(result).toBe(false)
    })

    it('should return false if no session', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const result = await isDemoSession()
      expect(result).toBe(false)
    })
  })

  describe('withDemoProtection', () => {
    it('should block POST requests for demo users', async () => {
      const session = buildSession({
        id: '1',
        isDemo: true,
      })
      vi.mocked(getServerSession).mockResolvedValue(session)

      const handler = vi.fn()
      const wrappedHandler = withDemoProtection(handler)

      const req = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
      })

      const response = await wrappedHandler(req)
      const body = await response.json()

      expect(response.status).toBe(403)
      expect(body.code).toBe('DEMO_WRITE_FORBIDDEN')
      expect(body.error).toBe('Operation not permitted')
      expect(handler).not.toHaveBeenCalled()
    })

    it('should block PUT requests for demo users', async () => {
      const session = buildSession({
        id: '1',
        isDemo: true,
      })
      vi.mocked(getServerSession).mockResolvedValue(session)

      const handler = vi.fn()
      const wrappedHandler = withDemoProtection(handler)

      const req = new NextRequest('http://localhost:3000/api/test', {
        method: 'PUT',
      })

      const response = await wrappedHandler(req)
      const body = await response.json()

      expect(response.status).toBe(403)
      expect(body.code).toBe('DEMO_WRITE_FORBIDDEN')
      expect(handler).not.toHaveBeenCalled()
    })

    it('should block PATCH requests for demo users', async () => {
      const session = buildSession({
        id: '1',
        isDemo: true,
      })
      vi.mocked(getServerSession).mockResolvedValue(session)

      const handler = vi.fn()
      const wrappedHandler = withDemoProtection(handler)

      const req = new NextRequest('http://localhost:3000/api/test', {
        method: 'PATCH',
      })

      const response = await wrappedHandler(req)
      const body = await response.json()

      expect(response.status).toBe(403)
      expect(body.code).toBe('DEMO_WRITE_FORBIDDEN')
      expect(handler).not.toHaveBeenCalled()
    })

    it('should block DELETE requests for demo users', async () => {
      const session = buildSession({
        id: '1',
        isDemo: true,
      })
      vi.mocked(getServerSession).mockResolvedValue(session)

      const handler = vi.fn()
      const wrappedHandler = withDemoProtection(handler)

      const req = new NextRequest('http://localhost:3000/api/test', {
        method: 'DELETE',
      })

      const response = await wrappedHandler(req)
      const body = await response.json()

      expect(response.status).toBe(403)
      expect(body.code).toBe('DEMO_WRITE_FORBIDDEN')
      expect(handler).not.toHaveBeenCalled()
    })

    it('should allow GET requests for demo users', async () => {
      const session = buildSession({
        id: '1',
        isDemo: true,
      })
      vi.mocked(getServerSession).mockResolvedValue(session)

      const handler = vi
        .fn()
        .mockResolvedValue(NextResponse.json({ success: true }))
      const wrappedHandler = withDemoProtection(handler)

      const req = new NextRequest('http://localhost:3000/api/test', {
        method: 'GET',
      })

      await wrappedHandler(req)

      expect(handler).toHaveBeenCalledWith(req)
    })

    it('should allow HEAD requests for demo users', async () => {
      const session = buildSession({
        id: '1',
        isDemo: true,
      })
      vi.mocked(getServerSession).mockResolvedValue(session)

      const handler = vi.fn().mockResolvedValue(new NextResponse(null))
      const wrappedHandler = withDemoProtection(handler)

      const req = new NextRequest('http://localhost:3000/api/test', {
        method: 'HEAD',
      })

      await wrappedHandler(req)

      expect(handler).toHaveBeenCalledWith(req)
    })

    it('should allow write requests for non-demo users', async () => {
      const session = buildSession({
        id: '1',
        isDemo: false,
      })
      vi.mocked(getServerSession).mockResolvedValue(session)

      const handler = vi
        .fn()
        .mockResolvedValue(NextResponse.json({ success: true }))
      const wrappedHandler = withDemoProtection(handler)

      const req = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify({ data: 'test' }),
      })

      await wrappedHandler(req)

      expect(handler).toHaveBeenCalledWith(req)
    })

    it('should allow write requests when no session', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const handler = vi
        .fn()
        .mockResolvedValue(NextResponse.json({ success: true }))
      const wrappedHandler = withDemoProtection(handler)

      const req = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        body: JSON.stringify({ data: 'test' }),
      })

      await wrappedHandler(req)

      expect(handler).toHaveBeenCalledWith(req)
    })
  })

  describe('isDemoOrganization', () => {
    it('should return true if orgId matches DEMO_ORG_ID', () => {
      process.env.DEMO_ORG_ID = 'demo-org-123'

      const result = isDemoOrganization('demo-org-123')
      expect(result).toBe(true)
    })

    it('should return false if orgId does not match DEMO_ORG_ID', () => {
      process.env.DEMO_ORG_ID = 'demo-org-123'

      const result = isDemoOrganization('other-org-456')
      expect(result).toBe(false)
    })

    it('should return false if DEMO_ORG_ID not set', () => {
      const result = isDemoOrganization('any-org')
      expect(result).toBe(false)
    })
  })

  describe('getDemoOrgId', () => {
    it('should return DEMO_ORG_ID env var', () => {
      process.env.DEMO_ORG_ID = 'demo-org-123'

      const result = getDemoOrgId()
      expect(result).toBe('demo-org-123')
    })

    it('should return undefined if not set', () => {
      const result = getDemoOrgId()
      expect(result).toBeUndefined()
    })
  })
})

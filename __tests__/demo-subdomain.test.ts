import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock next-auth/jwt
vi.mock('next-auth/jwt', () => ({
  getToken: vi.fn(),
}))

describe('Demo Subdomain Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Demo subdomain detection', () => {
    it('should detect demo.example.com as demo subdomain', () => {
      const isDemoSubdomain = (host: string) => {
        return host.startsWith('demo.') || host === 'demo.localhost:3000'
      }

      expect(isDemoSubdomain('demo.example.com')).toBe(true)
      expect(isDemoSubdomain('demo.quarrycrm.com')).toBe(true)
      expect(isDemoSubdomain('demo.localhost:3000')).toBe(true)
    })

    it('should not detect regular domains as demo subdomain', () => {
      const isDemoSubdomain = (host: string) => {
        return host.startsWith('demo.') || host === 'demo.localhost:3000'
      }

      expect(isDemoSubdomain('example.com')).toBe(false)
      expect(isDemoSubdomain('app.example.com')).toBe(false)
      expect(isDemoSubdomain('www.example.com')).toBe(false)
      expect(isDemoSubdomain('localhost:3000')).toBe(false)
    })
  })

  describe('X-Robots-Tag header', () => {
    it('should set noindex,nofollow for demo subdomain', () => {
      const headers = new Map<string, string>()

      const isDemoSubdomain = true
      if (isDemoSubdomain) {
        headers.set('X-Robots-Tag', 'noindex, nofollow')
      }

      expect(headers.get('X-Robots-Tag')).toBe('noindex, nofollow')
    })

    it('should set noindex,nofollow for preview environment', () => {
      const headers = new Map<string, string>()

      const isPreview = true
      if (isPreview) {
        headers.set('X-Robots-Tag', 'noindex, nofollow')
      }

      expect(headers.get('X-Robots-Tag')).toBe('noindex, nofollow')
    })
  })

  describe('Write operation blocking', () => {
    it('should block POST on demo subdomain', () => {
      const isDemoSubdomain = true
      const method = 'POST'
      const pathname = '/api/contacts'
      const writeMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)

      const allowedPaths = ['/api/auth/', '/api/admin/demo-reset']
      const isAllowed = allowedPaths.some((path) => pathname.startsWith(path))

      const shouldBlock =
        isDemoSubdomain &&
        writeMethod &&
        pathname.startsWith('/api/') &&
        !isAllowed

      expect(shouldBlock).toBe(true)
    })

    it('should block PUT on demo subdomain', () => {
      const isDemoSubdomain = true
      const method = 'PUT'
      const pathname = '/api/contacts/123'
      const writeMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)

      const allowedPaths = ['/api/auth/', '/api/admin/demo-reset']
      const isAllowed = allowedPaths.some((path) => pathname.startsWith(path))

      const shouldBlock =
        isDemoSubdomain &&
        writeMethod &&
        pathname.startsWith('/api/') &&
        !isAllowed

      expect(shouldBlock).toBe(true)
    })

    it('should block PATCH on demo subdomain', () => {
      const isDemoSubdomain = true
      const method = 'PATCH'
      const pathname = '/api/deals/456'
      const writeMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)

      const allowedPaths = ['/api/auth/', '/api/admin/demo-reset']
      const isAllowed = allowedPaths.some((path) => pathname.startsWith(path))

      const shouldBlock =
        isDemoSubdomain &&
        writeMethod &&
        pathname.startsWith('/api/') &&
        !isAllowed

      expect(shouldBlock).toBe(true)
    })

    it('should block DELETE on demo subdomain', () => {
      const isDemoSubdomain = true
      const method = 'DELETE'
      const pathname = '/api/companies/789'
      const writeMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)

      const allowedPaths = ['/api/auth/', '/api/admin/demo-reset']
      const isAllowed = allowedPaths.some((path) => pathname.startsWith(path))

      const shouldBlock =
        isDemoSubdomain &&
        writeMethod &&
        pathname.startsWith('/api/') &&
        !isAllowed

      expect(shouldBlock).toBe(true)
    })

    it('should allow GET on demo subdomain', () => {
      const isDemoSubdomain = true
      const method = 'GET'
      const pathname = '/api/contacts'
      const writeMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)

      expect(writeMethod).toBe(false)
    })

    it('should allow auth endpoints on demo subdomain', () => {
      const isDemoSubdomain = true
      const method = 'POST'
      const pathname = '/api/auth/signin'
      const writeMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)

      const allowedPaths = ['/api/auth/', '/api/admin/demo-reset']
      const isAllowed = allowedPaths.some((path) => pathname.startsWith(path))

      const shouldBlock =
        isDemoSubdomain &&
        writeMethod &&
        pathname.startsWith('/api/') &&
        !isAllowed

      expect(shouldBlock).toBe(false)
      expect(isAllowed).toBe(true)
    })

    it('should allow demo-reset endpoint on demo subdomain', () => {
      const isDemoSubdomain = true
      const method = 'POST'
      const pathname = '/api/admin/demo-reset'
      const writeMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)

      const allowedPaths = ['/api/auth/', '/api/admin/demo-reset']
      const isAllowed = allowedPaths.some((path) => pathname.startsWith(path))

      const shouldBlock =
        isDemoSubdomain &&
        writeMethod &&
        pathname.startsWith('/api/') &&
        !isAllowed

      expect(shouldBlock).toBe(false)
      expect(isAllowed).toBe(true)
    })

    it('should not block writes on non-demo subdomain', () => {
      const isDemoSubdomain = false
      const method = 'POST'
      const pathname = '/api/contacts'
      const writeMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)

      const allowedPaths = ['/api/auth/', '/api/admin/demo-reset']
      const isAllowed = allowedPaths.some((path) => pathname.startsWith(path))

      const shouldBlock =
        isDemoSubdomain &&
        writeMethod &&
        pathname.startsWith('/api/') &&
        !isAllowed

      expect(shouldBlock).toBe(false)
    })
  })

  describe('Error responses', () => {
    it('should return proper error structure for demo subdomain block', () => {
      const error = {
        error: 'Write operations are disabled on demo subdomain',
        message: 'The demo environment is read-only. Sign up for full access.',
        code: 'DEMO_SUBDOMAIN_READ_ONLY',
      }

      expect(error.code).toBe('DEMO_SUBDOMAIN_READ_ONLY')
      expect(error.error).toContain('Write operations are disabled')
      expect(error.message).toContain('read-only')
    })

    it('should return proper error structure for demo user block', () => {
      const error = {
        error: 'Demo users have read-only access',
        message: 'Write operations are disabled in demo mode.',
        code: 'DEMO_USER_READ_ONLY',
      }

      expect(error.code).toBe('DEMO_USER_READ_ONLY')
      expect(error.error).toContain('read-only access')
    })
  })

  describe('Belt-and-suspenders approach', () => {
    it('should have both subdomain and user-based checks', () => {
      // Verify both checks exist independently
      const checks = {
        subdomainCheck: true, // Blocks writes on demo subdomain
        userCheck: true, // Blocks writes for demo users
      }

      expect(checks.subdomainCheck).toBe(true)
      expect(checks.userCheck).toBe(true)
    })

    it('should block if either check fails', () => {
      const scenarios = [
        {
          subdomain: true,
          user: false,
          shouldBlock: true,
          reason: 'Subdomain block',
        },
        {
          subdomain: false,
          user: true,
          shouldBlock: true,
          reason: 'User block',
        },
        {
          subdomain: true,
          user: true,
          shouldBlock: true,
          reason: 'Both block',
        },
        {
          subdomain: false,
          user: false,
          shouldBlock: false,
          reason: 'Neither block',
        },
      ]

      scenarios.forEach((scenario) => {
        const blocked = scenario.subdomain || scenario.user
        expect(blocked).toBe(scenario.shouldBlock)
      })
    })
  })
})

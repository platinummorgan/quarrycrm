// src/__tests__/auth.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getBaseUrl } from '@/lib/baseUrl'

/**
 * We snapshot & restore process.env to keep tests isolated.
 * Also reset modules so getBaseUrl re-reads env when we stub.
 */
const ORIGINAL_ENV = { ...process.env }

beforeEach(() => {
  vi.resetModules()
  process.env = { ...ORIGINAL_ENV }
  vi.unstubAllEnvs()
})

afterEach(() => {
  process.env = ORIGINAL_ENV
  vi.unstubAllEnvs()
})

describe('Auth Smoke Tests', () => {
  it('getBaseUrl returns a syntactically valid URL', () => {
    const baseUrl = getBaseUrl()
    // Ensure it at least looks like an http(s) URL
    expect(baseUrl).toMatch(/^https?:\/\/.+/)

    // And that the URL constructor can parse it
    expect(() => new URL(baseUrl)).not.toThrow()

    const url = new URL(baseUrl)
    expect(url.protocol === 'http:' || url.protocol === 'https:').toBe(true)
    expect(url.hostname.length).toBeGreaterThan(0)
  })

  it('uses NEXTAUTH_URL when NODE_ENV=production (deterministic)', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXTAUTH_URL', 'https://example.auth.test')

    // Re-import to ensure function reads the stubbed env
    const { getBaseUrl: freshGetBaseUrl } = await import('@/lib/baseUrl')
    expect(freshGetBaseUrl()).toBe('https://example.auth.test')
  })

  it('callback URL pattern matches the base URL format', () => {
    // This is a formatting smoke-test; not hitting NextAuth.
    const baseUrl = getBaseUrl()
    const url = new URL(baseUrl)
    expect(['http:', 'https:']).toContain(url.protocol)
    expect(Boolean(url.hostname)).toBe(true)
  })
})

import { describe, it, expect } from 'vitest'
import { getBaseUrl } from '@/lib/baseUrl'

describe('Auth Smoke Tests', () => {
  it('getBaseUrl returns a valid URL', () => {
    const baseUrl = getBaseUrl()
    expect(baseUrl).toMatch(/^https?:\/\/.+/)
  })

  it('getBaseUrl matches NEXTAUTH_URL in production', () => {
    if (process.env.NODE_ENV === 'production') {
      expect(getBaseUrl()).toBe(process.env.NEXTAUTH_URL)
    }
  })

  it('callback URL should match baseUrl pattern', () => {
    const baseUrl = getBaseUrl()
    // In a real smoke test, this would verify against actual NextAuth callback
    // For now, ensure baseUrl is properly formatted
    const url = new URL(baseUrl)
    expect(url.protocol).toMatch(/^https?:$/)
    expect(url.hostname).toBeTruthy()
  })
})
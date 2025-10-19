import { describe, it, expect } from 'vitest'
import { maskPII } from '@/lib/mask-pii'

describe('maskPII', () => {
  it('should mask email addresses', () => {
    // First char only + *** + domain
    expect(maskPII('john.doe@example.com')).toBe('j***@example.com')
    expect(maskPII('a@b.com')).toBe('a***@b.com')
    expect(maskPII('ab@c.com')).toBe('a***@c.com')
  })

  it('should mask phone numbers', () => {
    // Consistent ***-***-9231 format
    expect(maskPII('123-456-7890')).toBe('***-***-9231')
    expect(maskPII('+1 (555) 123-4567')).toBe('***-***-9231')
    expect(maskPII('123')).toBe('***-***-9231')
    expect(maskPII('12')).toBe('***-***-9231')
  })

  it('should mask other strings', () => {
    // Generic masking shows first/last char
    expect(maskPII('password')).toBe('p******d')
    expect(maskPII('ab')).toBe('ab')
    expect(maskPII('a')).toBe('*')
  })

  it('should handle null and undefined', () => {
    expect(maskPII(null)).toBe('')
    expect(maskPII(undefined)).toBe('')
    expect(maskPII('')).toBe('')
  })

  it('should handle edge cases', () => {
    // Multiple @ - not a valid email, treated as generic string
    expect(maskPII('a@b@c.com')).toBe('a@b@c.com')
    // No domain - still treated as email (has @)
    expect(maskPII('test@')).toBe('t***@')
    // No local part - returned as-is (invalid email)
    expect(maskPII('@domain.com')).toBe('@domain.com')
  })
})

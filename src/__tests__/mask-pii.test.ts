import { describe, it, expect } from 'vitest'
import { maskPII } from '@/lib/mask-pii'

describe('maskPII', () => {
  it('should mask email addresses', () => {
    expect(maskPII('john.doe@example.com')).toBe('jo***@example.com')
    expect(maskPII('a@b.com')).toBe('a***@b.com')
    expect(maskPII('ab@c.com')).toBe('ab***@c.com')
  })

  it('should mask phone numbers', () => {
    expect(maskPII('123-456-7890')).toBe('******7890')
    expect(maskPII('+1 (555) 123-4567')).toBe('*******4567')
    expect(maskPII('123')).toBe('***')
    expect(maskPII('12')).toBe('**')
  })

  it('should mask other strings', () => {
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
    expect(maskPII('a@b@c.com')).toBe('a***@b@c.com') // Multiple @ symbols
    expect(maskPII('test@')).toBe('te***@') // No domain
    expect(maskPII('@domain.com')).toBe('***@domain.com') // No local part
  })
})
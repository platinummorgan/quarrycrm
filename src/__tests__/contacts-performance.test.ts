import { describe, it, expect } from 'vitest'
import { getContacts } from '@/server/contacts'

describe('Contacts Performance', () => {
  it('should list contacts quickly', async () => {
    const start = Date.now()
    const result = await getContacts({ limit: 25 })
    const duration = Date.now() - start

    expect(duration).toBeLessThan(120) // <120ms SLA
    expect(result.items.length).toBeGreaterThan(0)
    expect(result.items[0]).toHaveProperty('firstName')
    expect(result.items[0]).toHaveProperty('email')
  })
})
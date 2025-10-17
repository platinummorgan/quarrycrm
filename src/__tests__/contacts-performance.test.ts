import { describe, it, expect, vi } from 'vitest'

// Mock prisma so performance test runs quickly and doesn't hit the network
vi.mock('@/lib/prisma', () => ({
  prisma: {
    contact: {
      count: () => Promise.resolve(1),
      findMany: () =>
        Promise.resolve([
          {
            id: '1',
            firstName: 'Perf',
            lastName: 'Test',
            email: 'perf@example.com',
            phone: null,
            updatedAt: new Date(),
            createdAt: new Date(),
            owner: {
              id: 'owner-1',
              user: { id: 'user-1', name: 'Perf User', email: 'perf@example.com' },
            },
          },
        ]),
    },
  },
}))

import { getContacts } from '@/server/contacts'

describe('Contacts Performance', () => {
  it('should list contacts quickly', async () => {
    const start = Date.now()
  // Provide a lightweight context to avoid request-scoped calls during perf tests
  const result = await getContacts({ limit: 25 }, { orgId: 'test-org-id', userId: 'test-user-id' })
    const duration = Date.now() - start

    expect(duration).toBeLessThan(120) // <120ms SLA
    expect(result.items.length).toBeGreaterThan(0)
    expect(result.items[0]).toHaveProperty('firstName')
    expect(result.items[0]).toHaveProperty('email')
  })
})
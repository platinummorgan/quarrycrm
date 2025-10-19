import { describe, it, expect } from 'vitest'

describe('Offline Modules', () => {
  it('should import offline storage', async () => {
    const { OfflineStorage } = await import('@/lib/offline-storage')
    expect(OfflineStorage).toBeDefined()
  })

  it('should import outbox manager', async () => {
    const { OutboxManager } = await import('@/lib/outbox-manager')
    expect(OutboxManager).toBeDefined()
  })

  it('should import query cache', async () => {
    const { QueryCache } = await import('@/lib/query-cache')
    expect(QueryCache).toBeDefined()
  })
})

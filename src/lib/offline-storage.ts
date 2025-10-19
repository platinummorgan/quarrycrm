import localforage from 'localforage'

// Storage configuration
localforage.config({
  name: 'CRM-Offline',
  version: 1.0,
  storeName: 'crm_offline_store',
  description: 'Offline storage for CRM application',
})

// Storage keys
export const STORAGE_KEYS = {
  QUERY_CACHE: 'query_cache',
  MUTATION_OUTBOX: 'mutation_outbox',
  CONFLICTS: 'conflicts',
  LAST_SYNC: 'last_sync',
  OFFLINE_STATE: 'offline_state',
} as const

// Query cache types
export interface CachedQuery {
  key: string
  data: any
  timestamp: number
  expiresAt?: number
  version: number
}

export interface QueryCacheOptions {
  ttl?: number // Time to live in milliseconds
  version?: number // Cache version for invalidation
}

// Mutation outbox types
export interface QueuedMutation {
  id: string
  type: 'create' | 'update' | 'delete'
  entity: 'contact' | 'company' | 'deal'
  data: any
  originalData?: any // For updates/deletes
  timestamp: number
  retryCount: number
  lastAttempt?: number
  error?: string
  procedure: string // tRPC procedure name
  args: any[] // tRPC procedure arguments
}

export interface OutboxStats {
  total: number
  pending: number
  failed: number
  retrying: number
}

// Conflict types
export interface DataConflict {
  id: string
  entity: 'contact' | 'company' | 'deal'
  entityId: string
  localData: any
  remoteData: any
  localTimestamp: number
  remoteTimestamp: number
  resolved: boolean
  resolution?: 'local' | 'remote' | 'merged'
  auditEntry?: any
}

// Offline state types
export type NetworkState = 'online' | 'offline' | 'syncing'

export interface OfflineState {
  networkState: NetworkState
  lastOnline: number
  pendingMutations: number
  unresolvedConflicts: number
}

// Storage helpers
export class OfflineStorage {
  // Query caching
  static async setQueryCache(
    key: string,
    data: any,
    options: QueryCacheOptions = {}
  ): Promise<void> {
    const cache: CachedQuery = {
      key,
      data,
      timestamp: Date.now(),
      expiresAt: options.ttl ? Date.now() + options.ttl : undefined,
      version: options.version || 1,
    }

    const existingCache = await this.getQueryCache()
    const updatedCache = { ...existingCache, [key]: cache }

    await localforage.setItem(STORAGE_KEYS.QUERY_CACHE, updatedCache)
  }

  static async getQueryCache(): Promise<Record<string, CachedQuery>> {
    return (await localforage.getItem(STORAGE_KEYS.QUERY_CACHE)) || {}
  }

  static async getCachedQuery(key: string): Promise<CachedQuery | null> {
    const cache = await this.getQueryCache()
    const cached = cache[key]

    if (!cached) return null

    // Check expiration
    if (cached.expiresAt && Date.now() > cached.expiresAt) {
      await this.invalidateQueryCache(key)
      return null
    }

    return cached
  }

  static async invalidateQueryCache(key?: string): Promise<void> {
    if (key) {
      const cache = await this.getQueryCache()
      delete cache[key]
      await localforage.setItem(STORAGE_KEYS.QUERY_CACHE, cache)
    } else {
      await localforage.setItem(STORAGE_KEYS.QUERY_CACHE, {})
    }
  }

  static async clearExpiredCache(): Promise<void> {
    const cache = await this.getQueryCache()
    const now = Date.now()
    let hasChanges = false

    for (const [key, cached] of Object.entries(cache)) {
      if (cached.expiresAt && now > cached.expiresAt) {
        delete cache[key]
        hasChanges = true
      }
    }

    if (hasChanges) {
      await localforage.setItem(STORAGE_KEYS.QUERY_CACHE, cache)
    }
  }

  // Mutation outbox
  static async addToOutbox(
    mutation: Omit<QueuedMutation, 'id' | 'timestamp' | 'retryCount'>
  ): Promise<string> {
    const outbox = await this.getOutbox()
    const id = `mutation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const queuedMutation: QueuedMutation = {
      ...mutation,
      id,
      timestamp: Date.now(),
      retryCount: 0,
    }

    outbox.push(queuedMutation)
    await localforage.setItem(STORAGE_KEYS.MUTATION_OUTBOX, outbox)

    // Update offline state
    await this.updateOfflineState({ pendingMutations: outbox.length })

    return id
  }

  static async getOutbox(): Promise<QueuedMutation[]> {
    return (await localforage.getItem(STORAGE_KEYS.MUTATION_OUTBOX)) || []
  }

  static async updateMutationInOutbox(
    id: string,
    updates: Partial<QueuedMutation>
  ): Promise<void> {
    const outbox = await this.getOutbox()
    const index = outbox.findIndex((m) => m.id === id)

    if (index !== -1) {
      outbox[index] = { ...outbox[index], ...updates }
      await localforage.setItem(STORAGE_KEYS.MUTATION_OUTBOX, outbox)
    }
  }

  static async removeFromOutbox(id: string): Promise<void> {
    const outbox = await this.getOutbox()
    const filtered = outbox.filter((m) => m.id !== id)
    await localforage.setItem(STORAGE_KEYS.MUTATION_OUTBOX, filtered)

    // Update offline state
    await this.updateOfflineState({ pendingMutations: filtered.length })
  }

  static async clearOutbox(): Promise<void> {
    await localforage.setItem(STORAGE_KEYS.MUTATION_OUTBOX, [])
    await this.updateOfflineState({ pendingMutations: 0 })
  }

  static async getOutboxStats(): Promise<OutboxStats> {
    const outbox = await this.getOutbox()

    return {
      total: outbox.length,
      pending: outbox.filter((m) => !m.error).length,
      failed: outbox.filter((m) => m.error && m.retryCount >= 3).length,
      retrying: outbox.filter((m) => m.error && m.retryCount < 3).length,
    }
  }

  // Conflicts
  static async addConflict(
    conflict: Omit<DataConflict, 'id'>
  ): Promise<string> {
    const conflicts = await this.getConflicts()
    const id = `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const dataConflict: DataConflict = {
      ...conflict,
      id,
    }

    conflicts.push(dataConflict)
    await localforage.setItem(STORAGE_KEYS.CONFLICTS, conflicts)

    // Update offline state
    await this.updateOfflineState({
      unresolvedConflicts: conflicts.filter((c) => !c.resolved).length,
    })

    return id
  }

  static async getConflicts(): Promise<DataConflict[]> {
    return (await localforage.getItem(STORAGE_KEYS.CONFLICTS)) || []
  }

  static async resolveConflict(
    id: string,
    resolution: DataConflict['resolution'],
    auditEntry?: any
  ): Promise<void> {
    const conflicts = await this.getConflicts()
    const index = conflicts.findIndex((c) => c.id === id)

    if (index !== -1) {
      conflicts[index] = {
        ...conflicts[index],
        resolved: true,
        resolution,
        auditEntry,
      }
      await localforage.setItem(STORAGE_KEYS.CONFLICTS, conflicts)

      // Update offline state
      await this.updateOfflineState({
        unresolvedConflicts: conflicts.filter((c) => !c.resolved).length,
      })
    }
  }

  static async removeConflict(id: string): Promise<void> {
    const conflicts = await this.getConflicts()
    const filtered = conflicts.filter((c) => c.id !== id)
    await localforage.setItem(STORAGE_KEYS.CONFLICTS, filtered)

    // Update offline state
    await this.updateOfflineState({
      unresolvedConflicts: filtered.filter((c) => !c.resolved).length,
    })
  }

  // Offline state
  static async getOfflineState(): Promise<OfflineState> {
    const state = (await localforage.getItem(
      STORAGE_KEYS.OFFLINE_STATE
    )) as OfflineState | null
    return (
      state || {
        networkState: 'online' as NetworkState,
        lastOnline: Date.now(),
        pendingMutations: 0,
        unresolvedConflicts: 0,
      }
    )
  }

  static async updateOfflineState(
    updates: Partial<OfflineState>
  ): Promise<void> {
    const current = await this.getOfflineState()
    const updated = { ...current, ...updates }
    await localforage.setItem(STORAGE_KEYS.OFFLINE_STATE, updated)
  }

  // Sync timestamp
  static async setLastSync(timestamp: number = Date.now()): Promise<void> {
    await localforage.setItem(STORAGE_KEYS.LAST_SYNC, timestamp)
  }

  static async getLastSync(): Promise<number | null> {
    return await localforage.getItem(STORAGE_KEYS.LAST_SYNC)
  }

  // Utility methods
  static async clearAll(): Promise<void> {
    await localforage.clear()
  }

  static async getStorageSize(): Promise<{ used: number; available: number }> {
    // Estimate storage usage (simplified)
    const cache = await this.getQueryCache()
    const outbox = await this.getOutbox()
    const conflicts = await this.getConflicts()

    const used = JSON.stringify({ cache, outbox, conflicts }).length

    // Get available storage (if supported)
    let available = 50 * 1024 * 1024 // 50MB default estimate
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate()
      available = estimate.quota || available
    }

    return { used, available: available - used }
  }
}

import React from 'react'
import { OfflineStorage, CachedQuery, QueryCacheOptions } from '@/lib/offline-storage'
export function generateCacheKey(procedure: string, args: any[]): string {
  return `${procedure}:${JSON.stringify(args)}`
}

// Query caching wrapper
export class QueryCache {
  static async get<T>(
    procedure: string,
    args: any[],
    options: QueryCacheOptions = {}
  ): Promise<T | null> {
    const key = generateCacheKey(procedure, args)
    const cached = await OfflineStorage.getCachedQuery(key)

    if (cached) {
      return cached.data as T
    }

    return null
  }

  static async set<T>(
    procedure: string,
    args: any[],
    data: T,
    options: QueryCacheOptions = {}
  ): Promise<void> {
    const key = generateCacheKey(procedure, args)
    await OfflineStorage.setQueryCache(key, data, options)
  }

  static async invalidate(procedure?: string, args?: any[]): Promise<void> {
    if (procedure && args) {
      const key = generateCacheKey(procedure, args)
      await OfflineStorage.invalidateQueryCache(key)
    } else if (procedure) {
      // Invalidate all queries for a procedure
      const cache = await OfflineStorage.getQueryCache()
      const keysToRemove = Object.keys(cache).filter(key => key.startsWith(`${procedure}:`))

      for (const key of keysToRemove) {
        await OfflineStorage.invalidateQueryCache(key)
      }
    } else {
      // Clear all cache
      await OfflineStorage.invalidateQueryCache()
    }
  }

  static async clearExpired(): Promise<void> {
    await OfflineStorage.clearExpiredCache()
  }

  // Cache with TTL helpers
  static getCacheOptions(ttlMinutes: number = 5): QueryCacheOptions {
    return {
      ttl: ttlMinutes * 60 * 1000, // Convert to milliseconds
      version: 1,
    }
  }

  static getLongCacheOptions(): QueryCacheOptions {
    return this.getCacheOptions(30) // 30 minutes
  }

  static getShortCacheOptions(): QueryCacheOptions {
    return this.getCacheOptions(1) // 1 minute
  }
}

// React hook for cached queries
export function useCachedQuery<T>(
  procedure: string,
  args: any[],
  options: QueryCacheOptions = {}
) {
  const [cachedData, setCachedData] = React.useState<T | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    const loadCachedData = async () => {
      setIsLoading(true)
      try {
        const data = await QueryCache.get<T>(procedure, args, options)
        setCachedData(data)
      } catch (error) {
        console.error('Error loading cached data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadCachedData()
  }, [procedure, JSON.stringify(args), JSON.stringify(options)])

  const updateCache = React.useCallback(async (data: T) => {
    await QueryCache.set(procedure, args, data, options)
    setCachedData(data)
  }, [procedure, args, options])

  const invalidateCache = React.useCallback(async () => {
    await QueryCache.invalidate(procedure, args)
    setCachedData(null)
  }, [procedure, args])

  return {
    data: cachedData,
    isLoading,
    updateCache,
    invalidateCache,
  }
}
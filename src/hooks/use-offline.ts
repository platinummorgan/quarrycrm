'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  OfflineStorage,
  NetworkState,
  OfflineState,
} from '@/lib/offline-storage'

// Network state hook
export function useNetworkState() {
  const [networkState, setNetworkState] = useState<NetworkState>('online')
  const [isOnline, setIsOnline] = useState(true)
  const [offlineState, setOfflineState] = useState<OfflineState | null>(null)

  // Update network state
  const updateNetworkState = useCallback(async (state: NetworkState) => {
    setNetworkState(state)
    await OfflineStorage.updateOfflineState({
      networkState: state,
      lastOnline: state === 'online' ? Date.now() : undefined,
    })
  }, [])

  // Load initial state
  useEffect(() => {
    const loadInitialState = async () => {
      const state = await OfflineStorage.getOfflineState()
      setOfflineState(state)
      setNetworkState(state.networkState)
      setIsOnline(navigator.onLine)
    }

    loadInitialState()
  }, [])

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true)
      await updateNetworkState('online')
    }

    const handleOffline = async () => {
      setIsOnline(false)
      await updateNetworkState('offline')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [updateNetworkState])

  // Update offline state when it changes
  useEffect(() => {
    const updateOfflineState = async () => {
      const state = await OfflineStorage.getOfflineState()
      setOfflineState(state)
    }

    // Update periodically and when network state changes
    const interval = setInterval(updateOfflineState, 5000)
    updateOfflineState()

    return () => clearInterval(interval)
  }, [networkState])

  return {
    networkState,
    isOnline,
    offlineState,
    updateNetworkState,
  }
}

// Sync state hook
export function useSyncState() {
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<number | null>(null)

  useEffect(() => {
    const loadLastSync = async () => {
      const timestamp = await OfflineStorage.getLastSync()
      setLastSync(timestamp)
    }

    loadLastSync()
  }, [])

  const startSync = useCallback(async () => {
    setIsSyncing(true)
    await OfflineStorage.updateOfflineState({ networkState: 'syncing' })
  }, [])

  const endSync = useCallback(async () => {
    setIsSyncing(false)
    const timestamp = Date.now()
    setLastSync(timestamp)
    await OfflineStorage.setLastSync(timestamp)
    await OfflineStorage.updateOfflineState({ networkState: 'online' })
  }, [])

  return {
    isSyncing,
    lastSync,
    startSync,
    endSync,
  }
}

// Outbox hook
export function useOutbox() {
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    failed: 0,
    retrying: 0,
  })

  const refreshStats = useCallback(async () => {
    const outboxStats = await OfflineStorage.getOutboxStats()
    setStats(outboxStats)
  }, [])

  useEffect(() => {
    refreshStats()

    // Refresh stats periodically
    const interval = setInterval(refreshStats, 2000)
    return () => clearInterval(interval)
  }, [refreshStats])

  const clearOutbox = useCallback(async () => {
    await OfflineStorage.clearOutbox()
    await refreshStats()
  }, [refreshStats])

  return {
    stats,
    refreshStats,
    clearOutbox,
  }
}

// Conflicts hook
export function useConflicts() {
  const [conflicts, setConflicts] = useState<any[]>([])
  const [unresolvedCount, setUnresolvedCount] = useState(0)

  const refreshConflicts = useCallback(async () => {
    const allConflicts = await OfflineStorage.getConflicts()
    setConflicts(allConflicts)
    setUnresolvedCount(allConflicts.filter((c) => !c.resolved).length)
  }, [])

  useEffect(() => {
    refreshConflicts()

    // Refresh conflicts periodically
    const interval = setInterval(refreshConflicts, 5000)
    return () => clearInterval(interval)
  }, [refreshConflicts])

  const resolveConflict = useCallback(
    async (id: string, resolution: any, auditEntry?: any) => {
      await OfflineStorage.resolveConflict(id, resolution, auditEntry)
      await refreshConflicts()
    },
    [refreshConflicts]
  )

  return {
    conflicts,
    unresolvedCount,
    refreshConflicts,
    resolveConflict,
  }
}

// Combined offline hook
export function useOffline() {
  const network = useNetworkState()
  const sync = useSyncState()
  const outbox = useOutbox()
  const conflicts = useConflicts()

  return {
    // Network state
    networkState: network.networkState,
    isOnline: network.isOnline,
    offlineState: network.offlineState,

    // Sync state
    isSyncing: sync.isSyncing,
    lastSync: sync.lastSync,
    startSync: sync.startSync,
    endSync: sync.endSync,

    // Outbox
    outboxStats: outbox.stats,
    clearOutbox: outbox.clearOutbox,

    // Conflicts
    conflicts: conflicts.conflicts,
    unresolvedConflicts: conflicts.unresolvedCount,
    resolveConflict: conflicts.resolveConflict,

    // Combined state
    hasPendingWork: outbox.stats.total > 0 || conflicts.unresolvedCount > 0,
    isOfflineMode: network.networkState === 'offline' || !network.isOnline,
  }
}

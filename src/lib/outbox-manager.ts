import { OfflineStorage, QueuedMutation } from '@/lib/offline-storage'

// Type declarations for Background Sync API
declare global {
  interface ServiceWorkerRegistration {
    sync: {
      register(tag: string): Promise<void>
      getTags(): Promise<string[]>
    }
  }
}

// Backoff configuration
const BACKOFF_CONFIG = {
  initialDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  multiplier: 2,
  maxRetries: 5,
}

// Outbox manager class
export class OutboxManager {
  private static instance: OutboxManager
  private isProcessing = false
  private abortController: AbortController | null = null

  static getInstance(): OutboxManager {
    if (!OutboxManager.instance) {
      OutboxManager.instance = new OutboxManager()
    }
    return OutboxManager.instance
  }

  // Add mutation to outbox
  async queueMutation(
    procedure: string,
    args: any[],
    type: QueuedMutation['type'],
    entity: QueuedMutation['entity'],
    data: any,
    originalData?: any
  ): Promise<string> {
    const mutationId = await OfflineStorage.addToOutbox({
      type,
      entity,
      data,
      originalData,
      procedure,
      args,
    })

    // Start processing if online
    if (navigator.onLine) {
      this.processOutbox()
    } else {
      // Trigger background sync when offline
      this.triggerBackgroundSync()
    }

    return mutationId
  }

  // Process outbox mutations
  async processOutbox(): Promise<void> {
    if (this.isProcessing || !navigator.onLine) {
      return
    }

    this.isProcessing = true
    this.abortController = new AbortController()

    try {
      const outbox = await OfflineStorage.getOutbox()
      const pendingMutations = outbox.filter(m => !m.error || m.retryCount < BACKOFF_CONFIG.maxRetries)

      for (const mutation of pendingMutations) {
        if (this.abortController.signal.aborted) break

        try {
          await this.executeMutation(mutation)
          await OfflineStorage.removeFromOutbox(mutation.id)
        } catch (error) {
          await this.handleMutationError(mutation, error as Error)
        }

        // Small delay between mutations
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    } finally {
      this.isProcessing = false
      this.abortController = null
    }
  }

  // Execute a single mutation
  private async executeMutation(mutation: QueuedMutation): Promise<void> {
    // Import tRPC client dynamically to avoid circular dependencies
    const { trpc } = await import('@/lib/trpc')

    // For now, we'll use fetch to call the tRPC endpoint directly
    // This is a simplified version - in production you'd want proper tRPC client integration
    const response = await fetch('/api/trpc', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        0: {
          jsonrpc: '2.0',
          method: mutation.procedure,
          params: { json: mutation.args },
          id: Date.now(),
        },
      }),
    })

    if (!response.ok) {
      throw new Error(`Mutation failed: ${response.statusText}`)
    }

    const result = await response.json()

    if (result[0]?.error) {
      throw new Error(result[0].error.message)
    }

    return result[0]?.result
  }

  // Handle mutation errors with backoff
  private async handleMutationError(mutation: QueuedMutation, error: Error): Promise<void> {
    const retryCount = mutation.retryCount + 1

    if (retryCount >= BACKOFF_CONFIG.maxRetries) {
      // Mark as failed
      await OfflineStorage.updateMutationInOutbox(mutation.id, {
        retryCount,
        error: error.message,
        lastAttempt: Date.now(),
      })
    } else {
      // Schedule retry with backoff
      const delay = Math.min(
        BACKOFF_CONFIG.initialDelay * Math.pow(BACKOFF_CONFIG.multiplier, retryCount - 1),
        BACKOFF_CONFIG.maxDelay
      )

      await OfflineStorage.updateMutationInOutbox(mutation.id, {
        retryCount,
        error: error.message,
        lastAttempt: Date.now(),
      })

      // Schedule retry
      setTimeout(() => {
        if (navigator.onLine) {
          this.processOutbox()
        }
      }, delay)
    }
  }

  // Invalidate related caches after successful mutation
  private async invalidateRelatedCaches(mutation: QueuedMutation): Promise<void> {
    const { QueryCache } = await import('@/lib/query-cache')

    // Invalidate entity-specific caches
    switch (mutation.entity) {
      case 'contact':
        await QueryCache.invalidate('contact')
        await QueryCache.invalidate('contacts')
        break
      case 'company':
        await QueryCache.invalidate('company')
        await QueryCache.invalidate('companies')
        break
      case 'deal':
        await QueryCache.invalidate('deal')
        await QueryCache.invalidate('deals')
        break
    }

    // Invalidate specific item cache if it's an update/delete
    if (mutation.type !== 'create' && mutation.data.id) {
      await QueryCache.invalidate(`${mutation.entity}`, [mutation.data.id])
    }
  }

  // Retry failed mutations
  async retryFailedMutations(): Promise<void> {
    const outbox = await OfflineStorage.getOutbox()
    const failedMutations = outbox.filter(m => m.error && m.retryCount < BACKOFF_CONFIG.maxRetries)

    for (const mutation of failedMutations) {
      await OfflineStorage.updateMutationInOutbox(mutation.id, {
        retryCount: 0,
        error: undefined,
        lastAttempt: undefined,
      })
    }

    if (navigator.onLine) {
      this.processOutbox()
    }
  }

  // Stop processing
  stopProcessing(): void {
    if (this.abortController) {
      this.abortController.abort()
    }
    this.isProcessing = false
  }

  // Trigger background sync
  private async triggerBackgroundSync(): Promise<void> {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready
        await registration.sync.register('outbox-sync')
      } catch (error) {
        console.warn('Background sync not supported or failed to register:', error)
      }
    }
  }

  // Get processing status
  getStatus() {
    return {
      isProcessing: this.isProcessing,
      isOnline: navigator.onLine,
    }
  }
}

// Global outbox instance
export const outboxManager = OutboxManager.getInstance()

// React hook for outbox management
export function useOutboxManager() {
  const [status, setStatus] = React.useState(outboxManager.getStatus())

  React.useEffect(() => {
    const interval = setInterval(() => {
      setStatus(outboxManager.getStatus())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const queueMutation = React.useCallback(
    (procedure: string, args: any[], type: QueuedMutation['type'], entity: QueuedMutation['entity'], data: any, originalData?: any) => {
      return outboxManager.queueMutation(procedure, args, type, entity, data, originalData)
    },
    []
  )

  const retryFailed = React.useCallback(() => {
    return outboxManager.retryFailedMutations()
  }, [])

  const stopProcessing = React.useCallback(() => {
    outboxManager.stopProcessing()
  }, [])

  return {
    ...status,
    queueMutation,
    retryFailed,
    stopProcessing,
  }
}

// Import React for hooks
import React from 'react'
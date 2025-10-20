'use client'

import { useState, useEffect } from 'react'
import { toast } from '@/lib/toast'

// Expose default timeout so it's testable and configurable in one place
export const DEFAULT_LOADING_TIMEOUT = 2000

interface UseLoadingStateOptions {
  // timeout: number -> milliseconds to wait before showing empty state
  // Pass `null` to disable the timeout entirely (keep skeleton until loading finishes)
  timeout?: number | null // Default DEFAULT_LOADING_TIMEOUT when undefined
  showToast?: boolean
  toastMessage?: string
  onTimeout?: () => void
}

/**
 * Hook that manages loading state with skeleton → empty UI + toast pattern
 * Shows skeleton for max timeout, then shows empty state and optional toast
 */
export function useLoadingState(
  isLoading: boolean,
  options: UseLoadingStateOptions = {}
) {
  const {
    timeout: timeoutOption = DEFAULT_LOADING_TIMEOUT,
    showToast = true,
    toastMessage = 'Taking longer than expected. Please wait...',
    onTimeout,
  } = options

  // Allow callers to pass `timeout: null` to disable the timeout behavior.
  const timeout = timeoutOption === null ? null : timeoutOption

  const [showSkeleton, setShowSkeleton] = useState(false)
  const [hasTimedOut, setHasTimedOut] = useState(false)

  useEffect(() => {
    if (isLoading) {
      setShowSkeleton(true)
      setHasTimedOut(false)

      // If timeout is explicitly null, do not start a timer - keep skeleton until
      // the loading flag resolves.
      if (timeout === null) {
        return
      }

      const timer = setTimeout(() => {
        setShowSkeleton(false)
        setHasTimedOut(true)

        if (showToast) {
          toast.info(toastMessage)
        }

        onTimeout?.()
      }, timeout)

      return () => clearTimeout(timer)
    } else {
      setShowSkeleton(false)
      setHasTimedOut(false)
    }
  }, [isLoading, timeout, showToast, toastMessage, onTimeout])

  return {
    showSkeleton: isLoading && showSkeleton,
    showEmptyState: isLoading && hasTimedOut,
    isLoading,
  }
}

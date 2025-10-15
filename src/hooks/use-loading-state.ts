'use client'

import { useState, useEffect } from 'react'
import { toast } from '@/lib/toast'

interface UseLoadingStateOptions {
  timeout?: number // Default 400ms
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
    timeout = 400,
    showToast = true,
    toastMessage = 'Taking longer than expected. Please wait...',
    onTimeout,
  } = options

  const [showSkeleton, setShowSkeleton] = useState(false)
  const [hasTimedOut, setHasTimedOut] = useState(false)

  useEffect(() => {
    if (isLoading) {
      setShowSkeleton(true)
      setHasTimedOut(false)

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
/**
 * Hook for handling rate limit errors (429) with friendly toast notifications
 */

import { useToast } from './use-toast'

export interface RateLimitError {
  error: string
  message: string
  retryAfter?: number
}

/**
 * Hook to handle rate limit errors with user-friendly toast messages
 * 
 * @example
 * const handleRateLimit = useRateLimitHandler()
 * 
 * try {
 *   const response = await fetch('/api/whoami')
 *   if (response.status === 429) {
 *     await handleRateLimit(response)
 *   }
 * } catch (error) {
 *   // handle other errors
 * }
 */
export function useRateLimitHandler() {
  const { toast } = useToast()

  /**
   * Handle a 429 rate limit response
   * Shows a friendly toast with retry time
   */
  const handleRateLimit = async (response: Response) => {
    try {
      // Get retry-after header (in seconds)
      const retryAfterHeader = response.headers.get('retry-after')
      const retryAfter = retryAfterHeader ? parseInt(retryAfterHeader, 10) : null

      // Try to parse JSON error message
      let errorData: RateLimitError | null = null
      try {
        errorData = await response.json()
      } catch {
        // Ignore JSON parse errors
      }

      // Format retry time message
      let retryMessage = 'Please try again later.'
      if (retryAfter) {
        if (retryAfter < 60) {
          retryMessage = `Please try again in ${retryAfter} seconds.`
        } else {
          const minutes = Math.ceil(retryAfter / 60)
          retryMessage = `Please try again in ${minutes} minute${minutes > 1 ? 's' : ''}.`
        }
      }

      // Show toast notification
      toast({
        variant: 'destructive',
        title: 'Too many requests',
        description: errorData?.message || `You've made too many requests. ${retryMessage}`,
        duration: 5000,
      })

      return {
        handled: true,
        retryAfter,
        message: errorData?.message,
      }
    } catch (error) {
      console.error('Error handling rate limit response:', error)
      
      // Fallback toast
      toast({
        variant: 'destructive',
        title: 'Too many requests',
        description: 'You\'ve made too many requests. Please try again later.',
        duration: 5000,
      })

      return {
        handled: true,
        retryAfter: null,
        message: null,
      }
    }
  }

  /**
   * Wrap a fetch call with automatic rate limit handling
   * 
   * @example
   * const data = await withRateLimitHandling(
   *   fetch('/api/whoami'),
   *   { fallbackValue: null }
   * )
   */
  const withRateLimitHandling = async <T>(
    fetchPromise: Promise<Response>,
    options?: {
      fallbackValue?: T
      onRateLimit?: (retryAfter: number | null) => void
    }
  ): Promise<T | undefined> => {
    try {
      const response = await fetchPromise

      if (response.status === 429) {
        const result = await handleRateLimit(response)
        options?.onRateLimit?.(result.retryAfter)
        return options?.fallbackValue
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      if (error instanceof Error && error.message.includes('429')) {
        // Already handled
        return options?.fallbackValue
      }
      throw error
    }
  }

  return {
    handleRateLimit,
    withRateLimitHandling,
  }
}

/**
 * Format seconds into a human-readable time string
 */
export function formatRetryAfter(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} second${seconds !== 1 ? 's' : ''}`
  }
  
  const minutes = Math.ceil(seconds / 60)
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`
  }
  
  const hours = Math.ceil(minutes / 60)
  return `${hours} hour${hours !== 1 ? 's' : ''}`
}

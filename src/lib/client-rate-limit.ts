import { toast } from 'sonner'

export interface RateLimitError {
  error: string
  message: string
  retryAfter?: number
  limit?: number
  reset?: number
}

/**
 * Check if a response is a rate limit error (429)
 */
export function isRateLimitError(response: Response): boolean {
  return response.status === 429
}

/**
 * Handle rate limit error response with user-friendly toast
 *
 * @param response - Fetch response object (status 429)
 * @returns Parsed rate limit error data
 */
export async function handleRateLimitError(
  response: Response
): Promise<RateLimitError | null> {
  if (!isRateLimitError(response)) {
    return null
  }

  try {
    const data: RateLimitError = await response.json()
    const retryAfter =
      data.retryAfter || parseInt(response.headers.get('Retry-After') || '60')

    // Format retry message
    const retryMessage =
      retryAfter < 60
        ? `Try again in ${retryAfter} seconds`
        : `Try again in ${Math.ceil(retryAfter / 60)} minute${retryAfter >= 120 ? 's' : ''}`

    // Show toast notification
    toast.error('Rate limit exceeded', {
      description: `${data.message || 'Too many requests'}. ${retryMessage}.`,
      duration: 5000,
    })

    return {
      ...data,
      retryAfter,
    }
  } catch (error) {
    // Fallback if JSON parsing fails
    toast.error('Rate limit exceeded', {
      description: 'Too many requests. Please slow down and try again later.',
      duration: 5000,
    })

    return {
      error: 'rate_limit_exceeded',
      message: 'Too many requests',
      retryAfter: 60,
    }
  }
}

/**
 * Fetch wrapper that automatically handles rate limit errors
 *
 * @param url - URL to fetch
 * @param options - Fetch options
 * @returns Response or throws on rate limit
 *
 * @example
 * try {
 *   const response = await fetchWithRateLimit('/api/contacts', {
 *     method: 'POST',
 *     body: JSON.stringify(data),
 *   });
 *   const result = await response.json();
 * } catch (error) {
 *   // Rate limit error already handled with toast
 * }
 */
export async function fetchWithRateLimit(
  url: string,
  options?: RequestInit
): Promise<Response> {
  const response = await fetch(url, options)

  if (isRateLimitError(response)) {
    await handleRateLimitError(response)
    throw new Error('Rate limit exceeded')
  }

  return response
}

/**
 * Get rate limit info from response headers
 */
export function getRateLimitInfo(response: Response): {
  limit: number | null
  remaining: number | null
  reset: number | null
  resetDate: Date | null
} {
  const limit = response.headers.get('X-RateLimit-Limit')
  const remaining = response.headers.get('X-RateLimit-Remaining')
  const reset = response.headers.get('X-RateLimit-Reset')

  return {
    limit: limit ? parseInt(limit) : null,
    remaining: remaining ? parseInt(remaining) : null,
    reset: reset ? parseInt(reset) : null,
    resetDate: reset ? new Date(parseInt(reset) * 1000) : null,
  }
}

/**
 * Error handler for tRPC rate limit errors
 * Extracts rate limit info from TRPCError and formats it for UI display
 */

import { TRPCClientError } from '@trpc/client'

export interface RateLimitInfo {
  isRateLimited: boolean
  retryAfter?: number
  limit?: number
  reset?: number
  message?: string
}

/**
 * Extract rate limit information from a tRPC error
 * 
 * @param error - The error thrown by tRPC
 * @returns Rate limit information if applicable
 * 
 * @example
 * try {
 *   await trpc.contacts.create.mutate(data)
 * } catch (error) {
 *   const rateLimitInfo = extractRateLimitInfo(error)
 *   if (rateLimitInfo.isRateLimited) {
 *     toast({
 *       title: 'Rate limit exceeded',
 *       description: `Please wait ${rateLimitInfo.retryAfter}s`
 *     })
 *   }
 * }
 */
export function extractRateLimitInfo(error: unknown): RateLimitInfo {
  // Check if it's a TRPCClientError
  if (error instanceof TRPCClientError) {
    const data = error.data as any
    
    // Check for TOO_MANY_REQUESTS error code
    if (data?.code === 'TOO_MANY_REQUESTS' || error.message.includes('Rate limit exceeded')) {
      return {
        isRateLimited: true,
        retryAfter: data?.cause?.retryAfter,
        limit: data?.cause?.limit,
        reset: data?.cause?.reset,
        message: error.message,
      }
    }
  }
  
  // Check if it's a standard Error with rate limit message
  if (error instanceof Error && error.message.includes('Rate limit exceeded')) {
    // Try to extract retry time from message
    const retryMatch = error.message.match(/wait (\d+) seconds/)
    const retryAfter = retryMatch ? parseInt(retryMatch[1], 10) : undefined
    
    return {
      isRateLimited: true,
      retryAfter,
      message: error.message,
    }
  }
  
  return {
    isRateLimited: false,
  }
}

/**
 * Format retry time in human-readable format
 * 
 * @param seconds - Number of seconds to wait
 * @returns Formatted string like "30 seconds" or "2 minutes"
 */
export function formatRetryTime(seconds: number): string {
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

/**
 * Format reset timestamp to human-readable time
 * 
 * @param reset - Unix timestamp (seconds)
 * @returns Formatted time like "2:30 PM"
 */
export function formatResetTime(reset: number): string {
  const date = new Date(reset * 1000)
  return date.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

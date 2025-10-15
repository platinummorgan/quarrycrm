import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Get the base URL for the application
 * Uses NEXT_PUBLIC_BASE_URL if set, otherwise builds from VERCEL_URL or defaults to localhost
 */
export function getBaseUrl(): string {
  // Check for explicit base URL
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL
  }

  // Check for Vercel URL
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }

  // Default to localhost for development
  return 'http://localhost:3000'
}

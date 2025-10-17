import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Get the base URL for the application
 * Uses NEXT_PUBLIC_BASE_URL if set, otherwise builds from VERCEL_URL or defaults to localhost
 */
export { getBaseUrl } from './baseUrl'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface TimingEntry {
  name: string
  duration: number
  description?: string
}

interface RouteTimingData {
  route: string
  method: string
  totalDuration: number
  sqlDuration: number
  handlerDuration: number
  timestamp: number
}

// In-memory store for timing data (dev only)
const timingStore: RouteTimingData[] = []
const MAX_TIMING_ENTRIES = 100

/**
 * Store timing data for debug page
 */
function storeTimingData(data: RouteTimingData) {
  if (process.env.NODE_ENV !== 'development') return

  timingStore.unshift(data)
  if (timingStore.length > MAX_TIMING_ENTRIES) {
    timingStore.pop()
  }
}

/**
 * Get stored timing data (sorted by total duration)
 */
export function getTimingData() {
  return [...timingStore].sort((a, b) => b.totalDuration - a.totalDuration)
}

/**
 * Clear timing data
 */
export function clearTimingData() {
  timingStore.length = 0
}

/**
 * Measure SQL query performance
 */
export async function measureSql<T>(
  name: string,
  fn: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const start = performance.now()
  const result = await fn()
  const duration = performance.now() - start

  return { result, duration }
}

/**
 * Format timing header value
 */
function formatTiming(timings: TimingEntry[]): string {
  return timings
    .map((t) => {
      const desc = t.description ? `;desc="${t.description}"` : ''
      return `${t.name};dur=${t.duration.toFixed(2)}${desc}`
    })
    .join(', ')
}

/**
 * Higher-order function to wrap API route handlers with timing
 */
export function withServerTiming<T = any>(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse<T>>
) {
  return async (req: NextRequest, context?: any): Promise<NextResponse<T>> => {
    const timings: TimingEntry[] = []
    const totalStart = performance.now()
    let sqlDuration = 0

    // Intercept Prisma queries to measure SQL timing
    const originalPrismaQuery = (prisma as any)._engine?.query
    if (originalPrismaQuery) {
      ;(prisma as any)._engine.query = async function (...args: any[]) {
        const sqlStart = performance.now()
        const result = await originalPrismaQuery.apply(this, args)
        const duration = performance.now() - sqlStart
        sqlDuration += duration
        return result
      }
    }

    try {
      // Measure handler execution
      const handlerStart = performance.now()
      const response = await handler(req, context)
      const handlerDuration = performance.now() - handlerStart
      const totalDuration = performance.now() - totalStart

      // Add timings
      if (sqlDuration > 0) {
        timings.push({
          name: 'sql',
          duration: sqlDuration,
          description: 'Database queries',
        })
      }

      timings.push({
        name: 'handler',
        duration: handlerDuration - sqlDuration,
        description: 'Handler execution',
      })

      timings.push({
        name: 'total',
        duration: totalDuration,
        description: 'Total request time',
      })

      // Store timing data for debug page
      const url = new URL(req.url)
      storeTimingData({
        route: url.pathname,
        method: req.method,
        totalDuration,
        sqlDuration,
        handlerDuration: handlerDuration - sqlDuration,
        timestamp: Date.now(),
      })

      // Clone response and add Server-Timing header
      const headers = new Headers(response.headers)
      headers.set('Server-Timing', formatTiming(timings))

      return new NextResponse(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      })
    } catch (error) {
      // Even on error, report timing
      const totalDuration = performance.now() - totalStart

      timings.push({
        name: 'error',
        duration: totalDuration,
        description: 'Request failed',
      })

      const url = new URL(req.url)
      storeTimingData({
        route: url.pathname,
        method: req.method,
        totalDuration,
        sqlDuration,
        handlerDuration: 0,
        timestamp: Date.now(),
      })

      throw error
    } finally {
      // Restore original Prisma query method
      if (originalPrismaQuery) {
        ;(prisma as any)._engine.query = originalPrismaQuery
      }
    }
  }
}

/**
 * Standalone function to measure any async operation
 */
export async function measure<T>(
  name: string,
  fn: () => Promise<T>
): Promise<{ result: T; duration: number; timing: TimingEntry }> {
  const start = performance.now()
  const result = await fn()
  const duration = performance.now() - start

  return {
    result,
    duration,
    timing: {
      name,
      duration,
    },
  }
}

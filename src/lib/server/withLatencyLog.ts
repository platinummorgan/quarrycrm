import { NextRequest, NextResponse } from 'next/server'

type ServerAction<T extends any[] = any[], R = any> = (...args: T) => Promise<R>

interface LatencyLogOptions {
  name?: string
  logLevel?: 'debug' | 'info' | 'warn'
  includeArgs?: boolean
}

/**
 * Higher-order function that wraps server actions with latency logging
 * Returns latency in milliseconds in development mode
 */
export function withLatencyLog<T extends any[], R>(
  action: ServerAction<T, R>,
  options: LatencyLogOptions = {}
): ServerAction<T, R> {
  const {
    name = action.name || 'anonymous',
    logLevel = 'debug',
    includeArgs = false,
  } = options

  return async (...args: T): Promise<R> => {
    const startTime = Date.now()
    const isDev = process.env.NODE_ENV === 'development'

    try {
      if (isDev) {
        console[logLevel](`[${name}] Starting...`, includeArgs ? args : '')
      }

      const result = await action(...args)
      const latency = Date.now() - startTime

      if (isDev) {
        console[logLevel](`[${name}] Completed in ${latency}ms`)
      }

      // In development, return result with latency info
      if (isDev && typeof result === 'object' && result !== null) {
        return {
          ...result,
          _latency: latency,
        } as R
      }

      return result
    } catch (error) {
      const latency = Date.now() - startTime

      if (isDev) {
        console.error(`[${name}] Failed after ${latency}ms:`, error)
      }

      throw error
    }
  }
}

/**
 * Middleware-style latency logger for Next.js API routes
 */
export function withLatencyLogMiddleware(
  handler: (req: NextRequest) => Promise<NextResponse> | NextResponse,
  options: LatencyLogOptions & { route?: string } = {}
) {
  const { route = 'api', ...logOptions } = options

  return async (req: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now()
    const isDev = process.env.NODE_ENV === 'development'
    const method = req.method
    const url = req.url

    try {
      if (isDev) {
        console.debug(`[${route}] ${method} ${url} - Starting...`)
      }

      const response = await handler(req)
      const latency = Date.now() - startTime

      if (isDev) {
        console.debug(`[${route}] ${method} ${url} - Completed in ${latency}ms`)
      }

      // Add latency header in development
      if (isDev && response instanceof NextResponse) {
        response.headers.set('X-Response-Time', `${latency}ms`)
      }

      return response
    } catch (error) {
      const latency = Date.now() - startTime

      if (isDev) {
        console.error(`[${route}] ${method} ${url} - Failed after ${latency}ms:`, error)
      }

      throw error
    }
  }
}
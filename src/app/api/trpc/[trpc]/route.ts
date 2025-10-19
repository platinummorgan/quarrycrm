import { createTRPCContext } from '@/server/trpc/trpc'
import { appRouter } from '@/server/trpc/routers/_app'
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { checkDemoRateLimit } from '@/lib/rate-limit'

const handler = async (request: Request) => {
  // Check if this is a demo user request and apply rate limiting
  const session = await import('@/lib/auth-helpers').then(m => m.getServerAuthSession())

  if (session?.user?.isDemo || session?.user?.currentOrg?.role === 'DEMO') {
    // Convert Request to NextRequest-like object for rate limiting
    const nextRequest = {
      headers: {
        get: (name: string) => request.headers.get(name),
      },
    } as any

    // Determine if this is a write operation (POST, PUT, DELETE)
    const isWrite = ['POST', 'PUT', 'DELETE'].includes(request.method)

    const rateLimitResponse = checkDemoRateLimit(nextRequest, isWrite)
    if (rateLimitResponse) {
      return rateLimitResponse
    }
  }

  try {
    return await fetchRequestHandler({
      endpoint: '/api/trpc',
      req: request,
      router: appRouter,
      createContext: createTRPCContext,
    })
  } catch (error: any) {
    // Log detailed tRPC errors in development for easier debugging
    if (process.env.NODE_ENV !== 'production') {
      try {
        console.error('tRPC error at /api/trpc', error)
      } catch (e) {
        // ignore logging errors
      }
    }
    throw error
  }
}

export { handler as GET, handler as POST }

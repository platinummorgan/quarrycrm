import { createTRPCContext } from '@/server/trpc/trpc'
import { appRouter } from '@/server/trpc/routers/_app'
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'

const handler = (request: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req: request,
    router: appRouter,
    createContext: createTRPCContext,
  })

export { handler as GET, handler as POST }

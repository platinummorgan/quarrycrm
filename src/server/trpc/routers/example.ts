import { createTRPCRouter, publicProcedure } from '@/server/trpc/trpc'

export const exampleRouter = createTRPCRouter({
  hello: publicProcedure.query(() => {
    return {
      message: 'Hello from tRPC!',
    }
  }),
})

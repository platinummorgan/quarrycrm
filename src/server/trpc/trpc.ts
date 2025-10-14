import { initTRPC, TRPCError } from '@trpc/server'
import { type FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch'
import superjson from 'superjson'
import { getServerAuthSession } from '@/lib/auth-helpers'

export const createTRPCContext = async (opts: FetchCreateContextFnOptions) => {
  const session = await getServerAuthSession()

  return {
    req: opts.req,
    res: opts.resHeaders,
    session,
  }
}

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
})

export const createTRPCRouter = t.router
export const publicProcedure = t.procedure

// Protected procedure that requires authentication
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource',
    })
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
    },
  })
})

// Organization-scoped procedure that requires org context
export const orgProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (!ctx.session.user.currentOrg) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'No organization context found',
    })
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      userId: ctx.session.user.id,
      orgId: ctx.session.user.currentOrg.id,
      orgRole: ctx.session.user.currentOrg.role,
    },
  })
})

// Role-based procedure creators
export const ownerProcedure = orgProcedure.use(async ({ ctx, next }) => {
  if (ctx.orgRole !== 'OWNER') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Only organization owners can access this resource',
    })
  }
  return next()
})

export const adminProcedure = orgProcedure.use(async ({ ctx, next }) => {
  if (!['OWNER', 'ADMIN'].includes(ctx.orgRole)) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Only organization owners and admins can access this resource',
    })
  }
  return next()
})

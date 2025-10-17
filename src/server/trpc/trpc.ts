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

// Demo users can only read, not write
export const demoProcedure = orgProcedure.use(async ({ ctx, next }) => {
  if (ctx.orgRole === 'DEMO') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Demo accounts are read-only. Contact your administrator to upgrade.',
    })
  }
  return next()
})

// Rate-limited procedure for write operations
import { checkCombinedRateLimit, getClientIp, type SlidingWindowConfig } from '@/lib/rate-limit'

export function rateLimitedProcedure(config: SlidingWindowConfig & { burst?: number }) {
  return orgProcedure.use(async ({ ctx, next }) => {
    // Extract IP from request headers
    const clientIp = getClientIp(ctx.req)
    const orgId = ctx.orgId

    // Check rate limit
    const rateLimitResult = await checkCombinedRateLimit(clientIp, orgId, config)

    if (!rateLimitResult.success) {
      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: `Rate limit exceeded. Please wait ${rateLimitResult.retryAfter} seconds before trying again.`,
        cause: {
          retryAfter: rateLimitResult.retryAfter,
          limit: rateLimitResult.limit,
          reset: rateLimitResult.reset,
        },
      })
    }

    // Add rate limit info to response headers
    if (ctx.res) {
      ctx.res.set('X-RateLimit-Limit', rateLimitResult.limit.toString())
      ctx.res.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString())
      ctx.res.set('X-RateLimit-Reset', rateLimitResult.reset.toString())
    }

    return next()
  })
}

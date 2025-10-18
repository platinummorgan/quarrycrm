import { initTRPC, TRPCError } from '@trpc/server'
import { type FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch'
import superjson from 'superjson'
import { getServerAuthSession } from '@/lib/auth-helpers'
import { ensureUserOrg } from '@/server/ensure-user-org'
import { prisma } from '@/lib/prisma'

export const createTRPCContext = async (opts: FetchCreateContextFnOptions) => {
  const session = await getServerAuthSession()

  // Resolve organization id from header, cookie, or session
  const req = opts.req
  const resHeaders = opts.resHeaders

  let orgId: string | null = null

  // 1) header
  try {
    const headerOrg = req.headers.get('x-org-id')
    if (headerOrg) orgId = headerOrg
  } catch (e) {
    // ignore
  }

  // 2) cookie
  if (!orgId) {
    try {
      const cookieHeader = req.headers.get('cookie') || ''
      const match = cookieHeader.match(/(?:^|; )org=([^;]+)/)
      if (match) orgId = decodeURIComponent(match[1])
    } catch (e) {
      // ignore
    }
  }

  // 3) session current org
  if (!orgId && (session as any)?.user) {
    orgId = (session as any).user?.currentOrg?.id || (session as any).user?.currentOrganizationId || null
  }

  // 4) fallback: if logged in and no org, auto-provision
  let createdOrg = false
  if (!orgId && (session as any)?.user?.id) {
    orgId = await ensureUserOrg((session as any).user.id)
    createdOrg = true
  }

  // 5) final guard
  if (!orgId) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'No organization context found' })
  }

  // If we created the org, attempt to set a cookie on the response headers
  if (createdOrg) {
    try {
      const setCookieHeader = `org=${encodeURIComponent(orgId)}; Path=/; SameSite=Lax`
      if (typeof resHeaders?.append === 'function') {
        resHeaders.append('Set-Cookie', setCookieHeader)
      } else if (typeof resHeaders?.set === 'function') {
        const existing = resHeaders.get && resHeaders.get('Set-Cookie')
        if (existing) {
          const combined = Array.isArray(existing) ? existing.join('\n') + '\n' + setCookieHeader : `${existing}\n${setCookieHeader}`
          resHeaders.set('Set-Cookie', combined)
        } else {
          resHeaders.set('Set-Cookie', setCookieHeader)
        }
      }
    } catch (e) {
      // ignore
    }
  }

  return {
    req: opts.req,
    res: opts.resHeaders,
    session,
    orgId,
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
  // ctx.orgId should be set by the context creator
  if (!ctx.orgId) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'No organization context found' })
  }

  // Derive userId and role from session or DB lookup
  const userId = ctx.session.user.id
  let orgRole: string | null = null

  try {
    const membership = await prisma.orgMember.findUnique({
      where: { organizationId_userId: { organizationId: ctx.orgId, userId } },
    })

    if (membership) orgRole = membership.role
  } catch (e) {
    // fallback: if session contains role info
    orgRole = (ctx.session as any).user?.currentOrg?.role || null
  }

  if (!orgRole) {
    // If we couldn't determine role, default to MEMBER
    orgRole = 'MEMBER'
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      userId,
      orgId: ctx.orgId,
      orgRole,
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

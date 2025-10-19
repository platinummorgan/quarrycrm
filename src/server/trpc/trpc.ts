import { initTRPC, TRPCError } from '@trpc/server'
import { type FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch'
import superjson from 'superjson'
import { getServerAuthSession } from '@/lib/auth-helpers'
import { ensureOrgForUser } from '@/lib/org/ensure'
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

  // 4) fallback: if logged in and no org, try quick membership lookup then auto-provision
  let createdOrg = false
  if (!orgId && (session as any)?.user?.id) {
    const userId = (session as any).user.id

    try {
      const membership = await prisma.orgMember.findFirst({
        where: { userId },
        select: { organizationId: true },
      })

      if (membership?.organizationId) {
        orgId = membership.organizationId
      } else {
        // Auto-provision a personal org for first-time users
        const created = await ensureOrgForUser(prisma, { id: userId, email: (session as any).user?.email || null })
        orgId = created.id
        createdOrg = true
      }
    } catch (e) {
      // fallback to existing logic: try to auto-create via helper
      try {
        const created = await ensureOrgForUser(prisma, { id: (session as any).user.id, email: (session as any).user?.email || null })
        orgId = created.id
        createdOrg = true
      } catch (e) {
        // ignore and let the final guard throw
      }
    }
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

  // Resolve organization record and membership for convenience in routers
  let org = null
  let membership = null

  if (orgId) {
    try {
      org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { id: true, name: true },
      })
    } catch (e) {
      // ignore; leave org null and let downstream guard handle it
    }

    if (org && (session as any)?.user?.id) {
      try {
        membership = await prisma.orgMember.findUnique({
          where: { organizationId_userId: { organizationId: orgId, userId: (session as any).user.id } },
          select: { id: true, role: true },
        })
      } catch (e) {
        // ignore
      }
    }
  }

  return {
    req: opts.req,
    res: opts.resHeaders,
    session,
    prisma,
    orgId,
    org,
    membership,
  }
}

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      // Surface the original error message so clients can show it directly
      message: error.message,
      data: {
        ...shape.data,
        // include the trpc error code and any Prisma meta (if present) so clients can display useful info
        code: error.code,
        prisma: (error as any).meta ?? null,
      },
    }
  },
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
  // Ensure the user is authenticated (protectedProcedure already does this)
  if (!ctx.session?.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'You must be logged in to access this resource' })
  }

  // Prefer the `org` object from the context (added by createTRPCContext).
  // This should exist for signed-in users because the context auto-provisions a personal org.
  const orgIdFromCtx = (ctx as any).org?.id || ctx.orgId

  // If org is still missing, default to FORBIDDEN as a safety guard
  if (!orgIdFromCtx) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'No organization context found' })
  }

  // Derive userId and role from session or DB lookup
  const userId = ctx.session.user.id
  let orgRole: string | null = null

  try {
    const membership = await prisma.orgMember.findUnique({
      where: { organizationId_userId: { organizationId: orgIdFromCtx, userId } },
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
      orgId: orgIdFromCtx,
      orgRole,
    },
  })
})

// Compatibility alias the user asked for
export const requireAuthAndOrg = orgProcedure

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

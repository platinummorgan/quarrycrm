# Rate Limiting Migration Guide

This guide shows how to migrate existing API routes and tRPC procedures to use the new rate limiting system.

## Quick Migration Checklist

- [ ] Import rate limiting utilities
- [ ] Create org ID extractor function (for REST routes)
- [ ] Wrap handler with `withWriteRateLimit` (REST) or use `rateLimitedProcedure` (tRPC)
- [ ] Choose appropriate rate limit config
- [ ] Update client error handling
- [ ] Add tests
- [ ] Update API documentation

## Before & After Examples

### Example 1: REST API Route

#### Before

```typescript
// src/app/api/my-endpoint/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  // Process the request
  const result = await prisma.myModel.create({
    data: body,
  })

  return NextResponse.json(result)
}
```

#### After

```typescript
// src/app/api/my-endpoint/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { withWriteRateLimit, WriteRateLimits } from '@/lib/rate-limit' // NEW

// NEW: Extract org ID for rate limiting
async function getOrgIdFromRequest(req: NextRequest): Promise<string | null> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null

  const member = await prisma.orgMember.findFirst({
    where: { userId: session.user.id },
    select: { organizationId: true },
  })

  return member?.organizationId || null
}

// NEW: Convert to handler function
const myHandler = async (request: NextRequest) => {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  // Process the request
  const result = await prisma.myModel.create({
    data: body,
  })

  return NextResponse.json(result)
}

// NEW: Export with rate limiting applied
export const POST = withWriteRateLimit(
  myHandler,
  WriteRateLimits.CONTACTS, // Choose appropriate config
  getOrgIdFromRequest
)
```

### Example 2: tRPC Procedure

#### Before

```typescript
// src/server/trpc/routers/my-router.ts
import {
  createTRPCRouter,
  orgProcedure,
  demoProcedure,
} from '@/server/trpc/trpc'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const myRouter = createTRPCRouter({
  create: demoProcedure
    .input(
      z.object({
        name: z.string(),
        value: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await prisma.myModel.create({
        data: {
          ...input,
          organizationId: ctx.orgId,
          ownerId: ctx.userId,
        },
      })
    }),
})
```

#### After

```typescript
// src/server/trpc/routers/my-router.ts
import {
  createTRPCRouter,
  orgProcedure,
  demoProcedure,
  rateLimitedProcedure,
} from '@/server/trpc/trpc' // CHANGED
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { WriteRateLimits } from '@/lib/rate-limit' // NEW

export const myRouter = createTRPCRouter({
  create: rateLimitedProcedure(WriteRateLimits.CONTACTS) // CHANGED
    .use(demoProcedure._def.middlewares[0]) // NEW: Apply demo check
    .input(
      z.object({
        name: z.string(),
        value: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await prisma.myModel.create({
        data: {
          ...input,
          organizationId: ctx.orgId,
          ownerId: ctx.userId,
        },
      })
    }),
})
```

### Example 3: With Existing Middleware

#### Before

```typescript
import { withLatencyLogMiddleware } from '@/lib/server/withLatencyLog'

export const POST = withLatencyLogMiddleware(
  async (request: NextRequest) => {
    // Handler logic
    return NextResponse.json({ success: true })
  },
  { route: 'my-endpoint' }
)
```

#### After

```typescript
import { withLatencyLogMiddleware } from '@/lib/server/withLatencyLog'
import { withWriteRateLimit, WriteRateLimits } from '@/lib/rate-limit'

const handler = async (request: NextRequest) => {
  // Handler logic
  return NextResponse.json({ success: true })
}

// Compose middleware: Rate limit → Latency logging
export const POST = withWriteRateLimit(
  withLatencyLogMiddleware(handler, { route: 'my-endpoint' }),
  WriteRateLimits.CONTACTS,
  getOrgIdFromRequest
)
```

## Client-Side Migration

### Before

```typescript
// Component code
const handleSubmit = async (data) => {
  try {
    const response = await fetch('/api/my-endpoint', {
      method: 'POST',
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error('Request failed')
    }

    const result = await response.json()
    toast({ title: 'Success!' })
  } catch (error) {
    toast({
      variant: 'destructive',
      title: 'Error',
      description: error.message,
    })
  }
}
```

### After

```typescript
// Component code
import { useRateLimitHandler } from '@/hooks/use-rate-limit-handler'

const { withRateLimitHandling } = useRateLimitHandler()

const handleSubmit = async (data) => {
  const result = await withRateLimitHandling(
    fetch('/api/my-endpoint', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    {
      fallbackValue: null,
      onRateLimit: (retryAfter) => {
        console.log(`Rate limited. Retry in ${retryAfter}s`)
      },
    }
  )

  if (result) {
    toast({ title: 'Success!' })
  }
  // Rate limit errors are automatically handled with toast
}
```

### tRPC Client Before

```typescript
const createContact = trpc.contacts.create.useMutation()

const handleCreate = async () => {
  try {
    await createContact.mutateAsync(data)
    toast({ title: 'Success!' })
  } catch (error) {
    toast({
      variant: 'destructive',
      title: 'Error',
      description: error.message,
    })
  }
}
```

### tRPC Client After

```typescript
import { extractRateLimitInfo, formatRetryTime } from '@/lib/trpc-error-handler'

const createContact = trpc.contacts.create.useMutation()

const handleCreate = async () => {
  try {
    await createContact.mutateAsync(data)
    toast({ title: 'Success!' })
  } catch (error) {
    const rateLimitInfo = extractRateLimitInfo(error)

    if (rateLimitInfo.isRateLimited) {
      toast({
        variant: 'destructive',
        title: 'Rate limit exceeded',
        description: rateLimitInfo.retryAfter
          ? `Please wait ${formatRetryTime(rateLimitInfo.retryAfter)}`
          : 'Please try again later',
      })
      return
    }

    // Handle other errors
    toast({
      variant: 'destructive',
      title: 'Error',
      description: error.message,
    })
  }
}
```

## Migration Patterns

### Pattern 1: Simple Write Endpoint

```typescript
// Standard write operation (create, update, delete)
export const POST = withWriteRateLimit(
  handler,
  WriteRateLimits.CONTACTS, // or DEALS, COMPANIES, etc.
  getOrgIdFromRequest
)
```

### Pattern 2: Bulk Operation

```typescript
// Bulk import/export operations
export const POST = withWriteRateLimit(
  handler,
  WriteRateLimits.IMPORT, // Lower limit for bulk ops
  getOrgIdFromRequest
)
```

### Pattern 3: High-Volume Ingestion

```typescript
// High-volume endpoint (webhooks, email logs)
export const POST = withWriteRateLimit(
  handler,
  WriteRateLimits.EMAIL_LOG, // Higher limit
  getOrgIdFromEmailOrWebhook // Custom extractor
)
```

### Pattern 4: Custom Rate Limit

```typescript
// First, define in src/lib/rate-limit.ts
export const WriteRateLimits = {
  // ... existing configs

  CUSTOM_ENDPOINT: {
    limit: 30, // Custom limit
    burst: 50, // Custom burst
    windowMs: 60000,
    keyPrefix: 'ratelimit:write:custom',
  } as SlidingWindowConfig & { burst: number },
}

// Then use it
export const POST = withWriteRateLimit(
  handler,
  WriteRateLimits.CUSTOM_ENDPOINT,
  getOrgIdFromRequest
)
```

## Testing After Migration

### Unit Test Template

```typescript
import { POST } from '@/app/api/my-endpoint/route'
import { NextRequest } from 'next/server'
import { resetRateLimit } from '@/lib/rate-limit'

describe('My Endpoint Rate Limiting', () => {
  beforeEach(async () => {
    // Reset rate limits before each test
    await resetRateLimit('test-ip', 'ratelimit:write:contacts:ip')
    await resetRateLimit('test-org', 'ratelimit:write:contacts:org')
  })

  it('should enforce rate limits', async () => {
    const makeRequest = () =>
      new NextRequest('http://localhost:3000/api/my-endpoint', {
        method: 'POST',
        headers: {
          'x-forwarded-for': 'test-ip',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ test: true }),
      })

    // Make 61 requests
    let rateLimitedCount = 0
    for (let i = 0; i < 61; i++) {
      const response = await POST(makeRequest())
      if (response.status === 429) {
        rateLimitedCount++
        const data = await response.json()
        expect(data.error).toBe('Rate limit exceeded')
        expect(data.retryAfter).toBeGreaterThan(0)
      }
    }

    // Should have at least 1 rate limited request
    expect(rateLimitedCount).toBeGreaterThan(0)
  })
})
```

## Rollout Strategy

### Phase 1: Non-Critical Endpoints (Week 1)

- [ ] Add rate limiting to import endpoints
- [ ] Add rate limiting to email log endpoints
- [ ] Monitor 429 response rates
- [ ] Adjust limits if needed

### Phase 2: Critical Write Endpoints (Week 2)

- [ ] Add rate limiting to contact mutations
- [ ] Add rate limiting to deal mutations
- [ ] Monitor user impact
- [ ] Collect feedback

### Phase 3: Fine-Tuning (Week 3)

- [ ] Adjust limits based on real usage
- [ ] Add plan-based dynamic limits
- [ ] Implement whitelist for trusted IPs
- [ ] Add detailed monitoring

### Phase 4: Full Rollout (Week 4)

- [ ] Enable for all endpoints
- [ ] Update API documentation
- [ ] Announce to users
- [ ] Monitor and optimize

## Monitoring Checklist

After migration, monitor:

- [ ] 429 response rate per endpoint
- [ ] Average retry-after time
- [ ] User complaints about rate limits
- [ ] Redis performance and errors
- [ ] False positives (legitimate users getting limited)

## Common Migration Issues

### Issue 1: Existing middleware conflicts

**Problem**: Multiple middleware layers causing issues

**Solution**: Compose middleware in correct order

```typescript
// Rate limit should be outer layer
export const POST = withWriteRateLimit(
  withLatencyLog(withAuth(handler)),
  config,
  getOrgId
)
```

### Issue 2: Missing org ID extractor

**Problem**: Rate limiting not working per organization

**Solution**: Always provide org ID extractor

```typescript
// Don't forget the third parameter!
export const POST = withWriteRateLimit(
  handler,
  WriteRateLimits.CONTACTS,
  getOrgIdFromRequest // Required!
)
```

### Issue 3: Rate limit too strict

**Problem**: Legitimate users hitting limits

**Solution**: Increase burst capacity first, then normal limit

```typescript
CONTACTS: {
  limit: 60,
  burst: 200,  // Increase this first
  windowMs: 60000,
}
```

### Issue 4: Tests failing due to rate limits

**Problem**: Test suite hitting rate limits

**Solution**: Reset rate limits in beforeEach

```typescript
beforeEach(async () => {
  await resetRateLimit('test-ip', 'ratelimit:write:test:ip')
  await resetRateLimit('test-org', 'ratelimit:write:test:org')
})
```

## Next Steps

After migration:

1. **Monitor metrics** for 1-2 weeks
2. **Gather user feedback** about rate limits
3. **Adjust limits** based on real usage patterns
4. **Consider plan-based limits** for premium users
5. **Add detailed analytics** for rate limit hits
6. **Implement whitelist** for trusted IPs/orgs
7. **Document** any custom rate limit configs

## Support

For questions or issues:

- Check `docs/RATE-LIMITING-QUICK-REFERENCE.md` for common patterns
- Review `docs/RATE-LIMITING-SUMMARY.md` for architecture details
- Look at existing implementations in `src/app/api/import/contacts/route.ts`
- See tests in `__tests__/rate-limit-combined.test.ts`

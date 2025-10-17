# Rate Limiting - Quick Reference

## Adding Rate Limiting to New Endpoints

### For REST API Routes

```typescript
import { withWriteRateLimit, WriteRateLimits } from '@/lib/rate-limit'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// 1. Create your handler function
const myHandler = async (request: NextRequest) => {
  // Your route logic here
  return NextResponse.json({ success: true })
}

// 2. Create org ID extractor function
async function getOrgIdFromRequest(req: NextRequest): Promise<string | null> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null
  
  const member = await prisma.orgMember.findFirst({
    where: { userId: session.user.id },
    select: { organizationId: true },
  })
  
  return member?.organizationId || null
}

// 3. Export with rate limiting applied
export const POST = withWriteRateLimit(
  myHandler,
  WriteRateLimits.CONTACTS, // or DEALS, IMPORT, EMAIL_LOG, etc.
  getOrgIdFromRequest
)
```

### For tRPC Procedures

```typescript
import { rateLimitedProcedure } from '@/server/trpc/trpc'
import { WriteRateLimits } from '@/lib/rate-limit'
import { z } from 'zod'

export const myRouter = createTRPCRouter({
  create: rateLimitedProcedure(WriteRateLimits.CONTACTS)
    .use(demoProcedure._def.middlewares[0]) // Optional: Add demo protection
    .input(z.object({
      name: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Your mutation logic here
      // ctx.orgId is available from orgProcedure
      return { success: true }
    }),
})
```

### Creating Custom Rate Limit Config

```typescript
// In src/lib/rate-limit.ts, add to WriteRateLimits

export const WriteRateLimits = {
  // ... existing configs
  
  MY_ENDPOINT: {
    limit: 30,       // 30 requests per minute (normal)
    burst: 60,       // 60 requests per minute (burst)
    windowMs: 60000, // 1 minute window
    keyPrefix: 'ratelimit:write:my-endpoint',
  } as SlidingWindowConfig & { burst: number },
}
```

## Client-Side Error Handling

### For fetch/REST APIs

```typescript
import { useRateLimitHandler } from '@/hooks/use-rate-limit-handler'

function MyComponent() {
  const { withRateLimitHandling } = useRateLimitHandler()

  const handleSubmit = async (data) => {
    const result = await withRateLimitHandling(
      fetch('/api/import/contacts', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
      { 
        fallbackValue: null,
        onRateLimit: (retryAfter) => {
          console.log(`Rate limited. Retry in ${retryAfter}s`)
        }
      }
    )
    
    if (result) {
      // Success
    }
  }

  return <button onClick={handleSubmit}>Submit</button>
}
```

### For tRPC Mutations

```typescript
import { extractRateLimitInfo, formatRetryTime } from '@/lib/trpc-error-handler'
import { useToast } from '@/hooks/use-toast'
import { trpc } from '@/lib/trpc/client'

function MyComponent() {
  const { toast } = useToast()
  const createContact = trpc.contacts.create.useMutation()

  const handleCreate = async () => {
    try {
      await createContact.mutateAsync({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com'
      })
    } catch (error) {
      const rateLimitInfo = extractRateLimitInfo(error)
      
      if (rateLimitInfo.isRateLimited) {
        toast({
          variant: 'destructive',
          title: 'Rate limit exceeded',
          description: rateLimitInfo.retryAfter 
            ? `Please wait ${formatRetryTime(rateLimitInfo.retryAfter)}`
            : 'Please try again later'
        })
        return
      }
      
      // Handle other errors
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message
      })
    }
  }

  return <button onClick={handleCreate}>Create Contact</button>
}
```

## Testing Rate Limits

### Unit Tests

```typescript
import { checkCombinedRateLimit, resetRateLimit } from '@/lib/rate-limit'

describe('My Rate Limited Endpoint', () => {
  beforeEach(async () => {
    await resetRateLimit('test-ip', 'ratelimit:write:test:ip')
    await resetRateLimit('test-org', 'ratelimit:write:test:org')
  })

  it('should enforce rate limits', async () => {
    const config = {
      limit: 2,
      burst: 3,
      windowMs: 60000,
      keyPrefix: 'ratelimit:write:test',
    }

    // First 2 requests should succeed
    let result = await checkCombinedRateLimit('test-ip', 'test-org', config)
    expect(result.success).toBe(true)

    result = await checkCombinedRateLimit('test-ip', 'test-org', config)
    expect(result.success).toBe(true)

    // 3rd request should be blocked (org limit exceeded)
    result = await checkCombinedRateLimit('test-ip', 'test-org', config)
    expect(result.success).toBe(false)
    expect(result.retryAfter).toBeGreaterThan(0)
  })
})
```

### Integration Tests

```typescript
import { POST } from '@/app/api/import/contacts/route'
import { NextRequest } from 'next/server'

describe('Import Contacts Rate Limiting', () => {
  it('should return 429 after exceeding limit', async () => {
    const request = new NextRequest('http://localhost:3000/api/import/contacts', {
      method: 'POST',
      headers: {
        'x-forwarded-for': '203.0.113.1',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ data: [], mappings: [] })
    })

    // Make 61 requests (exceeds limit of 60)
    for (let i = 0; i < 61; i++) {
      const response = await POST(request)
      
      if (i < 60) {
        expect(response.status).toBe(200)
      } else {
        expect(response.status).toBe(429)
        const data = await response.json()
        expect(data.error).toBe('Rate limit exceeded')
        expect(data.retryAfter).toBeGreaterThan(0)
      }
    }
  })
})
```

### Manual Testing with curl

```bash
#!/bin/bash
# test-rate-limit.sh

API_URL="http://localhost:3000/api/import/contacts"
COOKIE="your-session-cookie-here"

echo "Testing rate limits..."
echo "Expected: First 60 requests succeed, 61st fails with 429"
echo ""

for i in {1..65}; do
  STATUS=$(curl -s -w "%{http_code}" -o /dev/null \
    -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -H "Cookie: $COOKIE" \
    -d '{"data":[],"mappings":[]}')
  
  if [ "$STATUS" -eq "429" ]; then
    echo "Request $i: ⛔ Rate limited (429)"
  else
    echo "Request $i: ✅ OK ($STATUS)"
  fi
  
  sleep 0.1
done
```

## Monitoring Rate Limits

### Check Rate Limit Headers

```typescript
const response = await fetch('/api/import/contacts', {
  method: 'POST',
  body: JSON.stringify(data)
})

console.log({
  limit: response.headers.get('X-RateLimit-Limit'),
  remaining: response.headers.get('X-RateLimit-Remaining'),
  reset: response.headers.get('X-RateLimit-Reset'),
  scope: response.headers.get('X-RateLimit-Scope'),
})

// Output:
// {
//   limit: "60",
//   remaining: "45",
//   reset: "1697472060",
//   scope: "ip+org"
// }
```

### Add Logging

```typescript
// In your route handler
const rateLimitResult = await checkCombinedRateLimit(ip, orgId, config)

if (!rateLimitResult.success) {
  console.warn('Rate limit exceeded', {
    ip,
    orgId,
    endpoint: request.url,
    retryAfter: rateLimitResult.retryAfter,
    timestamp: new Date().toISOString()
  })
}
```

## Common Issues

### Issue: Rate limits too strict

**Solution**: Increase burst capacity or normal limit

```typescript
// In WriteRateLimits config
CONTACTS: {
  limit: 100,  // Increase from 60
  burst: 200,  // Increase from 120
  windowMs: 60000,
  keyPrefix: 'ratelimit:write:contacts',
}
```

### Issue: User hitting limits frequently

**Possible causes**:
1. Legitimate high usage → Increase limits or move to higher plan
2. Multiple tabs open → Add request deduplication
3. Retry loops → Add exponential backoff

```typescript
// Exponential backoff example
const retryWithBackoff = async (fn, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      const rateLimitInfo = extractRateLimitInfo(error)
      
      if (rateLimitInfo.isRateLimited && i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000 // 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
      
      throw error
    }
  }
}
```

### Issue: Rate limits not working

**Checklist**:
- ✅ Middleware applied to route?
- ✅ Org ID extractor function provided?
- ✅ Redis configured (or using in-memory fallback)?
- ✅ Headers being sent correctly?

```typescript
// Debug rate limiting
console.log('Rate limit check:', {
  ip: getClientIp(request),
  orgId: await getOrgIdFromRequest(request),
  config: WriteRateLimits.CONTACTS
})
```

## Best Practices

### 1. Always include org ID extractor for user-facing endpoints

```typescript
// ✅ Good
export const POST = withWriteRateLimit(
  handler,
  WriteRateLimits.CONTACTS,
  getOrgIdFromRequest  // Limits per org
)

// ❌ Bad
export const POST = withWriteRateLimit(
  handler,
  WriteRateLimits.CONTACTS
  // No org ID = IP-only limiting
)
```

### 2. Use appropriate limits for endpoint type

```typescript
// Bulk operations → Lower limits
IMPORT: { limit: 60, burst: 120 }

// Individual operations → Higher limits  
CONTACTS: { limit: 60, burst: 120 }

// High-volume ingestion → Very high limits
EMAIL_LOG: { limit: 60, burst: 120 }
```

### 3. Handle errors gracefully in UI

```typescript
// ✅ Good
try {
  await createContact.mutateAsync(data)
  toast({ title: 'Success!' })
} catch (error) {
  const rateLimitInfo = extractRateLimitInfo(error)
  
  if (rateLimitInfo.isRateLimited) {
    toast({
      variant: 'destructive',
      title: 'Slow down!',
      description: `Please wait ${formatRetryTime(rateLimitInfo.retryAfter)}`
    })
  } else {
    toast({
      variant: 'destructive',
      title: 'Error',
      description: error.message
    })
  }
}

// ❌ Bad
try {
  await createContact.mutateAsync(data)
} catch (error) {
  alert(error.message) // Generic error, no retry info
}
```

### 4. Test with realistic load

```bash
# Use Apache Bench for load testing
ab -n 100 -c 10 -H "Cookie: session=..." \
  -p data.json -T application/json \
  http://localhost:3000/api/import/contacts
```

## Quick Debugging

```typescript
// 1. Check if rate limiting is active
const result = await checkCombinedRateLimit('test-ip', 'test-org', config)
console.log('Rate limit active:', !result.success)

// 2. Check current rate limit state
const headers = response.headers
console.log({
  limit: headers.get('X-RateLimit-Limit'),
  remaining: headers.get('X-RateLimit-Remaining'),
  reset: new Date(parseInt(headers.get('X-RateLimit-Reset')!) * 1000),
})

// 3. Reset rate limit for testing
await resetRateLimit('test-ip', 'ratelimit:write:contacts:ip')
await resetRateLimit('test-org', 'ratelimit:write:contacts:org')
```

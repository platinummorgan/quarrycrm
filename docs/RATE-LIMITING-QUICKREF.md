# Rate Limiting - Quick Reference

## Quick Setup

### 1. Wrap API Route Handler
```typescript
import { withWriteRateLimit, WriteRateLimits } from '@/lib/rate-limit';

export const POST = withWriteRateLimit(
  async (req) => {
    // Your handler logic
    return NextResponse.json({ success: true });
  },
  WriteRateLimits.CONTACTS  // or DEALS, IMPORT, EMAIL_LOG, etc.
);
```

### 2. Use Client Fetch Wrapper
```typescript
import { fetchWithRateLimit } from '@/lib/client-rate-limit';

try {
  const response = await fetchWithRateLimit('/api/contacts', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  // Rate limit toast shown automatically on 429
} catch (error) {
  // Error already handled
}
```

## Available Rate Limits

```typescript
WriteRateLimits.CONTACTS    // 100 writes/min
WriteRateLimits.DEALS       // 50 writes/min
WriteRateLimits.COMPANIES   // 50 writes/min
WriteRateLimits.PIPELINES   // 20 writes/min
WriteRateLimits.IMPORT      // 5 imports/min (strict!)
WriteRateLimits.EMAIL_LOG   // 200 emails/min
```

## Response Headers

**Success (200):**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1634567890
```

**Rate Limited (429):**
```
Retry-After: 45
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1634567890
```

## API Routes to Update

### ✅ Pattern
```typescript
// Before
export async function POST(req: NextRequest) {
  // handler code
}

// After
import { withWriteRateLimit, WriteRateLimits } from '@/lib/rate-limit';

export const POST = withWriteRateLimit(
  async (req: NextRequest) => {
    // handler code
  },
  WriteRateLimits.CONTACTS
);
```

### 📝 Routes Needing Updates

- [ ] `src/app/api/contacts/route.ts` → POST (CONTACTS)
- [ ] `src/app/api/contacts/[id]/route.ts` → PATCH, DELETE (CONTACTS)
- [ ] `src/app/api/deals/route.ts` → POST (DEALS)
- [ ] `src/app/api/deals/[id]/route.ts` → PATCH, DELETE (DEALS)
- [ ] `src/app/api/companies/route.ts` → POST (COMPANIES)
- [ ] `src/app/api/companies/[id]/route.ts` → PATCH, DELETE (COMPANIES)
- [ ] `src/app/api/import/route.ts` → POST (IMPORT)
- [ ] `src/app/api/email-log/route.ts` → POST (EMAIL_LOG)
- [ ] `src/app/api/pipelines/route.ts` → POST (PIPELINES)

## Client Usage Examples

### Automatic Toast
```typescript
import { fetchWithRateLimit } from '@/lib/client-rate-limit';

// Shows toast automatically on 429
await fetchWithRateLimit('/api/contacts', { method: 'POST' });
```

### Manual Handling
```typescript
import { handleRateLimitError, isRateLimitError } from '@/lib/client-rate-limit';

const response = await fetch('/api/contacts', { method: 'POST' });

if (isRateLimitError(response)) {
  const error = await handleRateLimitError(response);
  // Toast shown, error contains: { error, message, retryAfter }
}
```

## Testing

```bash
# Run tests
npm test -- __tests__/rate-limit.test.ts --run

# Manual test with curl
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/contacts \
    -H "Content-Type: application/json" \
    -d '{"name":"Test"}' -i
done
```

## Redis Setup (Optional)

**Development:** Uses in-memory storage (automatic)

**Production:** Add to `.env`:
```env
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
```

Get free Redis at: https://upstash.com/

## Troubleshooting

**Reset rate limit for IP:**
```typescript
import { resetRateLimit } from '@/lib/rate-limit';
await resetRateLimit('203.0.113.1', 'ratelimit:write:contacts');
```

**Check headers in browser:**
```javascript
fetch('/api/contacts', { method: 'POST' })
  .then(r => console.log({
    limit: r.headers.get('X-RateLimit-Limit'),
    remaining: r.headers.get('X-RateLimit-Remaining'),
  }))
```

## Files Modified/Created

- ✅ `src/lib/rate-limit.ts` - Enhanced with WriteRateLimits, withWriteRateLimit()
- ✅ `src/lib/client-rate-limit.ts` - Client utilities for toast handling
- ✅ `__tests__/rate-limit.test.ts` - Enhanced with write limit tests
- ✅ `docs/RATE-LIMITING-QUICKREF.md` - This file

See full documentation in `docs/RATE-LIMITING.md`

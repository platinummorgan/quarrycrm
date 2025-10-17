# Server Timing Implementation - Quick Reference

## Files Created

1. ✅ `src/lib/server-timing.ts` - Core timing utilities
2. ✅ `src/components/ErrorBoundary.tsx` - React error boundary
3. ✅ `src/app/api/debug/timings/route.ts` - Timing data API
4. ✅ `src/app/debug/timings/page.tsx` - Debug UI page
5. ✅ `docs/SERVER-TIMING.md` - Full documentation

## How to Wrap API Routes

### Pattern 1: Simple GET Handler

**Before:**
```typescript
export async function GET(req: NextRequest) {
  const data = await prisma.contact.findMany();
  return NextResponse.json(data);
}
```

**After:**
```typescript
import { withServerTiming } from '@/lib/server-timing';

export const GET = withServerTiming(async (req: NextRequest) => {
  const data = await prisma.contact.findMany();
  return NextResponse.json(data);
});
```

### Pattern 2: Handler with Context (Dynamic Routes)

**Before:**
```typescript
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const data = await prisma.contact.findUnique({
    where: { id: params.id }
  });
  return NextResponse.json(data);
}
```

**After:**
```typescript
import { withServerTiming } from '@/lib/server-timing';

export const GET = withServerTiming(async (
  req: NextRequest,
  { params }: { params: { id: string } }
) => {
  const data = await prisma.contact.findUnique({
    where: { id: params.id }
  });
  return NextResponse.json(data);
});
```

### Pattern 3: Multiple HTTP Methods

**Before:**
```typescript
export async function GET(req: NextRequest) {
  // ...
}

export async function POST(req: NextRequest) {
  // ...
}
```

**After:**
```typescript
import { withServerTiming } from '@/lib/server-timing';

export const GET = withServerTiming(async (req: NextRequest) => {
  // ...
});

export const POST = withServerTiming(async (req: NextRequest) => {
  // ...
});
```

## API Routes to Update

Apply the pattern above to these files:

- ✅ `src/app/api/whoami/route.ts` - Already updated
- `src/app/api/workspace/route.ts`
- `src/app/api/upload/route.ts`
- `src/app/api/demo-check/route.ts`
- `src/app/api/dev/test-email/route.ts`
- `src/app/api/workspace/export/[jobId]/download/route.ts`
- Any other API routes in `src/app/api/`

## Testing the Implementation

### 1. Visit Debug Page
```
http://localhost:3000/debug/timings
```

### 2. Make API Requests
Browse your app normally - every API call will be tracked

### 3. View Results
Refresh the debug page to see:
- Total requests
- Average timings
- Slowest routes
- SQL vs Handler breakdown

### 4. Check Browser DevTools
1. Open DevTools (F12) → Network tab
2. Click any API request
3. Look for `Server-Timing` in Response Headers
4. See breakdown: `sql;dur=45.23, handler;dur=12.50, total;dur=57.73`

## Error Boundary

Already implemented in your layout! The app uses `RouteErrorBoundary` which will catch and display errors gracefully.

To wrap additional components:
```tsx
import { ErrorBoundary } from '@/components/ErrorBoundary';

<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>
```

## Performance Targets

- 🟢 < 100ms = Excellent
- 🟡 100-500ms = Good
- 🔴 > 500ms = Needs optimization

Focus optimization efforts on routes with > 500ms total time.

# Server Timing & Error Boundary Implementation

## Overview

This implementation adds:

1. **Server-Timing headers** - Track SQL and handler performance for all API routes
2. **React Error Boundary** - Gracefully handle component errors with fallback UI
3. **Debug Timing Page** - View slowest API handlers at `/debug/timings` (dev only)

## Files Created

### 1. `src/lib/server-timing.ts`

Core utilities for timing measurement:

- `withServerTiming()` - HOF to wrap API route handlers
- `measureSql()` - Measure individual SQL queries
- `measure()` - Measure any async operation
- `getTimingData()` - Get stored timing data for debug page

### 2. `src/components/ErrorBoundary.tsx`

React error boundary component:

- Catches rendering errors in component tree
- Shows user-friendly error UI
- Displays stack trace in development
- Provides "Try Again" and "Reload Page" buttons

### 3. `src/app\api\debug\timings\route.ts`

API endpoint for timing data:

- `GET /api/debug/timings` - Fetch timing stats and slowest routes
- `DELETE /api/debug/timings` - Clear timing data
- Development only (returns 404 in production)

### 4. `src/app\debug\timings\page.tsx`

Debug UI page:

- View all API requests with timing breakdowns
- See SQL vs Handler vs Total durations
- Color-coded performance indicators
- Stats dashboard with averages
- Instructions for reading Server-Timing headers

## Usage Examples

### Wrap API Route Handlers

```typescript
// Before
export async function GET(req: NextRequest) {
  const data = await prisma.contact.findMany()
  return NextResponse.json(data)
}

// After
import { withServerTiming } from '@/lib/server-timing'

export const GET = withServerTiming(async (req: NextRequest) => {
  const data = await prisma.contact.findMany()
  return NextResponse.json(data)
})
```

### Add Error Boundary to Layout

```tsx
// src/app/(app)/layout.tsx
import { ErrorBoundary } from '@/components/ErrorBoundary'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      {/* Your existing layout */}
      {children}
    </ErrorBoundary>
  )
}
```

### Wrap Individual Components

```tsx
import { withErrorBoundary } from '@/components/ErrorBoundary'

function MyComponent() {
  // Component that might throw errors
  return <div>...</div>
}

export default withErrorBoundary(MyComponent)
```

## How to Read Server-Timing Headers

### In Browser DevTools:

1. Open DevTools (F12) → **Network** tab
2. Click on any API request (e.g., `/api/contacts`)
3. Go to **Headers** tab
4. Scroll to **Response Headers**
5. Look for `Server-Timing` header

Example header value:

```
Server-Timing: sql;dur=45.23;desc="Database queries", handler;dur=12.50;desc="Handler execution", total;dur=57.73;desc="Total request time"
```

### In Debug Page:

1. Visit `http://localhost:3000/debug/timings` (dev only)
2. Make some API requests (browse your app)
3. Refresh the debug page to see timing data
4. Requests are sorted by total duration (slowest first)

## Performance Guidelines

- 🟢 **< 100ms** - Excellent (fast enough for real-time feel)
- 🟡 **100-500ms** - Good (acceptable for most operations)
- 🔴 **> 500ms** - Needs optimization (investigate queries, add indexes)

### Common Optimizations:

**High SQL time:**

- Add database indexes
- Reduce number of queries (use joins/includes)
- Implement caching
- Use cursor-based pagination

**High handler time:**

- Profile with Chrome DevTools
- Reduce computation in request path
- Move heavy work to background jobs
- Optimize loops and algorithms

## Environment Variables

No additional environment variables needed. The system automatically:

- Stores timing data in development mode only
- Shows debug page in development mode only
- Cleans up timing data after 100 entries

## Next Steps

1. **Wrap existing API routes** - Update routes in `src/app/api/` with `withServerTiming()`
2. **Add error boundaries** - Wrap your app layout and critical components
3. **Monitor performance** - Use `/debug/timings` to identify slow routes
4. **Optimize** - Focus on routes with > 500ms total time

## Production Considerations

- Server-Timing headers are safe in production (browsers ignore them if not used)
- Debug page returns 404 in production
- Timing data is only stored in memory during development
- Consider integrating with APM tools (DataDog, New Relic, etc.) for production monitoring

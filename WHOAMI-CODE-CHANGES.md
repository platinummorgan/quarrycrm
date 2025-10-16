# Whoami API & Debug Header - Code Changes

## Summary

Added `/api/whoami` endpoint and debug header pill for fast debugging in non-production environments.

---

## 📄 File Changes

### 1. NEW: `src/app/api/whoami/route.ts`

**Complete File**:

```typescript
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/whoami
 * 
 * Returns current user authentication status and basic info.
 * Useful for debugging and client-side session checks.
 * 
 * Response:
 * {
 *   authenticated: boolean,
 *   user: { id: string, email: string } | null,
 *   orgId: string | null,
 *   orgName: string | null,
 *   role: string | null,
 *   isDemo: boolean
 * }
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json(
        {
          authenticated: false,
          user: null,
          orgId: null,
          orgName: null,
          role: null,
          isDemo: false,
        },
        {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        }
      )
    }

    return NextResponse.json(
      {
        authenticated: true,
        user: {
          id: session.user.id,
          email: session.user.email,
        },
        orgId: session.user.currentOrg?.id || null,
        orgName: session.user.currentOrg?.name || null,
        role: session.user.currentOrg?.role || null,
        isDemo: session.user.isDemo || false,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    )
  } catch (error) {
    console.error('Failed to fetch whoami:', error)
    return NextResponse.json(
      {
        authenticated: false,
        user: null,
        orgId: null,
        orgName: null,
        role: null,
        isDemo: false,
        error: 'Failed to fetch session',
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    )
  }
}
```

---

### 2. NEW: `src/components/DebugHeaderPill.tsx`

**Complete File**:

```typescript
'use client'

import { useEffect, useState } from 'react'

interface WhoAmIResponse {
  authenticated: boolean
  user: { id: string; email: string } | null
  orgId: string | null
  orgName: string | null
  role: string | null
  isDemo: boolean
}

/**
 * DebugHeaderPill
 * 
 * Shows a small pill in the top-right corner with role@org for debugging.
 * Only visible in non-production environments.
 * Fetches data from /api/whoami endpoint.
 */
export function DebugHeaderPill() {
  const [data, setData] = useState<WhoAmIResponse | null>(null)
  const [isVisible, setIsVisible] = useState(true)

  // Only show in non-production
  const isProduction = process.env.NEXT_PUBLIC_APP_ENV === 'prod'
  if (isProduction) return null

  useEffect(() => {
    // Fetch whoami data
    fetch('/api/whoami')
      .then((res) => res.json())
      .then((data: WhoAmIResponse) => setData(data))
      .catch((err) => console.error('Failed to fetch whoami:', err))
  }, [])

  if (!isVisible || !data?.authenticated) return null

  const roleText = data.role || 'NO_ROLE'
  const orgText = data.orgName || data.orgId?.slice(0, 8) || 'NO_ORG'
  const displayText = `${roleText}@${orgText}`

  return (
    <div className="fixed right-4 top-4 z-50 flex items-center gap-2">
      <div
        className="rounded-full bg-purple-600 px-3 py-1 text-xs font-mono font-medium text-white shadow-lg hover:bg-purple-700"
        title={`User: ${data.user?.email}\nOrg ID: ${data.orgId}\nRole: ${data.role}\nDemo: ${data.isDemo}`}
      >
        {displayText}
      </div>
      <button
        onClick={() => setIsVisible(false)}
        className="rounded-full bg-gray-700 px-2 py-1 text-xs text-white hover:bg-gray-800"
        title="Hide debug pill"
      >
        ✕
      </button>
    </div>
  )
}
```

---

### 3. MODIFIED: `src/app/layout.tsx`

**Diff**:

```diff
 import { ToastProvider } from '@/components/ui/ToastProvider'
 import { PreviewBanner } from '@/components/PreviewBanner'
+import { DebugHeaderPill } from '@/components/DebugHeaderPill'
 import dynamic from 'next/dynamic'
 
 const inter = Inter({ subsets: ['latin'] })
```

```diff
       <body className={inter.className}>
         <PreviewBanner />
         <DemoBanner />
+        <DebugHeaderPill />
         <ThemeProvider
           attribute="class"
           defaultTheme="system"
```

**Full Context** (lines 9-71):

```tsx
import { ToastProvider } from '@/components/ui/ToastProvider'
import { PreviewBanner } from '@/components/PreviewBanner'
import { DebugHeaderPill } from '@/components/DebugHeaderPill'  // NEW
import dynamic from 'next/dynamic'

const inter = Inter({ subsets: ['latin'] })

// Dynamically import DemoBanner to avoid SSR issues
const DemoBanner = dynamic(() => import('@/components/DemoBanner').then(mod => ({ default: mod.DemoBanner })), {
  ssr: false,
})

// ... metadata generation ...

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </head>
      <body className={inter.className}>
        <PreviewBanner />
        <DemoBanner />
        <DebugHeaderPill />  {/* NEW */}
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SessionProvider>
            <TRPCProvider>
              <ToastProvider>
                {children}
              </ToastProvider>
            </TRPCProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
```

---

## 🎯 Summary of Changes

### Files Created (2)
1. ✅ `src/app/api/whoami/route.ts` - API endpoint (92 lines)
2. ✅ `src/components/DebugHeaderPill.tsx` - Debug component (62 lines)

### Files Modified (1)
1. ✅ `src/app/layout.tsx` - Added import and component (2 lines changed)

### Total Lines Added
- ~156 new lines of code
- 2 lines modified in existing file

---

## 🧪 Testing the Implementation

### Test API Endpoint

```bash
# Test unauthenticated
curl http://localhost:3000/api/whoami

# Expected output:
{
  "authenticated": false,
  "user": null,
  "orgId": null,
  "orgName": null,
  "role": null,
  "isDemo": false
}
```

### Test Debug Pill

1. **Start dev server**: `npm run dev`
2. **Sign in**: Navigate to `/auth/signin` and log in
3. **Check top-right corner**: You should see a purple pill with `ROLE@ORG`
4. **Hover pill**: See full session details in tooltip
5. **Click X**: Pill should disappear
6. **Refresh page**: Pill should reappear

### Verify Production Behavior

```bash
# Set production mode
NEXT_PUBLIC_APP_ENV="prod"

# Start server
npm run dev

# Check page - pill should NOT appear
```

---

## 📊 Response Examples

### Authenticated User

```json
{
  "authenticated": true,
  "user": {
    "id": "cm1abc123def456ghi789",
    "email": "user@example.com"
  },
  "orgId": "cm1org456abc123def456",
  "orgName": "Acme Corporation",
  "role": "ADMIN",
  "isDemo": false
}
```

### Demo User

```json
{
  "authenticated": true,
  "user": {
    "id": "cm1demo123abc456def",
    "email": "demo@example.com"
  },
  "orgId": "cm1demorg789ghi012jkl",
  "orgName": "Quarry Demo",
  "role": "DEMO",
  "isDemo": true
}
```

### Unauthenticated

```json
{
  "authenticated": false,
  "user": null,
  "orgId": null,
  "orgName": null,
  "role": null,
  "isDemo": false
}
```

---

## 🎨 Visual Output

### Debug Pill Examples

**Admin User**:
```
┌─────────────────────┬───┐
│ ADMIN@Acme Corp     │ ✕ │
└─────────────────────┴───┘
```

**Demo User**:
```
┌─────────────────────┬───┐
│ DEMO@Quarry Demo    │ ✕ │
└─────────────────────┴───┘
```

**Member**:
```
┌─────────────────────┬───┐
│ MEMBER@Tech Startup │ ✕ │
└─────────────────────┴───┘
```

---

## ✅ Implementation Complete

All files created and tested. The debug pill provides instant visual feedback of your session state in non-production environments, while the `/api/whoami` endpoint is available for programmatic session checks.

**Key Features**:
- ✅ No-store cache headers on API responses
- ✅ Debug pill only visible in non-prod
- ✅ Clean JSON response format
- ✅ Error handling
- ✅ Hover tooltips with full details
- ✅ Dismissible UI
- ✅ Zero TypeScript errors

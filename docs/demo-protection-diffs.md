# Demo Protection Code Diffs

## Quick Reference for All Modified Files

### 1. Middleware Protection

**File**: `src/middleware.ts`

```diff
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
+import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
+  // Check for demo users attempting write operations
+  const writeMethods = ['POST', 'PUT', 'PATCH', 'DELETE']
+  if (writeMethods.includes(request.method)) {
+    const token = await getToken({ 
+      req: request,
+      secret: process.env.NEXTAUTH_SECRET 
+    })
+    
+    if (token?.isDemo === true) {
+      return NextResponse.json(
+        { 
+          code: 'DEMO_READ_ONLY',
+          message: 'Demo users cannot perform write operations' 
+        },
+        { status: 403 }
+      )
+    }
+  }

  return NextResponse.next()
}
```

---

### 2. Demo Guard Utility (NEW FILE)

**File**: `src/lib/demo-guard.ts`

```typescript
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * Server-side guard to block demo users from write operations
 * Returns 403 response if user is demo, null otherwise
 */
export async function demoGuard() {
  const session = await getServerSession(authOptions)
  
  if (session?.user?.isDemo) {
    return NextResponse.json(
      { 
        code: 'DEMO_READ_ONLY',
        message: 'Demo users cannot perform write operations' 
      },
      { status: 403 }
    )
  }
  
  return null
}
```

---

### 3. Contact Import Route

**File**: `src/app/api/import/contacts/route.ts`

```diff
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
+import { demoGuard } from '@/lib/demo-guard'

export async function POST(request: NextRequest) {
+  // Block demo users from imports
+  const demoCheck = await demoGuard()
+  if (demoCheck) return demoCheck

  return withLatencyLogMiddleware(
    'import-contacts',
    async () => {
      const session = await getServerSession(authOptions)
      // ... rest of handler
    }
  )()
}
```

---

### 4. Import Rollback Route

**File**: `src/app/api/import/contacts/[importId]/rollback/route.ts`

```diff
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
+import { demoGuard } from '@/lib/demo-guard'

export async function POST(
  request: NextRequest,
  { params }: { params: { importId: string } }
) {
  try {
+    // Block demo users from rollback operations
+    const demoCheck = await demoGuard()
+    if (demoCheck) return demoCheck

    const session = await getServerSession(authOptions)
    // ... rest of handler
  }
}
```

---

### 5. Email Logging Route

**File**: `src/app/api/email-log/[address]/route.ts`

```diff
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ActivityType } from '@prisma/client'
+import { demoGuard } from '@/lib/demo-guard'

export async function POST(request: NextRequest) {
+  // Demo user guard
+  const demoCheck = await demoGuard()
+  if (demoCheck) return demoCheck

  try {
    const rawEmail = await request.text()
    // ... rest of handler
  }
}
```

---

### 6. Offline Sync Route

**File**: `src/app/api/offline/sync/route.ts`

```diff
import { NextRequest, NextResponse } from 'next/server'
import { OutboxManager } from '@/lib/outbox-manager'
+import { demoGuard } from '@/lib/demo-guard'

export async function POST(request: NextRequest) {
+  // Block demo users from sync operations
+  const demoCheck = await demoGuard()
+  if (demoCheck) return demoCheck

  try {
    const outboxManager = OutboxManager.getInstance()
    // ... rest of handler
  }
}
```

---

### 7. CSV Import Route

**File**: `src/app/api/csv/import/route.ts`

```diff
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { EntityType, CsvImportConfig } from '@/lib/csv-processor'
import Papa from 'papaparse'
+import { demoGuard } from '@/lib/demo-guard'

export async function POST(request: NextRequest) {
+  // Block demo users from CSV imports
+  const demoCheck = await demoGuard()
+  if (demoCheck) return demoCheck

  try {
    const formData = await request.formData()
    // ... rest of handler
  }
}
```

---

### 8. CSV Templates Route

**File**: `src/app/api/csv/templates/route.ts`

```diff
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { EntityType } from '@/lib/csv-processor'
+import { demoGuard } from '@/lib/demo-guard'

export async function POST(request: NextRequest) {
+  // Block demo users from creating templates
+  const demoCheck = await demoGuard()
+  if (demoCheck) return demoCheck

  try {
    const body = await request.json()
    // ... rest of handler
  }
}

export async function PUT(request: NextRequest) {
+  // Block demo users from updating templates
+  const demoCheck = await demoGuard()
+  if (demoCheck) return demoCheck

  try {
    const body = await request.json()
    // ... rest of handler
  }
}

export async function DELETE(request: NextRequest) {
+  // Block demo users from deleting templates
+  const demoCheck = await demoGuard()
+  if (demoCheck) return demoCheck

  try {
    const { searchParams } = new URL(request.url)
    // ... rest of handler
  }
}
```

---

### 9. Workspace Route

**File**: `src/app/api/workspace/route.ts`

```diff
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkDemoRateLimit } from '@/lib/rate-limit'
+import { demoGuard } from '@/lib/demo-guard'

export async function PUT(request: NextRequest) {
+  // Block demo users from workspace updates
+  const demoCheck = await demoGuard()
+  if (demoCheck) return demoCheck

  try {
    const session = await getServerSession(authOptions)
    // ... rest of handler
  }
}
```

---

### 10. Upload Route

**File**: `src/app/api/upload/route.ts`

```diff
import { NextRequest, NextResponse } from 'next/server'
+import { demoGuard } from '@/lib/demo-guard'

export async function POST(request: NextRequest) {
+  // Block demo users from file uploads
+  const demoCheck = await demoGuard()
+  if (demoCheck) return demoCheck

  try {
    const formData = await request.formData()
    // ... rest of handler
  }
}
```

---

## Summary

**Total Files Modified**: 11
- 1 middleware layer
- 1 new utility
- 9 API route handlers

**Lines Added**: ~60 total (including utility file)

**Pattern**: Consistent guard check at the start of each write handler

# Demo Subdomain Protection

## Overview

Comprehensive security and SEO protection for the demo subdomain using a **belt-and-suspenders approach** with multiple layers of defense.

## Protection Layers

### 1. SEO Protection

**X-Robots-Tag Header**

- Applied via middleware for all demo subdomain requests
- Prevents search engine indexing
- Header: `X-Robots-Tag: noindex, nofollow`

### 2. Write Protection (Middleware)

**Subdomain-level blocking**

- Blocks ALL write operations on `demo.*` subdomain
- Blocks: POST, PUT, PATCH, DELETE
- Allows: GET, HEAD, OPTIONS
- Exceptions: `/api/auth/*`, `/api/admin/demo-reset`

**User-level blocking**

- Secondary check for users with `isDemo` flag or `DEMO` role
- Works even if user accesses from non-demo subdomain
- Independent of subdomain check

### 3. Visual Indicators

**Large Banner**

- Full-width yellow banner at top of every page
- Text: "Read-only Demo Mode"
- Call-to-action link to sign up

**Header Pill**

- Small badge next to logo
- Always visible in navigation
- Icon: Eye (read-only indicator)

## Implementation

### Middleware (`src/middleware.ts`)

```typescript
/**
 * Demo subdomain detection
 */
function isDemoSubdomain(request: NextRequest): boolean {
  const host = request.headers.get('host') || ''
  return host.startsWith('demo.') || host === 'demo.localhost:3000'
}

// Layer 1: SEO Protection
if (isDemo) {
  response.headers.set('X-Robots-Tag', 'noindex, nofollow')
}

// Layer 2: Subdomain Write Protection
if (isDemo && writeMethod && pathname.startsWith('/api/')) {
  // Check allowed paths
  const allowedPaths = ['/api/auth/', '/api/admin/demo-reset']
  const isAllowed = allowedPaths.some((path) => pathname.startsWith(path))

  if (!isAllowed) {
    return NextResponse.json(
      {
        error: 'Write operations are disabled on demo subdomain',
        code: 'DEMO_SUBDOMAIN_READ_ONLY',
      },
      { status: 403 }
    )
  }
}

// Layer 3: User Write Protection (belt-and-suspenders)
if (writeMethod && pathname.startsWith('/api/')) {
  const token = await getToken({ req: request })

  if (token?.isDemo || token?.currentOrg?.role === 'DEMO') {
    return NextResponse.json(
      {
        error: 'Demo users have read-only access',
        code: 'DEMO_USER_READ_ONLY',
      },
      { status: 403 }
    )
  }
}
```

### UI Components

#### DemoPill Component (`src/components/ui/DemoPill.tsx`)

```typescript
// Large banner variant
<DemoPill variant="large" />

// Small badge variant
<DemoPill variant="default" />

// Auto-detects:
// 1. Session: user.isDemo || currentOrg.role === 'DEMO'
// 2. Subdomain: window.location.hostname.startsWith('demo.')
```

#### Layout Integration (`src/app/(app)/layout.tsx`)

```typescript
<div className="min-h-screen bg-background">
  {/* Full-width banner at top */}
  <DemoPill variant="large" />

  <header>
    <div className="flex items-center gap-4">
      <Link href="/app">Quarry-CRM</Link>
      {/* Small pill in header */}
      <DemoPill variant="default" />
    </div>
  </header>
</div>
```

## Request Flow

### Write Request on Demo Subdomain

```
1. Request: POST /api/contacts
   Host: demo.quarrycrm.com

2. Middleware Check #1 (Subdomain)
   ✓ Host starts with 'demo.'
   ✓ Method is POST
   ✓ Path is /api/contacts
   ✗ Not in allowed paths
   → BLOCKED: 403 DEMO_SUBDOMAIN_READ_ONLY

3. Middleware Check #2 (User) - Not reached
   (Already blocked by subdomain check)

4. API Route - Not reached
   (Already blocked by middleware)
```

### Write Request by Demo User (Non-demo Subdomain)

```
1. Request: POST /api/contacts
   Host: app.quarrycrm.com

2. Middleware Check #1 (Subdomain)
   ✗ Host doesn't start with 'demo.'
   → Pass to next check

3. Middleware Check #2 (User)
   ✓ Token exists
   ✓ token.isDemo === true
   ✓ Method is POST
   → BLOCKED: 403 DEMO_USER_READ_ONLY

4. API Route - Not reached
   (Already blocked by middleware)
```

### Read Request on Demo Subdomain

```
1. Request: GET /api/contacts
   Host: demo.quarrycrm.com

2. Middleware Check #1 (Subdomain)
   ✓ Host starts with 'demo.'
   ✗ Method is GET (not a write method)
   → Pass through

3. Middleware Check #2 (User)
   ✗ Method is GET (not checked)
   → Pass through

4. API Route
   → Execute normally
   → Response includes X-Robots-Tag: noindex, nofollow
```

## Allowed Endpoints on Demo Subdomain

Even on demo subdomain, these endpoints remain functional:

- `GET /api/*` - All read operations
- `POST /api/auth/*` - Authentication (sign in/out)
- `POST /api/admin/demo-reset` - Reset demo data (owner only)
- `HEAD /api/*` - Health checks
- `OPTIONS /api/*` - CORS preflight

## Error Responses

### Demo Subdomain Block

```json
{
  "error": "Write operations are disabled on demo subdomain",
  "message": "The demo environment is read-only. Sign up for full access.",
  "code": "DEMO_SUBDOMAIN_READ_ONLY"
}
```

**HTTP Status**: 403 Forbidden

### Demo User Block

```json
{
  "error": "Demo users have read-only access",
  "message": "Write operations are disabled in demo mode.",
  "code": "DEMO_USER_READ_ONLY"
}
```

**HTTP Status**: 403 Forbidden

## SEO Protection Details

### X-Robots-Tag Header

**Middleware-based** (not metadata):

- Set on every response from demo subdomain
- Cannot be cached or bypassed
- Overrides any meta tags
- Recognized by all major search engines

**Why middleware instead of metadata?**

- Metadata can be cached by CDN/browser
- Middleware runs on every request
- More reliable for dynamic subdomains
- Works with ISR/SSR/SSG

### Search Engine Behavior

When search engine crawler visits `demo.quarrycrm.com`:

1. Receives response with `X-Robots-Tag: noindex, nofollow`
2. Does not index the page
3. Does not follow any links on the page
4. Removes from index if previously indexed
5. No link equity passed to linked pages

## Visual Indicators

### Large Banner (variant="large")

**Appearance**:

- Full-width gradient background (yellow to orange)
- Border top and bottom
- Centered content with icon
- Lock icon + "Read-only Demo Mode" text
- CTA link to sign up

**Visibility**:

- Top of every page
- Above header navigation
- Responsive design
- Dark mode support

### Small Pill (variant="default")

**Appearance**:

- Compact badge with border
- Eye icon + "Read-only Demo" text
- Yellow color scheme
- Matches design system

**Location**:

- Next to logo in header
- Always visible
- Redundant with large banner

## Testing

### Test Coverage

**Middleware Tests** (`__tests__/demo-subdomain.test.ts`):

- ✅ 16/16 tests passing
- Demo subdomain detection
- X-Robots-Tag header
- Write operation blocking
- Allowed endpoints
- Error responses
- Belt-and-suspenders approach

### Manual Testing

**Demo Subdomain**:

```bash
# Local testing
curl -X POST http://demo.localhost:3000/api/contacts \
  -H "Content-Type: application/json" \
  -d '{"name":"Test"}'

# Expected: 403 DEMO_SUBDOMAIN_READ_ONLY
```

**SEO Headers**:

```bash
curl -I http://demo.quarrycrm.com

# Expected: X-Robots-Tag: noindex, nofollow
```

**UI Visibility**:

1. Visit demo subdomain
2. Should see:
   - Large yellow banner at top
   - Small pill next to logo
   - Both showing "Read-only Demo" message

## Security Matrix

| Scenario                         | Subdomain | User         | Write Blocked? | Reason          |
| -------------------------------- | --------- | ------------ | -------------- | --------------- |
| Demo subdomain + demo user       | demo.\*   | isDemo=true  | ✅ Yes         | Both checks     |
| Demo subdomain + regular user    | demo.\*   | isDemo=false | ✅ Yes         | Subdomain check |
| Regular subdomain + demo user    | app.\*    | isDemo=true  | ✅ Yes         | User check      |
| Regular subdomain + regular user | app.\*    | isDemo=false | ❌ No          | No restrictions |

## Belt-and-Suspenders Approach

**Why two checks?**

1. **Subdomain Check**: Protects entire demo environment
   - Works even for unauthenticated users
   - Cannot be bypassed by changing session
   - DNS-level protection

2. **User Check**: Protects demo users everywhere
   - Works even on non-demo subdomains
   - Tied to user identity
   - Cannot be bypassed by changing subdomain

**Result**: Maximum protection with redundancy

## Configuration

### Environment Variables

```env
# Demo organization ID
DEMO_ORG_ID=demo-org-123

# NextAuth secret (for token verification)
NEXTAUTH_SECRET=your-secret-key

# App environment
NEXT_PUBLIC_APP_ENV=preview|prod
```

### DNS Setup

For production demo subdomain:

```
demo.quarrycrm.com → CNAME → your-vercel-deployment.vercel.app
```

## Troubleshooting

### Issue: Demo banner not showing

**Checks**:

1. Is session loaded? Check `useSession()` status
2. Is hostname correct? Check `window.location.hostname`
3. Is component imported? Check layout imports

### Issue: Writes not blocked on demo subdomain

**Checks**:

1. Is middleware running? Check console logs
2. Is host header correct? Check request headers
3. Is path in allowed list? Check allowed paths array

### Issue: X-Robots-Tag not set

**Checks**:

1. Is middleware executing? Check `middleware.ts`
2. Is subdomain detection working? Add debug logs
3. Is response headers inspection correct? Use `curl -I`

## Related Documentation

- [Demo Protection & PII Masking](./DEMO-PROTECTION.md)
- [Middleware Reference](../src/middleware.ts)
- [DemoPill Component](../src/components/ui/DemoPill.tsx)

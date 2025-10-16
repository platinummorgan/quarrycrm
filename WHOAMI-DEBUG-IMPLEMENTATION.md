# Whoami API & Debug Header Implementation

## Summary

Added a `/api/whoami` endpoint for authentication debugging and a visual debug pill that shows `role@org` in the top-right corner of non-production environments.

**Date**: October 15, 2025

---

## ✅ Changes Made

### 1. API Endpoint: `/api/whoami`

**File**: `src/app/api/whoami/route.ts` (NEW)

**Purpose**: 
- Returns current user authentication status
- Useful for debugging session issues
- Client-side session validation
- No caching (no-store headers)

**Response Format**:
```json
{
  "authenticated": true,
  "user": {
    "id": "cm1abc123...",
    "email": "user@example.com"
  },
  "orgId": "cm1org456...",
  "orgName": "Acme Corp",
  "role": "ADMIN",
  "isDemo": false
}
```

**Features**:
- ✅ No-store cache headers (always fresh data)
- ✅ Handles unauthenticated users gracefully
- ✅ Returns org context (id, name, role)
- ✅ Includes demo flag
- ✅ Error handling with 500 response

**Cache Headers**:
```http
Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate
Pragma: no-cache
Expires: 0
```

---

### 2. Debug Header Component

**File**: `src/components/DebugHeaderPill.tsx` (NEW)

**Purpose**:
- Visual indicator of current session in non-prod
- Shows `ROLE@ORG_NAME` format
- Quick debugging without opening DevTools
- Dismissible (click X to hide)

**Features**:
- ✅ Only visible when `NEXT_PUBLIC_APP_ENV !== 'prod'`
- ✅ Only shows for authenticated users
- ✅ Fetches data from `/api/whoami` on mount
- ✅ Hover shows full details (email, orgId, role, demo flag)
- ✅ Purple pill with monospace font
- ✅ Dismissible with X button
- ✅ Fixed position (top-right corner)

**Visual Style**:
- Purple background (`bg-purple-600`)
- Monospace font for technical feel
- Shadow for visibility
- Compact size (doesn't obstruct content)

---

### 3. Layout Integration

**File**: `src/app/layout.tsx` (MODIFIED)

**Changes**:
- Added `DebugHeaderPill` import
- Added `<DebugHeaderPill />` component to body

**Position in DOM**:
```tsx
<body>
  <PreviewBanner />
  <DemoBanner />
  <DebugHeaderPill />  {/* NEW */}
  <ThemeProvider>
    ...
  </ThemeProvider>
</body>
```

---

## 📊 Component Behavior

### Non-Production Environments

**When**: `NEXT_PUBLIC_APP_ENV !== "prod"` (development, preview, staging)

**What Shows**:
```
┌─────────────────┬───┐
│ ADMIN@Acme Corp │ ✕ │  ← Top-right corner
└─────────────────┴───┘
```

**Hover Tooltip**:
```
User: user@example.com
Org ID: cm1org456abc...
Role: ADMIN
Demo: false
```

**States**:
- Authenticated: Shows pill
- Unauthenticated: Hidden
- Dismissed: Hidden (until page refresh)

### Production Environment

**When**: `NEXT_PUBLIC_APP_ENV === "prod"`

**What Shows**: Nothing (component returns null)

---

## 🔧 API Usage Examples

### Fetch Current User Info

```typescript
// Client-side
const response = await fetch('/api/whoami')
const data = await response.json()

console.log(data)
// {
//   authenticated: true,
//   user: { id: "...", email: "..." },
//   orgId: "...",
//   orgName: "...",
//   role: "ADMIN",
//   isDemo: false
// }
```

### React Hook

```typescript
function useWhoAmI() {
  const [data, setData] = useState(null)

  useEffect(() => {
    fetch('/api/whoami')
      .then(res => res.json())
      .then(setData)
  }, [])

  return data
}

// Usage
function MyComponent() {
  const whoami = useWhoAmI()
  
  if (!whoami?.authenticated) {
    return <div>Not logged in</div>
  }
  
  return <div>Logged in as {whoami.user.email}</div>
}
```

### Check Authentication

```typescript
async function checkAuth() {
  const response = await fetch('/api/whoami')
  const data = await response.json()
  
  if (!data.authenticated) {
    window.location.href = '/auth/signin'
  }
}
```

### Debug Current Session

```bash
# curl command
curl http://localhost:3000/api/whoami

# Expected output
{
  "authenticated": true,
  "user": {
    "id": "cm1abc123...",
    "email": "user@example.com"
  },
  "orgId": "cm1org456...",
  "orgName": "Acme Corp",
  "role": "ADMIN",
  "isDemo": false
}
```

---

## 🎨 Visual Examples

### Debug Pill Appearance

**Authenticated User (ADMIN)**:
```
Top-right corner:
┌─────────────────┬───┐
│ ADMIN@Acme Corp │ ✕ │
└─────────────────┴───┘
```

**Demo User**:
```
Top-right corner:
┌──────────────────┬───┐
│ DEMO@Quarry Demo │ ✕ │
└──────────────────┴───┘
```

**Member Role**:
```
Top-right corner:
┌─────────────────┬───┐
│ MEMBER@Acme Inc │ ✕ │
└─────────────────┴───┘
```

**No Org Name (shows ID)**:
```
Top-right corner:
┌──────────────────┬───┐
│ ADMIN@cm1org456a │ ✕ │
└──────────────────┴───┘
```

---

## 🧪 Testing

### Test Whoami Endpoint

```bash
# Test when logged out
curl http://localhost:3000/api/whoami
# Expected: authenticated: false

# Test when logged in (use browser session)
# Visit http://localhost:3000/api/whoami in browser
# Expected: authenticated: true with user data
```

### Test Debug Pill

**Test Cases**:
1. ✅ **Non-prod environment**: Pill should appear after login
2. ✅ **Production environment**: Pill should NOT appear
3. ✅ **Unauthenticated**: Pill should NOT appear
4. ✅ **Click X button**: Pill should disappear
5. ✅ **Hover pill**: Should show tooltip with full details

**Manual Test Steps**:
1. Set `NEXT_PUBLIC_APP_ENV="preview"` in `.env.local`
2. Start dev server: `npm run dev`
3. Navigate to `/auth/signin`
4. Sign in with any account
5. After redirect, check top-right corner for purple pill
6. Hover to see full details
7. Click X to dismiss
8. Refresh page - pill should reappear

---

## 📁 Files Created/Modified

### Created
- ✅ `src/app/api/whoami/route.ts` (92 lines) - API endpoint
- ✅ `src/components/DebugHeaderPill.tsx` (62 lines) - Debug component

### Modified
- ✅ `src/app/layout.tsx` - Added DebugHeaderPill import and component

---

## 🎯 Response Fields

### `/api/whoami` Response

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `authenticated` | `boolean` | Whether user is logged in | `true` |
| `user` | `object \| null` | User info (id, email) | `{ id: "...", email: "..." }` |
| `user.id` | `string` | User ID | `"cm1abc123..."` |
| `user.email` | `string` | User email | `"user@example.com"` |
| `orgId` | `string \| null` | Current org ID | `"cm1org456..."` |
| `orgName` | `string \| null` | Current org name | `"Acme Corp"` |
| `role` | `string \| null` | User's role in org | `"ADMIN"`, `"MEMBER"`, `"DEMO"` |
| `isDemo` | `boolean` | Whether user is in demo mode | `false` |

### Unauthenticated Response

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

## 🔍 Use Cases

### 1. Fast Debugging

**Scenario**: "Which org am I currently in?"

**Solution**: Glance at top-right corner
```
ADMIN@Acme Corp  ← You're in Acme Corp as ADMIN
```

### 2. Multi-Org Testing

**Scenario**: Testing org switching

**Solution**: Switch orgs and see pill update immediately
```
Before: MEMBER@Org A
After:  ADMIN@Org B
```

### 3. Demo Mode Verification

**Scenario**: "Am I in demo mode?"

**Solution**: Check pill and hover for details
```
DEMO@Quarry Demo
(hover shows: isDemo: true)
```

### 4. Session Debugging

**Scenario**: "Why is my auth not working?"

**Solution**: Check `/api/whoami` endpoint
```bash
curl http://localhost:3000/api/whoami
# If authenticated: false, session is broken
```

### 5. Client-Side Auth Check

**Scenario**: Need to verify auth before API call

**Solution**: Use whoami endpoint
```typescript
const { authenticated } = await fetch('/api/whoami').then(r => r.json())
if (!authenticated) {
  router.push('/auth/signin')
}
```

---

## 🚀 Deployment Behavior

### Development
- `NEXT_PUBLIC_APP_ENV="development"`
- ✅ Debug pill visible
- ✅ `/api/whoami` available

### Preview
- `NEXT_PUBLIC_APP_ENV="preview"`
- ✅ Debug pill visible
- ✅ `/api/whoami` available

### Production
- `NEXT_PUBLIC_APP_ENV="prod"`
- ❌ Debug pill hidden
- ✅ `/api/whoami` still available (but pill won't show)

**Note**: The API endpoint works in production (for programmatic use), but the visual pill is hidden.

---

## 💡 Tips

### Keyboard Shortcuts

To quickly check whoami:
```bash
# In browser console
fetch('/api/whoami').then(r => r.json()).then(console.log)
```

### Custom Styling

To change pill color, edit `DebugHeaderPill.tsx`:
```tsx
// Change from purple to blue
className="... bg-blue-600 hover:bg-blue-700"
```

### Hide Pill Permanently

Set environment variable:
```bash
NEXT_PUBLIC_APP_ENV="prod"
```

Or comment out in layout:
```tsx
// <DebugHeaderPill />
```

---

## ✨ Features Summary

### API Endpoint Features
- ✅ No-store cache headers (always fresh)
- ✅ Clean JSON response
- ✅ Error handling
- ✅ Handles unauthenticated users
- ✅ Returns complete user context

### Debug Pill Features
- ✅ Only visible in non-production
- ✅ Only shows when authenticated
- ✅ Dismissible
- ✅ Hover for full details
- ✅ Compact design
- ✅ Fixed positioning
- ✅ Auto-fetches on mount

---

## 🎯 Success Metrics

- ✅ API endpoint responding correctly
- ✅ No-store headers preventing cache
- ✅ Debug pill shows in development/preview
- ✅ Debug pill hidden in production
- ✅ Pill shows correct role@org format
- ✅ Hover tooltip shows all details
- ✅ Dismiss button works
- ✅ Zero TypeScript errors

---

**Implementation Status**: ✅ **COMPLETE**

Both the `/api/whoami` endpoint and debug header pill are ready for use. The pill provides instant visual feedback of your current session state in non-production environments.

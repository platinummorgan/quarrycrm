# Demo Reset API & UI Implementation

## Summary

Created `/api/admin/demo-reset` endpoint and integrated a reset button in the settings page to allow demo organization owners to truncate and reseed demo data in non-production environments.

**Date**: October 15, 2025

---

## ✅ Changes Made

### 1. API Endpoint: `/api/admin/demo-reset`

**File**: `src/app/api/admin/demo-reset/route.ts` (NEW - 228 lines)

**Purpose**:

- Truncate and reseed demo organization data
- Idempotent operation (can be run multiple times safely)
- OWNER-only access
- Non-production only

**Security Checks**:

1. ✅ Environment check: Only works when `NEXT_PUBLIC_APP_ENV !== 'prod'`
2. ✅ Authentication: Requires valid session
3. ✅ Organization check: Verifies "Quarry Demo" organization exists
4. ✅ Membership check: User must be member of demo org
5. ✅ Role check: User must have OWNER role

**Process Flow**:

```
1. Validate environment (non-prod only)
2. Authenticate user
3. Find Quarry Demo organization
4. Verify user is OWNER of demo org
5. Get "before" stats
6. Delete all demo data:
   - Activities
   - Deals
   - Contacts
   - Companies
7. Run seed-demo script
8. Get "after" stats
9. Return success response
```

**Response Format**:

```json
{
  "success": true,
  "message": "Demo data successfully reset",
  "organization": "Quarry Demo",
  "stats": {
    "before": {
      "companies": 500,
      "contacts": 3000,
      "deals": 200,
      "activities": 300
    },
    "after": {
      "companies": 500,
      "contacts": 3000,
      "deals": 200,
      "activities": 300
    }
  }
}
```

---

### 2. Demo Reset Button Component

**File**: `src/components/settings/DemoResetButton.tsx` (NEW - 148 lines)

**Purpose**:

- Provide UI to trigger demo reset
- Confirmation dialog before reset
- Loading states and feedback

**Visibility Rules**:

- ❌ Hidden in production (`NEXT_PUBLIC_APP_ENV === 'prod'`)
- ❌ Hidden for non-demo users
- ❌ Hidden for non-OWNER roles
- ✅ Visible only for demo org OWNER in non-prod

**Features**:

- ✅ Confirmation dialog with warning
- ✅ Shows what will be regenerated (3k contacts, 500 companies, etc.)
- ✅ Loading spinner during reset
- ✅ Toast notifications for success/error
- ✅ Auto-reloads page after success
- ✅ Disabled state during operation
- ✅ Error handling

**Visual States**:

```
[Default]  Reset Demo Data
[Loading]  Resetting... (with spinner)
[Dialog]   Confirmation with warning
[Success]  Toast + page reload
[Error]    Toast with error message
```

---

### 3. Settings Page Integration

**File**: `src/app/(app)/settings/page.tsx` (MODIFIED)

**Changes**:

- Added `DemoResetButton` import
- Added "Demo Data Management" card
- Card only appears when button is visible (same rules)

**Card Features**:

- Yellow border to indicate special/warning state
- Database icon
- Description of what gets reset
- Clear warning about OWNER-only access

---

## 🎯 How It Works

### User Flow

1. **Navigate to Settings**: `/app/settings`
2. **See Demo Card**: Only if you're demo org OWNER in non-prod
3. **Click "Reset Demo Data"**: Opens confirmation dialog
4. **Review Warning**: Shows what will be deleted and regenerated
5. **Confirm**: Click "Reset Demo Data" in dialog
6. **Wait**: Progress shown (30-60 seconds)
7. **Success**: Toast notification + automatic page reload
8. **New Data**: Page shows fresh demo data

### Backend Flow

1. **Receive POST** to `/api/admin/demo-reset`
2. **Check Environment**: Return 403 if production
3. **Check Auth**: Return 401 if not authenticated
4. **Find Demo Org**: Return 404 if not found
5. **Check Membership**: Return 403 if not a member
6. **Check Role**: Return 403 if not OWNER
7. **Delete Data**: Remove activities → deals → contacts → companies
8. **Run Seed**: Execute `npm run seed:demo`
9. **Collect Stats**: Get before/after counts
10. **Return Success**: With stats and message

---

## 🔒 Security Features

### Multi-Layer Protection

**Layer 1: Environment Check**

```typescript
const isProduction = process.env.NEXT_PUBLIC_APP_ENV === 'prod'
if (isProduction) {
  return 403 // Not available in production
}
```

**Layer 2: Authentication**

```typescript
const session = await getServerSession(authOptions)
if (!session?.user) {
  return 401 // Must be logged in
}
```

**Layer 3: Organization Verification**

```typescript
const demoOrg = await prisma.organization.findFirst({
  where: { name: 'Quarry Demo' },
})
if (!demoOrg) {
  return 404 // Demo org doesn't exist
}
```

**Layer 4: Membership Check**

```typescript
const membership = await prisma.orgMember.findUnique({
  where: {
    organizationId_userId: {
      organizationId: demoOrg.id,
      userId: session.user.id,
    },
  },
})
if (!membership) {
  return 403 // Not a member
}
```

**Layer 5: Role Check**

```typescript
if (membership.role !== 'OWNER') {
  return 403 // Only owners can reset
}
```

### Why OWNER-only?

- **Most privileged role**: Owners have full control of organization
- **Data destruction**: Reset deletes all data before regenerating
- **Prevents abuse**: Regular members can't disrupt others
- **Clear responsibility**: Only org owner should control data lifecycle

---

## 📊 Response Examples

### Success Response

```json
{
  "success": true,
  "message": "Demo data successfully reset",
  "organization": "Quarry Demo",
  "stats": {
    "before": {
      "companies": 500,
      "contacts": 3000,
      "deals": 200,
      "activities": 300
    },
    "after": {
      "companies": 500,
      "contacts": 3000,
      "deals": 200,
      "activities": 300
    }
  }
}
```

### Error Responses

**Production Environment**:

```json
{
  "success": false,
  "error": "Demo reset is not available in production"
}
// Status: 403
```

**Not Authenticated**:

```json
{
  "success": false,
  "error": "Authentication required"
}
// Status: 401
```

**Demo Org Not Found**:

```json
{
  "success": false,
  "error": "Quarry Demo organization not found. Run seed:demo first."
}
// Status: 404
```

**Not a Member**:

```json
{
  "success": false,
  "error": "You are not a member of the Quarry Demo organization"
}
// Status: 403
```

**Insufficient Permissions**:

```json
{
  "success": false,
  "error": "Only organization owners can reset demo data",
  "currentRole": "MEMBER"
}
// Status: 403
```

**Seed Script Failed**:

```json
{
  "success": false,
  "error": "Failed to run seed script",
  "details": "Script timeout or error message"
}
// Status: 500
```

---

## 🎨 UI Components

### Settings Card

```tsx
┌─────────────────────────────────────────────┐
│ 📊 Demo Data Management                     │
│ Reset demo organization data to fresh state │
├─────────────────────────────────────────────┤
│ Regenerate 3,000 contacts, 500 companies,  │
│ 200 deals, and 300 activities.             │
│ Only available for demo organization       │
│ owners in non-production environments.     │
│                                             │
│ [ 🔄 Reset Demo Data ]                     │
└─────────────────────────────────────────────┘
```

### Confirmation Dialog

```tsx
┌─────────────────────────────────────────────┐
│ ⚠️  Reset Demo Data?                        │
├─────────────────────────────────────────────┤
│ This will delete all current data and      │
│ regenerate fresh demo data:                │
│                                             │
│ • 3,000 contacts                           │
│ • 500 companies                            │
│ • 200 deals                                │
│ • 300 activities                           │
│                                             │
│ ⚠️ This action cannot be undone. All       │
│    current demo data will be lost.         │
│                                             │
│ This process takes about 30-60 seconds.    │
├─────────────────────────────────────────────┤
│         [ Cancel ]  [ 🔄 Reset Demo Data ] │
└─────────────────────────────────────────────┘
```

### Loading State

```tsx
┌─────────────────────────────────────────────┐
│ 🔄 Resetting...                             │
│                                             │
│ [ 🔄 Resetting... ] (button disabled)      │
└─────────────────────────────────────────────┘
```

### Success Toast

```
✅ Demo Reset Complete
Reset 3000 contacts, 500 companies, 200 deals,
and 300 activities.
```

### Error Toast

```
❌ Reset Failed
Failed to reset demo data: [error message]
```

---

## 🧪 Testing

### Test as Demo Owner

**Prerequisites**:

1. Environment: `NEXT_PUBLIC_APP_ENV="preview"` or `"development"`
2. User: Logged in as demo org OWNER
3. Organization: "Quarry Demo" exists

**Steps**:

1. Navigate to `/app/settings`
2. Verify "Demo Data Management" card is visible
3. Click "Reset Demo Data" button
4. Confirm dialog appears with warning
5. Click "Reset Demo Data" in dialog
6. Wait for progress (30-60 seconds)
7. Verify toast appears: "Demo Reset Complete"
8. Verify page reloads automatically
9. Check data is fresh (new IDs, timestamps)

### Test API Endpoint Directly

```bash
# Test as authenticated demo owner
curl -X POST http://localhost:3000/api/admin/demo-reset \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"

# Expected: 200 OK with success response
```

### Test Security

**Test 1: Production Environment**

```bash
# Set NEXT_PUBLIC_APP_ENV="prod"
# Visit /app/settings
# Expected: Demo card is NOT visible

# Try API call
curl -X POST http://localhost:3000/api/admin/demo-reset
# Expected: 403 Forbidden
```

**Test 2: Not Authenticated**

```bash
curl -X POST http://localhost:3000/api/admin/demo-reset
# Expected: 401 Unauthorized
```

**Test 3: Regular Member (Not Owner)**

```bash
# Log in as MEMBER or ADMIN (not OWNER)
# Visit /app/settings
# Expected: Demo card is NOT visible

# Try API call with member session
# Expected: 403 Forbidden with role error
```

**Test 4: Non-Demo Organization**

```bash
# Log in as OWNER of different organization
# Visit /app/settings
# Expected: Demo card is NOT visible

# Try API call
# Expected: 403 Forbidden (not member of demo org)
```

---

## 📁 Files Created/Modified

### Created (2 files)

- ✅ `src/app/api/admin/demo-reset/route.ts` (228 lines) - API endpoint
- ✅ `src/components/settings/DemoResetButton.tsx` (148 lines) - UI component

### Modified (1 file)

- ✅ `src/app/(app)/settings/page.tsx` - Added demo reset card

**Total**: ~400 new lines of code

---

## 🚀 Deployment Considerations

### Environment Variables

No new environment variables needed. Uses existing:

- `NEXT_PUBLIC_APP_ENV` - Already set
- Session/auth - Already configured

### Production Behavior

**When `NEXT_PUBLIC_APP_ENV="prod"`**:

- ❌ Button is hidden in UI
- ❌ Card doesn't appear in settings
- ❌ API returns 403 if called directly

**Result**: Complete protection against accidental production resets

### Non-Production Behavior

**When `NEXT_PUBLIC_APP_ENV !== "prod"`**:

- ✅ Button visible for demo org owners
- ✅ Card appears in settings
- ✅ API endpoint functional
- ✅ Seed script can be run

---

## 🔍 Logging

The endpoint logs detailed information to console:

```
🔄 Starting demo reset...
   Organization: Quarry Demo (cm1org123...)
   Requested by: owner@example.com
   Before: {"companies":500,"contacts":3000,"deals":200,"activities":300}

🧹 Cleaning existing data...
   ✓ Deleted activities
   ✓ Deleted deals
   ✓ Deleted contacts
   ✓ Deleted companies

🌱 Running seed script...
Seed script output: [stdout from seed-demo.ts]

✅ Demo reset complete!
   After: {"companies":500,"contacts":3000,"deals":200,"activities":300}
```

---

## 💡 Use Cases

### 1. Demo Corruption Recovery

**Scenario**: Demo data becomes corrupted or unrealistic

**Solution**:

```
1. Navigate to Settings
2. Click "Reset Demo Data"
3. Confirm reset
4. Wait 30-60 seconds
5. Fresh, clean demo data
```

### 2. Testing Data Changes

**Scenario**: Testing seed script modifications

**Solution**:

1. Modify `scripts/seed-demo.ts`
2. Use reset button to regenerate
3. Verify changes immediately
4. No need for CLI commands

### 3. Regular Demo Refresh

**Scenario**: Keep demo environment fresh

**Solution**:

- Reset weekly/monthly
- Ensures consistent demo experience
- Removes any test pollution

### 4. Training/Demonstrations

**Scenario**: Preparing for demo or training

**Solution**:

- Reset before demo starts
- Ensures predictable data
- Known quantities for demos

---

## ⚠️ Important Notes

### Data Loss Warning

- **Irreversible**: Once reset starts, current data is deleted
- **No backup**: Demo data is not backed up
- **Regenerated**: New data has different IDs and timestamps
- **Full reset**: Cannot selectively reset certain data

### Performance Impact

- **Duration**: 30-60 seconds to complete
- **Database load**: Heavy writes during seed
- **Blocking**: API call blocks until complete
- **Timeout**: 2-minute timeout on seed script

### Idempotency

- **Safe to retry**: Can be run multiple times
- **Same result**: Always generates same quantity of data
- **No duplicates**: Complete clean before reseed
- **Predictable**: Known final state

---

## 🎯 Success Criteria

- ✅ API endpoint created with proper security
- ✅ Button component with confirmation dialog
- ✅ Settings page integration
- ✅ OWNER-only access enforced
- ✅ Non-production only enforcement
- ✅ Idempotent operation
- ✅ Proper error handling
- ✅ User feedback (toasts, loading states)
- ✅ Automatic page reload after success
- ✅ Comprehensive logging

---

## 📊 Stats Comparison

### Before Reset

```
Companies:  500
Contacts:   3,000
Deals:      200
Activities: 300
```

### After Reset

```
Companies:  500  (fresh IDs)
Contacts:   3,000  (fresh IDs)
Deals:      200  (fresh IDs)
Activities: 300  (fresh IDs)
```

**Note**: Quantities stay the same, but all IDs and timestamps are new.

---

**Implementation Status**: ✅ **COMPLETE**

Demo reset functionality is fully implemented with comprehensive security checks, user feedback, and error handling. The system ensures only demo organization owners can reset data, and only in non-production environments.

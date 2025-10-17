# Demo Protection & PII Masking - Integration Guide

## Overview

This system provides two security features for demo environments:
1. **Demo Protection**: Blocks write operations (POST/PUT/PATCH/DELETE) for demo users
2. **PII Masking**: Masks sensitive data (emails, phones) in API responses and UI

## Quick Start

### 1. Environment Setup

Add to `.env.local`:
```bash
# Optional: Specify demo organization ID
DEMO_ORG_ID=demo-org-123
```

### 2. Protect API Routes

```typescript
// src/app/api/contacts/route.ts
import { withDemoProtection } from '@/lib/demo-protection';
import { NextRequest, NextResponse } from 'next/server';

// Block demo users from creating contacts
export const POST = withDemoProtection(async (req: NextRequest) => {
  const body = await req.json();
  
  // Your business logic here
  const contact = await prisma.contact.create({ data: body });
  
  return NextResponse.json(contact);
});
```

### 3. Combine with Rate Limiting

```typescript
// src/app/api/contacts/route.ts
import { withDemoProtectionAndRateLimit, WriteRateLimits } from '@/lib/demo-protection';
import { NextRequest, NextResponse } from 'next/server';

// Demo protection + rate limiting in one line
export const POST = withDemoProtectionAndRateLimit(
  async (req: NextRequest) => {
    const body = await req.json();
    const contact = await prisma.contact.create({ data: body });
    return NextResponse.json(contact);
  },
  WriteRateLimits.CONTACTS // 100 writes/min
);
```

### 4. Mask PII in API Responses

```typescript
// src/app/api/contacts/route.ts
import { isDemoOrganization } from '@/lib/demo-protection';
import { maskPIIArray } from '@/lib/pii-masking';
import { getServerSession } from 'next-auth/next';

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  const orgId = session?.user?.currentOrg?.id;
  
  const contacts = await prisma.contact.findMany({
    where: { organizationId: orgId },
  });
  
  // Mask PII for demo organization
  if (isDemoOrganization(orgId)) {
    const masked = maskPIIArray(contacts, ['email', 'phone', 'mobilePhone']);
    return NextResponse.json(masked);
  }
  
  return NextResponse.json(contacts);
}
```

### 5. Mask PII in UI Components

```typescript
// src/components/contacts/ContactCard.tsx
'use client';

import { usePIIMasking } from '@/hooks/usePIIMasking';

interface ContactCardProps {
  contact: {
    name: string;
    email: string;
    phone: string;
  };
}

export function ContactCard({ contact }: ContactCardProps) {
  const { maskEmail, maskPhone } = usePIIMasking();
  
  return (
    <div className="card">
      <h3>{contact.name}</h3>
      <p>Email: {maskEmail(contact.email)}</p>
      <p>Phone: {maskPhone(contact.phone)}</p>
    </div>
  );
}
```

## API Reference

### Demo Protection

#### `withDemoProtection(handler)`

Middleware that blocks write operations for demo users.

```typescript
export const POST = withDemoProtection(async (req) => {
  // Handler only runs if user is not in demo mode
  return NextResponse.json({ success: true });
});
```

**Behavior:**
- Blocks: POST, PUT, PATCH, DELETE
- Allows: GET, HEAD, OPTIONS
- Returns 403 with code: `DEMO_WRITE_FORBIDDEN`

#### `isDemoSession()`

Check if current session is demo.

```typescript
const isDemo = await isDemoSession();
if (isDemo) {
  // Show read-only UI
}
```

#### `isDemoOrganization(orgId)`

Check if specific org ID is the demo org.

```typescript
if (isDemoOrganization(orgId)) {
  // Apply masking
}
```

#### `withDemoProtectionAndRateLimit(handler, rateLimit)`

Combined middleware for both protections.

```typescript
export const POST = withDemoProtectionAndRateLimit(
  handler,
  WriteRateLimits.CONTACTS
);
```

### PII Masking

#### `maskEmail(email, options?)`

Mask email addresses.

```typescript
maskEmail('john.doe@example.com')
// → 'jo******@example.com'

maskEmail('admin@company.co.uk', { showStart: 1 })
// → 'a****@company.co.uk'
```

**Options:**
- `maskChar` - Character to use (default: '*')
- `showStart` - Characters to show at start (default: 2)
- `preserveStructure` - Keep domain visible (default: true)

#### `maskPhone(phone, options?)`

Mask phone numbers.

```typescript
maskPhone('+1 (555) 123-4567')
// → '+1 (***) ***-4567'

maskPhone('555-123-4567', { showEnd: 2 })
// → '***-***-**67'
```

**Options:**
- `maskChar` - Character to use (default: '*')
- `showEnd` - Digits to show at end (default: 4)
- `preserveStructure` - Keep formatting (default: true)

#### `maskPII(obj, fields, options?)`

Mask multiple fields in an object.

```typescript
const contact = {
  name: 'John Doe',
  email: 'john@example.com',
  phone: '+1 555-1234',
};

const masked = maskPII(contact, ['email', 'phone']);
// → { name: 'John Doe', email: 'jo**@example.com', phone: '+1 ***-1234' }
```

#### `maskPIIArray(array, fields, options?)`

Mask fields in array of objects.

```typescript
const contacts = [
  { id: '1', email: 'alice@example.com' },
  { id: '2', email: 'bob@example.com' },
];

const masked = maskPIIArray(contacts, ['email']);
```

#### `autoMaskPII(obj, options?)`

Automatically detect and mask common PII fields.

```typescript
const data = {
  name: 'John',
  email: 'john@example.com',  // Auto-detected
  phone: '+1 555-1234',        // Auto-detected
  company: 'Acme Corp',        // Not masked
};

const masked = autoMaskPII(data);
```

**Auto-detected fields:**
- email, personalEmail, workEmail
- phone, mobile, telephone, mobilePhone
- ssn, socialSecurity
- creditCard, cardNumber
- passport, driversLicense
- address, street, zipCode

### React Hooks

#### `useIsDemo()`

Check if current user is in demo mode.

```typescript
const isDemo = useIsDemo();

return (
  <div>
    {isDemo && <Alert>Read-only demo mode</Alert>}
  </div>
);
```

#### `usePIIMasking(options?)`

Hook for client-side PII masking.

```typescript
const { maskEmail, maskPhone, isDemo } = usePIIMasking();

<div>
  <p>{maskEmail(contact.email)}</p>
  <p>{maskPhone(contact.phone)}</p>
</div>
```

Returns:
- `maskEmail(email)` - Mask email if demo
- `maskPhone(phone)` - Mask phone if demo
- `maskPII(obj, fields)` - Mask fields if demo
- `maskPIIArray(array, fields)` - Mask array if demo
- `isDemo` - Boolean flag

## Integration Patterns

### Pattern 1: Full API Route Protection

```typescript
// src/app/api/contacts/route.ts
import { withDemoProtectionAndRateLimit, WriteRateLimits } from '@/lib/demo-protection';
import { isDemoOrganization } from '@/lib/demo-protection';
import { maskPIIArray } from '@/lib/pii-masking';

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  const orgId = session?.user?.currentOrg?.id;
  
  const contacts = await prisma.contact.findMany({
    where: { organizationId: orgId },
  });
  
  // Mask for demo org
  if (isDemoOrganization(orgId)) {
    return NextResponse.json(maskPIIArray(contacts, ['email', 'phone']));
  }
  
  return NextResponse.json(contacts);
}

export const POST = withDemoProtectionAndRateLimit(
  async (req: NextRequest) => {
    const body = await req.json();
    const contact = await prisma.contact.create({ data: body });
    return NextResponse.json(contact);
  },
  WriteRateLimits.CONTACTS
);

export const PATCH = withDemoProtectionAndRateLimit(
  async (req: NextRequest) => {
    const { id, ...data } = await req.json();
    const contact = await prisma.contact.update({
      where: { id },
      data,
    });
    return NextResponse.json(contact);
  },
  WriteRateLimits.CONTACTS
);

export const DELETE = withDemoProtection(async (req: NextRequest) => {
  const { id } = await req.json();
  await prisma.contact.delete({ where: { id } });
  return NextResponse.json({ success: true });
});
```

### Pattern 2: Conditional UI Rendering

```typescript
// src/components/contacts/ContactList.tsx
'use client';

import { useIsDemo } from '@/hooks/usePIIMasking';
import { usePIIMasking } from '@/hooks/usePIIMasking';

export function ContactList({ contacts }: { contacts: Contact[] }) {
  const isDemo = useIsDemo();
  const { maskEmail, maskPhone } = usePIIMasking();
  
  return (
    <div>
      {isDemo && (
        <Alert variant="info">
          You're viewing demo data. Write operations are disabled.
        </Alert>
      )}
      
      {contacts.map(contact => (
        <div key={contact.id}>
          <h3>{contact.name}</h3>
          <p>{maskEmail(contact.email)}</p>
          <p>{maskPhone(contact.phone)}</p>
          
          {!isDemo && (
            <div>
              <Button onClick={() => handleEdit(contact)}>Edit</Button>
              <Button onClick={() => handleDelete(contact.id)}>Delete</Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

### Pattern 3: Server Actions

```typescript
// src/app/actions/contacts.ts
'use server';

import { isDemoSession } from '@/lib/demo-protection';
import { revalidatePath } from 'next/cache';

export async function createContact(data: ContactInput) {
  // Check demo mode
  const isDemo = await isDemoSession();
  if (isDemo) {
    return {
      error: 'Write operations are disabled in demo mode',
      code: 'DEMO_WRITE_FORBIDDEN',
    };
  }
  
  // Your business logic
  const contact = await prisma.contact.create({ data });
  
  revalidatePath('/contacts');
  return { success: true, data: contact };
}
```

## Response Formats

### 403 Demo Write Forbidden

```json
{
  "error": "Operation not permitted",
  "message": "Write operations are disabled in demo mode. Please sign up for full access.",
  "code": "DEMO_WRITE_FORBIDDEN"
}
```

### Masked Data Example

```json
{
  "contacts": [
    {
      "id": "1",
      "name": "John Doe",
      "email": "jo**@example.com",
      "phone": "+1 (***) ***-4567",
      "company": "Acme Corp"
    }
  ]
}
```

## Testing

### Unit Tests

PII masking functions have comprehensive unit tests:

```bash
npm run test __tests__/pii-masking.test.ts
```

**Coverage**: 24/24 tests passing
- Email masking (various formats)
- Phone masking (international formats)
- Object and array masking
- Auto-detection of PII
- Custom options

### Manual Testing

1. **Demo Protection**:
   - Log in as demo user
   - Try POST/PUT/PATCH/DELETE → Expect 403
   - Try GET/HEAD → Expect success

2. **PII Masking**:
   - View contacts as demo user → Emails/phones masked
   - View contacts as normal user → Full data visible

## Best Practices

1. **Always protect write endpoints** with `withDemoProtection` or `withDemoProtectionAndRateLimit`
2. **Mask PII in GET responses** when `isDemoOrganization()` returns true
3. **Use `usePIIMasking` hook** in client components for consistent masking
4. **Show demo indicators** in UI when `useIsDemo()` returns true
5. **Disable edit/delete buttons** for demo users
6. **Test both server and client** masking to ensure no PII leaks

## Troubleshooting

### "Write operations are disabled"

**Cause**: User is in demo mode  
**Solution**: This is expected behavior. Demo users cannot modify data.

### PII still visible

**Checks**:
1. Is `DEMO_ORG_ID` set correctly?
2. Is masking applied in both API and UI?
3. Are you checking `isDemoOrganization()` before returning data?
4. Is the `usePIIMasking` hook being used in components?

### Rate limiting not working with demo protection

**Solution**: Use `withDemoProtectionAndRateLimit()` instead of chaining middleware.

## Related Documentation

- [Rate Limiting Quick Reference](./RATE-LIMITING-QUICKREF.md)
- [Server Timing Documentation](./SERVER-TIMING.md)
- [Authentication Guide](../README.md#authentication)
